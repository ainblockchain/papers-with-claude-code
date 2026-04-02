// 🔌 ADAPTER — Replace with real DB API when spec is provided
import { UserProgress } from '@/types/learning';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import { papersAdapter, normalizePaperId } from '@/lib/adapters/papers';
import type { LearnerProgress } from '@/lib/ain/types';

export interface ProgressAdapter {
  saveCheckpoint(data: {
    userId: string;
    paperId: string;
    stageNumber: number;
    completedAt: string;
    quizScore?: number;
    totalStages?: number;
    /** When false, only update currentStage/lastAccessedAt without adding to completedStages.
     *  Defaults to true. Use false for stage_enter (navigating to a stage not yet completed). */
    markCompleted?: boolean;
    /** When true, only mark stage as completed without updating currentStage.
     *  Use this when quiz is passed but user hasn't navigated to next stage yet. */
    completedOnly?: boolean;
  }): Promise<void>;
  loadProgress(userId: string, paperId: string): Promise<UserProgress | null>;
  loadAllProgress(userId: string): Promise<UserProgress[]>;
  /** Load progress from AIN blockchain by wallet address */
  loadProgressByAddress(address: string, paperId: string): Promise<UserProgress | null>;
  loadAllProgressByAddress(address: string): Promise<UserProgress[]>;
  /** Load merged progress: blockchain + localStorage (localStorage wins on conflicts) */
  loadMergedProgress(userId: string, walletAddress?: string): Promise<UserProgress[]>;
}

/** Convert LearnerProgress (blockchain) to UserProgress[] (dashboard format) */
async function convertLearnerProgress(progress: LearnerProgress): Promise<UserProgress[]> {
  const results: UserProgress[] = [];

  for (const topic of progress.topics) {
    // Only process course topics (topicPath: "courses/{paperId}")
    if (!topic.topicPath.startsWith('courses/')) continue;

    const paperId = normalizePaperId(topic.topicPath.replace('courses/', ''));

    // Extract completed/unlocked stages and track latest stage_enter
    const completedStages: { stageNumber: number; completedAt: string; quizScore?: number }[] = [];
    const unlockedStages: number[] = [];
    let lastAccessedAt = '';
    let maxStageEnterIndex = 0;

    for (const entry of topic.entries) {
      let stageIndex = 0;
      const stageMatch = entry.summary.match(/stage\s+(\d+)/i);
      if (stageMatch) {
        stageIndex = parseInt(stageMatch[1], 10);
      }

      if (entry.depth === 2) {
        if (!completedStages.find(s => s.stageNumber === stageIndex)) {
          completedStages.push({
            stageNumber: stageIndex,
            completedAt: new Date(entry.createdAt).toISOString(),
          });
        }
      }

      // Track highest stage_enter index for currentStage restoration
      if (entry.depth === 1 && entry.summary.startsWith('stage_enter')) {
        maxStageEnterIndex = Math.max(maxStageEnterIndex, stageIndex);
      }

      // Track unlocked stages
      // Value = the stage index where unlock/payment happened (current stage at that time)
      if (entry.depth === 1 && entry.summary.startsWith('stage_unlock')) {
        unlockedStages.push(stageIndex);
      }

      const entryTime = new Date(entry.createdAt).toISOString();
      if (!lastAccessedAt || entryTime > lastAccessedAt) {
        lastAccessedAt = entryTime;
      }
    }

    // Get totalStages from paper metadata
    let totalStages = 5; // fallback
    try {
      const paper = await papersAdapter.getPaperById(paperId);
      if (paper) totalStages = paper.totalStages;
    } catch {
      // use fallback
    }

    results.push({
      paperId,
      currentStage: maxStageEnterIndex,
      totalStages,
      completedStages: completedStages.sort((a, b) => a.stageNumber - b.stageNumber),
      unlockedStages,
      lastAccessedAt,
    });
  }

  return results;
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
    totalStages?: number;
    markCompleted?: boolean;
    /** When true, only mark stage as completed without updating currentStage.
     *  Use this when quiz is passed but user hasn't navigated to next stage yet. */
    completedOnly?: boolean;
  }): Promise<void> {
    if (typeof window === 'undefined') return;
    const key = this.getKey(data.userId, data.paperId);
    const existing = localStorage.getItem(key);
    const progress: UserProgress = existing
      ? JSON.parse(existing)
      : { paperId: data.paperId, currentStage: 0, totalStages: data.totalStages ?? 5, completedStages: [], unlockedStages: [], lastAccessedAt: '' };
    // Update totalStages if provided (fixes stale values from older saves)
    if (data.totalStages) {
      progress.totalStages = data.totalStages;
    }

    // Only update currentStage if not completedOnly mode
    if (!data.completedOnly) {
      progress.currentStage = data.stageNumber;
    }
    progress.lastAccessedAt = data.completedAt;
    if (data.markCompleted !== false && !progress.completedStages.find(s => s.stageNumber === data.stageNumber)) {
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
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.unlockedStages) data.unlockedStages = [];
    return data;
  }

  async loadAllProgress(userId: string): Promise<UserProgress[]> {
    if (typeof window === 'undefined') return [];
    const results: UserProgress[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`progress:${userId}:`)) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          if (!data.unlockedStages) data.unlockedStages = [];
          results.push(data);
        }
      }
    }
    return results;
  }

  async loadProgressByAddress(_address: string, _paperId: string): Promise<UserProgress | null> {
    return null;
  }

  async loadAllProgressByAddress(_address: string): Promise<UserProgress[]> {
    return [];
  }

  async loadMergedProgress(userId: string, walletAddress?: string): Promise<UserProgress[]> {
    const localProgress = await this.loadAllProgress(userId);
    let chainProgress: UserProgress[] = [];
    if (walletAddress) {
      try {
        chainProgress = await this.loadAllProgressByAddress(walletAddress);
      } catch {
        // blockchain unavailable — use local only
      }
    }

    // Merge: blockchain wins on conflicts (source of truth)
    const progressMap = new Map<string, UserProgress>();
    for (const p of localProgress) progressMap.set(p.paperId, p);
    for (const p of chainProgress) progressMap.set(p.paperId, p);
    return Array.from(progressMap.values());
  }
}

class AinProgressAdapter extends MockProgressAdapter {
  /** Load progress from blockchain by querying the user's own derived address. */
  async loadProgressByAddress(address: string, paperId: string): Promise<UserProgress | null> {
    try {
      const progress = await ainAdapter.getProgress(address);
      const allProgress = await convertLearnerProgress(progress);
      const normalized = normalizePaperId(paperId);
      return allProgress.find(p => normalizePaperId(p.paperId) === normalized) ?? null;
    } catch (err) {
      console.error('[AinProgressAdapter] loadProgressByAddress failed:', err);
      return null;
    }
  }

  async loadAllProgressByAddress(address: string): Promise<UserProgress[]> {
    try {
      const progress = await ainAdapter.getProgress(address);
      return await convertLearnerProgress(progress);
    } catch (err) {
      console.error('[AinProgressAdapter] loadAllProgressByAddress failed:', err);
      return [];
    }
  }
}

const USE_REAL_AIN = process.env.NEXT_PUBLIC_USE_AIN_CHAIN === 'true';
export const progressAdapter: ProgressAdapter = USE_REAL_AIN
  ? new AinProgressAdapter()
  : new MockProgressAdapter();
