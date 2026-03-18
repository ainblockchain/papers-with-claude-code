import { create, type StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from '@/stores/useAuthStore';
import { multiChainAdapter } from '@/lib/payment/multi-chain-adapter';
import {
  type PaymentChainId,
  PAYMENT_CHAINS,
  getDefaultChain,
} from '@/lib/payment/chains';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import { normalizePaperId } from '@/lib/adapters/papers';
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
  /** Restore purchase records from AIN blockchain */
  restoreFromBlockchain: () => Promise<void>;
  /** Execute purchase via selected payment chain. Returns true on success. */
  purchaseCourse: (paperId: string) => Promise<boolean>;
  clearPurchaseError: () => void;
}

const storeConfig: StateCreator<PurchaseState> = (set, get) => ({
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

  getAccessStatus: (paperId) => get().accessMap[normalizePaperId(paperId)] ?? 'available',

  setAccessStatus: (paperId, status) =>
    set((state) => ({
      accessMap: { ...state.accessMap, [normalizePaperId(paperId)]: status },
    })),

  initializeAccess: (papers) => {
    const { user } = useAuthStore.getState();
    const currentUsername = user?.username;
    const newMap: Record<string, CourseAccessStatus> = { ...get().accessMap };

    for (const paper of papers) {
      const id = normalizePaperId(paper.id);
      // Already purchased → keep that status
      if (newMap[id] === 'purchased') continue;
      // Published by current user → owned
      if (currentUsername && paper.submittedBy === currentUsername) {
        newMap[id] = 'owned';
      } else if (!newMap[id]) {
        newMap[id] = 'available';
      }
    }
    set({ accessMap: newMap });
  },

  restoreFromBlockchain: async () => {
    const { passkeyInfo } = useAuthStore.getState();
    if (!passkeyInfo?.evmAddress) return;

    try {
      const progress = await ainAdapter.getProgress(passkeyInfo.evmAddress);

      const purchasedIds: string[] = [];

      for (const topic of progress.topics) {
        if (!topic.topicPath.startsWith('courses/')) continue;
        const paperId = normalizePaperId(topic.topicPath.replace('courses/', ''));
        // Any course_enter entry under the user's address means they enrolled
        const hasEnrollment = topic.entries?.some(
          (entry: any) => entry.depth === 1
        );
        if (hasEnrollment) purchasedIds.push(paperId);
      }

      for (const purchase of progress.purchases) {
        if (!purchase.topicPath.startsWith('courses/')) continue;
        const paperId = normalizePaperId(purchase.topicPath.replace('courses/', ''));
        purchasedIds.push(paperId);
      }

      if (purchasedIds.length > 0) {
        set((state) => {
          const newMap = { ...state.accessMap };
          for (const id of purchasedIds) {
            if (newMap[id] !== 'owned') newMap[id] = 'purchased';
          }
          return { accessMap: newMap };
        });
      }
    } catch (err) {
      console.error('[PurchaseStore] restoreFromBlockchain failed:', err);
    }
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
          accessMap: { ...state.accessMap, [normalizePaperId(paperId)]: 'purchased' },
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
});

export const usePurchaseStore = create<PurchaseState>()(
  persist(storeConfig, {
    name: 'purchase-store',
    partialize: (state) => ({ accessMap: state.accessMap }),
    merge: (persistedState, currentState) => ({
      ...currentState,
      accessMap: {
        ...currentState.accessMap,
        ...(persistedState as any)?.accessMap,
      },
    }),
  }),
);
