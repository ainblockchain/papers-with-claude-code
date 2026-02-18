// 🔌 ADAPTER — Replace with real DB API when spec is provided
import { UserProgress } from '@/types/learning';

export interface ProgressAdapter {
  saveCheckpoint(data: {
    userId: string;
    paperId: string;
    stageNumber: number;
    completedAt: string;
    quizScore?: number;
  }): Promise<void>;
  loadProgress(userId: string, paperId: string): Promise<UserProgress | null>;
  loadAllProgress(userId: string): Promise<UserProgress[]>;
}

class MockProgressAdapter implements ProgressAdapter {
  private getKey(userId: string, paperId?: string) {
    return paperId ? `progress:${userId}:${paperId}` : `progress:${userId}`;
  }

  async saveCheckpoint(data: {
    userId: string;
    paperId: string;
    stageNumber: number;
    completedAt: string;
    quizScore?: number;
  }): Promise<void> {
    if (typeof window === 'undefined') return;
    const key = this.getKey(data.userId, data.paperId);
    const existing = localStorage.getItem(key);
    const progress: UserProgress = existing
      ? JSON.parse(existing)
      : { paperId: data.paperId, currentStage: 0, totalStages: 5, completedStages: [], lastAccessedAt: '' };

    progress.currentStage = data.stageNumber;
    progress.lastAccessedAt = data.completedAt;
    if (!progress.completedStages.find(s => s.stageNumber === data.stageNumber)) {
      progress.completedStages.push({
        stageNumber: data.stageNumber,
        completedAt: data.completedAt,
        quizScore: data.quizScore,
      });
    }
    localStorage.setItem(key, JSON.stringify(progress));
  }

  async loadProgress(userId: string, paperId: string): Promise<UserProgress | null> {
    if (typeof window === 'undefined') return null;
    const key = this.getKey(userId, paperId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async loadAllProgress(userId: string): Promise<UserProgress[]> {
    if (typeof window === 'undefined') return [];
    const results: UserProgress[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`progress:${userId}:`)) {
        const data = localStorage.getItem(key);
        if (data) results.push(JSON.parse(data));
      }
    }
    return results;
  }
}

export const progressAdapter: ProgressAdapter = new MockProgressAdapter();
