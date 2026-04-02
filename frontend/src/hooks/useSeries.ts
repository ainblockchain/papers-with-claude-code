'use client';

import { useQuery } from '@tanstack/react-query';
import type { Series } from '@/types/paper';

async function fetchSeries(): Promise<Series[]> {
  const res = await fetch('/api/series');
  if (!res.ok) throw new Error('Failed to fetch series');
  return res.json();
}

export function useSeries() {
  return useQuery({
    queryKey: ['series'],
    queryFn: fetchSeries,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}
