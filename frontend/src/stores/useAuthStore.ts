import { create } from 'zustand';
import type { PasskeyInfo } from '@/lib/ain/passkey';

interface User {
  id: string;
  username: string;
  avatarUrl: string;
  email: string;
  provider?: 'github' | 'kite-passport';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Passkey / AIN wallet
  passkeyInfo: PasskeyInfo | null;

  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setPasskeyInfo: (info: PasskeyInfo | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  passkeyInfo: null,

  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false, passkeyInfo: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setPasskeyInfo: (passkeyInfo) => set({ passkeyInfo }),
}));
