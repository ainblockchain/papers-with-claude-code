'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useLearningStore } from '@/stores/useLearningStore';
import { TILE_SIZE, COURSE_ROOM_WIDTH, COURSE_ROOM_HEIGHT, WALK_ANIMATION_DURATION } from '@/constants/game';
import { StageConfig } from '@/types/learning';
import { useMapLoader } from '@/hooks/useMapLoader';
import { renderFullTileLayer } from '@/lib/tmj/renderer';
import { trackEvent } from '@/lib/ain/event-tracker';
import { drawWoodFloorTile, drawWallTile, drawDoor, drawBlackboard, tileHash } from '@/lib/sprites/terrain';
import {
  drawPlanetFloorA, drawPlanetFloorB, drawSpaceMountainWall,
  drawSpacePortal, drawSpaceOutpost, drawSpaceCrystal, is0GCourse,
} from '@/lib/sprites/terrain-space';
import { getPreRenderedSprite } from '@/lib/sprites/cache';
import { PLAYER_SPRITE } from '@/lib/sprites/player';
import { SPACE_PANDA_SPRITE } from '@/lib/sprites/space-panda';
import type { Direction } from '@/lib/sprites/types';

interface CourseCanvasProps {
  stage: StageConfig;
}

export function CourseCanvas({ stage }: CourseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    playerPosition,
    playerDirection,
    setPlayerPosition,
    setPlayerDirection,
    activeConceptId,
    setActiveConcept,
    isDoorUnlocked,
    isQuizPassed,
    setQuizActive,
    setPaymentModalOpen,
  } = useLearningStore();

  // Animation state
  const isWalkingRef = useRef(false);
  const animFrameRef = useRef(0);
  const walkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPositionRef = useRef(playerPosition);
  const rafIdRef = useRef<number>(0);
  const dirtyRef = useRef(true);

  const doorPosition = { x: stage.roomWidth - 2, y: Math.floor(stage.roomHeight / 2) };

  // Load TMJ map data (falls back to procedural rendering if unavailable)
  const { mapData } = useMapLoader('course-room');
  const canUseTmj = mapData && mapData.width === stage.roomWidth && mapData.height === stage.roomHeight;

  const isWalkable = useCallback(
    (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= stage.roomWidth || y >= stage.roomHeight) return false;
      if (y === 0 || y === stage.roomHeight - 1) return false;
      if (x === 0) return false;
      if (x === stage.roomWidth - 1) {
        return y === doorPosition.y && isDoorUnlocked;
      }
      return true;
    },
    [stage.roomWidth, stage.roomHeight, doorPosition.y, isDoorUnlocked]
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

  // Mark dirty on state change
  useEffect(() => {
    dirtyRef.current = true;
  }, [playerPosition, playerDirection, activeConceptId, isDoorUnlocked, stage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

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
        case 'Enter':
          // Interaction
          const concept = stage.concepts.find(
            (c) =>
              Math.abs(c.position.x - playerPosition.x) <= 1 &&
              Math.abs(c.position.y - playerPosition.y) <= 1
          );
          if (concept) {
            setActiveConcept(concept.id);
            const { currentPaper, playerDirection: dir } = useLearningStore.getState();
            trackEvent({
              type: 'concept_view',
              scene: 'course',
              paperId: currentPaper?.id ?? '',
              stageIndex: stage.stageNumber - 1,
              conceptId: concept.id,
              x: playerPosition.x,
              y: playerPosition.y,
              direction: dir,
              timestamp: Date.now(),
            });
          }
          if (
            Math.abs(playerPosition.x - doorPosition.x) <= 1 &&
            Math.abs(playerPosition.y - doorPosition.y) <= 1
          ) {
            if (!isQuizPassed) {
              setQuizActive(true);
            } else if (!isDoorUnlocked) {
              setPaymentModalOpen(true);
            }
          }
          return;
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
    [
      playerPosition,
      setPlayerPosition,
      setPlayerDirection,
      stage.concepts,
      setActiveConcept,
      doorPosition,
      isDoorUnlocked,
      isQuizPassed,
      setQuizActive,
      setPaymentModalOpen,
      isWalkable,
    ]
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

      const containerW = canvas.parentElement?.clientWidth || 800;
      const containerH = canvas.parentElement?.clientHeight || 600;
      if (canvas.width !== containerW || canvas.height !== containerH) {
        canvas.width = containerW;
        canvas.height = containerH;
      }

      const roomW = stage.roomWidth * TILE_SIZE;
      const roomH = stage.roomHeight * TILE_SIZE;
      const scale = Math.min(containerW / roomW, containerH / roomH);
      const oX = (containerW - roomW * scale) / 2;
      const oY = (containerH - roomH * scale) / 2;

      const isSpaceTheme = is0GCourse(useLearningStore.getState().currentPaper?.id);

      // Fill background
      ctx.fillStyle = isSpaceTheme ? '#0A0515' : '#111827';
      ctx.fillRect(0, 0, containerW, containerH);

      ctx.save();
      ctx.translate(oX, oY);
      ctx.scale(scale, scale);

      // ── Floor and walls ──
      const floorLayer = (canUseTmj && !isSpaceTheme) ? mapData!.layersByName.get('floor') : null;
      if (floorLayer && mapData) {
        renderFullTileLayer(ctx, floorLayer, mapData.tilesets, TILE_SIZE);
      } else {
        // Procedural floor
        for (let x = 1; x < stage.roomWidth - 1; x++) {
          for (let y = 1; y < stage.roomHeight - 1; y++) {
            if (isSpaceTheme) {
              const h = tileHash(x, y);
              if (h < 0.2) {
                drawPlanetFloorB(ctx, x * TILE_SIZE, y * TILE_SIZE, x, y, TILE_SIZE);
              } else {
                drawPlanetFloorA(ctx, x * TILE_SIZE, y * TILE_SIZE, x, y, TILE_SIZE);
              }
            } else {
              drawWoodFloorTile(ctx, x * TILE_SIZE, y * TILE_SIZE, x, y, TILE_SIZE);
            }
          }
        }

        // Walls
        const drawWall = isSpaceTheme ? drawSpaceMountainWall : drawWallTile;
        for (let x = 0; x < stage.roomWidth; x++) {
          drawWall(ctx, x * TILE_SIZE, 0, TILE_SIZE);
          drawWall(ctx, x * TILE_SIZE, (stage.roomHeight - 1) * TILE_SIZE, TILE_SIZE);
        }
        for (let y = 0; y < stage.roomHeight; y++) {
          drawWall(ctx, 0, y * TILE_SIZE, TILE_SIZE);
          if (y !== doorPosition.y) {
            drawWall(ctx, (stage.roomWidth - 1) * TILE_SIZE, y * TILE_SIZE, TILE_SIZE);
          }
        }
      }

      // ── Space decorations — glowing crystals ──
      if (isSpaceTheme) {
        for (let x = 1; x < stage.roomWidth - 1; x++) {
          for (let y = 1; y < stage.roomHeight - 1; y++) {
            const h = tileHash(x + 100, y + 100);
            if (h < 0.015) {
              const tooClose = stage.concepts.some(
                (c) => Math.abs(c.position.x - x) <= 1 && Math.abs(c.position.y - y) <= 1
              ) || (Math.abs(x - doorPosition.x) <= 1 && Math.abs(y - doorPosition.y) <= 1);
              if (!tooClose) {
                drawSpaceCrystal(ctx, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE);
              }
            }
          }
        }
      }

      // ── Door ──
      if (isSpaceTheme) {
        drawSpacePortal(
          ctx,
          (stage.roomWidth - 1) * TILE_SIZE,
          doorPosition.y * TILE_SIZE,
          TILE_SIZE,
          isDoorUnlocked,
        );
      } else {
        drawDoor(
          ctx,
          (stage.roomWidth - 1) * TILE_SIZE,
          doorPosition.y * TILE_SIZE,
          TILE_SIZE,
          isDoorUnlocked,
        );
      }

      // ── Concepts ──
      stage.concepts.forEach((concept) => {
        const isActive = activeConceptId === concept.id;
        const cx = concept.position.x * TILE_SIZE;
        const cy = concept.position.y * TILE_SIZE;
        const bbW = TILE_SIZE * 2;
        const bbH = TILE_SIZE * 1.5;

        if (isSpaceTheme) {
          drawSpaceOutpost(ctx, cx, cy, bbW, bbH, isActive, concept.title);
        } else {
          drawBlackboard(ctx, cx, cy, bbW, bbH, isActive, concept.title);
        }

        // Interaction hint
        const isNear =
          Math.abs(concept.position.x - playerPosition.x) <= 1 &&
          Math.abs(concept.position.y - playerPosition.y) <= 1;
        if (isNear && !isActive) {
          ctx.fillStyle = isSpaceTheme ? '#00FFFF' : '#FF9D00';
          ctx.font = `${TILE_SIZE * 0.25}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('Press E', cx + TILE_SIZE, cy - 8);
        }
      });

      // ── Player (pixel art sprite with animation) ──
      const pos = useLearningStore.getState().playerPosition;
      const dir = useLearningStore.getState().playerDirection as Direction;
      const frameIdx = animFrameRef.current;
      const sprite = isSpaceTheme ? SPACE_PANDA_SPRITE : PLAYER_SPRITE;
      const playerFrame = sprite.frames[dir][frameIdx];
      const cacheKey = `course-${sprite.name}-${dir}-${frameIdx}`;
      const spriteCanvas = getPreRenderedSprite(cacheKey, playerFrame, sprite.palette, TILE_SIZE, TILE_SIZE);
      ctx.drawImage(spriteCanvas, pos.x * TILE_SIZE, pos.y * TILE_SIZE);

      // ── Stage title ──
      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${TILE_SIZE * 0.4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      const titleText = `Stage ${stage.stageNumber}: ${stage.title}`;
      ctx.strokeText(titleText, roomW / 2, TILE_SIZE * 0.65);
      ctx.fillText(titleText, roomW / 2, TILE_SIZE * 0.65);

      ctx.restore();

      rafIdRef.current = requestAnimationFrame(draw);
    };

    dirtyRef.current = true;
    rafIdRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [stage, activeConceptId, isDoorUnlocked, doorPosition, mapData, canUseTmj, playerPosition, playerDirection]);

  return (
    <div className="w-full h-full bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
