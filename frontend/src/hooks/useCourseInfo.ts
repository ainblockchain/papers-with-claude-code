'use client';

import { useQuery } from '@tanstack/react-query';

interface CourseInfo {
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

async function fetchCourseInfo(courseId: string): Promise<CourseInfo> {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}`);
  if (!res.ok) throw new Error(`Failed to fetch course: ${courseId}`);
  return res.json();
}

export function useCourseInfo(courseId: string | null) {
  return useQuery({
    queryKey: ['course-info', courseId],
    queryFn: () => fetchCourseInfo(courseId!),
    enabled: !!courseId,
    staleTime: 10 * 60 * 1000,
  });
}
