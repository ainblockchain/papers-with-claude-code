'use client';

import { useMemo, useState } from 'react';
import {
  Bold,
  ChevronDown,
  DollarSign,
  Italic,
  Loader2,
  MoreHorizontal,
  Paintbrush,
  Percent,
  Play,
  Printer,
  Redo2,
  Search,
  Sparkles,
  Star,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';
import {
  CORRECT_INTENT_SHEET_ID,
  INTENT_ROWS,
  SHEET_DESCRIPTIONS,
  SHEET_ORDER,
  TRIGGER_ROWS,
  type IntentRow,
  type SheetId,
  type TriggerRow,
} from '@/data/courses/fix-intent-5min/intent-sheets';
import { QuestModal } from './QuestModal';
import { FeedbackModal } from './FeedbackModal';
import { RelatedInfoCard } from './RelatedInfoCard';

type Phase =
  | 'add-intent'
  | 'run-intent-script'
  | 'add-triggers'
  | 'run-trigger-script'
  | 'complete';

interface Props {
  disabled?: boolean;
  representative: SelectedIntent | null;
  onComplete: (summary: string) => void;
}

const INTENT_COLS: Array<{
  id: 'intent' | 'leadSentence' | 'prompt' | 'createdAt' | 'isPush';
  label: string;
  width: string;
  readonly?: boolean;
}> = [
  { id: 'intent', label: 'Intent', width: '140px' },
  { id: 'leadSentence', label: '대표 Sentence', width: '180px' },
  { id: 'prompt', label: 'Prompt', width: '1fr' },
  { id: 'createdAt', label: 'created_at', width: '180px', readonly: true },
  { id: 'isPush', label: 'isPush', width: '80px', readonly: true },
];

const TRIGGER_COLS: Array<{
  id: 'intent' | 'sentence';
  label: string;
  width: string;
}> = [
  { id: 'intent', label: 'Intent', width: '180px' },
  { id: 'sentence', label: 'Sentence', width: '1fr' },
];

const PHASE_QUEST: Record<Exclude<Phase, 'complete'>, string> = {
  'add-intent':
    '방금 정리한 해결 방향에 맞는 새 인텐트를 어떤 탭에 추가할지 생각해보고, 해당 탭에서 "+ 인텐트 행 추가" 를 눌러 Intent / 대표 Sentence / Prompt 를 채워주세요.',
  'run-intent-script':
    'Custom Scripts > "Update Intent Prompts (dev)" 를 실행해 Dev 서버에 반영하세요.',
  'add-triggers':
    '인텐트를 잘 추가하셨습니다. 이제 방금 만든 인텐트에 유저가 쓸 법한 질문 표현을 트리거링 문장으로 2개 이상 추가해주세요. 트리거가 다양할수록 매칭 정확도가 높아집니다.',
  'run-trigger-script':
    'Custom Scripts > "Update Intent Triggers (dev)" 를 실행해 Dev 서버에 반영하세요.',
};

export function SheetEditPage({ disabled, representative, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('add-intent');
  // Start on the trigger-sentence tab so we don't hint at which category
  // the learner should pick — they must actively navigate to an intent tab.
  const [activeTabId, setActiveTabId] = useState<SheetId>(
    'intent_trigger_sentence',
  );
  const [wrongTabAttempts, setWrongTabAttempts] = useState(0);

  const [intentRowsBySheet, setIntentRowsBySheet] = useState(() => ({
    ...INTENT_ROWS,
  }));
  const [triggerRows, setTriggerRows] = useState<TriggerRow[]>(() => [
    ...TRIGGER_ROWS,
  ]);

  const [addedIntent, setAddedIntent] = useState<{
    sheetId: SheetId;
    rowId: string;
  } | null>(null);
  const [newTriggerIds, setNewTriggerIds] = useState<string[]>([]);

  const [editing, setEditing] = useState<{
    sheetId: SheetId;
    rowId: string;
    colId: string;
  } | null>(null);
  const [draft, setDraft] = useState('');

  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    'intent' | 'triggers' | null
  >(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [phaseQuestSeen, setPhaseQuestSeen] = useState<Set<Phase>>(new Set());
  const [intentAttempts, setIntentAttempts] = useState(0);
  const [triggerAttempts, setTriggerAttempts] = useState(0);

  const showQuestFor =
    phase !== 'complete' && !phaseQuestSeen.has(phase) ? phase : null;

  const markQuestSeen = (p: Phase) => {
    setPhaseQuestSeen((prev) => {
      const next = new Set(prev);
      next.add(p);
      return next;
    });
  };

  const addedIntentRow = useMemo<IntentRow | null>(() => {
    if (!addedIntent) return null;
    if (addedIntent.sheetId === 'intent_trigger_sentence') return null;
    const rows =
      intentRowsBySheet[
        addedIntent.sheetId as Exclude<SheetId, 'intent_trigger_sentence'>
      ];
    return rows.find((r) => r.id === addedIntent.rowId) ?? null;
  }, [addedIntent, intentRowsBySheet]);

  const handleTabClick = (id: SheetId) => {
    setEditing(null);
    setActiveTabId(id);
  };

  const handleAddIntentRow = (sheetId: SheetId) => {
    if (sheetId === 'intent_trigger_sentence' || phase !== 'add-intent') return;
    if (sheetId !== CORRECT_INTENT_SHEET_ID) {
      const next = wrongTabAttempts + 1;
      setWrongTabAttempts(next);
      setFeedback(
        next >= 3
          ? `이 탭은 ${SHEET_DESCRIPTIONS[sheetId]} 주제예요. 수업·학사 주제를 다루는 탭을 찾아보세요.`
          : `이 탭은 ${SHEET_DESCRIPTIONS[sheetId]} 주제예요. 이 이슈와 맞는 탭일까요?`,
      );
      return;
    }
    const newRow: IntentRow = {
      id: `new-i-${Date.now()}`,
      intent: '',
      leadSentence: '',
      prompt: '',
      createdAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
      isPush: 'Y',
    };
    setIntentRowsBySheet((prev) => ({
      ...prev,
      학사: [...prev['학사'], newRow],
    }));
    setAddedIntent({ sheetId, rowId: newRow.id });
    setEditing({ sheetId, rowId: newRow.id, colId: 'intent' });
    setDraft('');
  };

  const handleAddTriggerRow = () => {
    if (phase !== 'add-triggers' || !addedIntentRow) return;
    const newRow: TriggerRow = {
      id: `new-t-${Date.now()}`,
      intent: addedIntentRow.intent || '(미지정)',
      sentence: '',
    };
    setTriggerRows((prev) => [...prev, newRow]);
    setNewTriggerIds((prev) => [...prev, newRow.id]);
    setEditing({
      sheetId: 'intent_trigger_sentence',
      rowId: newRow.id,
      colId: 'sentence',
    });
    setDraft('');
  };

  const isEditable = (sheetId: SheetId, rowId: string, colId: string) => {
    if (disabled || running) return false;
    if (phase === 'add-intent') {
      return (
        sheetId === CORRECT_INTENT_SHEET_ID &&
        rowId === addedIntent?.rowId &&
        (colId === 'intent' || colId === 'leadSentence' || colId === 'prompt')
      );
    }
    if (phase === 'add-triggers') {
      return (
        sheetId === 'intent_trigger_sentence' &&
        newTriggerIds.includes(rowId) &&
        colId === 'sentence'
      );
    }
    return false;
  };

  const startEdit = (sheetId: SheetId, rowId: string, colId: string) => {
    if (!isEditable(sheetId, rowId, colId)) return;
    let current = '';
    if (sheetId === 'intent_trigger_sentence') {
      current = triggerRows.find((t) => t.id === rowId)?.sentence ?? '';
    } else {
      const row = intentRowsBySheet[
        sheetId as Exclude<SheetId, 'intent_trigger_sentence'>
      ].find((r) => r.id === rowId);
      current =
        row &&
        (colId === 'intent' || colId === 'leadSentence' || colId === 'prompt')
          ? row[colId]
          : '';
    }
    setEditing({ sheetId, rowId, colId });
    setDraft(current);
  };

  const commitEdit = (
    after?: { sheetId: SheetId; rowId: string; colId: string } | null,
  ) => {
    if (!editing) return;
    const { sheetId, rowId, colId } = editing;
    // Compute the post-commit row so phase advancement below can check it
    // against the new value synchronously, without waiting for state.
    let postTriggerRows = triggerRows;
    let postIntentRows = intentRowsBySheet;
    if (sheetId === 'intent_trigger_sentence') {
      postTriggerRows = triggerRows.map((t) =>
        t.id === rowId ? { ...t, sentence: draft } : t,
      );
      setTriggerRows(postTriggerRows);
    } else {
      const key = sheetId as Exclude<SheetId, 'intent_trigger_sentence'>;
      postIntentRows = {
        ...intentRowsBySheet,
        [key]: intentRowsBySheet[key].map((r) =>
          r.id === rowId &&
          (colId === 'intent' ||
            colId === 'leadSentence' ||
            colId === 'prompt')
            ? { ...r, [colId]: draft }
            : r,
        ),
      };
      setIntentRowsBySheet(postIntentRows);
    }

    if (after) {
      // Move editing to the Tab-target cell. Look up its current value from
      // the just-computed post-state so the editor seeds with the latest.
      let nextValue = '';
      if (after.sheetId === 'intent_trigger_sentence') {
        nextValue =
          postTriggerRows.find((t) => t.id === after.rowId)?.sentence ?? '';
      } else {
        const key = after.sheetId as Exclude<SheetId, 'intent_trigger_sentence'>;
        const row = postIntentRows[key]?.find((r) => r.id === after.rowId);
        if (
          row &&
          (after.colId === 'intent' ||
            after.colId === 'leadSentence' ||
            after.colId === 'prompt')
        ) {
          nextValue = row[after.colId];
        }
      }
      setEditing(after);
      setDraft(nextValue);
      return;
    }

    setEditing(null);
    setDraft('');

    // Advance phase in-handler (not via effect) once required cells are filled.
    if (phase === 'add-intent' && addedIntent) {
      const key = addedIntent.sheetId as Exclude<
        SheetId,
        'intent_trigger_sentence'
      >;
      const row = postIntentRows[key]?.find((r) => r.id === addedIntent.rowId);
      if (
        row &&
        row.intent.trim() &&
        row.leadSentence.trim() &&
        row.prompt.trim()
      ) {
        setPhase('run-intent-script');
      }
    } else if (phase === 'add-triggers') {
      const filled = postTriggerRows.filter(
        (t) => newTriggerIds.includes(t.id) && t.sentence.trim(),
      ).length;
      if (filled >= 2) setPhase('run-trigger-script');
    }
  };

  // Tab navigation between editable cells within the current phase.
  // - add-intent: intent → leadSentence → prompt (forward), reverse on Shift.
  // - add-triggers: sentence row N → sentence row N±1 (across newTriggerIds).
  // Returns null when there's no further editable cell in that direction,
  // which commits and closes the editor.
  const computeNextCell = (
    current: { sheetId: SheetId; rowId: string; colId: string },
    shift: boolean,
  ) => {
    if (
      phase === 'add-intent' &&
      current.sheetId === CORRECT_INTENT_SHEET_ID &&
      addedIntent?.rowId === current.rowId
    ) {
      const order: Array<'intent' | 'leadSentence' | 'prompt'> = [
        'intent',
        'leadSentence',
        'prompt',
      ];
      const idx = order.indexOf(
        current.colId as 'intent' | 'leadSentence' | 'prompt',
      );
      if (idx < 0) return null;
      const nextIdx = shift ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= order.length) return null;
      return {
        sheetId: current.sheetId,
        rowId: current.rowId,
        colId: order[nextIdx],
      };
    }
    if (
      phase === 'add-triggers' &&
      current.sheetId === 'intent_trigger_sentence' &&
      newTriggerIds.includes(current.rowId)
    ) {
      const idx = newTriggerIds.indexOf(current.rowId);
      if (idx < 0) return null;
      const nextIdx = shift ? idx - 1 : idx + 1;
      if (nextIdx < 0 || nextIdx >= newTriggerIds.length) return null;
      return {
        sheetId: 'intent_trigger_sentence' as SheetId,
        rowId: newTriggerIds[nextIdx],
        colId: 'sentence',
      };
    }
    return null;
  };

  const handleTab = (shift: boolean) => {
    if (!editing) return;
    const next = computeNextCell(editing, shift);
    commitEdit(next);
  };

  const openConfirmIntent = () => {
    if (phase !== 'run-intent-script' || disabled || running) return;
    setMenuOpen(false);
    setConfirmDialog('intent');
  };

  const openConfirmTriggers = () => {
    if (phase !== 'run-trigger-script' || disabled || running) return;
    setMenuOpen(false);
    setConfirmDialog('triggers');
  };

  const runIntentScript = async () => {
    if (!addedIntentRow) return;
    setConfirmDialog(null);
    setRunning(true);
    const attempt = intentAttempts + 1;
    try {
      const res = await fetch(
        '/api/courses/fix-intent-5min/validate-sheet',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'intent',
            payload: {
              intentName: addedIntentRow.intent,
              leadSentence: addedIntentRow.leadSentence,
              prompt: addedIntentRow.prompt,
            },
            context: { representativeIntent: representative, attempt },
          }),
        },
      );
      const data = await res.json();
      await new Promise((r) => setTimeout(r, 600));
      setRunning(false);
      if (data?.pass) {
        setIntentAttempts(0);
        setPhase('add-triggers');
        setActiveTabId('intent_trigger_sentence');
      } else {
        setIntentAttempts(attempt);
        setPhase('add-intent');
        setFeedback(
          typeof data?.hint === 'string' && data.hint
            ? data.hint
            : '인텐트 행을 다시 확인해주세요.',
        );
      }
    } catch {
      setRunning(false);
      setPhase('add-intent');
      setFeedback('검증 서버에 일시적 오류가 있어요. 다시 시도해주세요.');
    }
  };

  const runTriggerScript = async () => {
    if (!addedIntentRow) return;
    setConfirmDialog(null);
    setRunning(true);
    const attempt = triggerAttempts + 1;
    const triggers = triggerRows
      .filter((t) => newTriggerIds.includes(t.id))
      .map((t) => t.sentence);
    try {
      const res = await fetch(
        '/api/courses/fix-intent-5min/validate-sheet',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'triggers',
            payload: { intentName: addedIntentRow.intent, triggers },
            context: { representativeIntent: representative, attempt },
          }),
        },
      );
      const data = await res.json();
      await new Promise((r) => setTimeout(r, 600));
      setRunning(false);
      if (data?.pass) {
        setTriggerAttempts(0);
        setPhase('complete');
        const summary = `학사 시트에 '${addedIntentRow.intent}' 인텐트 신설 + Prompt 작성, intent_trigger_sentence 에 트리거 ${triggers.length}건 등록. Update Intent Prompts (dev) · Update Intent Triggers (dev) 스크립트 실행 완료.`;
        onComplete(summary);
      } else {
        setTriggerAttempts(attempt);
        setPhase('add-triggers');
        setFeedback(
          typeof data?.hint === 'string' && data.hint
            ? data.hint
            : '트리거 문장을 다시 확인해주세요.',
        );
      }
    } catch {
      setRunning(false);
      setPhase('add-triggers');
      setFeedback('검증 서버에 일시적 오류가 있어요. 다시 시도해주세요.');
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white text-[#3c4043]">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-[#e0e0e0] bg-white px-4 py-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
          <svg viewBox="0 0 48 48" className="h-7 w-7" aria-hidden="true">
            <path
              d="M29 2H10a2 2 0 0 0-2 2v40a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V13L29 2z"
              fill="#0F9D58"
            />
            <path d="M29 2v11h11L29 2z" fill="#087f45" />
            <path
              d="M15 20h18v2H15zm0 5h18v2H15zm0 5h18v2H15zm0 5h18v2H15z"
              fill="#fff"
            />
          </svg>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-normal text-[#3c4043]">
              [DEVELOP] Hanyang Univ Intent Prompt
            </span>
            <button
              type="button"
              aria-label="Star"
              className="rounded-full p-1 text-[#5f6368] hover:bg-[rgba(60,64,67,0.08)]"
            >
              <Star size={16} />
            </button>
            <span className="ml-1 inline-flex items-center gap-1 rounded-md border border-[#dadce0] px-1.5 py-0.5 text-[11px] text-[#5f6368]">
              External
            </span>
            <span className="ml-1 text-[12px] text-[#5f6368]">
              Saved to Drive
            </span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex -space-x-1">
            <div
              className="h-7 w-7 rounded-full border-2 border-white"
              style={{ background: '#137333' }}
              aria-hidden="true"
            />
            <div
              className="h-7 w-7 rounded-full border-2 border-white"
              style={{ background: '#b80672' }}
              aria-hidden="true"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-full bg-[#c2e7ff] px-3.5 py-1.5 text-[13px] font-medium text-[#001d35] hover:bg-[#b2ddf7]"
          >
            Share
          </button>
        </div>
      </div>

      {/* Menu bar */}
      <div className="relative flex items-center gap-0.5 border-b border-[#e0e0e0] bg-white px-3 py-1 text-[13px] text-[#3c4043]">
        {[
          'File',
          'Edit',
          'View',
          'Insert',
          'Format',
          'Data',
          'Tools',
          'Extensions',
          'Help',
        ].map((m) => (
          <button
            key={m}
            type="button"
            className="rounded px-2 py-0.5 hover:bg-[rgba(60,64,67,0.08)]"
          >
            {m}
          </button>
        ))}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={disabled || running}
            className={`flex items-center gap-0.5 rounded px-2 py-0.5 hover:bg-[rgba(60,64,67,0.08)] disabled:opacity-40 ${
              menuOpen ? 'bg-[rgba(60,64,67,0.12)]' : ''
            } ${
              phase === 'run-intent-script' || phase === 'run-trigger-script'
                ? 'ring-2 ring-[#FF9D00] ring-offset-1'
                : ''
            }`}
          >
            Custom Scripts
            <ChevronDown size={14} className="text-[#5f6368]" />
          </button>
          {menuOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-[#e0e0e0] bg-white py-1 shadow-[0_2px_6px_2px_rgba(60,64,67,0.15)]">
              <button
                onClick={openConfirmIntent}
                disabled={phase !== 'run-intent-script'}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[rgba(60,64,67,0.08)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  phase === 'run-intent-script'
                    ? 'bg-[rgba(255,157,0,0.08)]'
                    : ''
                }`}
              >
                <Play size={14} className="text-[#0F9D58]" />
                Update Intent Prompts (dev)
                {phase === 'add-triggers' ||
                phase === 'run-trigger-script' ||
                phase === 'complete' ? (
                  <span className="ml-auto text-[10px] text-[#0F9D58]">✓</span>
                ) : null}
              </button>
              <button
                onClick={openConfirmTriggers}
                disabled={phase !== 'run-trigger-script'}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[rgba(60,64,67,0.08)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  phase === 'run-trigger-script'
                    ? 'bg-[rgba(255,157,0,0.08)]'
                    : ''
                }`}
              >
                <Play size={14} className="text-[#0F9D58]" />
                Update Intent Triggers (dev)
                {phase === 'complete' ? (
                  <span className="ml-auto text-[10px] text-[#0F9D58]">✓</span>
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Cosmetic toolbar */}
      <div className="flex items-center gap-1 border-b border-[#e0e0e0] bg-white px-3 py-1 text-[#5f6368]">
        {[
          Search,
          Undo2,
          Redo2,
          Printer,
          Paintbrush,
          Percent,
          DollarSign,
          Bold,
          Italic,
          Strikethrough,
          Sparkles,
          MoreHorizontal,
        ].map((Icon, i) => (
          <button
            key={i}
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-[rgba(60,64,67,0.08)]"
            aria-hidden="true"
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#e0e0e0] bg-white px-3 py-1.5">
        {SHEET_ORDER.map((id) => (
          <button
            key={id}
            onClick={() => handleTabClick(id)}
            className={`rounded-t px-3 py-1 text-xs ${
              activeTabId === id
                ? 'border-x border-t border-[rgba(55,53,47,0.12)] bg-white text-[#37352f]'
                : 'text-gray-500 hover:bg-[rgba(55,53,47,0.04)]'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4 pb-40">
        {activeTabId === 'intent_trigger_sentence' ? (
          <TriggerSheetTable
            rows={triggerRows}
            newTriggerIds={newTriggerIds}
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            startEdit={startEdit}
            commitEdit={commitEdit}
            handleTab={handleTab}
            isEditable={(rowId, colId) =>
              isEditable('intent_trigger_sentence', rowId, colId)
            }
          />
        ) : (
          <IntentSheetTable
            sheetId={activeTabId}
            rows={intentRowsBySheet[activeTabId]}
            addedRowId={
              addedIntent?.sheetId === activeTabId ? addedIntent.rowId : null
            }
            editing={editing}
            draft={draft}
            setDraft={setDraft}
            startEdit={startEdit}
            commitEdit={commitEdit}
            handleTab={handleTab}
            isEditable={(rowId, colId) =>
              isEditable(activeTabId, rowId, colId)
            }
          />
        )}

        {phase === 'add-intent' && activeTabId !== 'intent_trigger_sentence' ? (
          <div className="mt-2">
            <button
              onClick={() => handleAddIntentRow(activeTabId)}
              className="flex items-center gap-1.5 rounded-md border border-[#e0e0e0] bg-white px-3 py-1.5 text-[13px] text-[#3c4043] hover:bg-[rgba(60,64,67,0.04)]"
            >
              <Play size={12} className="text-[#0F9D58]" />+ 인텐트 행 추가
            </button>
          </div>
        ) : null}
        {phase === 'add-triggers' &&
        activeTabId === 'intent_trigger_sentence' ? (
          <div className="mt-2">
            <button
              onClick={handleAddTriggerRow}
              className="flex items-center gap-1.5 rounded-md border border-[#e0e0e0] bg-white px-3 py-1.5 text-[13px] text-[#3c4043] hover:bg-[rgba(60,64,67,0.04)]"
            >
              <Play size={12} className="text-[#0F9D58]" />+ 트리거 행 추가
            </button>
          </div>
        ) : null}
      </div>

      {running ? (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/60">
          <div className="flex items-center gap-2 rounded-md bg-white px-4 py-2 shadow">
            <Loader2 className="h-4 w-4 animate-spin text-[#0F9D58]" />
            <span className="text-sm">스크립트 실행 중…</span>
          </div>
        </div>
      ) : null}

      {(phase === 'add-intent' || phase === 'run-intent-script') &&
      !showQuestFor ? (
        <RelatedInfoCard defaultExpanded />
      ) : null}

      {showQuestFor ? (
        <QuestModal
          label="QUEST"
          body={PHASE_QUEST[showQuestFor]}
          cta="확인"
          onAccept={() => markQuestSeen(showQuestFor)}
        />
      ) : null}

      {!showQuestFor && feedback ? (
        <FeedbackModal
          correct={false}
          message={feedback}
          onClose={() => setFeedback(null)}
        />
      ) : null}

      {confirmDialog ? (
        <ConfirmDialog
          title={
            confirmDialog === 'intent'
              ? 'Update Intent Prompts (dev)'
              : 'Update Intent Triggers (dev)'
          }
          message={
            confirmDialog === 'intent'
              ? '모든 프롬프트를 dev에 업데이트 하시겠습니까?'
              : 'dev 인텐트 트리거 문장을 업데이트 하시겠습니까?'
          }
          onCancel={() => setConfirmDialog(null)}
          onConfirm={
            confirmDialog === 'intent' ? runIntentScript : runTriggerScript
          }
        />
      ) : null}
    </div>
  );
}

function TriggerSheetTable({
  rows,
  newTriggerIds,
  editing,
  draft,
  setDraft,
  startEdit,
  commitEdit,
  handleTab,
  isEditable,
}: {
  rows: TriggerRow[];
  newTriggerIds: string[];
  editing: { sheetId: SheetId; rowId: string; colId: string } | null;
  draft: string;
  setDraft: (s: string) => void;
  startEdit: (sheetId: SheetId, rowId: string, colId: string) => void;
  commitEdit: () => void;
  handleTab: (shift: boolean) => void;
  isEditable: (rowId: string, colId: string) => boolean;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        <tr>
          <td className="w-8 border border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] text-center text-[10px] text-gray-400">
            #
          </td>
          {TRIGGER_COLS.map((c) => (
            <td
              key={c.id}
              className="border border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] px-2 py-1 font-semibold text-[#37352f]"
              style={{ minWidth: c.width === '1fr' ? '240px' : c.width }}
            >
              {c.label}
            </td>
          ))}
        </tr>
        {rows.map((row, idx) => {
          const isNew = newTriggerIds.includes(row.id);
          return (
            <tr key={row.id}>
              <td className="w-8 border border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] text-center text-[10px] text-gray-400">
                {idx + 2}
              </td>
              {TRIGGER_COLS.map((c) => {
                const canEdit = isEditable(row.id, c.id);
                const isEditing =
                  !!editing &&
                  editing.sheetId === 'intent_trigger_sentence' &&
                  editing.rowId === row.id &&
                  editing.colId === c.id;
                const val = row[c.id];
                return (
                  <td
                    key={c.id}
                    onClick={() =>
                      canEdit &&
                      startEdit('intent_trigger_sentence', row.id, c.id)
                    }
                    className={`border border-[rgba(55,53,47,0.09)] px-2 py-1 align-top ${
                      canEdit
                        ? 'cursor-text bg-[#FFF8E1] ring-2 ring-[#FF9D00]'
                        : isNew
                          ? 'cursor-not-allowed bg-[#FFFBEA]'
                          : 'bg-white'
                    }`}
                    style={{ minWidth: c.width === '1fr' ? '240px' : c.width }}
                  >
                    {isEditing ? (
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            handleTab(e.shiftKey);
                            return;
                          }
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') commitEdit();
                        }}
                        className="w-full bg-transparent text-sm outline-none"
                      />
                    ) : val ? (
                      <span className="whitespace-pre-wrap">{val}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function IntentSheetTable({
  sheetId,
  rows,
  addedRowId,
  editing,
  draft,
  setDraft,
  startEdit,
  commitEdit,
  handleTab,
  isEditable,
}: {
  sheetId: SheetId;
  rows: IntentRow[];
  addedRowId: string | null;
  editing: { sheetId: SheetId; rowId: string; colId: string } | null;
  draft: string;
  setDraft: (s: string) => void;
  startEdit: (sheetId: SheetId, rowId: string, colId: string) => void;
  commitEdit: () => void;
  handleTab: (shift: boolean) => void;
  isEditable: (rowId: string, colId: string) => boolean;
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        <tr>
          <td className="w-8 border border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] text-center text-[10px] text-gray-400">
            #
          </td>
          {INTENT_COLS.map((c) => (
            <td
              key={c.id}
              className="border border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] px-2 py-1 font-semibold text-[#37352f]"
              style={{ minWidth: c.width === '1fr' ? '260px' : c.width }}
            >
              {c.label}
            </td>
          ))}
        </tr>
        {rows.map((row, idx) => {
          const isAdded = row.id === addedRowId;
          return (
            <tr key={row.id}>
              <td className="w-8 border border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] text-center text-[10px] text-gray-400">
                {idx + 2}
              </td>
              {INTENT_COLS.map((c) => {
                const canEdit = !c.readonly && isEditable(row.id, c.id);
                const isEditing =
                  !!editing &&
                  editing.sheetId === sheetId &&
                  editing.rowId === row.id &&
                  editing.colId === c.id;
                const val = row[c.id];
                return (
                  <td
                    key={c.id}
                    onClick={() => canEdit && startEdit(sheetId, row.id, c.id)}
                    className={`border border-[rgba(55,53,47,0.09)] px-2 py-1 align-top ${
                      canEdit
                        ? 'cursor-text bg-[#FFF8E1] ring-2 ring-[#FF9D00]'
                        : isAdded
                          ? 'cursor-not-allowed bg-[#FFFBEA]'
                          : 'bg-white'
                    }`}
                    style={{ minWidth: c.width === '1fr' ? '260px' : c.width }}
                  >
                    {isEditing ? (
                      c.id === 'prompt' ? (
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              handleTab(e.shiftKey);
                              return;
                            }
                            if (
                              e.key === 'Enter' &&
                              (e.metaKey || e.ctrlKey)
                            ) {
                              commitEdit();
                            }
                            if (e.key === 'Escape') commitEdit();
                          }}
                          rows={4}
                          className="w-full resize-none bg-transparent text-sm outline-none"
                        />
                      ) : (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              handleTab(e.shiftKey);
                              return;
                            }
                            if (e.key === 'Enter') commitEdit();
                            if (e.key === 'Escape') commitEdit();
                          }}
                          className="w-full bg-transparent text-sm outline-none"
                        />
                      )
                    ) : val ? (
                      <span className="whitespace-pre-wrap">{val}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ConfirmDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-lg bg-white shadow-xl">
        <div className="border-b border-[#e0e0e0] px-5 py-3 text-[15px] font-semibold text-[#202124]">
          {title}
        </div>
        <div className="px-5 py-5 text-[14px] text-[#3c4043]">{message}</div>
        <div className="flex justify-end gap-2 border-t border-[#e0e0e0] px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded px-3 py-1.5 text-[13px] text-[#1a73e8] hover:bg-[rgba(26,115,232,0.08)]"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="rounded bg-[#1a73e8] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#1669d1]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
