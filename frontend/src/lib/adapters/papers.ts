// 🔌 ADAPTER — Replace mock with real API when backend is ready
import { Paper } from '@/types/paper';
import { MOCK_PAPERS } from '@/constants/mock-papers';

export interface PapersAdapter {
  fetchTrendingPapers(period: 'daily' | 'weekly' | 'monthly'): Promise<Paper[]>;
  searchPapers(query: string): Promise<Paper[]>;
  getPaperById(id: string): Promise<Paper | null>;
}

class MockPapersAdapter implements PapersAdapter {
  async fetchTrendingPapers(): Promise<Paper[]> {
    return MOCK_PAPERS;
  }
  async searchPapers(query: string): Promise<Paper[]> {
    return MOCK_PAPERS.filter(p =>
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.description.toLowerCase().includes(query.toLowerCase())
    );
  }
  async getPaperById(id: string): Promise<Paper | null> {
    return MOCK_PAPERS.find(p => p.id === id) ?? null;
  }
}

export const papersAdapter: PapersAdapter = new MockPapersAdapter();
