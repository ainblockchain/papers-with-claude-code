'use client';

import { useState, useMemo } from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { useLearningStore } from '@/stores/useLearningStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { progressAdapter } from '@/lib/adapters/progress';
import { cn } from '@/lib/utils';
import { Quiz } from '@/types/learning';

export function QuizOverlay() {
  const {
    stages,
    currentStageIndex,
    currentPaper,
    isQuizActive,
    progress: userProgress,
    setQuizActive,
    setQuizPassed,
    setPaymentModalOpen,
    setDoorUnlocked,
    setProgress,
  } = useLearningStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [quizKey, setQuizKey] = useState(0);

  const currentStage = stages[currentStageIndex];

  // Select a random quiz from the quizzes array
  // Re-randomize when quizKey changes (on retry after wrong answer)
  const quiz: Quiz | null = useMemo(() => {
    if (!currentStage?.quizzes?.length) return null;
    const randomIndex = Math.floor(Math.random() * currentStage.quizzes.length);
    return currentStage.quizzes[randomIndex];
  }, [currentStage?.quizzes, quizKey]);

  if (!isQuizActive || !currentStage || !quiz) return null;

  const isCorrect = selectedOption === quiz.correctAnswer;

  const handleSubmit = () => {
    if (!selectedOption) return;
    setShowResult(true);
    if (selectedOption === quiz.correctAnswer) {
      // Record stage_complete on server (skip if already completed)
      const alreadyDone = userProgress?.completedStages?.some(
        s => s.stageNumber === currentStageIndex
      );
      if (!alreadyDone) {
        fetch('/api/stage-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperId: currentPaper?.id,
            stageNum: currentStageIndex,
            passkeyPublicKey: useAuthStore.getState().passkeyInfo?.publicKey,
          }),
        }).catch(err => console.error('[QuizOverlay] stage_complete failed:', err));
      }

      // Save to localStorage so dashboard reflects completion immediately
      // Use completedOnly: true to NOT update currentStage — user must click "Enter Stage X" to advance
      const authUser = useAuthStore.getState().user;
      const completedAt = new Date().toISOString();
      if (authUser && currentPaper) {
        progressAdapter.saveCheckpoint({
          userId: authUser.id,
          paperId: currentPaper.id,
          stageNumber: currentStageIndex,
          completedAt,
          totalStages: stages.length,
          completedOnly: true,
        });

        // Sync Zustand store so StageProgressBar updates immediately
        // Keep currentStage unchanged — only update when user clicks "Enter Stage X"
        const alreadyCompleted = userProgress?.completedStages?.some(
          s => s.stageNumber === currentStageIndex
        );
        if (!alreadyCompleted) {
          const updatedStages = [
            ...(userProgress?.completedStages ?? []),
            { stageNumber: currentStageIndex, completedAt },
          ];
          setProgress({
            paperId: currentPaper.id,
            currentStage: userProgress?.currentStage ?? currentStageIndex,
            totalStages: stages.length,
            completedStages: updatedStages,
            unlockedStages: userProgress?.unlockedStages ?? [],
            lastAccessedAt: completedAt,
          });
        }
      }

      setTimeout(() => {
        setQuizPassed(true);
        setQuizActive(false);
        setSelectedOption(null);
        setShowResult(false);
        const { stages: s, currentStageIndex: idx } = useLearningStore.getState();
        const isLastStage = idx >= s.length - 1;
        if (isLastStage) {
          // Last stage: unlock door directly (no payment needed)
          setDoorUnlocked(true);
        } else {
          // Auto-open payment modal after quiz pass
          setPaymentModalOpen(true);
        }
      }, 1500);
    }
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setShowResult(false);
    // Re-randomize quiz selection on retry
    setQuizKey((k) => k + 1);
  };

  const handleClose = () => {
    setQuizActive(false);
    setSelectedOption(null);
    setShowResult(false);
  };

  return (
    <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#111827]">Stage Quiz</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-[#111827] mb-4">{quiz.question}</p>

        <div className="space-y-2 mb-6">
          {quiz.options?.map((option) => (
            <button
              key={option}
              onClick={() => !showResult && setSelectedOption(option)}
              disabled={showResult}
              className={cn(
                'w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors',
                selectedOption === option
                  ? showResult
                    ? option === quiz.correctAnswer
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-red-500 bg-red-50 text-red-800'
                    : 'border-[#FF9D00] bg-orange-50 text-[#111827]'
                  : showResult && option === quiz.correctAnswer
                  ? 'border-green-500 bg-green-50 text-green-800'
                  : 'border-[#E5E7EB] hover:border-gray-300 text-[#111827]'
              )}
            >
              <div className="flex items-center gap-2">
                {showResult && option === quiz.correctAnswer && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
                {showResult && selectedOption === option && option !== quiz.correctAnswer && (
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <span>{option}</span>
              </div>
            </button>
          ))}
        </div>

        {showResult ? (
          isCorrect ? (
            <div className="text-center text-green-600 font-medium text-sm">
              Correct! Proceeding to unlock the door...
            </div>
          ) : (
            <button
              onClick={handleRetry}
              className="w-full py-2.5 bg-[#FF9D00] hover:bg-[#E88E00] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Try Again
            </button>
          )
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            className="w-full py-2.5 bg-[#FF9D00] hover:bg-[#E88E00] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Submit Answer
          </button>
        )}
      </div>
    </div>
  );
}
