/**
 * Space / planet terrain rendering for 0G courses.
 * All drawing is deterministic per (worldX, worldY) via tileHash.
 */

import { tileHash } from './terrain';

// ── Theme detection ──

export function is0GCourse(paperId: string | undefined | null): boolean {
  if (!paperId) return false;
  const lower = paperId.toLowerCase();
  return lower.startsWith('0g--') || lower.startsWith('0g-');
}

// ── Tile 1: Planet Surface (basic) ──

export function drawPlanetFloorA(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  worldX: number,
  worldY: number,
  tileSize: number,
) {
  const hash = tileHash(worldX, worldY);

  // Smooth base — no checkerboard
  const r = 61 + Math.floor(hash * 12) - 6;
  const g = 31 + Math.floor(hash * 8) - 4;
  const b = 78 + Math.floor(hash * 14) - 7;
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(screenX, screenY, tileSize, tileSize);

  // Tiny rock/pebble details
  if (hash > 0.3 && hash < 0.6) {
    ctx.fillStyle = '#5A3570';
    const px = screenX + ((hash * 1700) % (tileSize - 4)) + 2;
    const py = screenY + ((hash * 2300) % (tileSize - 4)) + 2;
    ctx.fillRect(px, py, 2, 1);
  }
  if (hash > 0.7) {
    ctx.fillStyle = '#4E2D64';
    const px2 = screenX + ((hash * 900) % (tileSize - 3)) + 1;
    const py2 = screenY + ((hash * 1300) % (tileSize - 3)) + 1;
    ctx.fillRect(px2, py2, 1, 1);
  }
}

// ── Tile 2: Planet Surface (variation with craters) ──

export function drawPlanetFloorB(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  worldX: number,
  worldY: number,
  tileSize: number,
) {
  // Same base as Floor A
  drawPlanetFloorA(ctx, screenX, screenY, worldX, worldY, tileSize);

  const hash = tileHash(worldX, worldY);
  const cx = screenX + tileSize * 0.3 + hash * tileSize * 0.4;
  const cy = screenY + tileSize * 0.3 + hash * tileSize * 0.35;

  // Small crater
  const craterR = 3 + Math.floor(hash * 3);
  ctx.fillStyle = '#2A1238';
  ctx.beginPath();
  ctx.arc(cx, cy, craterR, 0, Math.PI * 2);
  ctx.fill();

  // Crater rim highlight (upper-left)
  ctx.strokeStyle = '#6B3D80';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, craterR, Math.PI * 1.1, Math.PI * 1.7);
  ctx.stroke();

  // Extra pebbles
  if (hash > 0.5) {
    ctx.fillStyle = '#5E3575';
    const px = screenX + ((hash * 3100) % (tileSize - 6)) + 3;
    const py = screenY + ((hash * 2700) % (tileSize - 6)) + 3;
    ctx.fillRect(px, py, 2, 2);
    ctx.fillRect(px + 8, py + 5, 1, 2);
  }
}

// ── Tile 3: Border Wall — Purple Mountain / Cliff ──

export function drawSpaceMountainWall(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tileSize: number,
) {
  // Dark base
  ctx.fillStyle = '#1A0D2E';
  ctx.fillRect(screenX, screenY, tileSize, tileSize);

  // Jagged mountain peaks (3–4 triangles extending above)
  ctx.fillStyle = '#2D1545';
  const peaks = [
    { x: 0.15, h: 0.3 },
    { x: 0.45, h: 0.45 },
    { x: 0.75, h: 0.25 },
    { x: 0.92, h: 0.35 },
  ];
  for (const p of peaks) {
    const px = screenX + p.x * tileSize;
    const peakH = p.h * tileSize;
    ctx.beginPath();
    ctx.moveTo(px - tileSize * 0.1, screenY + tileSize);
    ctx.lineTo(px, screenY + tileSize - peakH);
    ctx.lineTo(px + tileSize * 0.1, screenY + tileSize);
    ctx.closePath();
    ctx.fill();
  }

  // Horizontal crack lines
  ctx.strokeStyle = '#251040';
  ctx.lineWidth = 0.5;
  const crackY1 = screenY + tileSize * 0.33;
  const crackY2 = screenY + tileSize * 0.66;
  ctx.beginPath();
  ctx.moveTo(screenX, crackY1);
  ctx.lineTo(screenX + tileSize, crackY1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(screenX, crackY2);
  ctx.lineTo(screenX + tileSize, crackY2);
  ctx.stroke();

  // Left-face highlight for depth
  ctx.fillStyle = '#3A1F55';
  ctx.fillRect(screenX, screenY, 2, tileSize);

  // Bottom shadow
  ctx.fillStyle = '#0D0618';
  ctx.fillRect(screenX, screenY + tileSize - 3, tileSize, 3);
}

// ── Tiles 4 & 5: Door — Portal (locked / open) ──

export function drawSpacePortal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tileSize: number,
  isUnlocked: boolean,
) {
  // Metal frame
  ctx.fillStyle = '#4A4A5A';
  ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
  ctx.fillStyle = '#2A2A3A';
  ctx.fillRect(x + 5, y + 5, tileSize - 10, tileSize - 10);

  // Corner bolts
  ctx.fillStyle = '#8888AA';
  ctx.fillRect(x + 3, y + 3, 2, 2);
  ctx.fillRect(x + tileSize - 5, y + 3, 2, 2);
  ctx.fillRect(x + 3, y + tileSize - 5, 2, 2);
  ctx.fillRect(x + tileSize - 5, y + tileSize - 5, 2, 2);

  const cx = x + tileSize / 2;
  const cy = y + tileSize / 2;

  if (isUnlocked) {
    // Active portal — cyan swirl
    ctx.fillStyle = '#0D0618';
    ctx.fillRect(x + 6, y + 6, tileSize - 12, tileSize - 12);

    // Concentric glow rings
    ctx.fillStyle = 'rgba(0, 200, 200, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(200, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Swirl arcs
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0.3, 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 2.5, 3.8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 4.5, 5.6);
    ctx.stroke();
  } else {
    // Inactive portal — dim red glow
    ctx.fillStyle = '#0D0618';
    ctx.fillRect(x + 6, y + 6, tileSize - 12, tileSize - 12);

    // Dim red core
    ctx.fillStyle = 'rgba(255, 50, 50, 0.2)';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // X mark
    ctx.strokeStyle = '#FF3333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy - 4);
    ctx.lineTo(cx + 4, cy + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 4);
    ctx.lineTo(cx - 4, cy + 4);
    ctx.stroke();
  }
}

// ── Tile 6: Info/Quiz Panel — Crashed Spaceship / Outpost ──

export function drawSpaceOutpost(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isActive: boolean,
  title: string,
) {
  // Metal hull body
  ctx.fillStyle = '#2A2A3E';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);

  // Panel lines
  ctx.strokeStyle = '#3A3A4E';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 3, y + h * 0.33);
  ctx.lineTo(x + w + 3, y + h * 0.33);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 3, y + h * 0.66);
  ctx.lineTo(x + w + 3, y + h * 0.66);
  ctx.stroke();

  // Antenna
  ctx.strokeStyle = '#6688AA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 3, y - 3);
  ctx.lineTo(x + 3, y - 11);
  ctx.stroke();

  // Antenna tip (blink dot)
  ctx.fillStyle = isActive ? '#00FFFF' : '#555555';
  ctx.beginPath();
  ctx.arc(x + 3, y - 12, 2, 0, Math.PI * 2);
  ctx.fill();

  // Hologram panel area
  const panelX = x + 4;
  const panelY = y + 4;
  const panelW = w - 8;
  const panelH = h - 8;

  if (isActive) {
    ctx.fillStyle = 'rgba(0, 200, 200, 0.12)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#00CCCC';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    // Scanlines
    ctx.fillStyle = 'rgba(0, 255, 255, 0.04)';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(panelX, panelY + panelH * 0.2 * (i + 1), panelW, 1);
    }
  } else {
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
  }

  // Title text
  ctx.fillStyle = isActive ? '#00FFFF' : '#888899';
  ctx.font = `bold ${Math.max(h * 0.18, 9)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + w / 2, y + h / 2, w - 12);
}

// ── Tile 10: Decoration — Glowing Crystal / Alien Plant ──

export function drawSpaceCrystal(
  ctx: CanvasRenderingContext2D,
  screenX: number,
  screenY: number,
  tileSize: number,
) {
  const cx = screenX + tileSize / 2;
  const groundY = screenY + tileSize * 0.88;

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.beginPath();
  ctx.ellipse(cx, groundY, tileSize * 0.3, tileSize * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glow aura
  ctx.fillStyle = 'rgba(0, 200, 200, 0.08)';
  ctx.beginPath();
  ctx.arc(cx, groundY - tileSize * 0.3, tileSize * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Main crystal — tall diamond
  const mainH = tileSize * 0.55;
  const mainW = tileSize * 0.16;
  const mainTopY = groundY - mainH;
  ctx.fillStyle = '#9B59B6';
  ctx.beginPath();
  ctx.moveTo(cx, mainTopY);
  ctx.lineTo(cx + mainW, groundY - mainH * 0.4);
  ctx.lineTo(cx, groundY);
  ctx.lineTo(cx - mainW, groundY - mainH * 0.4);
  ctx.closePath();
  ctx.fill();

  // Crystal highlight
  ctx.fillStyle = 'rgba(200, 150, 255, 0.4)';
  ctx.beginPath();
  ctx.moveTo(cx, mainTopY);
  ctx.lineTo(cx - mainW * 0.3, groundY - mainH * 0.5);
  ctx.lineTo(cx, groundY - mainH * 0.3);
  ctx.closePath();
  ctx.fill();

  // Secondary crystal (left, teal, shorter)
  const secH = tileSize * 0.35;
  const secW = tileSize * 0.1;
  const secX = cx - tileSize * 0.18;
  const secTopY = groundY - secH;
  ctx.fillStyle = '#00BCD4';
  ctx.beginPath();
  ctx.moveTo(secX, secTopY);
  ctx.lineTo(secX + secW, groundY - secH * 0.35);
  ctx.lineTo(secX, groundY);
  ctx.lineTo(secX - secW, groundY - secH * 0.35);
  ctx.closePath();
  ctx.fill();

  // Tertiary crystal (right, deep purple, small)
  const terH = tileSize * 0.28;
  const terW = tileSize * 0.08;
  const terX = cx + tileSize * 0.15;
  const terTopY = groundY - terH;
  ctx.fillStyle = '#7B1FA2';
  ctx.beginPath();
  ctx.moveTo(terX, terTopY);
  ctx.lineTo(terX + terW, groundY - terH * 0.35);
  ctx.lineTo(terX, groundY);
  ctx.lineTo(terX - terW, groundY - terH * 0.35);
  ctx.closePath();
  ctx.fill();

  // Sparkle dots at crystal tips
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx - 0.5, mainTopY, 1, 1);
  ctx.fillRect(secX - 0.5, secTopY, 1, 1);
}
