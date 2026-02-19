'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useVillageStore } from '@/stores/useVillageStore';
import { TILE_SIZE, VILLAGE_MAP_WIDTH, VILLAGE_MAP_HEIGHT, PLAYER_COLOR, FRIEND_COLORS } from '@/constants/game';
import { MOCK_PAPERS } from '@/constants/mock-papers';
import { useLocationSync } from '@/hooks/useLocationSync';
import { useMapLoader } from '@/hooks/useMapLoader';
import { renderTileLayer, type Viewport } from '@/lib/tmj/renderer';

interface CourseEntrance {
  paperId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const COURSE_COLORS = ['#8B4513', '#4A5568', '#2D3748', '#553C9A', '#2B6CB0', '#276749'];

/** Fallback course entrances when no blockchain data is available */
function getDefaultEntrances(): CourseEntrance[] {
  return MOCK_PAPERS.slice(0, 6).map((paper, i) => ({
    paperId: paper.id,
    label: paper.title.split(':')[0].trim(),
    x: 8 + (i % 3) * 16,
    y: 6 + Math.floor(i / 3) * 14,
    width: 4,
    height: 3,
    color: COURSE_COLORS[i],
  }));
}

export function VillageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const { playerPosition, playerDirection, setPlayerPosition, setPlayerDirection, friends, courseLocations } =
    useVillageStore();

  // Sync positions with AIN blockchain
  useLocationSync();

  // Load TMJ map data (falls back to procedural rendering if unavailable)
  const { mapData } = useMapLoader('village');

  // Build course entrances from blockchain-backed store or fallback to defaults
  const courseEntrances: CourseEntrance[] = useMemo(() => {
    if (courseLocations.length > 0) {
      return courseLocations.map((cl) => ({
        paperId: cl.paperId,
        label: cl.label,
        x: cl.x,
        y: cl.y,
        width: cl.width,
        height: cl.height,
        color: cl.color,
      }));
    }
    return getDefaultEntrances();
  }, [courseLocations]);

  const isWalkable = useCallback(
    (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= VILLAGE_MAP_WIDTH || y >= VILLAGE_MAP_HEIGHT) return false;
      for (const d of courseEntrances) {
        if (x >= d.x && x < d.x + d.width && y >= d.y && y < d.y + d.height) {
          const entranceX = d.x + Math.floor(d.width / 2);
          const entranceY = d.y + d.height;
          if (x === entranceX && y === entranceY) return true;
          return false;
        }
      }
      return true;
    },
    [courseEntrances]
  );

  const checkCourseEntry = useCallback(
    (x: number, y: number) => {
      for (const d of courseEntrances) {
        const entranceX = d.x + Math.floor(d.width / 2);
        const entranceY = d.y + d.height;
        if (x === entranceX && y === entranceY) {
          return d.paperId;
        }
      }
      return null;
    },
    [courseEntrances]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
          dy = -1;
          setPlayerDirection('up');
          break;
        case 'ArrowDown':
        case 's':
          dy = 1;
          setPlayerDirection('down');
          break;
        case 'ArrowLeft':
        case 'a':
          dx = -1;
          setPlayerDirection('left');
          break;
        case 'ArrowRight':
        case 'd':
          dx = 1;
          setPlayerDirection('right');
          break;
        case 'e':
        case 'Enter': {
          const paperId = checkCourseEntry(playerPosition.x, playerPosition.y);
          if (paperId) {
            router.push(`/learn/${paperId}`);
          }
          return;
        }
        default:
          return;
      }
      e.preventDefault();
      const newX = playerPosition.x + dx;
      const newY = playerPosition.y + dy;
      if (isWalkable(newX, newY)) {
        setPlayerPosition({ x: newX, y: newY });
      }
    },
    [playerPosition, setPlayerPosition, setPlayerDirection, isWalkable, checkCourseEntry, router]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Viewport
    const viewW = canvas.parentElement?.clientWidth || 800;
    const viewH = canvas.parentElement?.clientHeight || 600;
    canvas.width = viewW;
    canvas.height = viewH;

    const tilesX = Math.ceil(viewW / TILE_SIZE) + 1;
    const tilesY = Math.ceil(viewH / TILE_SIZE) + 1;
    const offsetX = playerPosition.x - Math.floor(tilesX / 2);
    const offsetY = playerPosition.y - Math.floor(tilesY / 2);

    // Clear
    ctx.fillStyle = '#4A7C59';
    ctx.fillRect(0, 0, viewW, viewH);

    // Draw ground tiles
    const groundLayer = mapData?.layersByName.get('ground');
    if (groundLayer && mapData) {
      // TMJ-based rendering
      const viewport: Viewport = { offsetX, offsetY, tilesX, tilesY };
      renderTileLayer(ctx, groundLayer, mapData.tilesets, viewport, TILE_SIZE, '#4A7C59');
    } else {
      // Fallback: procedural rendering
      for (let tx = 0; tx < tilesX; tx++) {
        for (let ty = 0; ty < tilesY; ty++) {
          const worldX = offsetX + tx;
          const worldY = offsetY + ty;
          if (worldX < 0 || worldY < 0 || worldX >= VILLAGE_MAP_WIDTH || worldY >= VILLAGE_MAP_HEIGHT)
            continue;

          const screenX = tx * TILE_SIZE;
          const screenY = ty * TILE_SIZE;

          const isPath =
            (worldX >= 6 && worldX <= 50 && (worldY === 12 || worldY === 26)) ||
            ((worldX === 14 || worldX === 30 || worldX === 46) && worldY >= 6 && worldY <= 30);

          ctx.fillStyle = isPath ? '#D2B48C' : (worldX + worldY) % 2 === 0 ? '#5B8C5A' : '#4A7C59';
          ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw course buildings (from blockchain-backed courseEntrances)
    courseEntrances.forEach((d) => {
      const bx = (d.x - offsetX) * TILE_SIZE;
      const by = (d.y - offsetY) * TILE_SIZE;

      // Building body
      ctx.fillStyle = d.color;
      ctx.fillRect(bx, by, d.width * TILE_SIZE, d.height * TILE_SIZE);

      // Roof
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.moveTo(bx - 5, by);
      ctx.lineTo(bx + (d.width * TILE_SIZE) / 2, by - 25);
      ctx.lineTo(bx + d.width * TILE_SIZE + 5, by);
      ctx.fill();

      // Entrance
      const entranceX = d.x + Math.floor(d.width / 2);
      const entranceScreenX = (entranceX - offsetX) * TILE_SIZE;
      const entranceScreenY = (d.y + d.height - 1 - offsetY) * TILE_SIZE;
      ctx.fillStyle = '#2D1810';
      ctx.fillRect(entranceScreenX - 5, entranceScreenY, TILE_SIZE + 10, TILE_SIZE);

      // Label
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        d.label,
        bx + (d.width * TILE_SIZE) / 2,
        by + d.height * TILE_SIZE + 14
      );

      // Course entrance label
      ctx.fillStyle = '#FFD700';
      ctx.font = '9px sans-serif';
      ctx.fillText(
        'Course Entrance',
        bx + (d.width * TILE_SIZE) / 2,
        by + d.height * TILE_SIZE + 26
      );
    });

    // Draw friends
    friends.forEach((friend, i) => {
      if (friend.currentScene !== 'village') return;
      const fx = (friend.position.x - offsetX) * TILE_SIZE + TILE_SIZE / 2;
      const fy = (friend.position.y - offsetY) * TILE_SIZE + TILE_SIZE / 2;

      ctx.fillStyle = FRIEND_COLORS[i % FRIEND_COLORS.length];
      ctx.beginPath();
      ctx.arc(fx, fy, TILE_SIZE * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Name label
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(friend.username, fx, fy - TILE_SIZE * 0.5);
    });

    // Draw player (always centered)
    const playerScreenX = Math.floor(tilesX / 2) * TILE_SIZE + TILE_SIZE / 2;
    const playerScreenY = Math.floor(tilesY / 2) * TILE_SIZE + TILE_SIZE / 2;

    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, TILE_SIZE * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('You', playerScreenX, playerScreenY - TILE_SIZE * 0.55);

    // Interaction hint near course entrance
    const nearPaper = checkCourseEntry(playerPosition.x, playerPosition.y);
    if (nearPaper) {
      ctx.fillStyle = '#FF9D00';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('Press E to enter course', playerScreenX, playerScreenY + TILE_SIZE * 1.2);
    }
  }, [playerPosition, playerDirection, friends, courseEntrances, checkCourseEntry, mapData]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
