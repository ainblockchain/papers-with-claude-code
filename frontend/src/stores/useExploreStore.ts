import { create } from 'zustand';
import { Paper, Series } from '@/types/paper';
import { syncCoursesToAin } from '@/lib/ain/course-sync';

interface ExploreState {
  papers: Paper[];
  filteredPapers: Paper[];
  series: Series[];
  filteredSeries: Series[];
  searchQuery: string;
  activeTab: 'courses' | 'series';
  isLoading: boolean;
  setPapers: (papers: Paper[]) => void;
  setSeries: (series: Series[]) => void;
  setSearchQuery: (query: string) => void;
  setActiveTab: (tab: 'courses' | 'series') => void;
  setLoading: (loading: boolean) => void;
  filterPapers: () => void;
  filterSeries: () => void;
}

export const useExploreStore = create<ExploreState>((set, get) => ({
  papers: [],
  filteredPapers: [],
  series: [],
  filteredSeries: [],
  searchQuery: '',
  activeTab: 'courses',
  isLoading: false,
  setPapers: (papers) => {
    set({ papers, filteredPapers: papers });
    syncCoursesToAin(papers);
  },
  setSeries: (series) => {
    set({ series, filteredSeries: series });
  },
  setSearchQuery: (searchQuery) => {
    set({ searchQuery });
    get().filterPapers();
    get().filterSeries();
  },
  setActiveTab: (activeTab) => set({ activeTab }),
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
          p.authors.some((a) => a.name.toLowerCase().includes(q)) ||
          (p.series && p.series.toLowerCase().includes(q)) ||
          (p.organization?.name && p.organization.name.toLowerCase().includes(q))
      ),
    });
  },
  filterSeries: () => {
    const { series, searchQuery } = get();
    if (!searchQuery.trim()) {
      set({ filteredSeries: series });
      return;
    }
    const q = searchQuery.toLowerCase();
    set({
      filteredSeries: series.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      ),
    });
  },
}));
