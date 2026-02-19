'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, AlertTriangle, Terminal } from 'lucide-react';
import { CourseCanvas } from '@/components/learn/CourseCanvas';
import { ClaudeTerminal } from '@/components/learn/ClaudeTerminal';
import { XtermTerminal } from '@/components/learn/XtermTerminal';
import { StageProgressBar } from '@/components/learn/StageProgressBar';
import { ConceptOverlay } from '@/components/learn/ConceptOverlay';
import { QuizOverlay } from '@/components/learn/QuizOverlay';
import { PaymentModal } from '@/components/learn/PaymentModal';
import { useLearningStore } from '@/stores/useLearningStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { papersAdapter } from '@/lib/adapters/papers';
import { progressAdapter } from '@/lib/adapters/progress';
import {
  terminalSessionAdapter,
  SessionLimitError,
} from '@/lib/adapters/terminal-session';
import { MOCK_STAGES_BITDANCE } from '@/constants/mock-stages';

const TERMINAL_API_URL = process.env.NEXT_PUBLIC_TERMINAL_API_URL;

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const paperId = params.paperId as string;
  // Track session ID for cleanup — ref survives async race conditions
  const sessionCleanupRef = useRef<string | null>(null);
  // Track whether effect has been cancelled (unmount / re-run)
  const cancelledRef = useRef(false);

  const { user } = useAuthStore();
  const {
    currentPaper,
    stages,
    currentStageIndex,
    isDoorUnlocked,
    sessionId,
    sessionStatus,
    sessionError,
    setPaper,
    setStages,
    setCurrentStageIndex,
    setProgress,
    setPlayerPosition,
    clearTerminalMessages,
    setSessionId,
    setSessionStatus,
    setSessionError,
    reset,
  } = useLearningStore();

  // Cleanup helper — deletes session from ref, callable from anywhere
  const cleanupSession = useCallback(() => {
    const sid = sessionCleanupRef.current;
    if (sid) {
      sessionCleanupRef.current = null;
      terminalSessionAdapter.deleteSession(sid);
    }
  }, []);

  // beforeunload — catches tab close / refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sid = sessionCleanupRef.current;
      if (sid && TERMINAL_API_URL) {
        // sendBeacon for reliable cleanup even when page is closing
        const url = `${TERMINAL_API_URL}/api/sessions/${sid}`;
        // sendBeacon only supports POST, so fall back to fetch keepalive
        try {
          fetch(url, { method: 'DELETE', keepalive: true });
        } catch {
          // best effort
        }
        sessionCleanupRef.current = null;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Load paper and stages
  useEffect(() => {
    // If there's a leftover session from a previous effect run (HMR / StrictMode),
    // clean it up before starting a new one
    cleanupSession();
    cancelledRef.current = false;

    async function load() {
      const paper = await papersAdapter.getPaperById(paperId);
      if (!paper || cancelledRef.current) {
        if (!paper) router.push('/explore');
        return;
      }
      setPaper(paper);

      // Use mock stages for now (backend stages integration later)
      const stageData =
        paperId === 'bitdance-2602'
          ? MOCK_STAGES_BITDANCE
          : generateGenericStages(paper.title, paper.totalStages);
      setStages(stageData);

      // Load progress
      if (user) {
        const progress = await progressAdapter.loadProgress(user.id, paperId);
        if (progress && !cancelledRef.current) {
          setProgress(progress);
          setCurrentStageIndex(Math.min(progress.currentStage, stageData.length - 1));
        }
      }

      // Create backend session if TERMINAL_API_URL is configured
      if (TERMINAL_API_URL && !cancelledRef.current) {
        setSessionStatus('creating');
        try {
          const session = await terminalSessionAdapter.createSession({
            repoUrl: paper.githubUrl,
            userId: user?.id,
          });

          // CRITICAL: Set ref immediately so cleanup can find it,
          // even if the effect is cancelled during the await below
          sessionCleanupRef.current = session.sessionId;

          if (cancelledRef.current) {
            // Effect was cancelled while createSession was in-flight
            // → delete the just-created session immediately
            cleanupSession();
            return;
          }

          setSessionId(session.sessionId);

          // Poll until session is running (Pod takes 10-30s)
          await waitForSession(session.sessionId, cancelledRef);

          if (cancelledRef.current) {
            cleanupSession();
            return;
          }

          setSessionStatus('running');

          // Try to fetch stages from backend
          const backendStages = await terminalSessionAdapter.getStages(session.sessionId);
          if (backendStages.length > 0 && !cancelledRef.current) {
            setStages(backendStages as typeof stageData);
          }
        } catch (err) {
          if (cancelledRef.current) {
            cleanupSession();
            return;
          }
          if (err instanceof SessionLimitError) {
            setSessionError(err.message);
          } else {
            setSessionError(
              err instanceof Error ? err.message : 'Failed to create session',
            );
          }
          setSessionStatus('error');
        }
      }
    }

    reset();
    load();

    // Cleanup session on unmount or paperId change
    return () => {
      cancelledRef.current = true;
      cleanupSession();
    };
  }, [paperId]);

  // Handle door transition to next stage
  useEffect(() => {
    if (isDoorUnlocked && stages.length > 0) {
      // Simplified: when door is unlocked, allow progressing
    }
  }, [isDoorUnlocked, stages]);

  const handleStageComplete = useCallback(
    (stageNumber: number) => {
      // Update store when backend signals stage completion
      const stageIdx = stages.findIndex((s) => s.stageNumber === stageNumber);
      if (stageIdx >= 0) {
        useLearningStore.getState().setQuizPassed(true);
        useLearningStore.getState().setDoorUnlocked(true);
      }
    },
    [stages],
  );

  const currentStage = stages[currentStageIndex];

  if (!currentPaper || !currentStage) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a1a]">
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

  const useRealTerminal = TERMINAL_API_URL && sessionStatus === 'running' && sessionId;

  return (
    <div className="flex flex-col h-screen">
      <StageProgressBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Course Canvas (60%) */}
        <div className="relative w-[60%] border-r border-gray-700">
          <CourseCanvas stage={currentStage} />
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

        {/* Right: Terminal (40%) */}
        <div className="w-[40%]">
          {sessionStatus === 'creating' ? (
            <SessionLoadingUI />
          ) : sessionStatus === 'error' ? (
            <SessionErrorUI error={sessionError} />
          ) : useRealTerminal ? (
            <XtermTerminal
              sessionId={sessionId}
              wsUrl={terminalSessionAdapter.getWebSocketUrl(sessionId)}
              onStageComplete={handleStageComplete}
            />
          ) : (
            <ClaudeTerminal />
          )}
        </div>
      </div>
    </div>
  );
}

/** Loading UI shown while Pod is creating (10-30s) */
function SessionLoadingUI() {
  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-gray-100">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#16162a] border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-gray-400 font-mono ml-2">
          Claude Code Terminal
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <div className="relative">
          <Terminal className="h-12 w-12 text-[#FF9D00]" />
          <Loader2 className="absolute -bottom-1 -right-1 h-5 w-5 animate-spin text-cyan-400" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-200">
            Launching Claude Code Environment
          </p>
          <p className="text-xs text-gray-500 font-mono">
            Provisioning sandbox pod & cloning repository...
          </p>
          <p className="text-xs text-gray-600">
            This typically takes 10–30 seconds
          </p>
        </div>
        <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#FF9D00] to-cyan-400 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/** Error UI when session creation fails */
function SessionErrorUI({ error }: { error: string | null }) {
  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-gray-100">
      <div className="flex items-center gap-2 px-4 py-2 bg-[#16162a] border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-gray-400 font-mono ml-2">
          Claude Code Terminal
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
        <AlertTriangle className="h-10 w-10 text-yellow-500" />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-red-400">
            Session Creation Failed
          </p>
          <p className="text-xs text-gray-400 font-mono max-w-sm">
            {error || 'Unknown error'}
          </p>
        </div>
        <p className="text-xs text-gray-600">
          Falling back to guided learning mode
        </p>
      </div>
    </div>
  );
}

/** Poll session status until it's running */
async function waitForSession(
  sessionId: string,
  cancelledRef: React.RefObject<boolean | null>,
  maxWait = 60000,
) {
  const start = Date.now();
  const interval = 2000;

  while (Date.now() - start < maxWait) {
    if (cancelledRef.current) return;
    try {
      const info = await terminalSessionAdapter.getSession(sessionId);
      if (info.status === 'running') return;
      if (info.status === 'terminated' || info.status === 'terminating') {
        throw new Error('Session terminated unexpectedly');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('terminated')) throw err;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Session creation timed out after 60 seconds');
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
