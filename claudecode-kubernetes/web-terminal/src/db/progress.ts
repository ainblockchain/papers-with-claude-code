// SQLite-based progress store — fallback DB for hackathon demo (end goal: blockchain)

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
    // Migration for existing DBs that lack the txHash column
    try {
      this.db.exec(`ALTER TABLE stage_completions ADD COLUMN txHash TEXT`);
    } catch {
      // Ignore if column already exists
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

  /** Link a blockchain transaction hash to a stage completion record */
  updateTxHash(userId: string, courseId: string, stageNumber: number, txHash: string): void {
    this.db.prepare(`
      UPDATE stage_completions SET txHash = ? WHERE userId = ? AND courseId = ? AND stageNumber = ?
    `).run(txHash, userId, courseId, stageNumber);
  }

  /** Save a stage payment record */
  saveStagePayment(userId: string, courseId: string, stageNumber: number, txHash: string, sessionId: string): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO stage_payments (userId, courseId, stageNumber, txHash, paidAt, sessionId)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, courseId, stageNumber, txHash, new Date().toISOString(), sessionId);
  }

  /** Check if a stage has been paid for */
  isStageUnlocked(userId: string, courseId: string, stageNumber: number): boolean {
    const row = this.db.prepare(
      'SELECT id FROM stage_payments WHERE userId = ? AND courseId = ? AND stageNumber = ?'
    ).get(userId, courseId, stageNumber);
    return !!row;
  }

  /** List of paid stages per paper for a user */
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
