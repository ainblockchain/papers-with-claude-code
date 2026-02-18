import { create } from 'zustand';
import { Paper } from '@/types/paper';
import { StageConfig, UserProgress } from '@/types/learning';

interface TerminalMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface PlayerPosition {
  x: number;
  y: number;
}

interface LearningState {
  // Paper & Stage
  currentPaper: Paper | null;
  stages: StageConfig[];
  currentStageIndex: number;
  progress: UserProgress | null;

  // Player
  playerPosition: PlayerPosition;
  playerDirection: 'up' | 'down' | 'left' | 'right';

  // Interaction
  activeConceptId: string | null;
  isQuizActive: boolean;
  isQuizPassed: boolean;
  isDoorUnlocked: boolean;
  isPaymentModalOpen: boolean;

  // Terminal
  terminalMessages: TerminalMessage[];
  isTerminalLoading: boolean;

  // Actions
  setPaper: (paper: Paper) => void;
  setStages: (stages: StageConfig[]) => void;
  setCurrentStageIndex: (index: number) => void;
  setProgress: (progress: UserProgress | null) => void;
  movePlayer: (dx: number, dy: number) => void;
  setPlayerPosition: (pos: PlayerPosition) => void;
  setPlayerDirection: (dir: 'up' | 'down' | 'left' | 'right') => void;
  setActiveConcept: (conceptId: string | null) => void;
  setQuizActive: (active: boolean) => void;
  setQuizPassed: (passed: boolean) => void;
  setDoorUnlocked: (unlocked: boolean) => void;
  setPaymentModalOpen: (open: boolean) => void;
  addTerminalMessage: (message: TerminalMessage) => void;
  setTerminalLoading: (loading: boolean) => void;
  clearTerminalMessages: () => void;
  reset: () => void;
}

const initialPlayerPos = { x: 3, y: 10 };

export const useLearningStore = create<LearningState>((set, get) => ({
  currentPaper: null,
  stages: [],
  currentStageIndex: 0,
  progress: null,
  playerPosition: initialPlayerPos,
  playerDirection: 'down',
  activeConceptId: null,
  isQuizActive: false,
  isQuizPassed: false,
  isDoorUnlocked: false,
  isPaymentModalOpen: false,
  terminalMessages: [],
  isTerminalLoading: false,

  setPaper: (currentPaper) => set({ currentPaper }),
  setStages: (stages) => set({ stages }),
  setCurrentStageIndex: (currentStageIndex) =>
    set({ currentStageIndex, isQuizPassed: false, isDoorUnlocked: false, activeConceptId: null }),
  setProgress: (progress) => set({ progress }),
  movePlayer: (dx, dy) => {
    const { playerPosition } = get();
    set({ playerPosition: { x: playerPosition.x + dx, y: playerPosition.y + dy } });
  },
  setPlayerPosition: (playerPosition) => set({ playerPosition }),
  setPlayerDirection: (playerDirection) => set({ playerDirection }),
  setActiveConcept: (activeConceptId) => set({ activeConceptId }),
  setQuizActive: (isQuizActive) => set({ isQuizActive }),
  setQuizPassed: (isQuizPassed) => set({ isQuizPassed }),
  setDoorUnlocked: (isDoorUnlocked) => set({ isDoorUnlocked }),
  setPaymentModalOpen: (isPaymentModalOpen) => set({ isPaymentModalOpen }),
  addTerminalMessage: (message) =>
    set((state) => ({ terminalMessages: [...state.terminalMessages, message] })),
  setTerminalLoading: (isTerminalLoading) => set({ isTerminalLoading }),
  clearTerminalMessages: () => set({ terminalMessages: [] }),
  reset: () =>
    set({
      currentPaper: null,
      stages: [],
      currentStageIndex: 0,
      progress: null,
      playerPosition: initialPlayerPos,
      playerDirection: 'down',
      activeConceptId: null,
      isQuizActive: false,
      isQuizPassed: false,
      isDoorUnlocked: false,
      isPaymentModalOpen: false,
      terminalMessages: [],
      isTerminalLoading: false,
    }),
}));
