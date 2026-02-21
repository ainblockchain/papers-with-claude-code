/**
 * Building renderer — detailed village buildings with windows, doors, etc.
 */

/** Darken a hex color by a percentage (0-100) */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((num >> 16) & 0xff) - Math.floor(((num >> 16) & 0xff) * percent / 100))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.floor(((num >> 8) & 0xff) * percent / 100))
  const b = Math.max(0, (num & 0xff) - Math.floor((num & 0xff) * percent / 100))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function drawWindow(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  size: number,
) {
  // Frame
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(wx - 2, wy - 2, size + 4, size + 4)
  // Glass
  ctx.fillStyle = '#87CEEB'
  ctx.fillRect(wx, wy, size, size)
  // Cross divider
  ctx.strokeStyle = '#8B6914'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(wx + size / 2, wy)
  ctx.lineTo(wx + size / 2, wy + size)
  ctx.moveTo(wx, wy + size / 2)
  ctx.lineTo(wx + size, wy + size / 2)
  ctx.stroke()
  // Highlight (top-left pane)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.fillRect(wx + 1, wy + 1, size / 2 - 2, size / 2 - 2)
}

export function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  widthTiles: number,
  heightTiles: number,
  color: string,
  tileSize: number,
  label: string,
) {
  const pw = widthTiles * tileSize
  const ph = heightTiles * tileSize

  // 1. Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.fillRect(x + 4, y + 4, pw, ph)

  // 2. Building body — upper wall
  ctx.fillStyle = color
  ctx.fillRect(x, y, pw, ph)
  // Lower wall shade
  ctx.fillStyle = darkenColor(color, 15)
  ctx.fillRect(x, y + ph * 0.6, pw, ph * 0.4)
  // Outline
  ctx.strokeStyle = '#1A1A2E'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, pw - 2, ph - 2)

  // 3. Roof — peaked triangle with overhang
  const overhang = 8
  const roofPeak = 28
  ctx.fillStyle = '#2D1F3D'
  ctx.beginPath()
  ctx.moveTo(x - overhang, y)
  ctx.lineTo(x + pw / 2, y - roofPeak)
  ctx.lineTo(x + pw + overhang, y)
  ctx.closePath()
  ctx.fill()
  // Roof outline
  ctx.strokeStyle = '#1A1A2E'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - overhang, y)
  ctx.lineTo(x + pw / 2, y - roofPeak)
  ctx.lineTo(x + pw + overhang, y)
  ctx.stroke()
  // Shingle lines
  ctx.strokeStyle = '#1A1A2E'
  ctx.lineWidth = 0.5
  for (let i = 1; i <= 3; i++) {
    const ly = y - roofPeak + (roofPeak * i) / 4
    const halfW = (pw / 2 + overhang) * (i / 4)
    ctx.beginPath()
    ctx.moveTo(x + pw / 2 - halfW, ly)
    ctx.lineTo(x + pw / 2 + halfW, ly)
    ctx.stroke()
  }

  // 4. Windows — 2 symmetrical windows
  const winSize = tileSize * 0.4
  const winY = y + ph * 0.2
  drawWindow(ctx, x + pw * 0.12, winY, winSize)
  drawWindow(ctx, x + pw * 0.88 - winSize, winY, winSize)

  // 5. Door — centered, arched top
  const doorW = tileSize * 0.55
  const doorH = tileSize * 0.85
  const doorX = x + pw / 2 - doorW / 2
  const doorY = y + ph - doorH
  // Door body
  ctx.fillStyle = '#2D1810'
  ctx.fillRect(doorX, doorY, doorW, doorH)
  // Arch
  ctx.beginPath()
  ctx.arc(doorX + doorW / 2, doorY, doorW / 2, Math.PI, 0)
  ctx.fill()
  // Door frame
  ctx.strokeStyle = '#1A1A2E'
  ctx.lineWidth = 1
  ctx.strokeRect(doorX, doorY, doorW, doorH)
  // Knob
  ctx.fillStyle = '#D4A853'
  ctx.beginPath()
  ctx.arc(doorX + doorW * 0.75, doorY + doorH * 0.5, 2.5, 0, Math.PI * 2)
  ctx.fill()

  // 6. Chimney
  const chimX = x + pw * 0.72
  const chimY = y - roofPeak * 0.6
  ctx.fillStyle = '#6B4423'
  ctx.fillRect(chimX, chimY, 8, 16)
  ctx.fillStyle = '#8B5E3C'
  ctx.fillRect(chimX - 1, chimY - 2, 10, 3)

  // 7. Sign — hanging board below building
  const maxSignW = Math.min(pw * 0.85, 130)
  ctx.font = 'bold 9px sans-serif'
  const textW = ctx.measureText(label).width
  const signW = Math.min(Math.max(textW + 16, 50), maxSignW)
  const signH = 18
  const signX = x + pw / 2 - signW / 2
  const signY = y + ph + 6

  // Board
  ctx.fillStyle = '#D4A853'
  ctx.fillRect(signX, signY, signW, signH)
  ctx.strokeStyle = '#8B6914'
  ctx.lineWidth = 1
  ctx.strokeRect(signX, signY, signW, signH)
  // Hanging posts
  ctx.fillStyle = '#8B6914'
  ctx.fillRect(signX + 4, signY - 5, 3, 5)
  ctx.fillRect(signX + signW - 7, signY - 5, 3, 5)
  // Text
  ctx.fillStyle = '#1A1A2E'
  ctx.font = 'bold 9px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + pw / 2, signY + signH / 2, signW - 12)
}
