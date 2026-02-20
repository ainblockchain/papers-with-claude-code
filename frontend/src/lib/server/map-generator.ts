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

export interface Lesson {
  concept_id: string;
  title: string;
  key_ideas: string[];
  exercise: string;
  explanation: string;
  prerequisites: string[];
}

export interface CourseEntry {
  id: string;
  title: string;
  description?: string;
  concepts: string[];
  lessons: Lesson[];
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
  quiz: QuizData;
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
 * Parse a lesson's exercise text into quiz data.
 * Without correct-answers.json, correctAnswer defaults to "" (empty string).
 */
function parseExercise(lesson: Lesson, quizId: string): QuizData {
  const exercise = lesson.exercise ?? '';
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
      correctAnswer: '',
      position: doorPos,
    };
  }

  // Numbered choice format: "...\n1) A\n2) B\n3) C\n\nType the number."
  const lines = exercise.split('\n').filter((l) => l.trim());
  const optionLines = lines.filter((l) => /^\d+[).]/.test(l.trim()));
  const questionLines = lines.filter(
    (l) => !/^\d+[).]/.test(l.trim()) && !l.trim().startsWith('Type'),
  );
  const options = optionLines.map((l) => l.replace(/^\d+[).]\s*/, '').trim());

  const question =
    questionLines.join(' ').trim() || exercise.split('\n')[0].trim();

  return {
    id: quizId,
    question,
    type: 'multiple-choice',
    options: options.length >= 2 ? options : ['True', 'False'],
    correctAnswer: '',
    position: doorPos,
  };
}

// ── Concept position layout ──────────────────────────────────────────────

/**
 * Distributes N concepts across the stage room.
 * For <=4 concepts: single row at y=6.
 * For 5-8 concepts: two rows at y=4 and y=10.
 * x starts at 3, increments by 3 per column (max 4 columns: 3,6,9,12).
 */
function computeConceptPositions(count: number): ConceptPosition[] {
  const positions: ConceptPosition[] = [];

  if (count <= 4) {
    for (let i = 0; i < count; i++) {
      positions.push({ x: 3 + i * 3, y: 6 });
    }
  } else {
    const topCount = Math.ceil(count / 2);
    const botCount = count - topCount;
    for (let i = 0; i < topCount; i++) {
      positions.push({ x: 3 + i * 3, y: 4 });
    }
    for (let i = 0; i < botCount; i++) {
      positions.push({ x: 3 + i * 3, y: 10 });
    }
  }

  return positions;
}

// ── Build concept content ────────────────────────────────────────────────

/** Build rich concept content from lesson key_ideas + explanation. */
function buildConceptContent(lesson: Lesson): string {
  const keyIdeasBlock = lesson.key_ideas?.length
    ? `Key ideas:\n${lesson.key_ideas.map((k) => `- ${k}`).join('\n')}\n\n`
    : '';
  return `${keyIdeasBlock}${lesson.explanation ?? ''}`.trim();
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

  // Quiz: prefer last lesson that has an exercise, else use the very last lesson
  let quizLesson = [...course.lessons]
    .reverse()
    .find((l) => l.exercise?.trim());
  if (!quizLesson) quizLesson = course.lessons[course.lessons.length - 1];

  const quiz = parseExercise(quizLesson, `quiz-stage-${stageNumber}`);

  const stageData: StageData = {
    id: course.id,
    stageNumber,
    title: course.title,
    roomWidth,
    roomHeight,
    concepts,
    quiz,
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
