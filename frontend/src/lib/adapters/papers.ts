// Papers 어댑터 — GitHub 레포에서 논문/코스 데이터를 가져옴
// fallback: GitHub API 실패 시 mock 데이터 사용
import { Paper } from '@/types/paper';
import { MOCK_PAPERS } from '@/constants/mock-papers';

export interface PapersAdapter {
  fetchTrendingPapers(period: 'daily' | 'weekly' | 'monthly'): Promise<Paper[]>;
  searchPapers(query: string): Promise<Paper[]>;
  getPaperById(id: string): Promise<Paper | null>;
  /** Synchronous lookup (cached data only — returns null if not cached) */
  getPaperByIdSync?(id: string): Paper | null;
}

class GitHubPapersAdapter implements PapersAdapter {
  private cachedPapers: Paper[] = [];

  async fetchTrendingPapers(): Promise<Paper[]> {
    try {
      const res = await fetch('/api/papers');
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const papers: Paper[] = await res.json();
      this.cachedPapers = papers;
      return papers;
    } catch (error) {
      console.warn('GitHub papers API failed, falling back to mock:', error);
      return MOCK_PAPERS;
    }
  }

  async searchPapers(query: string): Promise<Paper[]> {
    try {
      const res = await fetch(`/api/papers?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      return res.json();
    } catch {
      return MOCK_PAPERS.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  async getPaperById(id: string): Promise<Paper | null> {
    try {
      const res = await fetch(`/api/papers?id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      return res.json();
    } catch {
      return this.cachedPapers.find((p) => p.id === id)
        ?? MOCK_PAPERS.find((p) => p.id === id)
        ?? null;
    }
  }

  getPaperByIdSync(id: string): Paper | null {
    return this.cachedPapers.find((p) => p.id === id)
      ?? MOCK_PAPERS.find((p) => p.id === id)
      ?? null;
  }
}

export const papersAdapter: PapersAdapter = new GitHubPapersAdapter();
