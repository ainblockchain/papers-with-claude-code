'use client';

import { useLearningStore } from '@/stores/useLearningStore';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, DoorOpen, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function StageProgressBar() {
  const router = useRouter();
  const {
    currentPaper,
    stages,
    currentStageIndex,
    progress: userProgress,
    setCurrentStageIndex,
    setQuizActive,
    setQuizPassed,
    setDoorUnlocked,
    setPlayerPosition,
  } = useLearningStore();

  if (!currentPaper) return null;

  const totalStages = stages.length;
  const completedCount = userProgress?.completedStages?.length ?? 0;
  const progressPercent = totalStages > 0 ? (completedCount / totalStages) * 100 : 0;

  const isStageUnlocked = (stageIndex: number) => {
    if (stageIndex === 0) return true; // First stage always unlocked
    // Stage is unlocked if:
    // 1. Previous stage's exit was unlocked (payment/skip recorded for stageIndex-1)
    // 2. This stage itself is completed (already played through)
    // unlockedStages stores the stage index where unlock happened, so checking
    // stageIndex-1 means "the exit of the previous stage was paid for"
    const previousExitUnlocked = userProgress?.unlockedStages?.includes(stageIndex - 1) ?? false;
    const thisStageCompleted = userProgress?.completedStages?.some(
      (s) => s.stageNumber === stageIndex
    ) ?? false;
    return previousExitUnlocked || thisStageCompleted;
  };

  const isStageCompleted = (stageIndex: number) => {
    // completedStages.stageNumber is 0-based
    return userProgress?.completedStages?.some((s) => s.stageNumber === stageIndex) ?? false;
  };

  const handleStageClick = (stageIndex: number) => {
    if (!isStageUnlocked(stageIndex)) return;
    if (stageIndex === currentStageIndex) return;

    // Reset stage state
    setQuizActive(false);
    setQuizPassed(isStageCompleted(stageIndex));
    setDoorUnlocked(false);
    setPlayerPosition({ x: 3, y: 10 });
    setCurrentStageIndex(stageIndex);
  };

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
      <span className="text-sm font-medium text-[#111827] truncate max-w-[200px]">
        {currentPaper.title}
      </span>

      <div className="h-4 w-px bg-[#E5E7EB]" />

      <span className="text-xs text-[#6B7280] whitespace-nowrap">Progress</span>

      <Progress value={progressPercent} className="w-24 h-2" />

      <span className="text-xs text-[#6B7280]">{Math.round(progressPercent)}%</span>

      {/* Spacer to push stage navigation to the right */}
      <div className="flex-1" />

      {/* Stage Navigation */}
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-1">
          {stages.map((stage, index) => {
            const unlocked = isStageUnlocked(index);
            const completed = isStageCompleted(index);
            const isCurrent = index === currentStageIndex;

            return (
              <Tooltip key={stage.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleStageClick(index)}
                    disabled={!unlocked}
                    className={cn(
                      'relative w-7 h-7 rounded text-xs font-semibold transition-all',
                      'flex items-center justify-center',
                      isCurrent && unlocked && 'ring-2 ring-[#FF9D00] ring-offset-1',
                      unlocked
                        ? completed
                          ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                          : 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] cursor-pointer'
                        : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                    )}
                  >
                    {!unlocked ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                    {unlocked && completed && (
                      <Check className="absolute -top-1 -right-1 h-3 w-3 text-white bg-green-600 rounded-full p-0.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p className="font-medium">Stage {index + 1}: {stage.title}</p>
                  <p className="text-muted-foreground">
                    {!unlocked ? 'Locked' : completed ? 'Completed' : isCurrent ? 'Current' : 'Unlocked'}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
