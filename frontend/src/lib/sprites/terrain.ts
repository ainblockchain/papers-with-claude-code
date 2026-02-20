/**
 * Terrain rendering — grass, paths, trees, flowers
 * All drawing is deterministic per (worldX, worldY) so decorations
 * don't flicker on re-render.
 */

/** Deterministic hash for a tile coordinate → 0..1 */
export function tileHash(x: number, y: number): number {
  let h = ((x * 374761393 + y * 668265263) | 0) & 0x7fffffff
  h = (((h ^ (h >> 13)) * 1274126177) | 0) & 0x7fffffff
  return (h & 0xffff) / 0xffff
}

const FLOWER_COLORS = ['#FFD700', '#FF6B9D', '#FF4444', '#FFFFFF']

export function drawGrassTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  worldX: number,
  worldY: number,
  tileSize: number,
) {
  // Base checkerboard
  const isLight = (worldX + worldY) % 2 === 0
  ctx.fillStyle = isLight ? '#5B8C5A' : '#4A7C59'
  ctx.fillRect(screenX, screenY, tileSize, tileSize)

  const hash = tileHash(worldX, worldY)

  // Grass tufts — ~40% of tiles
  if (hash < 0.4) {
    ctx.fillStyle = '#3D6B3A'
    const count = 2 + (Math.floor(hash * 1000) % 2)
    for (let i = 0; i < count; i++) {
      const gx = screenX + ((hash * 1000 + i * 137) % (tileSize - 4)) + 2
      const gy = screenY + ((hash * 2000 + i * 251) % (tileSize - 6)) + 2
      // Small "V" grass tuft
      ctx.fillRect(gx, gy, 1, 3)
      ctx.fillRect(gx + 2, gy, 1, 3)
      ctx.fillRect(gx + 1, gy - 1, 1, 1)
    }
  }

  // Flowers — ~8% of tiles
  if (hash > 0.88 && hash < 0.96) {
    const colorIdx = Math.floor(hash * 100) % FLOWER_COLORS.length
    ctx.fillStyle = FLOWER_COLORS[colorIdx]
    const fx = screenX + ((hash * 1500) % (tileSize - 8)) + 4
    const fy = screenY + ((hash * 2500) % (tileSize - 10)) + 4
    // Flower petals
    ctx.fillRect(fx, fy, 3, 3)
    ctx.fillRect(fx - 1, fy + 1, 1, 1)
    ctx.fillRect(fx + 3, fy + 1, 1, 1)
    ctx.fillRect(fx + 1, fy - 1, 1, 1)
    ctx.fillRect(fx + 1, fy + 3, 1, 1)
    // Green stem
    ctx.fillStyle = '#2D5A1E'
    ctx.fillRect(fx + 1, fy + 4, 1, 3)
  }
}

export function drawPathTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  _worldX: number,
  _worldY: number,
  tileSize: number,
) {
  // Base
  ctx.fillStyle = '#D2B48C'
  ctx.fillRect(screenX, screenY, tileSize, tileSize)

  // Cobblestone pattern
  ctx.fillStyle = '#C4A67A'
  const stones = [
    { x: 2, y: 3, w: 12, h: 8 },
    { x: 16, y: 2, w: 14, h: 9 },
    { x: 5, y: 14, w: 10, h: 7 },
    { x: 18, y: 15, w: 13, h: 8 },
    { x: 3, y: 25, w: 15, h: 7 },
    { x: 20, y: 26, w: 12, h: 8 },
  ]
  for (const s of stones) {
    ctx.fillRect(screenX + s.x, screenY + s.y, s.w, s.h)
  }

  // Stone outlines
  ctx.strokeStyle = '#B8986D'
  ctx.lineWidth = 0.5
  for (const s of stones) {
    ctx.strokeRect(screenX + s.x + 0.5, screenY + s.y + 0.5, s.w - 1, s.h - 1)
  }
}

export function drawTree(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tileSize: number,
) {
  const cx = screenX + tileSize / 2
  const groundY = screenY + tileSize * 0.9

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
  ctx.beginPath()
  ctx.ellipse(cx, groundY, tileSize * 0.4, tileSize * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()

  // Trunk
  const trunkW = tileSize * 0.18
  const trunkH = tileSize * 0.45
  ctx.fillStyle = '#6B4423'
  ctx.fillRect(cx - trunkW / 2, groundY - trunkH, trunkW, trunkH)
  // Trunk left shadow
  ctx.fillStyle = '#4A2F15'
  ctx.fillRect(cx - trunkW / 2, groundY - trunkH, trunkW * 0.35, trunkH)

  // Canopy — 3 circles
  const canopyY = groundY - trunkH
  ctx.fillStyle = '#2D7A2A'
  ctx.beginPath()
  ctx.arc(cx - tileSize * 0.15, canopyY - tileSize * 0.1, tileSize * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx + tileSize * 0.15, canopyY - tileSize * 0.1, tileSize * 0.28, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3A8E37'
  ctx.beginPath()
  ctx.arc(cx, canopyY - tileSize * 0.25, tileSize * 0.32, 0, Math.PI * 2)
  ctx.fill()

  // Canopy highlight dots
  ctx.fillStyle = '#4CAF50'
  ctx.fillRect(cx - 4, canopyY - tileSize * 0.35, 2, 2)
  ctx.fillRect(cx + 3, canopyY - tileSize * 0.3, 2, 2)
  ctx.fillRect(cx - 6, canopyY - tileSize * 0.15, 2, 2)
}

// ── Course room tiles ──

export function drawWoodFloorTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  worldX: number,
  worldY: number,
  tileSize: number,
) {
  ctx.fillStyle = (worldX + worldY) % 2 === 0 ? '#D4A574' : '#C99B65'
  ctx.fillRect(screenX, screenY, tileSize, tileSize)

  // Plank lines
  ctx.strokeStyle = '#B8865A'
  ctx.lineWidth = 0.5
  for (let i = 1; i < 5; i++) {
    const ly = screenY + i * (tileSize / 5)
    ctx.beginPath()
    ctx.moveTo(screenX, ly)
    ctx.lineTo(screenX + tileSize, ly)
    ctx.stroke()
  }

  // Wood grain dot
  const hash = tileHash(worldX, worldY)
  if (hash > 0.6) {
    ctx.fillStyle = '#A07850'
    ctx.beginPath()
    ctx.arc(screenX + hash * 30, screenY + hash * 25, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

export function drawWallTile(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tileSize: number,
) {
  ctx.fillStyle = '#5A5F6B'
  ctx.fillRect(screenX, screenY, tileSize, tileSize)

  // Brick pattern
  ctx.strokeStyle = '#4A4F5B'
  ctx.lineWidth = 1
  const brickH = tileSize / 4
  for (let row = 0; row < 4; row++) {
    const ry = screenY + row * brickH
    ctx.beginPath()
    ctx.moveTo(screenX, ry)
    ctx.lineTo(screenX + tileSize, ry)
    ctx.stroke()

    const offset = row % 2 === 0 ? 0 : tileSize / 2
    ctx.beginPath()
    ctx.moveTo(screenX + offset, ry)
    ctx.lineTo(screenX + offset, ry + brickH)
    ctx.stroke()
    if (offset + tileSize / 2 <= tileSize) {
      ctx.beginPath()
      ctx.moveTo(screenX + offset + tileSize / 2, ry)
      ctx.lineTo(screenX + offset + tileSize / 2, ry + brickH)
      ctx.stroke()
    }
  }
}

export function drawDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  isUnlocked: boolean,
) {
  // Frame
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4)

  // Panel
  ctx.fillStyle = isUnlocked ? '#2D8B4E' : '#5A5F6B'
  ctx.fillRect(x + 5, y + 5, tileSize - 10, tileSize - 10)

  // Handle
  ctx.fillStyle = '#D4A853'
  ctx.fillRect(x + tileSize - 14, y + tileSize / 2 - 2, 4, 4)

  // Lock icon
  if (!isUnlocked) {
    ctx.fillStyle = '#1A1A2E'
    ctx.beginPath()
    ctx.arc(x + tileSize / 2, y + tileSize / 2 - 3, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(x + tileSize / 2 - 2, y + tileSize / 2, 4, 6)
  }
}

export function drawBlackboard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isActive: boolean,
  title: string,
) {
  // Wooden frame
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6)

  // Board surface
  ctx.fillStyle = isActive ? '#1B3A1B' : '#1A2332'
  ctx.fillRect(x, y, w, h)

  // Chalk tray
  ctx.fillStyle = '#6B5514'
  ctx.fillRect(x, y + h, w, 4)

  // Chalk marks
  if (isActive) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.fillRect(x + 5, y + h - 2, 8, 1)
    ctx.fillRect(x + w - 15, y + h - 3, 6, 1)
  }

  // Title text
  ctx.fillStyle = '#E0E0E0'
  ctx.font = `bold ${Math.max(h * 0.18, 9)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, x + w / 2, y + h / 2, w - 8)
}
