import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  activeModal: string | null;
  toastQueue: { id: string; message: string; type: 'info' | 'success' | 'error' }[];

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  isMobileMenuOpen: false,
  activeModal: null,
  toastQueue: [],

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setMobileMenuOpen: (isMobileMenuOpen) => set({ isMobileMenuOpen }),
  openModal: (activeModal) => set({ activeModal }),
  closeModal: () => set({ activeModal: null }),
  addToast: (message, type = 'info') =>
    set((state) => ({
      toastQueue: [...state.toastQueue, { id: `toast-${Date.now()}`, message, type }],
    })),
  removeToast: (id) =>
    set((state) => ({ toastQueue: state.toastQueue.filter((t) => t.id !== id) })),
}));
