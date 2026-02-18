'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { DungeonCanvas } from '@/components/learn/DungeonCanvas';
import { ClaudeTerminal } from '@/components/learn/ClaudeTerminal';
import { StageProgressBar } from '@/components/learn/StageProgressBar';
import { ConceptOverlay } from '@/components/learn/ConceptOverlay';
import { QuizOverlay } from '@/components/learn/QuizOverlay';
import { PaymentModal } from '@/components/learn/PaymentModal';
import { useLearningStore } from '@/stores/useLearningStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { papersAdapter } from '@/lib/adapters/papers';
import { progressAdapter } from '@/lib/adapters/progress';
import { MOCK_STAGES_BITDANCE } from '@/constants/mock-stages';

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;

  const { user } = useAuthStore();
  const {
    currentPaper,
    stages,
    currentStageIndex,
    isDoorUnlocked,
    setPaper,
    setStages,
    setCurrentStageIndex,
    setProgress,
    setPlayerPosition,
    clearTerminalMessages,
    reset,
  } = useLearningStore();

  // Load paper and stages
  useEffect(() => {
    async function load() {
      const paper = await papersAdapter.getPaperById(paperId);
      if (!paper) {
        router.push('/explore');
        return;
      }
      setPaper(paper);

      // 🔌 ADAPTER — Replace with real stage data fetching
      // For now, use mock stages for bitdance, or generate generic stages for others
      const stageData =
        paperId === 'bitdance-2602'
          ? MOCK_STAGES_BITDANCE
          : generateGenericStages(paper.title, paper.totalStages);
      setStages(stageData);

      // Load progress
      if (user) {
        const progress = await progressAdapter.loadProgress(user.id, paperId);
        if (progress) {
          setProgress(progress);
          setCurrentStageIndex(Math.min(progress.currentStage, stageData.length - 1));
        }
      }
    }

    reset();
    load();
  }, [paperId]);

  // Handle door transition to next stage
  useEffect(() => {
    if (isDoorUnlocked && stages.length > 0) {
      // Player walked through the door — check if they moved past the door
      // This is simplified: when door is unlocked, allow progressing
    }
  }, [isDoorUnlocked, stages]);

  const currentStage = stages[currentStageIndex];

  if (!currentPaper || !currentStage) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF9D00]" />
      </div>
    );
  }

  const handleNextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      clearTerminalMessages();
      setPlayerPosition({ x: 3, y: 10 });
      setCurrentStageIndex(currentStageIndex + 1);

      // Save checkpoint
      if (user) {
        progressAdapter.saveCheckpoint({
          userId: user.id,
          paperId: currentPaper.id,
          stageNumber: currentStageIndex + 1,
          completedAt: new Date().toISOString(),
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <StageProgressBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Dungeon Canvas (60%) */}
        <div className="relative w-[60%] border-r border-gray-700">
          <DungeonCanvas stage={currentStage} />
          <ConceptOverlay />
          <QuizOverlay />
          <PaymentModal />

          {/* Next Stage button (visible when door is unlocked) */}
          {isDoorUnlocked && currentStageIndex < stages.length - 1 && (
            <div className="absolute bottom-4 right-4 z-10">
              <button
                onClick={handleNextStage}
                className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-lg text-sm font-medium transition-colors"
              >
                Enter Stage {currentStageIndex + 2} →
              </button>
            </div>
          )}
        </div>

        {/* Right: Claude Code Terminal (40%) */}
        <div className="w-[40%]">
          <ClaudeTerminal />
        </div>
      </div>
    </div>
  );
}

// Generate generic stages for papers without predefined stages
function generateGenericStages(paperTitle: string, count: number) {
  const stageNames = [
    'Introduction & Motivation',
    'Core Architecture',
    'Key Innovation',
    'Training Pipeline',
    'Evaluation & Results',
    'Ablation Studies',
    'Applications & Future Work',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `stage-${i + 1}`,
    stageNumber: i + 1,
    title: stageNames[i] || `Advanced Topic ${i + 1}`,
    concepts: [
      {
        id: `concept-${i}-1`,
        title: `Concept ${i * 2 + 1}`,
        content: `This is a core concept from "${paperTitle}" related to ${stageNames[i] || 'advanced topics'}. In production, this content would be generated from the actual paper.`,
        position: { x: 5, y: 3 },
      },
      {
        id: `concept-${i}-2`,
        title: `Concept ${i * 2 + 2}`,
        content: `Another key concept from the paper. This would contain detailed technical explanations derived from the paper content.`,
        position: { x: 12, y: 3 },
      },
    ],
    quiz: {
      id: `quiz-${i + 1}`,
      question: `What is the main contribution of the ${stageNames[i] || 'topic'} section?`,
      type: 'multiple-choice' as const,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
    },
    roomWidth: 20,
    roomHeight: 15,
  }));
}
