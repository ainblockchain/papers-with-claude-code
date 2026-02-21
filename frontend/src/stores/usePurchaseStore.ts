import { create } from 'zustand';
import { useAuthStore } from '@/stores/useAuthStore';
import { multiChainAdapter } from '@/lib/payment/multi-chain-adapter';
import {
  type PaymentChainId,
  PAYMENT_CHAINS,
  getDefaultChain,
} from '@/lib/payment/chains';
import type { Paper } from '@/types/paper';

export type CourseAccessStatus = 'owned' | 'purchased' | 'available';

interface PurchaseState {
  /** paperId → access status */
  accessMap: Record<string, CourseAccessStatus>;
  /** Paper ID currently shown in purchase modal (null = modal closed) */
  purchaseModalPaperId: string | null;
  /** Paper object for the modal (cached for display) */
  purchaseModalPaper: Paper | null;
  isPurchasing: boolean;
  purchaseError: string | null;
  lastPurchaseReceipt: {
    amount: string;
    currency: string;
    chain: PaymentChainId;
    txHash?: string;
    explorerUrl?: string;
  } | null;
  /** Selected payment chain */
  selectedChain: PaymentChainId;

  setPurchaseModal: (paperId: string | null, paper?: Paper | null) => void;
  setSelectedChain: (chain: PaymentChainId) => void;
  getAccessStatus: (paperId: string) => CourseAccessStatus;
  setAccessStatus: (paperId: string, status: CourseAccessStatus) => void;
  /** Initialize access map from paper list. Marks papers as 'owned' if submittedBy matches current user. */
  initializeAccess: (papers: Paper[]) => void;
  /** Execute purchase via selected payment chain. Returns true on success. */
  purchaseCourse: (paperId: string) => Promise<boolean>;
  clearPurchaseError: () => void;
}

export const usePurchaseStore = create<PurchaseState>((set, get) => ({
  accessMap: {},
  purchaseModalPaperId: null,
  purchaseModalPaper: null,
  isPurchasing: false,
  purchaseError: null,
  lastPurchaseReceipt: null,
  selectedChain: getDefaultChain(),

  setPurchaseModal: (paperId, paper) =>
    set({
      purchaseModalPaperId: paperId,
      purchaseModalPaper: paper ?? null,
      purchaseError: null,
      lastPurchaseReceipt: null,
    }),

  setSelectedChain: (chain) => set({ selectedChain: chain }),

  getAccessStatus: (paperId) => get().accessMap[paperId] ?? 'available',

  setAccessStatus: (paperId, status) =>
    set((state) => ({
      accessMap: { ...state.accessMap, [paperId]: status },
    })),

  initializeAccess: (papers) => {
    const { user } = useAuthStore.getState();
    const currentUsername = user?.username;
    const newMap: Record<string, CourseAccessStatus> = { ...get().accessMap };

    for (const paper of papers) {
      // Already purchased → keep that status
      if (newMap[paper.id] === 'purchased') continue;
      // Published by current user → owned
      if (currentUsername && paper.submittedBy === currentUsername) {
        newMap[paper.id] = 'owned';
      } else if (!newMap[paper.id]) {
        newMap[paper.id] = 'available';
      }
    }
    set({ accessMap: newMap });
  },

  purchaseCourse: async (paperId) => {
    const { selectedChain } = get();
    set({ isPurchasing: true, purchaseError: null });
    try {
      const result = await multiChainAdapter.purchaseCourse({
        chain: selectedChain,
        paperId,
      });

      if (result.success) {
        const chainConfig = PAYMENT_CHAINS[selectedChain];
        set((state) => ({
          accessMap: { ...state.accessMap, [paperId]: 'purchased' },
          isPurchasing: false,
          lastPurchaseReceipt: {
            amount: String(chainConfig.amounts.coursePurchase),
            currency: chainConfig.currency,
            chain: selectedChain,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl,
          },
        }));
        return true;
      } else {
        set({
          isPurchasing: false,
          purchaseError: result.error || 'Purchase failed. Please try again.',
        });
        return false;
      }
    } catch (err) {
      set({
        isPurchasing: false,
        purchaseError: err instanceof Error ? err.message : 'Purchase failed',
      });
      return false;
    }
  },

  clearPurchaseError: () => set({ purchaseError: null }),
}));
