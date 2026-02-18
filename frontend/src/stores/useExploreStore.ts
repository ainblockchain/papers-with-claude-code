import { create } from 'zustand';
import { Paper } from '@/types/paper';

interface ExploreState {
  papers: Paper[];
  filteredPapers: Paper[];
  searchQuery: string;
  period: 'daily' | 'weekly' | 'monthly';
  isLoading: boolean;
  setPapers: (papers: Paper[]) => void;
  setSearchQuery: (query: string) => void;
  setPeriod: (period: 'daily' | 'weekly' | 'monthly') => void;
  setLoading: (loading: boolean) => void;
  filterPapers: () => void;
}

export const useExploreStore = create<ExploreState>((set, get) => ({
  papers: [],
  filteredPapers: [],
  searchQuery: '',
  period: 'daily',
  isLoading: false,
  setPapers: (papers) => set({ papers, filteredPapers: papers }),
  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().filterPapers();
  },
  setPeriod: (period) => set({ period }),
  setLoading: (isLoading) => set({ isLoading }),
  filterPapers: () => {
    const { papers, searchQuery } = get();
    if (!searchQuery.trim()) {
      set({ filteredPapers: papers });
      return;
    }
    const q = searchQuery.toLowerCase();
    set({
      filteredPapers: papers.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.authors.some((a) => a.name.toLowerCase().includes(q))
      ),
    });
  },
}));
