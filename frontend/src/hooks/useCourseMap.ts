'use client';

import { useState, useEffect } from 'react';
import type { ParsedMap } from '@/types/tmj';
import { mapLoaderAdapter } from '@/lib/adapters/map-loader';
import { parseTmjMap } from '@/lib/tmj/parser';

export type CourseMapSource = 'course' | 'default';

interface UseCourseMapResult {
  mapData: ParsedMap | null;
  source: CourseMapSource | null;
  loading: boolean;
  error: string | null;
}

const DEFAULT_MAP_ID = 'course-room';

function courseMapId(courseId: string, stageIndex: number): string {
  return `courses/${courseId}/stage-${stageIndex}`;
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

        if (cancelled) return;
        if (!raw) {
          setMapData(null);
          setSource(null);
          return;
        }

        setMapData(parseTmjMap(raw));
        setSource(resolvedSource);
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
