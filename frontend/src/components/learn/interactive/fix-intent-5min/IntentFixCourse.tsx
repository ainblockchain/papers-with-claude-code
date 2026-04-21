'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { chatLogSets, type ChatLogRow } from '@/data/courses/fix-intent-5min/chat-log-sets';
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
import { RepresentativeSelect } from './RepresentativeSelect';
import { NotionLanding } from './NotionLanding';
import { NotionTaskPage, STAGE1_FIELD_ORDER } from './NotionTaskPage';

export const FIX_INTENT_COURSE_ID = 'curious-nyang-intent-guide--fix-intent-5min';

type Phase =
  | 'dashboard'
  | 'representative-select'
  | 'notion-landing'
  | 'notion-task-page'
  | 'stage1-complete';

function countFilledStage1Notion(notion: NotionState): number {
  return STAGE1_FIELD_ORDER.filter((f) => notion[f] != null).length;
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
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // Guards phase-advancing handlers while a blockchain write is in-flight,
  // so a rapid second click can't race ahead of a failed persist.
  const [persisting, setPersisting] = useState(false);

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
      setSelectedIntents(restoredSelected);
      setRepresentative(restoredRep);
      setNotion(restoredNotion);
      const filledCount = countFilledStage1Notion(restoredNotion);
      if (filledCount >= STAGE1_FIELD_ORDER.length) {
        setCurrentFieldIdx(STAGE1_FIELD_ORDER.length);
        setPhase('stage1-complete');
      } else if (filledCount > 0) {
        setCurrentFieldIdx(filledCount);
        setPhase('notion-task-page');
      } else if (restoredRep) {
        setPhase('notion-landing');
      } else if (restoredSelected.length >= chatLogSets.length) {
        setPhase('representative-select');
      } else {
        setSetIndex(restoredSelected.length);
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
      chatbotInteraction: { question: null, answer: null },
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

  const currentSet = chatLogSets[setIndex];
  const currentFieldId: NotionFieldId | null =
    currentFieldIdx < STAGE1_FIELD_ORDER.length
      ? STAGE1_FIELD_ORDER[currentFieldIdx]
      : null;

  const handleRowClick = (row: ChatLogRow) => {
    if (dashboardFeedback) return;
    setDashboardFeedback({ correct: row.isBroken, row });
  };

  const handleDashboardFeedbackClose = async () => {
    if (persisting || !dashboardFeedback) return;
    const wasCorrect = dashboardFeedback.correct;
    const clickedRow = dashboardFeedback.row;

    if (!wasCorrect) {
      setDashboardFeedback(null);
      return;
    }

    const newSelected: SelectedIntent[] = [
      ...selectedIntents,
      {
        setId: currentSet.setId,
        row: {
          sessionId: clickedRow.sessionId,
          createdAt: clickedRow.createdAt,
          intent: clickedRow.intent,
          userMessage: clickedRow.userMessage,
          assistantContent: clickedRow.assistantContent,
        },
      },
    ];
    // Persist BEFORE any UI transition so a blockchain write failure leaves
    // the user on the same set with the modal still open — they can retry by
    // clicking 확인 again, and the save-error banner explains what happened.
    setPersisting(true);
    const persistOk = await persist({ selectedIntents: newSelected });
    setPersisting(false);
    if (!persistOk) return;

    setDashboardFeedback(null);
    setSelectedIntents(newSelected);
    const nextIdx = setIndex + 1;
    if (nextIdx >= chatLogSets.length) {
      setPhase('representative-select');
    } else {
      setSetIndex(nextIdx);
    }
  };

  const handleRepPick = async (intent: SelectedIntent) => {
    if (persisting) return;
    setPersisting(true);
    const persistOk = await persist({ representativeIntent: intent });
    setPersisting(false);
    if (!persistOk) return;
    setRepresentative(intent);
    setPhase('notion-landing');
  };

  const handleCreateTask = () => {
    setPhase('notion-task-page');
  };

  const handleNotionSubmit = async (fieldId: NotionFieldId, value: string) => {
    if (validating) return;
    if (STAGE1_FIELD_ORDER[currentFieldIdx] !== fieldId) return;
    setValidating(true);
    const pass = await validateNotionField(fieldId, value, {
      representativeIntent: representative,
    });
    if (!pass) {
      setValidating(false);
      const freeInput = fieldId === 'title' || fieldId === 'problemAnalysis';
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
    setCurrentFieldIdx(nextIdx);
    setValidating(false);
    if (nextIdx >= STAGE1_FIELD_ORDER.length) {
      setPhase('stage1-complete');
      await recordStageComplete(passkeyPublicKey, 0);
      // Optimistically mirror the blockchain write into local progress so
      // StageProgressBar renders the Stage 1 checkmark without a reload.
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
    }
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
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <DashboardView
          title={currentSet.title}
          setOrder={setIndex + 1}
          totalSets={chatLogSets.length}
          rows={currentSet.rows}
          onRowClick={handleRowClick}
        />
        {dashboardFeedback && (
          <FeedbackModal
            correct={dashboardFeedback.correct}
            onClose={handleDashboardFeedbackClose}
          />
        )}
      </div>
    );
  }

  if (phase === 'representative-select') {
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <RepresentativeSelect selected={selectedIntents} onPick={handleRepPick} />
      </div>
    );
  }

  if (phase === 'notion-landing') {
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <NotionLanding onCreate={handleCreateTask} />
      </div>
    );
  }

  if (phase === 'notion-task-page') {
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <NotionTaskPage
          notion={notion}
          currentFieldId={currentFieldId}
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
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full bg-white text-[#37352f] overflow-auto">
      {saveErrorBanner}
      <div className="max-w-3xl w-full mx-auto px-12 py-10">
        <div className="mb-6 flex items-center gap-2 px-3 py-2 bg-[#059669]/10 border border-[#059669]/30 rounded-md">
          <span className="text-lg">🎉</span>
          <span className="text-sm font-medium text-[#059669]">
            Stage 1 완료 — Notion Task가 생성되었습니다
          </span>
        </div>

        <h1 className="text-3xl font-bold mb-4">{notion.title}</h1>
        <div className="px-0 py-2 border-y border-gray-100 bg-gray-50/60 mb-6">
          {([
            ['Agent', notion.agent],
            ['Assignee', notion.assignee],
            ['Status', notion.status],
            ['Season', notion.season],
          ] as const).map(([label, v]) => (
            <div key={label} className="flex items-center gap-4 py-1.5 px-4">
              <div className="w-28 text-sm text-gray-500 shrink-0">{label}</div>
              <div className="text-sm text-[#37352f] px-2 py-1 bg-gray-100 rounded">
                {v}
              </div>
            </div>
          ))}
        </div>
        <h2 className="text-xl font-semibold mb-2">문제 상황 분석</h2>
        <p className="text-sm whitespace-pre-wrap mb-8">{notion.problemAnalysis}</p>

        <div className="text-xs text-gray-400 border-t border-gray-200 pt-4">
          다음 단계 · Stage 2 (해결방향 정리) 구현 예정
        </div>
      </div>
    </div>
  );
}
