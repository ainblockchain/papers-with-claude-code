import { create } from 'zustand';
import { FriendPosition } from '@/types/social';

interface VillageState {
  playerPosition: { x: number; y: number };
  playerDirection: 'up' | 'down' | 'left' | 'right';
  friends: FriendPosition[];
  viewportOffset: { x: number; y: number };

  setPlayerPosition: (pos: { x: number; y: number }) => void;
  setPlayerDirection: (dir: 'up' | 'down' | 'left' | 'right') => void;
  movePlayer: (dx: number, dy: number) => void;
  setFriends: (friends: FriendPosition[]) => void;
  setViewportOffset: (offset: { x: number; y: number }) => void;
}

export const useVillageStore = create<VillageState>((set, get) => ({
  playerPosition: { x: 30, y: 20 },
  playerDirection: 'down',
  friends: [],
  viewportOffset: { x: 0, y: 0 },

  setPlayerPosition: (playerPosition) => set({ playerPosition }),
  setPlayerDirection: (playerDirection) => set({ playerDirection }),
  movePlayer: (dx, dy) => {
    const { playerPosition } = get();
    set({ playerPosition: { x: playerPosition.x + dx, y: playerPosition.y + dy } });
  },
  setFriends: (friends) => set({ friends }),
  setViewportOffset: (viewportOffset) => set({ viewportOffset }),
}));
