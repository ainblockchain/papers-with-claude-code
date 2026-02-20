import type { SpriteFrame, Palette } from './types'

const spriteCache = new Map<string, HTMLCanvasElement>()

/**
 * Pre-render a 16×16 sprite frame to a target-sized offscreen canvas.
 * Cached by key so subsequent calls return instantly.
 */
export function getPreRenderedSprite(
  cacheKey: string,
  frame: SpriteFrame,
  palette: Palette,
  targetWidth: number,
  targetHeight: number,
): HTMLCanvasElement {
  const cached = spriteCache.get(cacheKey)
  if (cached) return cached

  const offscreen = document.createElement('canvas')
  offscreen.width = targetWidth
  offscreen.height = targetHeight
  const ctx = offscreen.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const sourceH = frame.length
  const sourceW = frame[0].length
  const scaleX = targetWidth / sourceW
  const scaleY = targetHeight / sourceH

  for (let row = 0; row < sourceH; row++) {
    for (let col = 0; col < sourceW; col++) {
      const idx = frame[row][col]
      if (idx === 0) continue
      ctx.fillStyle = palette[idx]
      ctx.fillRect(
        Math.floor(col * scaleX),
        Math.floor(row * scaleY),
        Math.ceil(scaleX),
        Math.ceil(scaleY),
      )
    }
  }

  spriteCache.set(cacheKey, offscreen)
  return offscreen
}

/** Clear all cached sprites (useful for hot-reload) */
export function clearSpriteCache() {
  spriteCache.clear()
}
