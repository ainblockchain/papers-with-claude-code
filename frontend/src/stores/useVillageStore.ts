import { create } from 'zustand';
import { FriendPosition } from '@/types/social';
import type { CourseLocation } from '@/lib/ain/location-types';
import { PLOT_WIDTH, PLOT_HEIGHT } from '@/lib/tmj/village-generator';

interface VillageState {
  playerPosition: { x: number; y: number };
  playerDirection: 'up' | 'down' | 'left' | 'right';
  friends: FriendPosition[];
  viewportOffset: { x: number; y: number };
  courseLocations: CourseLocation[];
  mapDimensions: { width: number; height: number };
  positionRestored: boolean;

  setPlayerPosition: (pos: { x: number; y: number }) => void;
  setPlayerDirection: (dir: 'up' | 'down' | 'left' | 'right') => void;
  movePlayer: (dx: number, dy: number) => void;
  setFriends: (friends: FriendPosition[]) => void;
  setViewportOffset: (offset: { x: number; y: number }) => void;
  setCourseLocations: (locations: CourseLocation[]) => void;
  setMapDimensions: (dims: { width: number; height: number }) => void;
  setPositionRestored: (restored: boolean) => void;
}

export const useVillageStore = create<VillageState>((set, get) => ({
  playerPosition: { x: Math.floor(PLOT_WIDTH / 2), y: Math.floor(PLOT_HEIGHT / 2) + 2 },
  playerDirection: 'down',
  friends: [],
  viewportOffset: { x: 0, y: 0 },
  courseLocations: [],
  mapDimensions: { width: PLOT_WIDTH, height: PLOT_HEIGHT },
  positionRestored: false,

  setPlayerPosition: (playerPosition) => set({ playerPosition }),
  setPlayerDirection: (playerDirection) => set({ playerDirection }),
  movePlayer: (dx, dy) => {
    const { playerPosition } = get();
    set({ playerPosition: { x: playerPosition.x + dx, y: playerPosition.y + dy } });
  },
  setFriends: (friends) => set({ friends }),
  setViewportOffset: (viewportOffset) => set({ viewportOffset }),
  setCourseLocations: (courseLocations) => set({ courseLocations }),
  setMapDimensions: (mapDimensions) => set({ mapDimensions }),
  setPositionRestored: (positionRestored) => set({ positionRestored }),
}));
