/** Color palette. Index 0 is always transparent. */
export type Palette = readonly string[]

/** 16×16 grid of palette indices. 0 = transparent. */
export type SpriteFrame = readonly (readonly number[])[]

/** Directional animation frames */
export interface DirectionalFrames {
  up: SpriteFrame[]
  down: SpriteFrame[]
  left: SpriteFrame[]
  right: SpriteFrame[]
}

/** Complete character sprite definition */
export interface CharacterSprite {
  name: string
  palette: Palette
  frames: DirectionalFrames
}

export type Direction = 'up' | 'down' | 'left' | 'right'
