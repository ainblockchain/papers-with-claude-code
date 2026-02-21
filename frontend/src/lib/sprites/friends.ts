import type { CharacterSprite, Palette } from './types'
import { PLAYER_SPRITE, PLAYER_PALETTE } from './player'

/** Override specific palette indices to create a variant character */
function swapPalette(
  base: Palette,
  overrides: Record<number, string>,
): Palette {
  return base.map((color, i) => overrides[i] ?? color)
}

interface FriendVariant {
  name: string
  overrides: Record<number, string>
}

const FRIEND_VARIANTS: FriendVariant[] = [
  {
    name: 'Red Scholar',
    overrides: {
      2: '#7C2D12', 3: '#B45309',       // brown hair
      6: '#EF4444', 7: '#DC2626', 8: '#B91C1C',  // red shirt
    },
  },
  {
    name: 'Purple Mage',
    overrides: {
      2: '#1E1B4B', 3: '#312E81',       // dark indigo hair
      6: '#8B5CF6', 7: '#7C3AED', 8: '#6D28D9',  // purple shirt
    },
  },
  {
    name: 'Pink Artist',
    overrides: {
      2: '#92400E', 3: '#D97706',       // golden hair
      6: '#EC4899', 7: '#DB2777', 8: '#BE185D',  // pink shirt
    },
  },
  {
    name: 'Teal Engineer',
    overrides: {
      2: '#064E3B', 3: '#047857',       // dark green hair
      6: '#14B8A6', 7: '#0D9488', 8: '#0F766E',  // teal shirt
    },
  },
  {
    name: 'Amber Guide',
    overrides: {
      2: '#78350F', 3: '#92400E',       // dark brown hair
      6: '#F59E0B', 7: '#D97706', 8: '#B45309',  // amber shirt
    },
  },
]

/** Pre-built friend sprites (same frames, different palettes) */
export const FRIEND_SPRITES: CharacterSprite[] = FRIEND_VARIANTS.map(
  (variant) => ({
    name: variant.name,
    palette: swapPalette(PLAYER_PALETTE, variant.overrides),
    frames: PLAYER_SPRITE.frames, // share the same frame data
  }),
)
