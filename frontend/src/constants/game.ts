export const TILE_SIZE = 40;
export const VIEWPORT_TILES_X = 16;
export const VIEWPORT_TILES_Y = 12;

// Plot grid constants (re-exported from village-generator for convenience)
export {
  PLOT_WIDTH,
  PLOT_HEIGHT,
  PLOT_INNER_WIDTH,
  PLOT_INNER_HEIGHT,
  PLOT_BORDER,
  BUILDING_WIDTH,
  BUILDING_HEIGHT,
} from '@/lib/tmj/village-generator';
export const PLAYER_SPEED = 1;
export const MIN_MOVE_INTERVAL = 150;

export const COURSE_ROOM_WIDTH = 20;
export const COURSE_ROOM_HEIGHT = 15;

export const STAGE_COLORS = {
  locked: '#6B7280',
  current: '#FF9D00',
  completed: '#10B981',
} as const;

export const PLAYER_COLOR = '#3B82F6';
export const FRIEND_COLORS = ['#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

// Animation
export const WALK_ANIMATION_DURATION = 300; // ms before returning to idle
export const SPRITE_SOURCE_SIZE = 16;        // px (16×16 pixel art)
