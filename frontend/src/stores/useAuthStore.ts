import { create } from 'zustand';

interface User {
  id: string;
  username: string;
  avatarUrl: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

// 🔌 ADAPTER — Mock auth for development. Replace with real GitHub OAuth session.
export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: 'mock-user',
    username: 'developer',
    avatarUrl: '',
    email: 'dev@example.com',
  },
  isAuthenticated: true,
  isLoading: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
