'use client';

import { useState } from 'react';
import { X, CheckCircle2, XCircle } from 'lucide-react';
import { useLearningStore } from '@/stores/useLearningStore';
import { useAinStore } from '@/stores/useAinStore';
import { cn } from '@/lib/utils';

export function QuizOverlay() {
  const {
    stages,
    currentStageIndex,
    currentPaper,
    isQuizActive,
    setQuizActive,
    setQuizPassed,
  } = useLearningStore();
  const { recordExploration } = useAinStore();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const currentStage = stages[currentStageIndex];
  if (!isQuizActive || !currentStage) return null;

  const quiz = currentStage.quiz;
  const isCorrect = selectedOption === quiz.correctAnswer;

  const handleSubmit = () => {
    if (!selectedOption) return;
    setShowResult(true);
    if (selectedOption === quiz.correctAnswer) {
      // Record exploration on AIN blockchain (fire-and-forget)
      if (currentPaper && currentStage) {
        recordExploration({
          topicPath: currentPaper.id,
          title: `${currentStage.title} - Quiz Passed`,
          content: `Completed stage ${currentStage.stageNumber} quiz`,
          summary: `Passed quiz for ${currentStage.title}`,
          depth: currentStage.stageNumber,
          tags: [currentPaper.id, `stage-${currentStage.stageNumber}`],
        }).catch(() => {
          // Non-blocking: exploration recording failure shouldn't block learning flow
        });
      }
      setTimeout(() => {
        setQuizPassed(true);
        setQuizActive(false);
        setSelectedOption(null);
        setShowResult(false);
      }, 1500);
    }
  };

  const handleRetry = () => {
    setSelectedOption(null);
    setShowResult(false);
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
