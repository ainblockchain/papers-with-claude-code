// Village map generator — produces a TmjMap from a list of courses using a plot grid system.
// Each course occupies one "plot" (viewport-sized area); the map expands as courses are added.

import type { TmjMap, TmjTileLayer, TmjObjectGroup, TmjObject } from '@/types/tmj';
import type { CourseLocation } from '@/lib/ain/location-types';

// ── Plot grid constants ──

export const PLOT_INNER_WIDTH = 16;
export const PLOT_INNER_HEIGHT = 12;
export const PLOT_BORDER = 1;
export const PLOT_WIDTH = PLOT_INNER_WIDTH + PLOT_BORDER * 2;   // 18
export const PLOT_HEIGHT = PLOT_INNER_HEIGHT + PLOT_BORDER * 2; // 14
export const BUILDING_WIDTH = 4;
export const BUILDING_HEIGHT = 3;

// ── Interfaces ──

export interface GridLayout {
  cols: number;
  rows: number;
  mapWidth: number;
  mapHeight: number;
}

export interface PlotAssignment {
  paperId: string;
  label: string;
  color: string;
  plotCol: number;
  plotRow: number;
  buildingX: number;
  buildingY: number;
}

export interface CourseInput {
  paperId: string;
  label: string;
  color: string;
}

// ── Grid computation ──

export function computeGridLayout(courseCount: number): GridLayout {
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

/** Assign each course to a plot position in the grid. */
export function assignCoursesToGrid(courses: CourseInput[]): {
  layout: GridLayout;
  assignments: PlotAssignment[];
} {
  const layout = computeGridLayout(courses.length);
  const assignments: PlotAssignment[] = courses.map((course, i) => {
    const plotCol = i % layout.cols;
    const plotRow = Math.floor(i / layout.cols);
    const buildingX =
      plotCol * PLOT_WIDTH + PLOT_BORDER + Math.floor((PLOT_INNER_WIDTH - BUILDING_WIDTH) / 2);
    const buildingY =
      plotRow * PLOT_HEIGHT + PLOT_BORDER + Math.floor((PLOT_INNER_HEIGHT - BUILDING_HEIGHT) / 2) - 1;
    return {
      paperId: course.paperId,
      label: course.label,
      color: course.color,
      plotCol,
      plotRow,
      buildingX,
      buildingY,
    };
  });
  return { layout, assignments };
}

// ── TMJ generation ──

function generateGroundData(mapWidth: number, mapHeight: number): number[] {
  const data = new Array<number>(mapWidth * mapHeight);
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const localX = x % PLOT_WIDTH;
      const localY = y % PLOT_HEIGHT;
      const isBorder =
        localX === 0 || localX === PLOT_WIDTH - 1 ||
        localY === 0 || localY === PLOT_HEIGHT - 1;
      if (isBorder) {
        data[y * mapWidth + x] = 3; // path tile
      } else {
        data[y * mapWidth + x] = (x + y) % 2 === 0 ? 1 : 2; // checkerboard grass
      }
    }
  }
  return data;
}

/** Generate a full TmjMap from grid layout and course assignments. */
export function generateVillageTmj(
  layout: GridLayout,
  assignments: PlotAssignment[],
): TmjMap {
  const { mapWidth, mapHeight } = layout;

  const groundData = generateGroundData(mapWidth, mapHeight);
  const collisionData = new Array<number>(mapWidth * mapHeight).fill(0);

  // Spawn point: center of the first plot (pixel coordinates)
  const spawnTileX = Math.floor(PLOT_WIDTH / 2);
  const spawnTileY = Math.floor(PLOT_HEIGHT / 2) + 2;

  const courseObjects: TmjObject[] = assignments.map((a, i) => ({
    id: i + 2,
    name: `course-${a.paperId}`,
    type: 'course_entrance',
    x: a.buildingX * 40,
    y: a.buildingY * 40,
    width: BUILDING_WIDTH * 40,
    height: BUILDING_HEIGHT * 40,
    rotation: 0,
    visible: true,
    properties: [
      { name: 'paperId', type: 'string' as const, value: a.paperId },
      { name: 'label', type: 'string' as const, value: a.label },
      { name: 'color', type: 'string' as const, value: a.color },
    ],
  }));

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
    objects: [
      {
        id: 1,
        name: 'spawn',
        type: 'spawn',
        x: spawnTileX * 40,
        y: spawnTileY * 40,
        width: 0,
        height: 0,
        rotation: 0,
        visible: true,
        point: true,
      },
      ...courseObjects,
    ],
    x: 0,
    y: 0,
    visible: true,
    opacity: 1,
  };

  return {
    type: 'map',
    version: '1.10',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width: mapWidth,
    height: mapHeight,
    tilewidth: 40,
    tileheight: 40,
    infinite: false,
    layers: [groundLayer, collisionLayer, objectsLayer],
    tilesets: [
      {
        firstgid: 1,
        name: 'village-tiles',
        tilewidth: 40,
        tileheight: 40,
        tilecount: 3,
        columns: 3,
        image: '',
        imagewidth: 120,
        imageheight: 40,
        tiles: [
          { id: 0, type: 'grass-light', properties: [{ name: 'color', type: 'string', value: '#5B8C5A' }] },
          { id: 1, type: 'grass-dark', properties: [{ name: 'color', type: 'string', value: '#4A7C59' }] },
          { id: 2, type: 'path', properties: [{ name: 'color', type: 'string', value: '#D2B48C' }] },
        ],
      },
    ],
  };
}

// ── CourseLocation generation ──

/** Convert grid assignments to CourseLocation[] for the village store. */
export function generateCourseLocations(
  courses: CourseInput[],
  assignments: PlotAssignment[],
): CourseLocation[] {
  return assignments.map((a, i) => ({
    paperId: a.paperId,
    label: a.label,
    x: a.buildingX,
    y: a.buildingY,
    width: BUILDING_WIDTH,
    height: BUILDING_HEIGHT,
    color: a.color,
    registeredAt: Date.now(),
  }));
}
