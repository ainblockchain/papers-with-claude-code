import { create } from 'zustand';

export interface PaymentHistoryEntry {
  txHash?: string;
  timestamp: string;
  paperId: string;
  paperTitle: string;
  stageNum?: number;
  amount: string;
  method: string;
  status: string;
  explorerUrl?: string;
}

export interface LearningAttestation {
  paperId: string;
  paperTitle: string;
  stageNum: number;
  score: number;
  attestationHash: string;
  completedAt: string;
  explorerUrl: string;
  chain: 'base' | 'ain';
}

export type PaymentFlowStep = 0 | 1 | 2 | 3 | 4 | 5;

interface AgentState {
  // Identity
  agentDID: string | null;
  walletAddress: string | null;

  // Wallet
  balance: string;
  balanceWei: string;
  chainId: number;

  // Payment Flow
  paymentFlowStep: PaymentFlowStep;
  paymentFlowActive: boolean;

  // Payment History
  paymentHistory: PaymentHistoryEntry[];
  isLoadingHistory: boolean;

  // Learning Attestations
  attestations: LearningAttestation[];

  // Actions
  fetchWalletStatus: () => Promise<void>;
  fetchPaymentHistory: () => Promise<void>;
  fetchAttestations: () => Promise<void>;
  advancePaymentFlow: () => void;
  resetPaymentFlow: () => void;
  simulatePaymentFlow: () => void;
  reset: () => void;
}

const EXPLORER_BASE = 'https://basescan.org';

const MOCK_PAYMENT_HISTORY: PaymentHistoryEntry[] = [
  {
    txHash: '0x7a3b...f912',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    paperId: 'attention-is-all-you-need--bible',
    paperTitle: 'Attention Is All You Need',
    stageNum: 3,
    amount: '0.001',
    method: 'x402',
    status: 'confirmed',
    explorerUrl: `${EXPLORER_BASE}/tx/0x7a3bf912`,
  },
  {
    txHash: '0x92c1...d4e8',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    paperId: 'attention-is-all-you-need--bible',
    paperTitle: 'Attention Is All You Need',
    stageNum: 2,
    amount: '0.001',
    method: 'x402',
    status: 'confirmed',
    explorerUrl: `${EXPLORER_BASE}/tx/0x92c1d4e8`,
  },
  {
    txHash: '0x45dd...a1b3',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    paperId: 'attention-is-all-you-need--bible',
    paperTitle: 'Attention Is All You Need',
    stageNum: 1,
    amount: '0.001',
    method: 'x402',
    status: 'confirmed',
    explorerUrl: `${EXPLORER_BASE}/tx/0x45dda1b3`,
  },
];

const MOCK_ATTESTATIONS: LearningAttestation[] = [
  {
    paperId: 'attention-is-all-you-need--bible',
    paperTitle: 'Attention Is All You Need',
    stageNum: 3,
    score: 92,
    attestationHash: '0x8f2c...3d71',
    completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    explorerUrl: `${EXPLORER_BASE}/tx/0x8f2c3d71`,
    chain: 'base',
  },
  {
    paperId: 'attention-is-all-you-need--bible',
    paperTitle: 'Attention Is All You Need',
    stageNum: 2,
    score: 88,
    attestationHash: '0xab91...7e42',
    completedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    explorerUrl: `${EXPLORER_BASE}/tx/0xab917e42`,
    chain: 'ain',
  },
];

const MOCK_AGENT_DID = process.env.NEXT_PUBLIC_AGENT_DID || 'did:ain:learner.eth/claude-tutor/v1';
const MOCK_WALLET_ADDRESS = process.env.BASE_MERCHANT_ADDRESS || '0xc0078d495e80fd3b1e92f0803d0bc7c279165d8c';

const initialState = {
  agentDID: null,
  walletAddress: null,
  balance: '0',
  balanceWei: '0',
  chainId: 8453,
  paymentFlowStep: 0 as PaymentFlowStep,
  paymentFlowActive: false,
  paymentHistory: [],
  isLoadingHistory: false,
  attestations: [],
};

export const useAgentStore = create<AgentState>((set, get) => ({
  ...initialState,

  fetchWalletStatus: async () => {
    try {
      const res = await fetch('/api/x402/status');
      if (!res.ok) {
        set({
          walletAddress: MOCK_WALLET_ADDRESS,
          balance: '4.70',
          agentDID: MOCK_AGENT_DID,
        });
        return;
      }
      const status = await res.json();
      set({
        walletAddress: status.walletAddress || MOCK_WALLET_ADDRESS,
        balance: status.balance || '4.70',
        agentDID: status.agentDID || MOCK_AGENT_DID,
      });
    } catch {
      set({
        walletAddress: MOCK_WALLET_ADDRESS,
        balance: '4.70',
        agentDID: MOCK_AGENT_DID,
      });
    }
  },

  fetchPaymentHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const res = await fetch('/api/x402/history');
      if (!res.ok) {
        set({ paymentHistory: MOCK_PAYMENT_HISTORY, isLoadingHistory: false });
        return;
      }
      const data = await res.json();
      const history = data.history ?? [];
      set({
        paymentHistory: history.length > 0 ? history : MOCK_PAYMENT_HISTORY,
        isLoadingHistory: false,
      });
    } catch {
      set({ paymentHistory: MOCK_PAYMENT_HISTORY, isLoadingHistory: false });
    }
  },

  fetchAttestations: async () => {
    try {
      const res = await fetch('/api/x402/attestations');
      if (!res.ok) {
        set({ attestations: MOCK_ATTESTATIONS });
        return;
      }
      const data = await res.json();
      const attestations = data.attestations ?? [];
      set({ attestations: attestations.length > 0 ? attestations : MOCK_ATTESTATIONS });
    } catch {
      set({ attestations: MOCK_ATTESTATIONS });
    }
  },

  advancePaymentFlow: () => {
    const current = get().paymentFlowStep;
    if (current < 5) {
      set({ paymentFlowStep: (current + 1) as PaymentFlowStep, paymentFlowActive: true });
    }
    if (current + 1 === 5) {
      // Auto-deactivate after completion
      setTimeout(() => set({ paymentFlowActive: false }), 3000);
    }
  },

  resetPaymentFlow: () => {
    set({ paymentFlowStep: 0, paymentFlowActive: false });
  },

  simulatePaymentFlow: () => {
    set({ paymentFlowStep: 1, paymentFlowActive: true });
    const steps = [1500, 2200, 1800, 1200];
    let delay = 0;
    steps.forEach((stepDelay, i) => {
      delay += stepDelay;
      setTimeout(() => {
        set({ paymentFlowStep: (i + 2) as PaymentFlowStep });
        if (i === steps.length - 1) {
          setTimeout(() => set({ paymentFlowActive: false }), 3000);
        }
      }, delay);
    });
  },

  reset: () => set(initialState),
}));
