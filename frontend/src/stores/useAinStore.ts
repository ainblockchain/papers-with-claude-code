import { create } from 'zustand';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import type { LearnerProgress, ExplorationInput } from '@/lib/ain/types';

interface AinState {
  // Account
  ainAddress: string | null;
  ainBalance: number;

  // Explorations
  explorationsByUser: Record<string, any> | null;

  // Knowledge Graph
  graph: { nodes: Record<string, any>; edges: Record<string, any> } | null;
  isLoadingGraph: boolean;

  // Frontier Map
  frontierMap: Record<string, { explorer_count: number; max_depth: number; avg_depth: number }> | null;

  // Progress
  progress: LearnerProgress | null;
  isLoadingProgress: boolean;

  // Topics
  topics: Record<string, any> | null;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAccountInfo: () => Promise<void>;
  fetchTopics: () => Promise<void>;
  recordExploration: (input: ExplorationInput) => Promise<any>;
  fetchExplorationsByUser: (address: string) => Promise<void>;
  fetchGraph: () => Promise<void>;
  fetchFrontierMap: (topicPath?: string) => Promise<void>;
  fetchProgress: (address: string) => Promise<void>;
  reset: () => void;
}

const initialState = {
  ainAddress: null,
  ainBalance: 0,
  explorationsByUser: null,
  graph: null,
  isLoadingGraph: false,
  frontierMap: null,
  progress: null,
  isLoadingProgress: false,
  topics: null,
  isLoading: false,
  error: null,
};

export const useAinStore = create<AinState>((set) => ({
  ...initialState,

  fetchAccountInfo: async () => {
    try {
      const info = await ainAdapter.getAccountInfo();
      set({ ainAddress: info.address, ainBalance: info.balance });
    } catch (err) {
      console.error('Failed to fetch AIN account info:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to fetch account' });
    }
  },

  fetchTopics: async () => {
    try {
      set({ isLoading: true });
      const topics = await ainAdapter.listTopics();
      set({ topics, isLoading: false });
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to fetch topics' });
    }
  },

  recordExploration: async (input: ExplorationInput) => {
    try {
      set({ isLoading: true, error: null });
      const result = await ainAdapter.recordExploration(input);
      set({ isLoading: false });
      return result;
    } catch (err) {
      console.error('Failed to record exploration:', err);
      set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to record exploration' });
      throw err;
    }
  },

  fetchExplorationsByUser: async (address: string) => {
    try {
      const explorations = await ainAdapter.getExplorationsByUser(address);
      set({ explorationsByUser: explorations });
    } catch (err) {
      console.error('Failed to fetch explorations:', err);
    }
  },

  fetchGraph: async () => {
    try {
      set({ isLoadingGraph: true });
      const graph = await ainAdapter.getGraph();
      set({ graph, isLoadingGraph: false });
    } catch (err) {
      console.error('Failed to fetch graph:', err);
      set({ isLoadingGraph: false });
    }
  },

  fetchFrontierMap: async (topicPath?: string) => {
    try {
      const frontierMap = await ainAdapter.getFrontierMap(topicPath);
      set({ frontierMap });
    } catch (err) {
      console.error('Failed to fetch frontier map:', err);
    }
  },

  fetchProgress: async (address: string) => {
    try {
      set({ isLoadingProgress: true });
      const progress = await ainAdapter.getProgress(address);
      set({ progress, isLoadingProgress: false });
    } catch (err) {
      console.error('Failed to fetch progress:', err);
      set({ isLoadingProgress: false });
    }
  },

  reset: () => set(initialState),
}));
