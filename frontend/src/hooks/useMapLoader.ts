'use client';

import { useState, useEffect } from 'react';
import type { ParsedMap } from '@/types/tmj';
import { mapLoaderAdapter } from '@/lib/adapters/map-loader';
import { parseTmjMap } from '@/lib/tmj/parser';

interface UseMapLoaderResult {
  mapData: ParsedMap | null;
  loading: boolean;
  error: string | null;
}

export function useMapLoader(mapId: string): UseMapLoaderResult {
  const [mapData, setMapData] = useState<ParsedMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const raw = await mapLoaderAdapter.loadMap(mapId);
        if (cancelled) return;
        if (!raw) {
          setLoading(false);
          return;
        }
        const parsed = parseTmjMap(raw);
        if (!cancelled) setMapData(parsed);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Map load failed');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [mapId]);

  return { mapData, loading, error };
}
