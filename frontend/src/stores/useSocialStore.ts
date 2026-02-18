import { create } from 'zustand';
import { Notification, LeaderboardEntry } from '@/types/social';

interface SocialState {
  notifications: Notification[];
  leaderboard: LeaderboardEntry[];

  addNotification: (notif: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
}

export const useSocialStore = create<SocialState>((set) => ({
  notifications: [],
  leaderboard: [],

  addNotification: (notif) =>
    set((state) => ({ notifications: [notif, ...state.notifications].slice(0, 20) })),
  removeNotification: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),
  clearNotifications: () => set({ notifications: [] }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
}));
