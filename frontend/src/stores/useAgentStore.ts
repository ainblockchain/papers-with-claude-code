import { create } from 'zustand';
import { x402Adapter } from '@/lib/adapters/x402';

export interface StandingIntent {
  agentDID: string;
  maxTransactionAmount: string;
  dailyCap: string;
  allowedContracts: string[];
  allowedFunctions: string[];
  expiresAt: number;
  userSignature: string;
}

export interface PaymentHistoryEntry {
  txHash: string;
  timestamp: string;
  paperId: string;
  paperTitle: string;
  stageNum?: number;
  amount: string;
  method: 'enrollCourse' | 'completeStage';
  status: 'confirmed' | 'pending' | 'failed';
  explorerUrl: string;
}

export interface LearningAttestation {
  paperId: string;
  paperTitle: string;
  stageNum: number;
  score: number;
  attestationHash: string;
  completedAt: string;
  explorerUrl: string;
}

interface AgentState {
  // Identity
  agentDID: string | null;
  walletAddress: string | null;
  kitePassHash: string | null;
  isKitePassVerified: boolean;

  // Wallet
  balance: string;
  balanceWei: string;
  chainId: number;

  // Standing Intent
  standingIntent: StandingIntent | null;
  dailyUsed: string;
  dailyCap: string;

  // Payment History
  paymentHistory: PaymentHistoryEntry[];
  isLoadingHistory: boolean;

  // Learning Attestations
  attestations: LearningAttestation[];

  // Actions
  fetchWalletStatus: () => Promise<void>;
  fetchPaymentHistory: () => Promise<void>;
  fetchAttestations: () => Promise<void>;
  updateStandingIntent: (si: StandingIntent) => Promise<void>;
  reset: () => void;
}

const initialState = {
  agentDID: null,
  walletAddress: null,
  kitePassHash: null,
  isKitePassVerified: false,
  balance: '0',
  balanceWei: '0',
  chainId: Number(process.env.NEXT_PUBLIC_KITE_CHAIN_ID) || 2368,
  standingIntent: null,
  dailyUsed: '0',
  dailyCap: '0',
  paymentHistory: [],
  isLoadingHistory: false,
  attestations: [],
};

export const useAgentStore = create<AgentState>((set) => ({
  ...initialState,

  fetchWalletStatus: async () => {
    try {
      if (!x402Adapter.getWalletStatus) return;
      const status = await x402Adapter.getWalletStatus();
      set({
        walletAddress: status.address,
        balance: status.balance,
        agentDID: status.agentDID,
        dailyUsed: status.dailyUsed,
        dailyCap: status.dailyCap,
      });
    } catch (err) {
      console.error('Failed to fetch wallet status:', err);
    }
  },

  fetchPaymentHistory: async () => {
    set({ isLoadingHistory: true });
    try {
      const res = await fetch('/api/x402/history');
      if (!res.ok) {
        set({ isLoadingHistory: false });
        return;
      }
      const data = await res.json();
      set({
        paymentHistory: data.history ?? [],
        isLoadingHistory: false,
      });
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
      set({ isLoadingHistory: false });
    }
  },

  fetchAttestations: async () => {
    try {
      const res = await fetch('/api/x402/attestations');
      if (!res.ok) return;
      const data = await res.json();
      set({ attestations: data.attestations ?? [] });
    } catch (err) {
      console.error('Failed to fetch attestations:', err);
    }
  },

  updateStandingIntent: async (si: StandingIntent) => {
    try {
      const res = await fetch('/api/x402/standing-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(si),
      });
      if (!res.ok) throw new Error('Failed to update standing intent');
      set({
        standingIntent: si,
        dailyCap: si.dailyCap,
      });
    } catch (err) {
      console.error('Failed to update standing intent:', err);
      throw err;
    }
  },

  reset: () => set(initialState),
}));
