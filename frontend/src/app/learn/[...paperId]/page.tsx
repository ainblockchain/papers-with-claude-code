'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertTriangle, Terminal, Trophy, ArrowRight, ExternalLink } from 'lucide-react';
import { CourseCanvas } from '@/components/learn/CourseCanvas';
import { ClaudeTerminal } from '@/components/learn/ClaudeTerminal';
import { XtermTerminal } from '@/components/learn/XtermTerminal';
import { StageProgressBar } from '@/components/learn/StageProgressBar';
import { ConceptOverlay } from '@/components/learn/ConceptOverlay';
import { QuizOverlay } from '@/components/learn/QuizOverlay';
import { PaymentModal } from '@/components/learn/PaymentModal';
import { ChatLogOverlay } from '@/components/learn/ChatLogOverlay';
import { IntentFixCourse, FIX_INTENT_COURSE_ID } from '@/components/learn/interactive/fix-intent-5min/IntentFixCourse';
import { useLearningStore } from '@/stores/useLearningStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { papersAdapter, normalizePaperId } from '@/lib/adapters/papers';
import { useSeries } from '@/hooks/useSeries';
import { progressAdapter } from '@/lib/adapters/progress';
import { loadCourseMap } from '@/hooks/useCourseMap';
import { resolveStageMode } from '@/lib/tmj/objects';
import {
  terminalSessionAdapter,
  SessionLimitError,
} from '@/lib/adapters/terminal-session';



const TERMINAL_API_URL = process.env.NEXT_PUBLIC_TERMINAL_API_URL;
const API_PROXY = '/api/terminal';

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  // catch-all 라우트: /learn/paper-slug/course-slug → paperId = ['paper-slug', 'course-slug']
  const paperId = Array.isArray(params.paperId)
    ? params.paperId.join('/')
    : (params.paperId as string);
  // Track session ID for cleanup — ref survives async race conditions
  const sessionCleanupRef = useRef<string | null>(null);
  // Monotonic ID to detect stale effect runs (Strict Mode safe)
  const effectIdRef = useRef(0);

  const { user, passkeyInfo } = useAuthStore();
  const { data: allSeries } = useSeries();
  const {
    currentPaper,
    stages,
    currentStageIndex,
    isDoorUnlocked,
    isCourseComplete,
    sessionId,
    sessionStatus,
    sessionError,
    setPaper,
    setStages,
    setCurrentStageIndex,
    setProgress,
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

  // Page close cleanup — both beforeunload and pagehide for maximum reliability
  useEffect(() => {
    const cleanupOnClose = () => {
      const sid = sessionCleanupRef.current;
      if (sid) {
        const url = `${API_PROXY}/sessions/${sid}`;
        // Try sendBeacon first (most reliable for page unload), then fetch keepalive
        const beaconSent = navigator.sendBeacon(
          `${API_PROXY}/sessions/${sid}/delete`,
          '',
        );
        if (!beaconSent) {
          try {
            fetch(url, { method: 'DELETE', keepalive: true });
          } catch {
            // best effort
          }
        }
        sessionCleanupRef.current = null;
      }
    };

    window.addEventListener('beforeunload', cleanupOnClose);
    window.addEventListener('pagehide', cleanupOnClose);
    return () => {
      window.removeEventListener('beforeunload', cleanupOnClose);
      window.removeEventListener('pagehide', cleanupOnClose);
    };
  }, []);

  // Load paper and stages
  useEffect(() => {
    // If there's a leftover session from a previous effect run (HMR / StrictMode),
    // clean it up before starting a new one
    cleanupSession();
    const myId = ++effectIdRef.current;
    const isCancelled = () => effectIdRef.current !== myId;

    async function load() {
      const paper = await papersAdapter.getPaperById(paperId);
      if (!paper || isCancelled()) {
        if (!paper) router.push('/explore');
        return;
      }
      setPaper(paper);

      // Try loading stages from API (knowledge-graph-builder courses),
      // then fall back to hardcoded mock data or generic stages.
      const stageData = await loadStages(paperId, paper.title, paper.totalStages);

      // Prefetch each stage's TMJ to resolve exit-gate mode (portal vs door).
      const stageModes = await Promise.all(
        stageData.map((_, idx) =>
          loadCourseMap(paperId, idx).then((res) => resolveStageMode(res.mapData)),
        ),
      );
      if (isCancelled()) return;
      const stagesWithMode = stageData.map((s, i) => ({ ...s, mode: stageModes[i] }));
      setStages(stagesWithMode);

      // Load progress — prefer blockchain, fallback to localStorage
      let initialStageIdx = 0;
      if (user) {
        let progress = null;
        const walletAddress = useAuthStore.getState().passkeyInfo?.evmAddress;
        if (walletAddress) {
          progress = await progressAdapter.loadProgressByAddress(walletAddress, paperId);
        }
        if (!progress) {
          progress = await progressAdapter.loadProgress(user.id, paperId);
        }
        if (progress && !isCancelled()) {
          setProgress(progress);
          initialStageIdx = Math.min(progress.currentStage, stageData.length - 1);
          setCurrentStageIndex(initialStageIdx);

          // Restore quiz/unlock state from blockchain progress
          const stageAlreadyCompleted = progress.completedStages.some(
            s => s.stageNumber === initialStageIdx
          );
          if (stageAlreadyCompleted) {
            useLearningStore.getState().setQuizPassed(true);
          }
          const stageAlreadyUnlocked = progress.unlockedStages?.includes(initialStageIdx);
          if (stageAlreadyUnlocked) {
            useLearningStore.getState().setDoorUnlocked(true);
          }
        }
      }

      // Record stage_enter via dedicated server API
      if (!isCancelled()) {
        console.log('[learn] calling /api/stage-enter for', paperId, 'stage', initialStageIdx);
        fetch('/api/stage-enter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperId,
            stageNum: initialStageIdx,
            stageTitle: stageData[initialStageIdx]?.title,
            passkeyPublicKey: passkeyInfo?.publicKey,
          }),
        })
        .then(res => console.log('[learn] stage-enter response:', res.status))
        .catch(err => console.error('[LearnPage] stage_enter failed:', err));
      }

      // Create backend session if TERMINAL_API_URL is configured
      if (TERMINAL_API_URL && !isCancelled()) {
        setSessionStatus('creating');
        // Clean up any leftover terminated sessions from previous visits
        await terminalSessionAdapter.cleanupStaleSessions();
        try {
          // Use EVM wallet address as userId for consistency with per-user data storage
          const walletAddress = useAuthStore.getState().passkeyInfo?.evmAddress;
          const session = await terminalSessionAdapter.createSession({
            courseUrl: paper.courseRepoUrl || paper.githubUrl,
            userId: walletAddress || user?.id,
          });

          // CRITICAL: Set ref immediately so cleanup can find it,
          // even if the effect is cancelled during the await below
          sessionCleanupRef.current = session.sessionId;

          if (isCancelled()) {
            cleanupSession();
            return;
          }

          setSessionId(session.sessionId);

          // Poll until session is running (Pod takes 10-30s)
          await waitForSession(session.sessionId, isCancelled);

          if (isCancelled()) {
            cleanupSession();
            return;
          }

          setSessionStatus('running');

          // Try to fetch stages from backend
          const backendStages = await terminalSessionAdapter.getStages(session.sessionId);
          if (backendStages.length > 0 && !isCancelled()) {
            setStages(backendStages as typeof stageData);
          }
        } catch (err) {
          if (isCancelled()) {
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
      // stage_complete is recorded server-side (unlock-stage API), so no trackEvent here
      const stageIdx = stages.findIndex((s) => s.stageNumber === stageNumber);
      if (stageIdx >= 0) {
        useLearningStore.getState().setQuizPassed(true);
        useLearningStore.getState().setDoorUnlocked(true);
      }

      // Save checkpoint to local progress
      if (user) {
        progressAdapter.saveCheckpoint({
          userId: user.id,
          paperId,
          stageNumber,
          completedAt: new Date().toISOString(),
          totalStages: stages.length,
        });
      }
    },
    [stages, user, paperId],
  );

  const currentStage = stages[currentStageIndex];

  // Passkey guard: require login (passkey) to learn
  if (!user || !passkeyInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0a0a1a] gap-4">
        <AlertTriangle className="h-10 w-10 text-[#FF9D00]" />
        <p className="text-white text-lg font-medium">Login required to start learning</p>
        <Link href="/login" className="px-4 py-2 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white rounded-lg text-sm font-medium">
          Go to Login
        </Link>
      </div>
    );
  }

  if (!currentPaper || !currentStage) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0a0a1a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF9D00]" />
      </div>
    );
  }

  const handleNextStage = () => {
    if (currentStageIndex < stages.length - 1) {
      // stage_complete is recorded server-side (unlock-stage API after payment).
      // Player spawn is applied by CourseCanvas when the new stage's TMJ loads.
      clearTerminalMessages();
      const newIdx = currentStageIndex + 1;
      // New stage: reset quiz/unlock — blockchain is source of truth,
      // these will be restored from progress if already done
      useLearningStore.getState().setQuizPassed(false);
      useLearningStore.getState().setDoorUnlocked(false);
      setCurrentStageIndex(newIdx);

      // Save current position (don't mark as completed — QuizOverlay handles that)
      if (user) {
        progressAdapter.saveCheckpoint({
          userId: user.id,
          paperId: currentPaper.id,
          stageNumber: newIdx,
          completedAt: new Date().toISOString(),
          totalStages: stages.length,
          markCompleted: false,
        });
      }

      // Record stage_enter via dedicated server API
      fetch('/api/stage-enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperId: currentPaper.id,
          stageNum: newIdx,
          stageTitle: stages[newIdx]?.title,
          passkeyPublicKey: passkeyInfo?.publicKey,
        }),
      }).catch(err => console.error('[LearnPage] stage_enter failed:', err));
    }
  };

  const useRealTerminal = TERMINAL_API_URL && sessionStatus === 'running' && sessionId;

  // Find achievement URL for current course from series data
  const achievementUrl = (() => {
    if (!currentPaper || !allSeries) return null;
    for (const series of allSeries) {
      for (const entries of Object.values(series.groups)) {
        const entry = entries.find((e) => e.courseId === currentPaper.id);
        if (entry?.achievementUrl) return entry.achievementUrl;
      }
    }
    return null;
  })();

  // Course complete overlay
  if (isCourseComplete) {
    return (
      <div className="flex flex-col h-screen">
        <StageProgressBar />
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Congratulations */}
          <div className="relative w-[60%] border-r border-gray-700 bg-[#0a0a1a] flex items-center justify-center">
            <div className="text-center px-8 max-w-md">
              <div className="mb-6">
                <Trophy className="h-16 w-16 text-[#FF9D00] mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-white mb-2">Course Complete!</h1>
                <p className="text-gray-400">
                  You&apos;ve completed all {stages.length} stages of
                </p>
                <p className="text-lg font-semibold text-[#FF9D00] mt-1">
                  {currentPaper.title}
                </p>
              </div>

              <div className="bg-[#1a1a2e] rounded-lg p-4 mb-6 border border-gray-700">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">{stages.length}</p>
                    <p className="text-xs text-gray-500">Stages Cleared</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[#10B981]">100%</p>
                    <p className="text-xs text-gray-500">Complete</p>
                  </div>
                </div>
                {passkeyInfo && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">Recorded to AIN Wallet</p>
                    <p className="text-xs text-[#FF9D00] font-mono mt-0.5">
                      {passkeyInfo.ainAddress}
                    </p>
                  </div>
                )}
              </div>

              {achievementUrl && (
                <a
                  href={achievementUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-4"
                >
                  <button className="w-full px-4 py-3 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2">
                    Complete on Modulabs
                    <ExternalLink className="h-4 w-4" />
                  </button>
                </a>
              )}

              <div className="flex gap-3 justify-center">
                <Link href="/dashboard">
                  <button className="px-4 py-2 bg-[#1a1a2e] hover:bg-[#252545] text-gray-300 rounded-lg text-sm font-medium transition-colors border border-gray-700">
                    Dashboard
                  </button>
                </Link>
                <Link href="/explore">
                  <button className="px-4 py-2 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                    Explore More
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Terminal stays visible */}
          <div className="w-[40%]">
            {useRealTerminal ? (
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

  return (
    <div className="flex flex-col h-screen">
      <StageProgressBar />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Course Canvas (60%) */}
        <div className="relative w-[60%] border-r border-gray-700">
          {normalizePaperId(paperId) === FIX_INTENT_COURSE_ID ? (
            <IntentFixCourse />
          ) : (
            <>
              <CourseCanvas stage={currentStage} />
              <ConceptOverlay />
              <ChatLogOverlay />
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
            </>
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
  isCancelled: () => boolean,
  maxWait = 60000,
) {
  const start = Date.now();
  const interval = 2000;

  while (Date.now() - start < maxWait) {
    if (isCancelled()) return;
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

// Try loading stages from the course API, then fall back to mock/generic data.
async function loadStages(paperId: string, paperTitle: string, totalStages: number) {
  // 1. Try API-served course data (knowledge-graph-builder output)
  try {
    const stages = [];
    for (let i = 1; i <= totalStages; i++) {
      const res = await fetch(`/api/maps/courses/${encodeURIComponent(paperId)}/stages/${i}`);
      if (!res.ok) throw new Error(`Stage ${i} not found`);
      const json = await res.json();
      if (!json.ok || !json.data?.stage) throw new Error('Invalid stage data');
      const s = json.data.stage;
      // Support both old (quiz) and new (quizzes) format
      const quizzes = s.quizzes || (s.quiz ? [s.quiz] : []);
      stages.push({
        id: s.id,
        stageNumber: s.stageNumber,
        title: s.title,
        concepts: s.concepts,
        quizzes,
        signboards: s.signboards,
        roomWidth: s.roomWidth,
        roomHeight: s.roomHeight,
      });
    }
    if (stages.length > 0) return stages;
  } catch {
    // API not available — fall through
  }

  // 2. Generic placeholder stages
  return generateGenericStages(paperTitle, totalStages);
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
    quizzes: [
      {
        id: `quiz-${i + 1}`,
        question: `What is the main contribution of the ${stageNames[i] || 'topic'} section?`,
        type: 'multiple-choice' as const,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A',
      },
    ],
    roomWidth: 20,
    roomHeight: 15,
  }));
}
