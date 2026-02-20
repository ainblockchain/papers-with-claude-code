'use client';

import { useEffect, useRef } from 'react';
import { useVillageStore } from '@/stores/useVillageStore';
import { FRIEND_COLORS, PLAYER_COLOR, TILE_SIZE } from '@/constants/game';

const MINIMAP_HEIGHT = 128;

export function VillageMinimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { playerPosition, friends, courseLocations, mapDimensions } = useVillageStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = container.clientWidth;
    const ch = MINIMAP_HEIGHT;
    canvas.width = cw;
    canvas.height = ch;

    const mapW = mapDimensions.width;
    const mapH = mapDimensions.height;
    if (mapW === 0 || mapH === 0) return;

    // Scale to fit while preserving aspect ratio
    const scaleX = cw / mapW;
    const scaleY = ch / mapH;
    const scale = Math.min(scaleX, scaleY);

    // Center the map in the canvas
    const drawW = mapW * scale;
    const drawH = mapH * scale;
    const ox = (cw - drawW) / 2;
    const oy = (ch - drawH) / 2;

    const toX = (wx: number) => ox + wx * scale;
    const toY = (wy: number) => oy + wy * scale;

    // 1. Background
    ctx.fillStyle = '#1a2e1a';
    ctx.fillRect(0, 0, cw, ch);

    // Map area
    ctx.fillStyle = '#2D5A3D';
    ctx.fillRect(ox, oy, drawW, drawH);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    const gridStep = 18; // plot-sized grid
    for (let gx = 0; gx <= mapW; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(toX(gx), oy);
      ctx.lineTo(toX(gx), oy + drawH);
      ctx.stroke();
    }
    for (let gy = 0; gy <= mapH; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(ox, toY(gy));
      ctx.lineTo(ox + drawW, toY(gy));
      ctx.stroke();
    }

    // 2. Course buildings
    courseLocations.forEach((cl) => {
      const bx = toX(cl.x);
      const by = toY(cl.y);
      const bw = cl.width * scale;
      const bh = cl.height * scale;

      // Building shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx + 1, by + 1, bw, bh);

      // Building body
      ctx.fillStyle = cl.color;
      ctx.fillRect(bx, by, bw, bh);

      // Building border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, bw, bh);

      // Label (only if building is wide enough)
      if (bw > 16) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = `bold ${Math.max(5, Math.min(7, bw / 4))}px sans-serif`;
        ctx.textAlign = 'center';
        const abbrev = cl.label.length > 8 ? cl.label.slice(0, 7) + '…' : cl.label;
        ctx.fillText(abbrev, bx + bw / 2, by + bh + Math.max(5, scale * 1.5));
      }
    });

    // 3. Viewport indicator
    const viewTilesX = Math.ceil((containerRef.current?.parentElement?.parentElement?.clientWidth || 800) / TILE_SIZE) + 1;
    const viewTilesY = Math.ceil(600 / TILE_SIZE) + 1;
    const vpX = playerPosition.x - Math.floor(viewTilesX / 2);
    const vpY = playerPosition.y - Math.floor(viewTilesY / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(toX(vpX), toY(vpY), viewTilesX * scale, viewTilesY * scale);

    // 4. Friends (village scene only)
    friends.forEach((friend, i) => {
      if (friend.currentScene !== 'village') return;
      const fx = toX(friend.position.x) + scale / 2;
      const fy = toY(friend.position.y) + scale / 2;
      const r = Math.max(2.5, scale * 0.6);

      ctx.fillStyle = FRIEND_COLORS[i % FRIEND_COLORS.length];
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fill();

      // White border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Name label
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(5, Math.min(7, scale * 1.2))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(friend.username, fx, fy - r - 2);
    });

    // 5. Player
    const px = toX(playerPosition.x) + scale / 2;
    const py = toY(playerPosition.y) + scale / 2;
    const pr = Math.max(3, scale * 0.7);

    // Glow
    ctx.fillStyle = 'rgba(59,130,246,0.3)';
    ctx.beginPath();
    ctx.arc(px, py, pr + 3, 0, Math.PI * 2);
    ctx.fill();

    // Dot
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }, [playerPosition, friends, courseLocations, mapDimensions]);

  return (
    <div ref={containerRef} className="bg-[#1a2e1a] rounded-lg overflow-hidden" style={{ height: MINIMAP_HEIGHT }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: MINIMAP_HEIGHT, imageRendering: 'pixelated' }}
      />
    </div>
  );
}
