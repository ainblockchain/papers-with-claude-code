/**
 * generate-maps.ts
 *
 * Converts courses.json + course-metadata.json → TMJ map files
 * conforming to frontend/docs/map-api-spec.md.
 *
 * Usage:
 *   npx tsx generate-maps.ts <knowledge-dir>
 *   npx ts-node generate-maps.ts <knowledge-dir>
 *
 * Inputs  (must exist):
 *   <knowledge-dir>/courses.json
 *   <knowledge-dir>/map/course-metadata.json
 *   <knowledge-dir>/map/correct-answers.json
 *
 * Outputs (created/overwritten):
 *   <knowledge-dir>/map/village.tmj
 *   <knowledge-dir>/map/stages/1.json … N.json
 *   <knowledge-dir>/map/course-info.json
 */

import fs from 'fs';
import path from 'path';

// ── Types (input) ─────────────────────────────────────────────────────────

interface Lesson {
  concept_id: string;
  title: string;
  key_ideas: string[];
  exercise: string;
  explanation: string;
  prerequisites: string[];
}

interface CourseEntry {
  id: string;
  title: string;
  description?: string;
  concepts: string[];
  lessons: Lesson[];
}

interface StageInfo {
  stageNumber: number;
  title: string;
  conceptCount: number;
  hasQuiz: boolean;
  roomWidth: number;
  roomHeight: number;
}

interface CourseMetadata {
  courseId: string;
  paperId: string;
  title: string;
  description?: string;
  authors?: Array<{ id: string; name: string; avatarUrl: string | null }>;
  publishedAt?: string;
  arxivUrl?: string;
  githubUrl?: string | null;
  githubStars?: number | null;
  organization?: { name: string; logoUrl: string | null } | null;
  color: string;
  plotPosition: { col: number; row: number };
  entrance: { x: number; y: number; width: number; height: number };
  stages: StageInfo[];
}

// ── Types (TMJ output) ────────────────────────────────────────────────────

interface TmjProperty {
  name: string;
  type: string;
  value: string | number | boolean;
}

interface TmjTileDef {
  id: number;
  type?: string;
  properties?: TmjProperty[];
}

interface TmjTilesetRef {
  firstgid: number;
  name: string;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  image?: string;
  imagewidth?: number;
  imageheight?: number;
  tiles: TmjTileDef[];
}

interface TmjTileLayer {
  type: 'tilelayer';
  id: number;
  name: string;
  data: number[];
  width: number;
  height: number;
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
}

interface TmjObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  point?: boolean;
  properties?: TmjProperty[];
}

interface TmjObjectGroup {
  type: 'objectgroup';
  id: number;
  name: string;
  draworder: string;
  x: number;
  y: number;
  visible: boolean;
  opacity: number;
  objects: TmjObject[];
}

interface TmjMap {
  type: 'map';
  version: string;
  orientation: string;
  renderorder: string;
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  infinite: boolean;
  layers: (TmjTileLayer | TmjObjectGroup)[];
  tilesets: TmjTilesetRef[];
}

// ── Types (stage output) ──────────────────────────────────────────────────

interface ConceptPosition {
  x: number;
  y: number;
}

interface QuizData {
  id: string;
  question: string;
  type: 'multiple-choice';
  options: string[];
  correctAnswer: string;
  position: { x: number; y: number };
}

interface ConceptData {
  id: string;
  title: string;
  content: string;
  position: ConceptPosition;
  type: 'text';
}

interface StageData {
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

interface StageFileOutput {
  map: TmjMap;
  stage: StageData;
}

// ── Constants (mirrors frontend/src/lib/tmj/village-generator.ts) ─────────

const PLOT_INNER_WIDTH  = 16;
const PLOT_INNER_HEIGHT = 12;
const PLOT_BORDER       = 1;
const PLOT_WIDTH        = PLOT_INNER_WIDTH  + PLOT_BORDER * 2; // 18
const PLOT_HEIGHT       = PLOT_INNER_HEIGHT + PLOT_BORDER * 2; // 14
const BUILDING_WIDTH    = 4;
const BUILDING_HEIGHT   = 3;
const TILE_PX           = 40;

// Stage room constants
const ROOM_WIDTH  = 20;
const ROOM_HEIGHT = 15;
const SPAWN_X = 1;
const SPAWN_Y = 7;
const DOOR_X  = 18;
const DOOR_Y  = 7;

// ── Quiz parsing ──────────────────────────────────────────────────────────

function parseExercise(
  lesson: Lesson,
  correctAnswers: Record<string, string>,
  quizId: string,
): QuizData {
  const exercise  = lesson.exercise ?? '';
  const rawAnswer = correctAnswers[lesson.concept_id] ?? '';
  const doorPos   = { x: DOOR_X, y: DOOR_Y };

  // True / False format
  if (
    exercise.includes("True or False:") ||
    exercise.includes("Type 'True' or 'False'") ||
    exercise.toLowerCase().includes("true or false")
  ) {
    const questionLine = exercise.split('\n').find(l => l.trim() && !l.startsWith("Type"))?.trim() ?? exercise.split('\n')[0].trim();
    return {
      id: quizId,
      question: questionLine,
      type: 'multiple-choice',
      options: ['True', 'False'],
      correctAnswer: rawAnswer || 'False',
      position: doorPos,
    };
  }

  // Numbered choice format: "...\n1) A\n2) B\n3) C\n\nType the number."
  const lines       = exercise.split('\n').filter(l => l.trim());
  const optionLines = lines.filter(l => /^\d+[)\.]/.test(l.trim()));
  const questionLines = lines.filter(l => !/^\d+[)\.]/.test(l.trim()) && !l.trim().startsWith('Type'));
  const options     = optionLines.map(l => l.replace(/^\d+[)\.]\s*/, '').trim());

  const question = questionLines.join(' ').trim() || exercise.split('\n')[0].trim();

  let correctAnswer: string;
  const answerIndex = parseInt(rawAnswer, 10) - 1;
  if (!isNaN(answerIndex) && answerIndex >= 0 && answerIndex < options.length) {
    correctAnswer = options[answerIndex];
  } else {
    correctAnswer = rawAnswer || (options[0] ?? '');
  }

  return {
    id: quizId,
    question,
    type: 'multiple-choice',
    options: options.length >= 2 ? options : ['True', 'False'],
    correctAnswer,
    position: doorPos,
  };
}

// ── Concept position layout ───────────────────────────────────────────────

/**
 * Distributes N concepts across the stage room.
 * For ≤4 concepts: single row at y=6.
 * For 5-8 concepts: two rows at y=4 and y=10.
 * x starts at 3, increments by 3 per column (max 4 columns: 3,6,9,12).
 */
function computeConceptPositions(count: number): ConceptPosition[] {
  const positions: ConceptPosition[] = [];

  if (count <= 4) {
    // Single row, centered vertically
    for (let i = 0; i < count; i++) {
      positions.push({ x: 3 + i * 3, y: 6 });
    }
  } else {
    // Two rows
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

// ── Stage room TMJ generation ─────────────────────────────────────────────

function generateStageRoomTmj(stageData: StageData): TmjMap {
  const W = stageData.roomWidth;
  const H = stageData.roomHeight;
  const doorY = stageData.doorPosition.y;

  // Floor layer
  const floorData: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isBorder = x === 0 || x === W - 1 || y === 0 || y === H - 1;
      floorData.push(isBorder ? 3 : (x + y) % 2 === 0 ? 1 : 2);
    }
  }

  // Collision layer
  // Right wall (x=W-1) is always blocked; door passage handled by game logic
  const collisionData: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const isBorderTop    = y === 0;
      const isBorderBottom = y === H - 1;
      const isBorderLeft   = x === 0;
      const isBorderRight  = x === W - 1;
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
      { name: 'conceptId', type: 'string', value: c.id },
      { name: 'title',     type: 'string', value: c.title },
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
          { id: 0, type: 'floor-light', properties: [{ name: 'color', type: 'string', value: '#E8D5A3' }] },
          { id: 1, type: 'floor-dark',  properties: [{ name: 'color', type: 'string', value: '#C9B88A' }] },
          { id: 2, type: 'wall',        properties: [{ name: 'color', type: 'string', value: '#8B6914' }] },
        ],
      },
    ],
  };
}

// ── Stage data + TMJ generation ───────────────────────────────────────────

function generateStageFile(
  stageNumber: number,
  course: CourseEntry,
  metadata: CourseMetadata,
  correctAnswers: Record<string, string>,
  totalStages: number,
): StageFileOutput {
  const stageInfo = metadata.stages?.find(s => s.stageNumber === stageNumber);
  const roomWidth  = stageInfo?.roomWidth  ?? ROOM_WIDTH;
  const roomHeight = stageInfo?.roomHeight ?? ROOM_HEIGHT;

  // Concept positions
  const positions = computeConceptPositions(course.lessons.length);

  // Concepts
  const concepts: ConceptData[] = course.lessons.map((lesson, i) => ({
    id: lesson.concept_id,
    title: lesson.title,
    content: buildConceptContent(lesson),
    position: positions[i] ?? { x: 3 + i * 2, y: 6 },
    type: 'text',
  }));

  // Quiz: use the lesson with an exercise from correct-answers.json.
  // Preference: last lesson that has a correct answer entry.
  let quizLesson = [...course.lessons].reverse().find(l => correctAnswers[l.concept_id]);
  if (!quizLesson) quizLesson = course.lessons[course.lessons.length - 1];

  const quiz = parseExercise(
    quizLesson,
    correctAnswers,
    `quiz-stage-${stageNumber}`,
  );

  const stageData: StageData = {
    id: course.id,
    stageNumber,
    title: course.title,
    roomWidth,
    roomHeight,
    concepts,
    quiz,
    doorPosition:  { x: DOOR_X,  y: DOOR_Y  },
    spawnPosition: { x: SPAWN_X, y: SPAWN_Y },
    nextStage:     stageNumber < totalStages ? stageNumber + 1 : null,
    previousStage: stageNumber > 1           ? stageNumber - 1 : null,
  };

  const tmjMap = generateStageRoomTmj(stageData);

  return { map: tmjMap, stage: stageData };
}

/** Build rich concept content from lesson key_ideas + explanation. */
function buildConceptContent(lesson: Lesson): string {
  const keyIdeasBlock = lesson.key_ideas?.length
    ? `Key ideas:\n${lesson.key_ideas.map(k => `- ${k}`).join('\n')}\n\n`
    : '';
  return `${keyIdeasBlock}${lesson.explanation ?? ''}`.trim();
}

// ── Village TMJ generation (mirrors village-generator.ts) ─────────────────

function generateVillageTmj(metadata: CourseMetadata): TmjMap {
  const mapWidth  = PLOT_WIDTH;
  const mapHeight = PLOT_HEIGHT;

  // Spawn: center of first plot
  const spawnTileX = Math.floor(PLOT_WIDTH  / 2); // 9
  const spawnTileY = Math.floor(PLOT_HEIGHT / 2) + 2; // 9

  // Building position (assignCoursesToGrid formula for plotCol=0, plotRow=0)
  const buildingX =
    PLOT_BORDER + Math.floor((PLOT_INNER_WIDTH  - BUILDING_WIDTH)  / 2); // 7
  const buildingY =
    PLOT_BORDER + Math.floor((PLOT_INNER_HEIGHT - BUILDING_HEIGHT) / 2) - 1; // 4

  // Ground data
  const groundData: number[] = [];
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const localX = x % PLOT_WIDTH;
      const localY = y % PLOT_HEIGHT;
      const isBorder =
        localX === 0 || localX === PLOT_WIDTH - 1 ||
        localY === 0 || localY === PLOT_HEIGHT - 1;
      groundData.push(isBorder ? 3 : (x + y) % 2 === 0 ? 1 : 2);
    }
  }

  const collisionData = new Array<number>(mapWidth * mapHeight).fill(0);

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
      {
        id: 2,
        name: `course-${metadata.paperId}`,
        type: 'course_entrance',
        x: buildingX * TILE_PX,
        y: buildingY * TILE_PX,
        width:  BUILDING_WIDTH  * TILE_PX,
        height: BUILDING_HEIGHT * TILE_PX,
        rotation: 0,
        visible: true,
        properties: [
          { name: 'paperId', type: 'string', value: metadata.paperId },
          { name: 'label',   type: 'string', value: metadata.title   },
          { name: 'color',   type: 'string', value: metadata.color   },
        ],
      },
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
          { id: 0, type: 'grass-light', properties: [{ name: 'color', type: 'string', value: '#5B8C5A' }] },
          { id: 1, type: 'grass-dark',  properties: [{ name: 'color', type: 'string', value: '#4A7C59' }] },
          { id: 2, type: 'path',        properties: [{ name: 'color', type: 'string', value: '#D2B48C' }] },
        ],
      },
    ],
  };
}

// ── Course info generation ────────────────────────────────────────────────

function generateCourseInfo(metadata: CourseMetadata, courses: CourseEntry[]) {
  return {
    courseId:    metadata.courseId,
    paperId:     metadata.paperId,
    title:       metadata.title,
    description: metadata.description ?? '',
    authors:     metadata.authors ?? [],
    publishedAt: metadata.publishedAt ?? '',
    arxivUrl:    metadata.arxivUrl ?? '',
    githubUrl:   metadata.githubUrl ?? null,
    githubStars: metadata.githubStars ?? null,
    organization: metadata.organization ?? null,
    color:        metadata.color,
    plotPosition: metadata.plotPosition,
    entrance:     metadata.entrance,
    status:       'ready',
    totalStages:  courses.length,
    stages: courses.map((c, i) => {
      const info = metadata.stages?.find(s => s.stageNumber === i + 1);
      return {
        stageNumber:  i + 1,
        title:        c.title,
        conceptCount: c.lessons.length,
        hasQuiz:      c.lessons.some(l => l.exercise?.trim()),
        roomWidth:    info?.roomWidth  ?? ROOM_WIDTH,
        roomHeight:   info?.roomHeight ?? ROOM_HEIGHT,
      };
    }),
    progress: null,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────

function generateMaps(knowledgeDir: string, mapDir?: string): void {
  const coursesPath    = path.join(knowledgeDir, 'courses.json');
  const resolvedMapDir = mapDir ?? path.join(knowledgeDir, 'map');
  const metadataPath   = path.join(resolvedMapDir, 'course-metadata.json');
  const answersPath    = path.join(resolvedMapDir, 'correct-answers.json');

  // Validate inputs
  for (const p of [coursesPath, metadataPath, answersPath]) {
    if (!fs.existsSync(p)) {
      console.error(`❌ Required file not found: ${p}`);
      process.exit(1);
    }
  }

  const courses: CourseEntry[]      = JSON.parse(fs.readFileSync(coursesPath,  'utf8'));
  const metadata: CourseMetadata    = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  const correctAnswers: Record<string, string> = JSON.parse(fs.readFileSync(answersPath, 'utf8'));

  const stagesDir = path.join(resolvedMapDir, 'stages');
  fs.mkdirSync(stagesDir, { recursive: true });

  console.log(`\n📦 Generating maps for: ${metadata.title}`);
  console.log(`   ${courses.length} courses (stages) × ${courses.reduce((n, c) => n + c.lessons.length, 0)} concepts total\n`);

  // 1. village.tmj
  const villageTmj = generateVillageTmj(metadata);
  fs.writeFileSync(path.join(resolvedMapDir, 'village.tmj'), JSON.stringify(villageTmj, null, 2));
  console.log(`✓ village.tmj  (${villageTmj.width}×${villageTmj.height} tiles)`);

  // 2. stages/N.json
  for (let i = 0; i < courses.length; i++) {
    const stageNumber = i + 1;
    const stageFile   = generateStageFile(stageNumber, courses[i], metadata, correctAnswers, courses.length);
    fs.writeFileSync(path.join(stagesDir, `${stageNumber}.json`), JSON.stringify(stageFile, null, 2));

    const objs  = stageFile.map.layers[2] as TmjObjectGroup;
    const npcs  = objs.objects.filter(o => o.type === 'npc').length;
    console.log(`✓ stages/${stageNumber}.json  (${stageFile.map.width}×${stageFile.map.height}, ${npcs} NPCs, quiz: "${stageFile.stage.quiz.question.slice(0, 50)}...")`);
  }

  // 3. course-info.json
  const courseInfo = generateCourseInfo(metadata, courses);
  fs.writeFileSync(path.join(resolvedMapDir, 'course-info.json'), JSON.stringify(courseInfo, null, 2));
  console.log(`✓ course-info.json  (status: "${courseInfo.status}", ${courseInfo.totalStages} stages)`);

  console.log('\n✅ All map files generated successfully!');
}

// ── CLI entry point ───────────────────────────────────────────────────────

// courses.json 위치 (기본: courseGenerator 하위 bible/knowledge)
const knowledgeDir = process.argv[2] ??
  path.join(
    __dirname,
    'courseGenerator',
    'awesome-papers-with-claude-code',
    'attention-is-all-you-need',
    'bible',
    'knowledge',
  );

// map/ 위치 (기본: knowledge-graph-builder/map — 이동된 경로)
const mapDir = process.argv[3] ?? path.join(__dirname, 'map');

generateMaps(path.resolve(knowledgeDir), path.resolve(mapDir));
