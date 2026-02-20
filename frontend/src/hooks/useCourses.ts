'use client';

import { useQuery } from '@tanstack/react-query';
import type { Paper } from '@/types/paper';

async function fetchCourses(): Promise<Paper[]> {
  const res = await fetch('/api/courses');
  if (!res.ok) throw new Error('Failed to fetch courses');
  return res.json();
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
    staleTime: 10 * 60 * 1000, // 10 minutes - data rarely changes
  });
}
