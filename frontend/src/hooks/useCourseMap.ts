'use client';

import { useState, useEffect } from 'react';
import type { ParsedMap } from '@/types/tmj';
import { mapLoaderAdapter } from '@/lib/adapters/map-loader';
import { parseTmjMap } from '@/lib/tmj/parser';

export type CourseMapSource = 'course' | 'default';

export interface CourseMapResult {
  mapData: ParsedMap | null;
  source: CourseMapSource | null;
}

interface UseCourseMapResult extends CourseMapResult {
  loading: boolean;
  error: string | null;
}

const DEFAULT_MAP_ID = 'course-room';

function courseMapId(courseId: string, stageIndex: number): string {
  return `courses/${courseId}/stage-${stageIndex}`;
}

export async function loadCourseMap(
  courseId: string | null | undefined,
  stageIndex: number,
): Promise<CourseMapResult> {
  let raw = null;
  let resolvedSource: CourseMapSource = 'default';

  if (courseId) {
    raw = await mapLoaderAdapter.loadMap(courseMapId(courseId, stageIndex));
    if (raw) resolvedSource = 'course';
  }

  if (!raw) {
    raw = await mapLoaderAdapter.loadMap(DEFAULT_MAP_ID);
    resolvedSource = 'default';
  }

  if (!raw) return { mapData: null, source: null };
  return { mapData: parseTmjMap(raw), source: resolvedSource };
}

export function useCourseMap(
  courseId: string | null | undefined,
  stageIndex: number,
): UseCourseMapResult {
  const [mapData, setMapData] = useState<ParsedMap | null>(null);
  const [source, setSource] = useState<CourseMapSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await loadCourseMap(courseId, stageIndex);
        if (cancelled) return;
        setMapData(result.mapData);
        setSource(result.source);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Map load failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, stageIndex]);

  return { mapData, source, loading, error };
}
