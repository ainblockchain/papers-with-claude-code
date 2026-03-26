'use client';

import { useLearningStore } from '@/stores/useLearningStore';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, DoorOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function StageProgressBar() {
  const router = useRouter();
  const { currentPaper, stages, currentStageIndex, progress: userProgress } = useLearningStore();

  if (!currentPaper) return null;

  const totalStages = stages.length;
  const completedCount = userProgress?.completedStages?.length ?? 0;
  const progressPercent = totalStages > 0 ? (completedCount / totalStages) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-[#E5E7EB]">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/explore')}
        className="h-8 px-2 text-[#6B7280]"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Exit
      </Button>

      <div className="h-4 w-px bg-[#E5E7EB]" />

      <DoorOpen className="h-4 w-4 text-[#FF9D00]" />
      <span className="text-sm font-medium text-[#111827] truncate max-w-[300px]">
        {currentPaper.title}
      </span>

      <div className="h-4 w-px bg-[#E5E7EB]" />

      <span className="text-xs text-[#6B7280] whitespace-nowrap">Progress</span>

      <Progress value={progressPercent} className="w-24 h-2" />

      <span className="text-xs text-[#6B7280]">{Math.round(progressPercent)}%</span>
    </div>
  );
}
