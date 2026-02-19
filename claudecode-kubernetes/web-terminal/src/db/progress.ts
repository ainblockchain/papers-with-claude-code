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
        paperId TEXT NOT NULL,
        stageNumber INTEGER NOT NULL,
        completedAt TEXT NOT NULL,
        sessionId TEXT,
        UNIQUE(userId, paperId, stageNumber)
      );
      CREATE TABLE IF NOT EXISTS course_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        paperId TEXT NOT NULL,
        completedAt TEXT NOT NULL,
        UNIQUE(userId, paperId)
      );
    `);
  }

  saveStageComplete(userId: string, paperId: string, stageNumber: number, sessionId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO stage_completions (userId, paperId, stageNumber, completedAt, sessionId)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, paperId, stageNumber, new Date().toISOString(), sessionId);
  }

  saveCourseComplete(userId: string, paperId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO course_completions (userId, paperId, completedAt)
      VALUES (?, ?, ?)
    `).run(userId, paperId, new Date().toISOString());
  }

  getProgress(userId: string, paperId: string): { completedStages: number[]; isCourseComplete: boolean } {
    const stages = this.db.prepare(
      'SELECT stageNumber FROM stage_completions WHERE userId = ? AND paperId = ? ORDER BY stageNumber'
    ).all(userId, paperId) as { stageNumber: number }[];

    const course = this.db.prepare(
      'SELECT id FROM course_completions WHERE userId = ? AND paperId = ?'
    ).get(userId, paperId);

    return {
      completedStages: stages.map(r => r.stageNumber),
      isCourseComplete: !!course,
    };
  }

  getAllProgress(userId: string): { paperId: string; completedStages: number[]; isCourseComplete: boolean }[] {
    const papers = this.db.prepare(
      'SELECT DISTINCT paperId FROM stage_completions WHERE userId = ?'
    ).all(userId) as { paperId: string }[];

    return papers.map(({ paperId }) => ({
      paperId,
      ...this.getProgress(userId, paperId),
    }));
  }
}
