'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useLearningStore } from '@/stores/useLearningStore';
import { TILE_SIZE, DUNGEON_ROOM_WIDTH, DUNGEON_ROOM_HEIGHT, PLAYER_COLOR, STAGE_COLORS } from '@/constants/game';
import { StageConfig } from '@/types/learning';

interface DungeonCanvasProps {
  stage: StageConfig;
}

export function DungeonCanvas({ stage }: DungeonCanvasProps) {
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

  const doorPosition = { x: stage.roomWidth - 2, y: Math.floor(stage.roomHeight / 2) };

  const isWalkable = useCallback(
    (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= stage.roomWidth || y >= stage.roomHeight) return false;
      // Walls: top/bottom/left rows, and right wall except door
      if (y === 0 || y === stage.roomHeight - 1) return false;
      if (x === 0) return false;
      if (x === stage.roomWidth - 1) {
        return y === doorPosition.y && isDoorUnlocked;
      }
      // Concept positions are passable but interactable
      return true;
    },
    [stage.roomWidth, stage.roomHeight, doorPosition.y, isDoorUnlocked]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip game keys when typing in an input/textarea
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
          }
          // Check if near door
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

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Size canvas to fill entire parent container
    const containerW = canvas.parentElement?.clientWidth || 800;
    const containerH = canvas.parentElement?.clientHeight || 600;
    canvas.width = containerW;
    canvas.height = containerH;

    const roomW = stage.roomWidth * TILE_SIZE;
    const roomH = stage.roomHeight * TILE_SIZE;
    const scale = Math.min(containerW / roomW, containerH / roomH);
    const offsetX = (containerW - roomW * scale) / 2;
    const offsetY = (containerH - roomH * scale) / 2;

    // Fill background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, containerW, containerH);

    // Translate and scale to center the room
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Clear room area
    ctx.fillStyle = '#D2B48C';
    ctx.fillRect(0, 0, roomW, roomH);

    // Draw floor
    for (let x = 1; x < stage.roomWidth - 1; x++) {
      for (let y = 1; y < stage.roomHeight - 1; y++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#E8D5B7' : '#DCC9A8';
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw walls
    ctx.fillStyle = '#6B7280';
    for (let x = 0; x < stage.roomWidth; x++) {
      ctx.fillRect(x * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
      ctx.fillRect(x * TILE_SIZE, (stage.roomHeight - 1) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    for (let y = 0; y < stage.roomHeight; y++) {
      ctx.fillRect(0, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      if (y !== doorPosition.y) {
        ctx.fillRect((stage.roomWidth - 1) * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    // Draw door
    ctx.fillStyle = isDoorUnlocked ? STAGE_COLORS.completed : STAGE_COLORS.locked;
    ctx.fillRect(
      (stage.roomWidth - 1) * TILE_SIZE,
      doorPosition.y * TILE_SIZE,
      TILE_SIZE,
      TILE_SIZE
    );
    // Door icon
    ctx.fillStyle = '#FFF';
    ctx.font = `${TILE_SIZE * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      isDoorUnlocked ? '🚪' : '🔒',
      (stage.roomWidth - 1) * TILE_SIZE + TILE_SIZE / 2,
      doorPosition.y * TILE_SIZE + TILE_SIZE / 2
    );

    // Draw concepts (blackboards)
    stage.concepts.forEach((concept) => {
      const isActive = activeConceptId === concept.id;
      const isNear =
        Math.abs(concept.position.x - playerPosition.x) <= 1 &&
        Math.abs(concept.position.y - playerPosition.y) <= 1;

      ctx.fillStyle = isActive ? '#1E40AF' : '#1F2937';
      ctx.fillRect(
        concept.position.x * TILE_SIZE,
        concept.position.y * TILE_SIZE,
        TILE_SIZE * 2,
        TILE_SIZE * 1.5
      );

      // Concept title
      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${TILE_SIZE * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        concept.title,
        concept.position.x * TILE_SIZE + TILE_SIZE,
        concept.position.y * TILE_SIZE + TILE_SIZE * 0.75
      );

      // Interaction hint
      if (isNear && !isActive) {
        ctx.fillStyle = '#FF9D00';
        ctx.font = `${TILE_SIZE * 0.25}px sans-serif`;
        ctx.fillText(
          'Press E',
          concept.position.x * TILE_SIZE + TILE_SIZE,
          concept.position.y * TILE_SIZE - 5
        );
      }
    });

    // Draw player
    ctx.fillStyle = PLAYER_COLOR;
    ctx.beginPath();
    ctx.arc(
      playerPosition.x * TILE_SIZE + TILE_SIZE / 2,
      playerPosition.y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE * 0.4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Direction indicator
    ctx.fillStyle = '#FFF';
    const dirOffsets = { up: [0, -5], down: [0, 5], left: [-5, 0], right: [5, 0] };
    const [dox, doy] = dirOffsets[playerDirection];
    ctx.beginPath();
    ctx.arc(
      playerPosition.x * TILE_SIZE + TILE_SIZE / 2 + dox,
      playerPosition.y * TILE_SIZE + TILE_SIZE / 2 + doy,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Stage title
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${TILE_SIZE * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      `Stage ${stage.stageNumber}: ${stage.title}`,
      roomW / 2,
      TILE_SIZE * 0.65
    );

    ctx.restore();
  }, [playerPosition, playerDirection, stage, activeConceptId, isDoorUnlocked, doorPosition]);

  return (
    <div className="w-full h-full bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
