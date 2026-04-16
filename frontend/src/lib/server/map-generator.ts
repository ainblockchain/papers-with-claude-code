/**
 * map-generator.ts
 *
 * Server-side library for generating TMJ map data.
 * Ported from knowledge-graph-builder/generate-maps.ts for use in Next.js API routes.
 *
 * Pure functions: take data as input, return generated data.
 * No fs/path imports -- all I/O is the caller's responsibility.
 */

import type {
  TmjMap,
  TmjTileLayer,
  TmjObjectGroup,
  TmjObject,
  TmjTilesetRef,
  TmjTileDef,
  TmjProperty,
} from '@/types/tmj';

// ── Input types ──────────────────────────────────────────────────────────

export interface ExerciseEntry {
  question: string;
  answer: string;
  explanation: string;
}

export interface Lesson {
  concept_id: string;
  title: string;
  content?: string; // Rich learning content for the concept (displayed on chalkboard)
  key_ideas: string[];
  exercise?: string;
  answer?: string;
  explanation: string;
  prerequisites: string[];
  exercises?: ExerciseEntry[];
}

export interface SignboardEntry {
  id: string;
  title: string;
  position: { x: number; y: number };
  dataSource: 'chatlog';
}

export interface CourseEntry {
  id: string;
  title: string;
  description?: string;
  concepts: string[];
  lessons: Lesson[];
  signboards?: SignboardEntry[];
}

// ── Output types ─────────────────────────────────────────────────────────

export interface ConceptPosition {
  x: number;
  y: number;
}

export interface QuizData {
  id: string;
  question: string;
  type: 'multiple-choice';
  options: string[];
  correctAnswer: string;
  position: { x: number; y: number };
}

export interface ConceptData {
  id: string;
  title: string;
  content: string;
  position: ConceptPosition;
  type: 'text';
}

export interface StageData {
  id: string;
  stageNumber: number;
  title: string;
  roomWidth: number;
  roomHeight: number;
  concepts: ConceptData[];
  quizzes: QuizData[];
  signboards?: SignboardEntry[];
  doorPosition: { x: number; y: number };
  spawnPosition: { x: number; y: number };
  nextStage: number | null;
  previousStage: number | null;
}

export interface StageFileOutput {
  map: TmjMap;
  stage: StageData;
}

export interface CourseInfo {
  courseId: string;
  paperId: string;
  title: string;
  description: string;
  totalStages: number;
  stages: Array<{
    stageNumber: number;
    title: string;
    conceptCount: number;
    hasQuiz: boolean;
  }>;
}

// ── Constants ────────────────────────────────────────────────────────────

export const PLOT_INNER_WIDTH = 16;
export const PLOT_INNER_HEIGHT = 12;
export const PLOT_BORDER = 1;
export const PLOT_WIDTH = PLOT_INNER_WIDTH + PLOT_BORDER * 2; // 18
export const PLOT_HEIGHT = PLOT_INNER_HEIGHT + PLOT_BORDER * 2; // 14
export const BUILDING_WIDTH = 4;
export const BUILDING_HEIGHT = 3;
export const TILE_PX = 40;

export const ROOM_WIDTH = 20;
export const ROOM_HEIGHT = 15;
export const SPAWN_X = 1;
export const SPAWN_Y = 7;
export const DOOR_X = 18;
export const DOOR_Y = 7;

// ── Quiz parsing ─────────────────────────────────────────────────────────

/**
 * Parse a single exercise text into quiz data.
 */
function parseSingleExercise(
  exercise: string,
  answer: string,
  quizId: string,
): QuizData {
  const doorPos = { x: DOOR_X, y: DOOR_Y };

  // True / False format
  if (
    exercise.includes('True or False:') ||
    exercise.includes("Type 'True' or 'False'") ||
    exercise.toLowerCase().includes('true or false')
  ) {
    const questionLine =
      exercise
        .split('\n')
        .find((l) => l.trim() && !l.startsWith('Type'))
        ?.trim() ?? exercise.split('\n')[0].trim();
    return {
      id: quizId,
      question: questionLine,
      type: 'multiple-choice',
      options: ['True', 'False'],
      correctAnswer: answer,
      position: doorPos,
    };
  }

  // Numbered choice format: "...\n1) A\n2) B\n3) C\n\nType the number."
  const lines = exercise.split('\n').filter((l) => l.trim());
  const optionLines = lines.filter((l) => /^\d+[).]/.test(l.trim()));
  const questionLines = lines.filter(
    (l) => !/^\d+[).]/.test(l.trim()) && !l.trim().startsWith('Type'),
  );
  let options = optionLines.map((l) => l.replace(/^\d+[).]\s*/, '').trim());

  // Inline choices: "... 1) A, 2) B, 3) C" or "(1) A (2) B" or "A) X B) Y"
  if (options.length < 2) {
    // Pattern: N) or (N) with comma separators
    const numInline = exercise.search(/\(?\d+\)/);
    if (numInline !== -1) {
      const segments = exercise.slice(numInline).split(/[,.]?\s*(?=\(?\d+\))/);
      const inlineOpts = segments
        .map((s) =>
          s
            .replace(/^\(?\d+\)\s*/, '')
            .replace(/\.?\s*(Type|Which).*$/i, '')
            .trim(),
        )
        .filter(Boolean);
      if (inlineOpts.length >= 2) options = inlineOpts;
    }
    // Pattern: A) X B) Y C) Z (letter-based)
    if (options.length < 2) {
      const letterInline = exercise.search(/[A-C]\)\s/);
      if (letterInline !== -1) {
        const segments = exercise.slice(letterInline).split(/\s*(?=[A-Z]\)\s)/);
        const inlineOpts = segments
          .map((s) => s.replace(/^[A-Z]\)\s*/, '').trim())
          .filter(Boolean);
        if (inlineOpts.length >= 2) options = inlineOpts;
      }
    }
  }

  const question =
    questionLines.join(' ').trim() || exercise.split('\n')[0].trim();

  return {
    id: quizId,
    question,
    type: 'multiple-choice',
    options: options.length >= 2 ? options : ['True', 'False'],
    correctAnswer: answer,
    position: doorPos,
  };
}

/**
 * Parse all exercises from a lesson into quiz data array.
 * Supports both new format (exercises array) and legacy format (single exercise/answer).
 */
function parseExercises(lesson: Lesson, baseQuizId: string): QuizData[] {
  // New format: exercises array
  if (lesson.exercises && lesson.exercises.length > 0) {
    return lesson.exercises.map((ex, i) =>
      parseSingleExercise(ex.question, ex.answer, `${baseQuizId}-${i}`),
    );
  }

  // Legacy format: single exercise/answer fields
  if (lesson.exercise?.trim()) {
    return [
      parseSingleExercise(
        lesson.exercise,
        lesson.answer ?? '',
        `${baseQuizId}-0`,
      ),
    ];
  }

  // No exercises found
  return [];
}

// ── Concept position layout ──────────────────────────────────────────────

/**
 * Distributes N concepts across the stage room.
 *
 * Blackboards are 3 tiles wide × 2 tiles tall (rendered in CourseCanvas),
 * so we need at least 4 tiles of horizontal spacing to avoid overlap.
 *
 * Layout strategy:
 * - Usable x range: 2 .. ROOM_WIDTH - 4 (leave room for walls + door area)
 * - For <=4 concepts: single row at y=6, evenly spaced.
 * - For 5-8 concepts: two rows at y=4 and y=10, evenly spaced.
 */
function computeConceptPositions(count: number): ConceptPosition[] {
  const positions: ConceptPosition[] = [];
  const minX = 2;
  const maxX = ROOM_WIDTH - 4; // leave room for 3-wide board + wall
  const BB_WIDTH = 3; // blackboard width in tiles

  function distributeRow(n: number, y: number) {
    if (n === 1) {
      positions.push({ x: Math.floor((minX + maxX) / 2), y });
      return;
    }
    const totalSpace = maxX - minX;
    const spacing = BB_WIDTH + 1; // 1 tile gap between blackboards
    const totalWidth = spacing * (n - 1);
    const startX = Math.max(minX, Math.floor((minX + maxX - totalWidth) / 2));
    for (let i = 0; i < n; i++) {
      positions.push({ x: startX + i * spacing, y });
    }
  }

  if (count <= 4) {
    distributeRow(count, 6);
  } else {
    const topCount = Math.ceil(count / 2);
    const botCount = count - topCount;
    distributeRow(topCount, 4);
    distributeRow(botCount, 10);
  }

  return positions;
}

// ── Build concept content ────────────────────────────────────────────────

/** Get concept content from lesson. */
function buildConceptContent(lesson: Lesson): string {
  return (lesson.content ?? '').trim();
}

// ── Stage room TMJ generation ────────────────────────────────────────────

function generateStageRoomTmj(stageData: StageData): TmjMap {
  const W = stageData.roomWidth;
  const H = stageData.roomHeight;

  // Floor layer
  const floorData: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isBorder = x === 0 || x === W - 1 || y === 0 || y === H - 1;
      floorData.push(isBorder ? 3 : (x + y) % 2 === 0 ? 1 : 2);
    }
  }

  // Collision layer
  const collisionData: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isBorderTop = y === 0;
      const isBorderBottom = y === H - 1;
      const isBorderLeft = x === 0;
      const isBorderRight = x === W - 1;
      collisionData.push(
        isBorderTop || isBorderBottom || isBorderLeft || isBorderRight ? 1 : 0,
      );
    }
  }

  // Objects
  const spawnObj: TmjObject = {
    id: 1,
    name: 'spawn',
    type: 'spawn',
    x: stageData.spawnPosition.x * TILE_PX,
    y: stageData.spawnPosition.y * TILE_PX,
    width: 0,
    height: 0,
    rotation: 0,
    visible: true,
    point: true,
  };

  const doorObj: TmjObject = {
    id: 2,
    name: 'door',
    type: 'door',
    x: stageData.doorPosition.x * TILE_PX,
    y: stageData.doorPosition.y * TILE_PX,
    width: TILE_PX,
    height: TILE_PX,
    rotation: 0,
    visible: true,
  };

  const npcObjects: TmjObject[] = stageData.concepts.map((c, i) => ({
    id: i + 3,
    name: c.id,
    type: 'npc',
    x: c.position.x * TILE_PX,
    y: c.position.y * TILE_PX,
    width: TILE_PX,
    height: TILE_PX,
    rotation: 0,
    visible: true,
    properties: [
      { name: 'conceptId', type: 'string' as const, value: c.id },
      { name: 'title', type: 'string' as const, value: c.title },
    ],
  }));

  const floorLayer: TmjTileLayer = {
    type: 'tilelayer',
    id: 1,
    name: 'floor',
    data: floorData,
    width: W,
    height: H,
    x: 0,
    y: 0,
    visible: true,
    opacity: 1,
  };

  const collisionLayer: TmjTileLayer = {
    type: 'tilelayer',
    id: 2,
    name: 'collision',
    data: collisionData,
    width: W,
    height: H,
    x: 0,
    y: 0,
    visible: false,
    opacity: 1,
  };

  const objectsLayer: TmjObjectGroup = {
    type: 'objectgroup',
    id: 3,
    name: 'objects',
    draworder: 'topdown',
    x: 0,
    y: 0,
    visible: true,
    opacity: 1,
    objects: [spawnObj, doorObj, ...npcObjects],
  };

  return {
    type: 'map',
    version: '1.10',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width: W,
    height: H,
    tilewidth: TILE_PX,
    tileheight: TILE_PX,
    infinite: false,
    layers: [floorLayer, collisionLayer, objectsLayer],
    tilesets: [
      {
        firstgid: 1,
        name: 'course-room-tiles',
        tilewidth: TILE_PX,
        tileheight: TILE_PX,
        tilecount: 3,
        columns: 3,
        image: '',
        imagewidth: TILE_PX * 3,
        imageheight: TILE_PX,
        tiles: [
          {
            id: 0,
            type: 'floor-light',
            properties: [
              { name: 'color', type: 'string', value: '#E8D5A3' },
            ],
          },
          {
            id: 1,
            type: 'floor-dark',
            properties: [
              { name: 'color', type: 'string', value: '#C9B88A' },
            ],
          },
          {
            id: 2,
            type: 'wall',
            properties: [
              { name: 'color', type: 'string', value: '#8B6914' },
            ],
          },
        ],
      },
    ],
  };
}

// ── Public API: generateStageData ────────────────────────────────────────

/**
 * Generate a stage file (TMJ map + stage metadata) for a single course/stage.
 *
 * @param stageNumber  1-based stage index
 * @param course       The course entry for this stage
 * @param totalStages  Total number of stages in the paper
 * @param roomWidth    Override room width (default: ROOM_WIDTH = 20)
 * @param roomHeight   Override room height (default: ROOM_HEIGHT = 15)
 */
export function generateStageData(
  stageNumber: number,
  course: CourseEntry,
  totalStages: number,
  roomWidth: number = ROOM_WIDTH,
  roomHeight: number = ROOM_HEIGHT,
): StageFileOutput {
  // Concept positions
  const positions = computeConceptPositions(course.lessons.length);

  // Concepts
  const concepts: ConceptData[] = course.lessons.map((lesson, i) => ({
    id: lesson.concept_id,
    title: lesson.title,
    content: buildConceptContent(lesson),
    position: positions[i] ?? { x: 3 + i * 2, y: 6 },
    type: 'text' as const,
  }));

  // Quizzes: collect all exercises from all lessons in this stage
  const quizzes: QuizData[] = [];
  course.lessons.forEach((lesson, lessonIdx) => {
    const lessonQuizzes = parseExercises(
      lesson,
      `quiz-stage-${stageNumber}-lesson-${lessonIdx}`,
    );
    quizzes.push(...lessonQuizzes);
  });

  // Fallback: if no quizzes found, create a placeholder
  if (quizzes.length === 0) {
    quizzes.push({
      id: `quiz-stage-${stageNumber}-fallback`,
      question: 'No quiz available for this stage.',
      type: 'multiple-choice',
      options: ['Continue'],
      correctAnswer: 'Continue',
      position: { x: DOOR_X, y: DOOR_Y },
    });
  }

  const stageData: StageData = {
    id: course.id,
    stageNumber,
    title: course.title,
    roomWidth,
    roomHeight,
    concepts,
    quizzes,
    ...(course.signboards?.length && { signboards: course.signboards }),
    doorPosition: { x: DOOR_X, y: DOOR_Y },
    spawnPosition: { x: SPAWN_X, y: SPAWN_Y },
    nextStage: stageNumber < totalStages ? stageNumber + 1 : null,
    previousStage: stageNumber > 1 ? stageNumber - 1 : null,
  };

  const tmjMap = generateStageRoomTmj(stageData);

  return { map: tmjMap, stage: stageData };
}

// ── Public API: generateCourseInfo ───────────────────────────────────────

/**
 * Build a CourseInfo summary from course data.
 *
 * @param paperSlug   The paper identifier (slug)
 * @param courseSlug  The course identifier (slug)
 * @param courses     Array of CourseEntry from courses.json
 * @param color       Optional color for the course (default: '#4A90D9')
 */
export function generateCourseInfo(
  paperSlug: string,
  courseSlug: string,
  courses: CourseEntry[],
  color: string = '#4A90D9',
): CourseInfo {
  return {
    courseId: courseSlug,
    paperId: paperSlug,
    title: courses[0]?.title ?? courseSlug,
    description: courses[0]?.description ?? '',
    totalStages: courses.length,
    stages: courses.map((c, i) => ({
      stageNumber: i + 1,
      title: c.title,
      conceptCount: c.lessons.length,
      hasQuiz: c.lessons.some((l) => l.exercise?.trim()),
    })),
  };
}

// ── Village grid helpers ─────────────────────────────────────────────────

interface GridLayout {
  cols: number;
  rows: number;
  mapWidth: number;
  mapHeight: number;
}

function computeGridLayout(courseCount: number): GridLayout {
  if (courseCount <= 0) {
    return { cols: 1, rows: 1, mapWidth: PLOT_WIDTH, mapHeight: PLOT_HEIGHT };
  }
  const cols = Math.ceil(Math.sqrt(courseCount));
  const rows = Math.ceil(courseCount / cols);
  return {
    cols,
    rows,
    mapWidth: cols * PLOT_WIDTH,
    mapHeight: rows * PLOT_HEIGHT,
  };
}

// ── Public API: generateVillageMap ───────────────────────────────────────

/**
 * Generate a village TMJ map from an array of courses.
 * Uses the plot grid system (18x14 tiles per plot, dynamic grid based on course count).
 *
 * @param courses  Array of { paperId, label, color } for each course building
 */
export function generateVillageMap(
  courses: Array<{ paperId: string; label: string; color: string }>,
): TmjMap {
  const layout = computeGridLayout(courses.length);
  const { mapWidth, mapHeight } = layout;

  // Ground data
  const groundData: number[] = [];
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const localX = x % PLOT_WIDTH;
      const localY = y % PLOT_HEIGHT;
      const isBorder =
        localX === 0 ||
        localX === PLOT_WIDTH - 1 ||
        localY === 0 ||
        localY === PLOT_HEIGHT - 1;
      groundData.push(isBorder ? 3 : (x + y) % 2 === 0 ? 1 : 2);
    }
  }

  const collisionData = new Array<number>(mapWidth * mapHeight).fill(0);

  // Spawn point: center of the first plot
  const spawnTileX = Math.floor(PLOT_WIDTH / 2); // 9
  const spawnTileY = Math.floor(PLOT_HEIGHT / 2) + 2; // 9

  // Course entrance objects
  const courseObjects: TmjObject[] = courses.map((course, i) => {
    const plotCol = i % layout.cols;
    const plotRow = Math.floor(i / layout.cols);
    const buildingX =
      plotCol * PLOT_WIDTH +
      PLOT_BORDER +
      Math.floor((PLOT_INNER_WIDTH - BUILDING_WIDTH) / 2);
    const buildingY =
      plotRow * PLOT_HEIGHT +
      PLOT_BORDER +
      Math.floor((PLOT_INNER_HEIGHT - BUILDING_HEIGHT) / 2) -
      1;

    return {
      id: i + 2,
      name: `course-${course.paperId}`,
      type: 'course_entrance',
      x: buildingX * TILE_PX,
      y: buildingY * TILE_PX,
      width: BUILDING_WIDTH * TILE_PX,
      height: BUILDING_HEIGHT * TILE_PX,
      rotation: 0,
      visible: true,
      properties: [
        { name: 'paperId', type: 'string' as const, value: course.paperId },
        { name: 'label', type: 'string' as const, value: course.label },
        { name: 'color', type: 'string' as const, value: course.color },
      ],
    };
  });

  const groundLayer: TmjTileLayer = {
    type: 'tilelayer',
    id: 1,
    name: 'ground',
    data: groundData,
    width: mapWidth,
    height: mapHeight,
    x: 0,
    y: 0,
    visible: true,
    opacity: 1,
  };

  const collisionLayer: TmjTileLayer = {
    type: 'tilelayer',
    id: 2,
    name: 'collision',
    data: collisionData,
    width: mapWidth,
    height: mapHeight,
    x: 0,
    y: 0,
    visible: false,
    opacity: 1,
  };

  const objectsLayer: TmjObjectGroup = {
    type: 'objectgroup',
    id: 3,
    name: 'objects',
    draworder: 'topdown',
    x: 0,
    y: 0,
    visible: true,
    opacity: 1,
    objects: [
      {
        id: 1,
        name: 'spawn',
        type: 'spawn',
        x: spawnTileX * TILE_PX,
        y: spawnTileY * TILE_PX,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
        point: true,
      },
      ...courseObjects,
    ],
  };

  return {
    type: 'map',
    version: '1.10',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width: mapWidth,
    height: mapHeight,
    tilewidth: TILE_PX,
    tileheight: TILE_PX,
    infinite: false,
    layers: [groundLayer, collisionLayer, objectsLayer],
    tilesets: [
      {
        firstgid: 1,
        name: 'village-tiles',
        tilewidth: TILE_PX,
        tileheight: TILE_PX,
        tilecount: 3,
        columns: 3,
        image: '',
        imagewidth: TILE_PX * 3,
        imageheight: TILE_PX,
        tiles: [
          {
            id: 0,
            type: 'grass-light',
            properties: [
              { name: 'color', type: 'string', value: '#5B8C5A' },
            ],
          },
          {
            id: 1,
            type: 'grass-dark',
            properties: [
              { name: 'color', type: 'string', value: '#4A7C59' },
            ],
          },
          {
            id: 2,
            type: 'path',
            properties: [
              { name: 'color', type: 'string', value: '#D2B48C' },
            ],
          },
        ],
      },
    ],
  };
}
