'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  buildChatLogSets,
  type ChatLogRow,
  type ChatLogSet,
} from '@/data/courses/fix-intent-5min/chat-log-sets';
import {
  initialCourseState,
  type CourseState,
  type NotionFieldId,
  type NotionState,
  type SelectedIntent,
} from '@/lib/courses/fix-intent-5min/course-state';
import { validateNotionField } from '@/lib/courses/fix-intent-5min/validate';
import {
  loadCourseState,
  saveCourseState,
  recordStageComplete,
} from '@/lib/courses/fix-intent-5min/storage';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLearningStore } from '@/stores/useLearningStore';
import { DashboardView } from './DashboardView';
import { FeedbackModal } from './FeedbackModal';
import { QuestModal } from './QuestModal';
import { NotionLanding } from './NotionLanding';
import {
  NotionTaskPage,
  STAGE1_FIELD_ORDER,
  STAGE2_FIELD_ORDER,
  STAGE3_FIELD_ORDER,
  STAGE4_FIELD_ORDER,
} from './NotionTaskPage';
import { NotionFloatingPanel } from './NotionFloatingPanel';
import { SheetEditPage } from './SheetEditPage';
import { ChatbotTestPage } from './ChatbotTestPage';

export const FIX_INTENT_COURSE_ID = 'curious-nyang-intent-guide--fix-intent-5min';

type Phase =
  | 'dashboard'
  | 'notion'
  | 'quest-clear'
  | 'stage2-page'
  | 'quest-clear-2'
  | 'sheet-edit'
  | 'quest-clear-3'
  | 'chatbot-test'
  | 'course-complete';

function countFilledStage1Notion(notion: NotionState): number {
  return STAGE1_FIELD_ORDER.filter((f) => notion[f] != null).length;
}

function countFilledStage2Notion(notion: NotionState): number {
  return STAGE2_FIELD_ORDER.filter((f) => notion[f] != null).length;
}

function countFilledStage3Notion(notion: NotionState): number {
  return STAGE3_FIELD_ORDER.filter((f) => notion[f] != null).length;
}

function countFilledStage4Notion(notion: NotionState): number {
  return STAGE4_FIELD_ORDER.filter((f) => notion[f] != null).length;
}

export function IntentFixCourse() {
  const passkeyPublicKey = useAuthStore((s) => s.passkeyInfo?.publicKey);

  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('dashboard');
  const [setIndex, setSetIndex] = useState(0);
  const [selectedIntents, setSelectedIntents] = useState<SelectedIntent[]>([]);
  const [representative, setRepresentative] = useState<SelectedIntent | null>(null);
  const [dashboardFeedback, setDashboardFeedback] = useState<
    { correct: boolean; row: ChatLogRow } | null
  >(null);

  const [notion, setNotion] = useState<NotionState>(initialCourseState.notion);
  const [chatbotInteraction, setChatbotInteraction] = useState(
    initialCourseState.chatbotInteraction,
  );
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // Guards phase-advancing handlers while a blockchain write is in-flight,
  // so a rapid second click can't race ahead of a failed persist.
  const [persisting, setPersisting] = useState(false);
  // One-shot briefing modal: shows on first entry of the dashboard phase when
  // the user has no progress yet. Dismissed for the rest of the session.
  const [questSeen, setQuestSeen] = useState(false);
  // Session-only flag so the Stage 3 mission briefing modal shows at most
  // once per visit. Not persisted — if the user leaves mid-stage and returns
  // they'll see it again, which is fine for a guidance prompt.
  const [stage3MissionSeen, setStage3MissionSeen] = useState(false);
  // Notion-phase guidance (stage 1 after rep pick):
  // - stage1NotionMissionSeen: dismisses initial "Task로 등록해봅시다" brief
  // - notionFirstCreateSeen: gates the "잘 하셨습니다" celebration to once
  // - notionStrayCount: wrong clicks on the landing before the user finds
  //   the correct "새로 만들기" button — used to escalate guidance to a hint
  // - notionStrayFeedback: current feedback message to show; null hides modal
  // - notionCreateCelebration: celebration QUEST CLEAR modal after first
  //   correct click; dismissal opens the floating panel
  const [stage1NotionMissionSeen, setStage1NotionMissionSeen] = useState(false);
  const [notionFirstCreateSeen, setNotionFirstCreateSeen] = useState(false);
  const [notionStrayCount, setNotionStrayCount] = useState(0);
  const [notionStrayFeedback, setNotionStrayFeedback] = useState<string | null>(
    null,
  );
  const [notionCreateCelebration, setNotionCreateCelebration] = useState(false);
  // Randomised per-session sets, rebuilt on game over. Three broken rows from
  // the pool (across patterns) plus four clean rows each, shuffled.
  const [activeSets, setActiveSets] = useState<ChatLogSet[]>(() =>
    buildChatLogSets(1, 4),
  );
  // Hearts HUD: 3 attempts across the dashboard phase. Hitting zero resets
  // the entire stage-1 run (both local state and blockchain blob).
  const [hearts, setHearts] = useState(3);
  const [showRestart, setShowRestart] = useState(false);
  // Countdown timer HUD (dashboard-only). Runs while the user is actively
  // scanning rows; pauses when any modal is up so reading feedback doesn't
  // cost time. Hitting zero triggers the same game-over path as hearts=0.
  const TIMER_TOTAL = 60;
  const [timerRemaining, setTimerRemaining] = useState(TIMER_TOTAL);
  // Notion floating panel — collapsible companion that persists from the
  // moment a representative intent is picked through Stage 1 completion.
  // Starts closed so users first see the Notion landing page and open the
  // task panel by clicking "새로 만들기". Mid-progress restoration still
  // auto-opens so users resume where they left off.
  const [panelOpen, setPanelOpen] = useState(false);

  // Load & restore from blockchain on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await loadCourseState(passkeyPublicKey);
      if (cancelled) return;
      if (!state) {
        setLoading(false);
        return;
      }
      const restoredNotion = { ...initialCourseState.notion, ...(state.notion ?? {}) };
      const restoredSelected = state.selectedIntents ?? [];
      const restoredRep = state.representativeIntent ?? null;
      const restoredChat =
        state.chatbotInteraction ?? initialCourseState.chatbotInteraction;
      setSelectedIntents(restoredSelected);
      setRepresentative(restoredRep);
      setNotion(restoredNotion);
      setChatbotInteraction(restoredChat);
      // Skip the briefing modal when returning mid-progress — the user
      // already knows the objective.
      if (restoredSelected.length > 0 || restoredRep) setQuestSeen(true);
      // Likewise skip the notion-phase guidance modals for returning users:
      // they've already been past the "click 새로 만들기" gate.
      if (restoredRep) {
        setStage1NotionMissionSeen(true);
        setNotionFirstCreateSeen(true);
      }
      const filledCount = countFilledStage1Notion(restoredNotion);
      if (filledCount >= STAGE1_FIELD_ORDER.length) {
        // Fast-forward across completed stages based on which NotionState
        // fields are populated.
        if (restoredNotion.result != null) {
          setPhase('course-complete');
          setCurrentFieldIdx(STAGE4_FIELD_ORDER.length);
        } else if (restoredNotion.workContent != null) {
          setPhase('chatbot-test');
          setCurrentFieldIdx(countFilledStage4Notion(restoredNotion));
        } else if (restoredNotion.solutionDirection != null) {
          setPhase('sheet-edit');
          setCurrentFieldIdx(countFilledStage3Notion(restoredNotion));
        } else {
          setPhase('stage2-page');
          setCurrentFieldIdx(countFilledStage2Notion(restoredNotion));
        }
      } else if (filledCount > 0) {
        setCurrentFieldIdx(filledCount);
        setPhase('notion');
        setPanelOpen(true);
      } else if (restoredRep) {
        setPhase('notion');
        setPanelOpen(false);
      } else {
        setSetIndex(0);
        setPhase('dashboard');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [passkeyPublicKey]);

  const persist = async (partial: Partial<CourseState>): Promise<boolean> => {
    const next: CourseState = {
      selectedIntents,
      representativeIntent: representative,
      notion,
      sheetEdit: { tab: null, cell: null, value: null },
      chatbotInteraction,
      updatedAt: Date.now(),
      ...partial,
    };
    const result = await saveCourseState(passkeyPublicKey, next);
    if (!result.ok) {
      setSaveError(result.error ?? '저장 실패');
      return false;
    }
    return true;
  };

  const currentSet = activeSets[setIndex];
  const activeFieldOrder =
    phase === 'stage2-page'
      ? STAGE2_FIELD_ORDER
      : phase === 'sheet-edit'
        ? STAGE3_FIELD_ORDER
        : phase === 'chatbot-test'
          ? STAGE4_FIELD_ORDER
          : STAGE1_FIELD_ORDER;
  const currentFieldId: NotionFieldId | null =
    currentFieldIdx < activeFieldOrder.length
      ? activeFieldOrder[currentFieldIdx]
      : null;

  const handleRowClick = (row: ChatLogRow) => {
    if (dashboardFeedback || showRestart || persisting) return;
    const correct = row.isBroken;

    if (!correct) {
      // Decrement a heart immediately (UI-only — no dedicated modal). If that
      // empties the HUD, surface the restart modal and skip the usual "틀렸습니다"
      // feedback so the user isn't hit with two sequential modals.
      const next = hearts - 1;
      setHearts(next);
      if (next <= 0) {
        setShowRestart(true);
        return;
      }
    }
    setDashboardFeedback({ correct, row });
  };

  const handleRestart = async () => {
    if (persisting) return;
    setPersisting(true);
    // Clear blockchain blob first; if it fails we leave the modal up so the
    // user can retry instead of re-starting against stale server state.
    const cleanState: CourseState = {
      ...initialCourseState,
      updatedAt: Date.now(),
    };
    const result = await saveCourseState(passkeyPublicKey, cleanState);
    setPersisting(false);
    if (!result.ok) {
      setSaveError(result.error ?? '초기화 실패');
      return;
    }
    setSelectedIntents([]);
    setRepresentative(null);
    setNotion(initialCourseState.notion);
    setCurrentFieldIdx(0);
    setSetIndex(0);
    setDashboardFeedback(null);
    setNotionError(null);
    setHearts(3);
    setActiveSets(buildChatLogSets(1, 4));
    setShowRestart(false);
    setPhase('dashboard');
    // questSeen stays true — the user just re-read the objective via the
    // restart modal copy, no need to re-show the briefing.
  };

  const handleDashboardFeedbackClose = async () => {
    if (persisting || !dashboardFeedback) return;
    const wasCorrect = dashboardFeedback.correct;
    const clickedRow = dashboardFeedback.row;

    if (!wasCorrect) {
      setDashboardFeedback(null);
      return;
    }

    // Single-round flow: the correctly picked broken row IS the representative
    // intent. Persist and jump straight to the notion phase — no accumulation
    // of multiple selections, no separate picker screen.
    const rep: SelectedIntent = {
      setId: currentSet.setId,
      row: {
        sessionId: clickedRow.sessionId,
        createdAt: clickedRow.createdAt,
        intent: clickedRow.intent,
        userMessage: clickedRow.userMessage,
        assistantContent: clickedRow.assistantContent,
      },
    };
    // Persist BEFORE UI transition: blockchain write failure should leave the
    // user on the dashboard with the save-error banner explaining what went
    // wrong, so they can retry by clicking 확인 again.
    setPersisting(true);
    const persistOk = await persist({ representativeIntent: rep });
    setPersisting(false);
    if (!persistOk) return;

    setDashboardFeedback(null);
    setRepresentative(rep);
    setPhase('notion');
    setPanelOpen(false);
  };

  // Landing's "새로 만들기" button reopens the floating panel (backdrop-only
  // anchor now that the panel hosts the task form). First correct click
  // during the guidance flow shows a QUEST CLEAR celebration; dismissing it
  // opens the panel. Subsequent clicks open directly.
  const handleCreateTask = () => {
    if (
      phase === 'notion' &&
      stage1NotionMissionSeen &&
      !notionFirstCreateSeen
    ) {
      setNotionCreateCelebration(true);
      setNotionStrayFeedback(null);
      return;
    }
    setPanelOpen(true);
  };

  const handleNotionCreateCelebrationAccept = () => {
    setNotionCreateCelebration(false);
    setNotionFirstCreateSeen(true);
    setPanelOpen(true);
  };

  // Clicks anywhere on NotionLanding that did NOT land on a "새로 만들기"
  // button bubble up here. We only treat them as stray during the guidance
  // window (mission dismissed, first-create not yet achieved, panel closed).
  const handleNotionStray = () => {
    if (phase !== 'notion') return;
    if (!stage1NotionMissionSeen) return;
    if (notionFirstCreateSeen) return;
    if (notionCreateCelebration) return;
    if (panelOpen) return;
    const next = notionStrayCount + 1;
    setNotionStrayCount(next);
    setNotionStrayFeedback(
      next >= 3
        ? '힌트: 페이지 하단 Tasks 영역 오른쪽에 있는 파란 "새로 만들기" 버튼을 클릭하세요.'
        : '새 Task 를 등록하려면 올바른 버튼을 눌러야 해요. 다시 찾아보세요.',
    );
  };

  const handleNotionSubmit = async (fieldId: NotionFieldId, value: string) => {
    if (validating) return;
    if (activeFieldOrder[currentFieldIdx] !== fieldId) return;
    setValidating(true);
    const pass = await validateNotionField(fieldId, value, {
      representativeIntent: representative,
    });
    if (!pass) {
      setValidating(false);
      const freeInput =
        fieldId === 'title' ||
        fieldId === 'problemAnalysis' ||
        fieldId === 'solutionDirection';
      setNotionError(
        freeInput
          ? '대표 인텐트와 관련이 약해 보여요. 다시 작성해주세요.'
          : '올바른 값을 선택해주세요.',
      );
      return;
    }
    // Persist BEFORE advancing UI. If the blockchain write fails, leave the
    // user on the same field so they can retry instead of silently losing
    // a validated answer (and, at completion, skipping stage_complete).
    const newNotion: NotionState = { ...notion, [fieldId]: value };
    const persistOk = await persist({ notion: newNotion });
    if (!persistOk) {
      setValidating(false);
      return;
    }
    setNotion(newNotion);
    const nextIdx = currentFieldIdx + 1;
    setValidating(false);

    // Stage 1 last field just passed → mark stage 0 complete on-chain and
    // show Quest Clear modal; the modal's accept handler transitions to
    // Stage 2 fullscreen page and resets the field cursor.
    if (phase === 'notion' && nextIdx >= STAGE1_FIELD_ORDER.length) {
      setCurrentFieldIdx(nextIdx);
      setPhase('quest-clear');
      await recordStageComplete(passkeyPublicKey, 0);
      const { progress: curr, setProgress } = useLearningStore.getState();
      if (curr && !curr.completedStages.some((s) => s.stageNumber === 0)) {
        setProgress({
          ...curr,
          completedStages: [
            ...curr.completedStages,
            { stageNumber: 0, completedAt: new Date().toISOString() },
          ],
        });
      }
      return;
    }

    // Stage 2 last field → Quest Clear → Stage 3.
    if (phase === 'stage2-page' && nextIdx >= STAGE2_FIELD_ORDER.length) {
      setCurrentFieldIdx(nextIdx);
      setPhase('quest-clear-2');
      await recordStageComplete(passkeyPublicKey, 1);
      const { progress: curr, setProgress } = useLearningStore.getState();
      if (curr && !curr.completedStages.some((s) => s.stageNumber === 1)) {
        setProgress({
          ...curr,
          completedStages: [
            ...curr.completedStages,
            { stageNumber: 1, completedAt: new Date().toISOString() },
          ],
        });
      }
      return;
    }

    // Stage 3 last field (workContent, auto-submitted by SheetEditPage) →
    // Quest Clear → Stage 4.
    if (phase === 'sheet-edit' && nextIdx >= STAGE3_FIELD_ORDER.length) {
      setCurrentFieldIdx(nextIdx);
      setPhase('quest-clear-3');
      await recordStageComplete(passkeyPublicKey, 2);
      const { progress: curr, setProgress } = useLearningStore.getState();
      if (curr && !curr.completedStages.some((s) => s.stageNumber === 2)) {
        setProgress({
          ...curr,
          completedStages: [
            ...curr.completedStages,
            { stageNumber: 2, completedAt: new Date().toISOString() },
          ],
        });
      }
      return;
    }

    // Stage 4 last field (result) → course complete.
    if (phase === 'chatbot-test' && nextIdx >= STAGE4_FIELD_ORDER.length) {
      setCurrentFieldIdx(nextIdx);
      setPhase('course-complete');
      await recordStageComplete(passkeyPublicKey, 3);
      const { progress: curr, setProgress } = useLearningStore.getState();
      if (curr && !curr.completedStages.some((s) => s.stageNumber === 3)) {
        setProgress({
          ...curr,
          completedStages: [
            ...curr.completedStages,
            { stageNumber: 3, completedAt: new Date().toISOString() },
          ],
        });
      }
      return;
    }

    setCurrentFieldIdx(nextIdx);
  };

  // Stage 3 completion handler invoked from SheetEditPage when the user
  // clicks "Custom Scripts → Update 스크립트 실행" after making edits.
  const handleSheetComplete = async (summary: string) => {
    await handleNotionSubmit('workContent', summary);
  };

  // Stage 4 chatbot interaction — persist the question/answer pair alongside
  // notion state so it restores on reload.
  const handleChatbotExchange = async (question: string, answer: string) => {
    const next = { question, answer };
    setChatbotInteraction(next);
    await persist({ chatbotInteraction: next });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#0a0a1a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF9D00]" />
      </div>
    );
  }

  const saveErrorBanner = saveError && (
    <div className="absolute top-0 inset-x-0 z-30 bg-red-500/90 text-white text-xs px-4 py-2 flex items-center justify-between">
      <span>저장 실패: {saveError}</span>
      <button
        onClick={() => setSaveError(null)}
        className="underline text-white/80 hover:text-white"
      >
        닫기
      </button>
    </div>
  );

  if (phase === 'dashboard' && currentSet) {
    const showQuest = !questSeen && !representative && !showRestart;
    return (
      <div className="relative h-full w-full bg-[#F9F9FA]">
        {saveErrorBanner}
        <DashboardView
          title={currentSet.title}
          setOrder={setIndex + 1}
          totalSets={activeSets.length}
          rows={currentSet.rows}
          onRowClick={handleRowClick}
          hearts={hearts}
        />
        {showQuest && (
          <QuestModal
            body="문제가 있는 인텐트의 행을 클릭하세요"
            onAccept={() => setQuestSeen(true)}
          />
        )}
        {dashboardFeedback && !showQuest && !showRestart && (
          dashboardFeedback.correct ? (
            <QuestModal
              label="QUEST CLEAR"
              body="인텐트 잘 찾았어요! 이제 노션 페이지로 이동해 이슈를 Task 로 등록합니다."
              cta={persisting ? '저장 중…' : '확인'}
              onAccept={handleDashboardFeedbackClose}
            />
          ) : (
            <FeedbackModal
              correct={false}
              onClose={handleDashboardFeedbackClose}
            />
          )
        )}
        {showRestart && (
          <QuestModal
            label="GAME OVER"
            body="하트를 모두 소진했어요. 처음부터 다시 도전해 주세요."
            cta={persisting ? '초기화 중…' : '다시 시작'}
            onAccept={handleRestart}
          />
        )}
      </div>
    );
  }

  if (phase === 'notion' || phase === 'quest-clear') {
    const filledCount = countFilledStage1Notion(notion);
    const showInitialMission =
      phase === 'notion' &&
      !stage1NotionMissionSeen &&
      !notionCreateCelebration &&
      !panelOpen;
    // Modal priority (highest first): quest-clear → celebration → initial
    // mission → stray feedback → field validation error. Only one at a time.
    let modal: React.ReactNode = null;
    if (phase === 'quest-clear') {
      modal = (
        <QuestModal
          label="QUEST CLEAR"
          body="Stage 1 완료! 이슈를 Notion에 기록했어요. 이제 해결 방향을 정리합니다."
          cta="다음 단계로"
          onAccept={() => {
            setCurrentFieldIdx(countFilledStage2Notion(notion));
            setPhase('stage2-page');
          }}
        />
      );
    } else if (notionCreateCelebration) {
      modal = (
        <QuestModal
          label="QUEST CLEAR"
          body="잘 하셨어요! 이슈를 새로 등록할 때는 '새로 만들기' 버튼을 눌러야 합니다."
          cta="확인"
          onAccept={handleNotionCreateCelebrationAccept}
        />
      );
    } else if (showInitialMission) {
      modal = (
        <QuestModal
          label="QUEST"
          body="노션 페이지에 이슈를 Task로 등록해봅시다."
          cta="확인"
          onAccept={() => setStage1NotionMissionSeen(true)}
        />
      );
    } else if (notionStrayFeedback) {
      modal = (
        <FeedbackModal
          correct={false}
          message={notionStrayFeedback}
          onClose={() => setNotionStrayFeedback(null)}
        />
      );
    } else if (notionError) {
      modal = (
        <FeedbackModal
          correct={false}
          message={notionError}
          onClose={() => setNotionError(null)}
        />
      );
    }

    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <NotionLanding
          onCreate={handleCreateTask}
          onStray={handleNotionStray}
        />
        <NotionFloatingPanel
          open={panelOpen}
          onOpen={() => setPanelOpen(true)}
          onClose={() => setPanelOpen(false)}
          progress={{ filled: filledCount, total: STAGE1_FIELD_ORDER.length }}
        >
          <NotionTaskPage
            notion={notion}
            currentFieldId={phase === 'notion' ? currentFieldId : null}
            disabled={validating}
            onSubmit={handleNotionSubmit}
          />
        </NotionFloatingPanel>
        {modal}
      </div>
    );
  }

  if (phase === 'stage2-page' || phase === 'quest-clear-2') {
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <NotionTaskPage
          notion={notion}
          currentFieldId={phase === 'stage2-page' ? currentFieldId : null}
          disabled={validating}
          onSubmit={handleNotionSubmit}
        />
        {notionError && (
          <FeedbackModal
            correct={false}
            message={notionError}
            onClose={() => setNotionError(null)}
          />
        )}
        {phase === 'quest-clear-2' && (
          <QuestModal
            label="QUEST CLEAR"
            body="Stage 2 완료! 수정 방향을 정리했어요. 이제 Dev Sheet 에서 실제로 고칩니다."
            cta="다음 단계로"
            onAccept={() => {
              setCurrentFieldIdx(countFilledStage3Notion(notion));
              setPhase('sheet-edit');
            }}
          />
        )}
      </div>
    );
  }

  if (phase === 'sheet-edit' || phase === 'quest-clear-3') {
    const showStage3Mission =
      phase === 'sheet-edit' && !stage3MissionSeen;
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <SheetEditPage disabled={validating} onComplete={handleSheetComplete} />
        {notionError && (
          <FeedbackModal
            correct={false}
            message={notionError}
            onClose={() => setNotionError(null)}
          />
        )}
        {showStage3Mission && (
          <QuestModal
            label="QUEST"
            body="수정 대상 탭에서 셀을 하나 이상 편집한 뒤, 메뉴바의 Custom Scripts → Update 스크립트 실행 을 클릭해 Dev 환경에 반영하세요."
            cta="확인"
            onAccept={() => setStage3MissionSeen(true)}
          />
        )}
        {phase === 'quest-clear-3' && (
          <QuestModal
            label="QUEST CLEAR"
            body="Stage 3 완료! Dev 에 수정이 반영됐어요. 이제 Dev 챗봇에서 결과를 확인해봅니다."
            cta="다음 단계로"
            onAccept={() => {
              setCurrentFieldIdx(countFilledStage4Notion(notion));
              setPhase('chatbot-test');
            }}
          />
        )}
      </div>
    );
  }

  if (phase === 'chatbot-test') {
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <ChatbotTestPage
          disabled={validating}
          representativeIntentLabel={representative?.row.intent}
          hasInteracted={
            !!chatbotInteraction.question && !!chatbotInteraction.answer
          }
          onAskAndReply={handleChatbotExchange}
          onSubmitResult={(v) => handleNotionSubmit('result', v)}
        />
        {notionError && (
          <FeedbackModal
            correct={false}
            message={notionError}
            onClose={() => setNotionError(null)}
          />
        )}
      </div>
    );
  }

  // course-complete phase — minimal success screen (no big celebration).
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-white text-[#37352f]">
      {saveErrorBanner}
      <div className="mb-2 text-sm text-[#059669]">코스 완료</div>
      <div className="text-xl font-semibold">수고하셨습니다.</div>
      <div className="mt-2 max-w-md text-center text-sm text-gray-500">
        인텐트 기여 한 사이클을 완주했어요. Stage 1~4 기록이 블록체인에 저장되었습니다.
      </div>
    </div>
  );
}
