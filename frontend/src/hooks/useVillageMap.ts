'use client';

import { useMemo } from 'react';
import type { ParsedMap } from '@/types/tmj';
import type { CourseLocation } from '@/lib/ain/location-types';
import { assignCoursesToGrid, generateVillageTmj, type GridLayout } from '@/lib/tmj/village-generator';
import { parseTmjMap } from '@/lib/tmj/parser';

export interface UseVillageMapResult {
  mapData: ParsedMap | null;
  mapDimensions: { width: number; height: number };
  gridLayout: GridLayout;
}

/**
 * Generates a ParsedMap from the current courseLocations using the plot grid system.
 * Memoized — only regenerates when the course list changes.
 */
export function useVillageMap(courseLocations: CourseLocation[]): UseVillageMapResult {
  return useMemo(() => {
    const courses = courseLocations.map((cl) => ({
      paperId: cl.paperId,
      label: cl.label,
      color: cl.color,
    }));

    const { layout, assignments } = assignCoursesToGrid(courses);
    const tmj = generateVillageTmj(layout, assignments);
    const mapData = parseTmjMap(tmj);

    return {
      mapData,
      mapDimensions: { width: layout.mapWidth, height: layout.mapHeight },
      gridLayout: layout,
    };
  }, [courseLocations]);
}
