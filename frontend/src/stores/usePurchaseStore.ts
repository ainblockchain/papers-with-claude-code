import { create } from 'zustand';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import { useAuthStore } from '@/stores/useAuthStore';
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
  lastPurchaseReceipt: { amount: string; currency: string } | null;

  setPurchaseModal: (paperId: string | null, paper?: Paper | null) => void;
  getAccessStatus: (paperId: string) => CourseAccessStatus;
  setAccessStatus: (paperId: string, status: CourseAccessStatus) => void;
  /** Initialize access map from paper list. Marks papers as 'owned' if submittedBy matches current user. */
  initializeAccess: (papers: Paper[]) => void;
  /** Execute purchase via ain.knowledge.access(). Returns true on success. */
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

  setPurchaseModal: (paperId, paper) =>
    set({
      purchaseModalPaperId: paperId,
      purchaseModalPaper: paper ?? null,
      purchaseError: null,
      lastPurchaseReceipt: null,
    }),

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
    set({ isPurchasing: true, purchaseError: null });
    try {
      // Use ain.knowledge.access() for x402 payment flow
      // ownerAddress: paper publisher address (in production, resolved from paper metadata)
      // topicPath: courses/{paperId}
      // entryId: paperId
      const topicPath = `courses/${paperId}`;
      const passkeyInfo = useAuthStore.getState().passkeyInfo;
      const ownerAddress = passkeyInfo?.ainAddress || '0x_default_owner';

      const result = await ainAdapter.accessEntry(ownerAddress, topicPath, paperId);

      if (result?.paid || result?.data?.paid || result?.ok) {
        const receipt = result?.receipt || result?.data?.receipt || { amount: '10', currency: 'AIN' };
        set((state) => ({
          accessMap: { ...state.accessMap, [paperId]: 'purchased' },
          isPurchasing: false,
          lastPurchaseReceipt: receipt,
        }));
        return true;
      } else {
        set({
          isPurchasing: false,
          purchaseError: result?.error || 'Purchase failed. Please try again.',
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
