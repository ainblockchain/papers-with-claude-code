'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVillageStore } from '@/stores/useVillageStore';
import { TILE_SIZE, WALK_ANIMATION_DURATION, SPRITE_SOURCE_SIZE } from '@/constants/game';
import { useLocationSync } from '@/hooks/useLocationSync';
import { useVillageMap } from '@/hooks/useVillageMap';
import { trackEvent } from '@/lib/ain/event-tracker';
import type { Paper } from '@/types/paper';
import { renderTileLayer, type Viewport } from '@/lib/tmj/renderer';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { papersAdapter } from '@/lib/adapters/papers';
import { PLOT_WIDTH, PLOT_HEIGHT } from '@/lib/tmj/village-generator';
import { drawGrassTile, drawPathTile, drawTree } from '@/lib/sprites/terrain';
import { drawBuilding } from '@/lib/sprites/buildings';
import { getPreRenderedSprite } from '@/lib/sprites/cache';
import { PLAYER_SPRITE } from '@/lib/sprites/player';
import { FRIEND_SPRITES } from '@/lib/sprites/friends';
import type { Direction } from '@/lib/sprites/types';

interface CourseEntrance {
  paperId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export function VillageCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();
  const { playerPosition, playerDirection, setPlayerPosition, setPlayerDirection, friends, courseLocations, setMapDimensions } =
    useVillageStore();
  const { getAccessStatus, setPurchaseModal } = usePurchaseStore();

  // Animation state
  const isWalkingRef = useRef(false);
  const animFrameRef = useRef(0); // 0 = idle, 1 = walk1, 2 = walk2
  const walkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPositionRef = useRef(playerPosition);
  const rafIdRef = useRef<number>(0);
  const dirtyRef = useRef(true);

  // Fetch courses and sync positions with AIN blockchain
  const [courses, setCourses] = useState<Paper[]>();
  useEffect(() => {
    papersAdapter.fetchTrendingPapers('daily').then(setCourses);
  }, []);
  useLocationSync(courses);

  // Generate village TMJ from course locations using plot grid system
  const { mapData, mapDimensions } = useVillageMap(courseLocations);

  // Update store with current map dimensions
  useEffect(() => {
    setMapDimensions(mapDimensions);
  }, [mapDimensions, setMapDimensions]);

  // Build course entrances from store
  const courseEntrances: CourseEntrance[] = useMemo(() => {
    return courseLocations.map((cl) => ({
      paperId: cl.paperId,
      label: cl.label,
      x: cl.x,
      y: cl.y,
      width: cl.width,
      height: cl.height,
      color: cl.color,
    }));
  }, [courseLocations]);

  const mapW = mapData?.width ?? PLOT_WIDTH;
  const mapH = mapData?.height ?? PLOT_HEIGHT;

  const isWalkable = useCallback(
    (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= mapW || y >= mapH) return false;
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
    [courseEntrances, mapW, mapH]
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

  // Detect movement → trigger walk animation
  useEffect(() => {
    const prev = prevPositionRef.current;
    if (prev.x !== playerPosition.x || prev.y !== playerPosition.y) {
      isWalkingRef.current = true;
      animFrameRef.current = animFrameRef.current === 1 ? 2 : 1;
      dirtyRef.current = true;

      if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
      walkTimerRef.current = setTimeout(() => {
        isWalkingRef.current = false;
        animFrameRef.current = 0;
        dirtyRef.current = true;
      }, WALK_ANIMATION_DURATION);
    }
    prevPositionRef.current = playerPosition;
  }, [playerPosition]);

  // Mark dirty on any state change
  useEffect(() => {
    dirtyRef.current = true;
  }, [playerPosition, playerDirection, friends, courseEntrances, mapData]);

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
            const access = getAccessStatus(paperId);
            if (access === 'owned' || access === 'purchased') {
              trackEvent({
                type: 'course_enter',
                scene: 'village',
                paperId,
                x: playerPosition.x,
                y: playerPosition.y,
                direction: useVillageStore.getState().playerDirection,
                timestamp: Date.now(),
              });
              router.push(`/learn/${paperId}`);
            } else {
              papersAdapter.getPaperById(paperId).then((p) => {
                if (p) setPurchaseModal(paperId, p);
              });
            }
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
    [playerPosition, setPlayerPosition, setPlayerDirection, isWalkable, checkCourseEntry, router, getAccessStatus, setPurchaseModal]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // rAF render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!dirtyRef.current) {
        rafIdRef.current = requestAnimationFrame(draw);
        return;
      }
      dirtyRef.current = false;

      // Viewport
      const viewW = canvas.parentElement?.clientWidth || 800;
      const viewH = canvas.parentElement?.clientHeight || 600;
      if (canvas.width !== viewW || canvas.height !== viewH) {
        canvas.width = viewW;
        canvas.height = viewH;
      }

      const pos = useVillageStore.getState().playerPosition;
      const dir = useVillageStore.getState().playerDirection as Direction;
      const tilesX = Math.ceil(viewW / TILE_SIZE) + 1;
      const tilesY = Math.ceil(viewH / TILE_SIZE) + 1;
      const offsetX = pos.x - Math.floor(tilesX / 2);
      const offsetY = pos.y - Math.floor(tilesY / 2);

      // Clear
      ctx.fillStyle = '#4A7C59';
      ctx.fillRect(0, 0, viewW, viewH);

      // ── Ground tiles ──
      const groundLayer = mapData?.layersByName.get('ground');
      if (groundLayer && mapData) {
        const viewport: Viewport = { offsetX, offsetY, tilesX, tilesY };
        renderTileLayer(ctx, groundLayer, mapData.tilesets, viewport, TILE_SIZE, '#4A7C59');
      } else {
        for (let tx = 0; tx < tilesX; tx++) {
          for (let ty = 0; ty < tilesY; ty++) {
            const worldX = offsetX + tx;
            const worldY = offsetY + ty;
            if (worldX < 0 || worldY < 0 || worldX >= mapW || worldY >= mapH) continue;

            const screenX = tx * TILE_SIZE;
            const screenY = ty * TILE_SIZE;

            const isPath =
              (worldX >= 6 && worldX <= 50 && (worldY === 12 || worldY === 26)) ||
              ((worldX === 14 || worldX === 30 || worldX === 46) && worldY >= 6 && worldY <= 30);

            if (isPath) {
              drawPathTile(ctx, screenX, screenY, worldX, worldY, TILE_SIZE);
            } else {
              drawGrassTile(ctx, screenX, screenY, worldX, worldY, TILE_SIZE);
            }
          }
        }
      }

      // ── Trees (decorative, placed deterministically along plot borders) ──
      if (!groundLayer) {
        for (let tx = 0; tx < tilesX; tx++) {
          for (let ty = 0; ty < tilesY; ty++) {
            const worldX = offsetX + tx;
            const worldY = offsetY + ty;
            if (worldX < 0 || worldY < 0 || worldX >= mapW || worldY >= mapH) continue;

            // Place trees along plot borders using hash
            const hash = ((worldX * 374761393 + worldY * 668265263) | 0) & 0x7fffffff;
            const h = (hash & 0xffff) / 0xffff;
            const isPlotBorder = worldX % 16 === 0 || worldY % 16 === 0;
            const isNotPath =
              !((worldX >= 6 && worldX <= 50 && (worldY === 12 || worldY === 26)) ||
                ((worldX === 14 || worldX === 30 || worldX === 46) && worldY >= 6 && worldY <= 30));
            const isNotBuilding = !courseEntrances.some(
              (d) => worldX >= d.x - 1 && worldX <= d.x + d.width && worldY >= d.y - 2 && worldY <= d.y + d.height + 1
            );

            if (isPlotBorder && isNotPath && isNotBuilding && h < 0.25) {
              const screenX = tx * TILE_SIZE;
              const screenY = ty * TILE_SIZE;
              drawTree(ctx, screenX, screenY, TILE_SIZE);
            }
          }
        }
      }

      // ── Course buildings ──
      courseEntrances.forEach((d) => {
        const bx = (d.x - offsetX) * TILE_SIZE;
        const by = (d.y - offsetY) * TILE_SIZE;
        drawBuilding(ctx, bx, by, d.width, d.height, d.color, TILE_SIZE, d.label);

        // Entrance marker
        const entranceX = d.x + Math.floor(d.width / 2);
        const entranceScreenX = (entranceX - offsetX) * TILE_SIZE;
        const entranceScreenY = (d.y + d.height - offsetY) * TILE_SIZE;
        ctx.fillStyle = '#FFD700';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼ Enter', entranceScreenX + TILE_SIZE / 2, entranceScreenY + 10);
      });

      // ── Friends (pixel art sprites) ──
      const friendsList = useVillageStore.getState().friends;
      friendsList.forEach((friend, i) => {
        if (friend.currentScene !== 'village') return;
        const fScreenX = (friend.position.x - offsetX) * TILE_SIZE;
        const fScreenY = (friend.position.y - offsetY) * TILE_SIZE;

        const sprite = FRIEND_SPRITES[i % FRIEND_SPRITES.length];
        const friendDir: Direction = 'down'; // friends always face down (no direction in FriendPosition)
        const frame = sprite.frames[friendDir][0]; // idle frame
        const cacheKey = `friend-${i}-idle`;
        const spriteCanvas = getPreRenderedSprite(cacheKey, frame, sprite.palette, TILE_SIZE, TILE_SIZE);
        ctx.drawImage(spriteCanvas, fScreenX, fScreenY);

        // Name label
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeText(friend.username, fScreenX + TILE_SIZE / 2, fScreenY - 4);
        ctx.fillText(friend.username, fScreenX + TILE_SIZE / 2, fScreenY - 4);
      });

      // ── Player (always centered, pixel art sprite with animation) ──
      const playerScreenX = Math.floor(tilesX / 2) * TILE_SIZE;
      const playerScreenY = Math.floor(tilesY / 2) * TILE_SIZE;

      const frameIdx = animFrameRef.current;
      const playerFrame = PLAYER_SPRITE.frames[dir][frameIdx];
      const cacheKey = `player-${dir}-${frameIdx}`;
      const playerCanvas = getPreRenderedSprite(cacheKey, playerFrame, PLAYER_SPRITE.palette, TILE_SIZE, TILE_SIZE);
      ctx.drawImage(playerCanvas, playerScreenX, playerScreenY);

      // Player name
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText('You', playerScreenX + TILE_SIZE / 2, playerScreenY - 4);
      ctx.fillText('You', playerScreenX + TILE_SIZE / 2, playerScreenY - 4);

      // ── Interaction hint near course entrance ──
      const nearPaper = checkCourseEntry(pos.x, pos.y);
      if (nearPaper) {
        const nearAccess = usePurchaseStore.getState().accessMap[nearPaper];
        const canEnter = nearAccess === 'owned' || nearAccess === 'purchased';
        ctx.fillStyle = canEnter ? '#FF9D00' : '#7C3AED';
        ctx.font = 'bold 13px sans-serif';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        const hintText = canEnter ? 'Press E to enter course' : 'Press E to purchase course';
        ctx.strokeText(hintText, playerScreenX + TILE_SIZE / 2, playerScreenY + TILE_SIZE + 16);
        ctx.fillText(hintText, playerScreenX + TILE_SIZE / 2, playerScreenY + TILE_SIZE + 16);
      }

      rafIdRef.current = requestAnimationFrame(draw);
    };

    dirtyRef.current = true;
    rafIdRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [mapData, mapW, mapH, courseEntrances, checkCourseEntry]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
