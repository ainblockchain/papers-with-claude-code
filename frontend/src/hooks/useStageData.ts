'use client';

import { useQuery } from '@tanstack/react-query';

// Stage data matches the StageFileOutput from map-generator
interface StageFileOutput {
  map: unknown; // TmjMap
  stage: {
    id: string;
    stageNumber: number;
    title: string;
    roomWidth: number;
    roomHeight: number;
    concepts: Array<{
      id: string;
      title: string;
      content: string;
      position: { x: number; y: number };
      type: string;
    }>;
    quiz: {
      id: string;
      question: string;
      type: string;
      options: string[];
      correctAnswer: string;
      position: { x: number; y: number };
    };
    doorPosition: { x: number; y: number };
    spawnPosition: { x: number; y: number };
    nextStage: number | null;
    previousStage: number | null;
  };
}

async function fetchStageData(courseId: string, stageNumber: number): Promise<StageFileOutput> {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/stages/${stageNumber}`);
  if (!res.ok) throw new Error(`Failed to fetch stage ${stageNumber} for course ${courseId}`);
  return res.json();
}

export function useStageData(courseId: string | null, stageNumber: number | null) {
  return useQuery({
    queryKey: ['stage-data', courseId, stageNumber],
    queryFn: () => fetchStageData(courseId!, stageNumber!),
    enabled: !!courseId && stageNumber != null && stageNumber > 0,
    staleTime: 30 * 60 * 1000, // 30 minutes - stage data changes very rarely
  });
}
