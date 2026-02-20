// SQLite 기반 진행도 저장소 — 해커톤 데모용 폴백 DB (최종 목표: 블록체인)

import Database from 'better-sqlite3';

export class ProgressStore {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stage_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        stageNumber INTEGER NOT NULL,
        completedAt TEXT NOT NULL,
        sessionId TEXT,
        txHash TEXT,
        UNIQUE(userId, courseId, stageNumber)
      );
      CREATE TABLE IF NOT EXISTS course_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        completedAt TEXT NOT NULL,
        UNIQUE(userId, courseId)
      );
      CREATE TABLE IF NOT EXISTS stage_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        courseId TEXT NOT NULL,
        stageNumber INTEGER NOT NULL,
        txHash TEXT NOT NULL,
        paidAt TEXT NOT NULL,
        sessionId TEXT,
        UNIQUE(userId, courseId, stageNumber)
      );
    `);
    // 기존 DB에 txHash 컬럼이 없을 경우를 위한 마이그레이션
    try {
      this.db.exec(`ALTER TABLE stage_completions ADD COLUMN txHash TEXT`);
    } catch {
      // 이미 컬럼이 존재하면 무시
    }
  }

  saveStageComplete(userId: string, courseId: string, stageNumber: number, sessionId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO stage_completions (userId, courseId, stageNumber, completedAt, sessionId)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, courseId, stageNumber, new Date().toISOString(), sessionId);
  }

  saveCourseComplete(userId: string, courseId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO course_completions (userId, courseId, completedAt)
      VALUES (?, ?, ?)
    `).run(userId, courseId, new Date().toISOString());
  }

  getProgress(userId: string, courseId: string): { completedStages: { stageNumber: number; completedAt: string; txHash: string | null }[]; isCourseComplete: boolean } {
    const stages = this.db.prepare(
      'SELECT stageNumber, completedAt, txHash FROM stage_completions WHERE userId = ? AND courseId = ? ORDER BY stageNumber'
    ).all(userId, courseId) as { stageNumber: number; completedAt: string; txHash: string | null }[];

    const course = this.db.prepare(
      'SELECT id FROM course_completions WHERE userId = ? AND courseId = ?'
    ).get(userId, courseId);

    return {
      completedStages: stages,
      isCourseComplete: !!course,
    };
  }

  /** 블록체인 트랜잭션 해시를 스테이지 완료 기록에 연결 */
  updateTxHash(userId: string, courseId: string, stageNumber: number, txHash: string): void {
    this.db.prepare(`
      UPDATE stage_completions SET txHash = ? WHERE userId = ? AND courseId = ? AND stageNumber = ?
    `).run(txHash, userId, courseId, stageNumber);
  }

  /** 스테이지 결제 기록 저장 */
  saveStagePayment(userId: string, courseId: string, stageNumber: number, txHash: string, sessionId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO stage_payments (userId, courseId, stageNumber, txHash, paidAt, sessionId)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, courseId, stageNumber, txHash, new Date().toISOString(), sessionId);
  }

  /** 스테이지 결제 여부 확인 */
  isStageUnlocked(userId: string, courseId: string, stageNumber: number): boolean {
    const row = this.db.prepare(
      'SELECT id FROM stage_payments WHERE userId = ? AND courseId = ? AND stageNumber = ?'
    ).get(userId, courseId, stageNumber);
    return !!row;
  }

  /** 유저의 논문별 결제된 스테이지 목록 */
  getPayments(userId: string, courseId: string): { stageNumber: number; txHash: string; paidAt: string }[] {
    return this.db.prepare(
      'SELECT stageNumber, txHash, paidAt FROM stage_payments WHERE userId = ? AND courseId = ? ORDER BY stageNumber'
    ).all(userId, courseId) as { stageNumber: number; txHash: string; paidAt: string }[];
  }

  getAllProgress(userId: string): { courseId: string; completedStages: { stageNumber: number; completedAt: string; txHash: string | null }[]; isCourseComplete: boolean }[] {
    const papers = this.db.prepare(
      'SELECT DISTINCT courseId FROM stage_completions WHERE userId = ?'
    ).all(userId) as { courseId: string }[];

    return papers.map(({ courseId }) => ({
      courseId,
      ...this.getProgress(userId, courseId),
    }));
  }
}
