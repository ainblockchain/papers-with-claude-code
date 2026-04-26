'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type {
  SelectedIntent,
  SheetArtifact,
} from '@/lib/courses/fix-intent-5min/course-state';
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
import { FeedbackModal } from './FeedbackModal';
import { RelatedInfoCard } from './RelatedInfoCard';
import { ValidationErrorModal } from './ValidationErrorModal';

type Phase =
  | 'add-intent'
  | 'run-intent-script'
  | 'add-triggers'
  | 'run-trigger-script'
  | 'complete';

interface Props {
  disabled?: boolean;
  representative: SelectedIntent | null;
  onComplete: (summary: string, artifact: SheetArtifact) => void;
  // Fires on every internal phase transition so the parent can surface
  // the matching mission copy in its persistent MissionBar. The effect
  // is read-only: parent must never drive phase back into SheetEditPage.
  onPhaseChange?: (phase: Phase) => void;
  // Reports the current phase's primary-action element back up so a
  // GuidanceTooltip anchored on it can point at the real target. The
  // anchor changes with internal `phase` (add-intent row button /
  // Custom Scripts menu / script menu item / add-trigger row button) —
  // fire with `null` when no anchor applies for the active phase.
  // During `add-intent` the reported element further branches on the
  // currently active sheet tab: trigger-sentence tab → leftmost intent
  // category tab; any intent tab → "+ 인텐트 행 추가" button.
  onAnchorEl?: (el: HTMLElement | null) => void;
  // Reports the currently active sheet tab id up to the parent so the
  // guidance resolver can pick between `sheet-add-intent-tab` and
  // `sheet-add-intent-row` sub-phases. Fires once on mount with the
  // initial tab and again after every tab switch.
  onActiveTabChange?: (tabId: SheetId) => void;
  // Per-column DOM element for the newly-added intent row. Fires with
  // the current <td> (or input/textarea when editing) on mount/layout
  // change; `null` when the row doesn't exist yet or the column's cell
  // isn't rendered. The parent anchors the intent / leadSentence /
  // prompt per-column tooltips on these elements.
  onIntentRowCellEl?: (
    colId: 'intent' | 'leadSentence' | 'prompt',
    el: HTMLElement | null,
  ) => void;
  // Reports which of the 3 editable columns on the newly-added intent
  // row currently have non-empty values. Fires with `null` before the
  // row exists (so the parent can keep showing "+ 인텐트 행 추가"
  // guidance); once the row is added, fires with an object and updates
  // on every commit. The parent feeds this into
  // `resolveActiveGuidancePhase` to walk through intent → leadSentence
  // → prompt column tooltips.
  onIntentRowFilled?: (
    filled: { intent: boolean; leadSentence: boolean; prompt: boolean } | null,
  ) => void;
  // Passed through to RelatedInfoCard. Reports the "복사" button ref
  // and fires a callback on successful clipboard write. Bubbled through
  // SheetEditPage because the card is rendered inside the sheet page,
  // not at the course root.
  onRelatedInfoCopyButtonEl?: (el: HTMLButtonElement | null) => void;
  onRelatedInfoCopy?: () => void;
  // Fires whenever the internal ConfirmDialog (triggered by clicking
  // "Update Intent Prompts (dev)" / "Update Intent Triggers (dev)") opens
  // or closes. The parent folds this into its `anyModalOpen` gate so the
  // idle GuidanceTooltip pointing at Custom Scripts is suppressed while
  // the blue confirm dialog is sitting in front of it — otherwise the
  // tooltip floats over/beside the dialog with stale "run the script" copy.
  onConfirmDialogChange?: (open: boolean) => void;
  // Fires while the script is actively running (`running=true`) — the
  // parent suppresses guidance the same way as the confirm dialog so
  // the "run the script" tooltip doesn't hang around the running spinner.
  onScriptRunningChange?: (running: boolean) => void;
  // Fires when the Custom Scripts dropdown menu is open. Suppresses the
  // idle guidance while the user is hovering menu items so the tooltip
  // doesn't overlay the open menu.
  onScriptMenuOpenChange?: (open: boolean) => void;
}

const INTENT_COLS: Array<{
  id: 'intent' | 'leadSentence' | 'prompt' | 'createdAt';
  label: string;
  width: string;
  readonly?: boolean;
}> = [
  { id: 'intent', label: 'Intent', width: '140px' },
  { id: 'leadSentence', label: '대표 Sentence', width: '180px' },
  { id: 'prompt', label: 'Prompt', width: '1fr' },
  { id: 'createdAt', label: 'created_at', width: '180px', readonly: true },
];

const TRIGGER_COLS: Array<{
  id: 'intent' | 'sentence';
  label: string;
  width: string;
}> = [
  { id: 'intent', label: 'Intent', width: '180px' },
  { id: 'sentence', label: 'Sentence', width: '1fr' },
];

// Leftmost intent category tab is the first in SHEET_ORDER after the
// default trigger-sentence tab. Anchoring the `sheet-add-intent-tab`
// tooltip on this tab reads left-to-right like normal tab navigation.
const INTENT_CATEGORY_TAB_IDS: SheetId[] = SHEET_ORDER.filter(
  (id) => id !== 'intent_trigger_sentence',
);
const LEFTMOST_INTENT_TAB_ID: SheetId = INTENT_CATEGORY_TAB_IDS[0];

export function SheetEditPage({
  disabled,
  representative,
  onComplete,
  onPhaseChange,
  onAnchorEl,
  onActiveTabChange,
  onIntentRowCellEl,
  onIntentRowFilled,
  onRelatedInfoCopyButtonEl,
  onRelatedInfoCopy,
  onConfirmDialogChange,
  onScriptRunningChange,
  onScriptMenuOpenChange,
}: Props) {
  const [phase, setPhase] = useState<Phase>('add-intent');
  // Callback-ref state for each anchor candidate. Using `useState`
  // setters as callback refs (React treats the setter as a stable ref
  // callback) lets the forwarding effect below re-run whenever any
  // anchor element mounts or unmounts — plain useRef wouldn't trigger
  // a re-render, so the parent would miss late-mounting anchors.
  const [addIntentBtn, setAddIntentBtn] =
    useState<HTMLButtonElement | null>(null);
  const [customScriptsBtn, setCustomScriptsBtn] =
    useState<HTMLButtonElement | null>(null);
  const [intentScriptItem, setIntentScriptItem] =
    useState<HTMLButtonElement | null>(null);
  const [triggerScriptItem, setTriggerScriptItem] =
    useState<HTMLButtonElement | null>(null);
  const [addTriggerBtn, setAddTriggerBtn] =
    useState<HTMLButtonElement | null>(null);
  // Anchor for `sheet-add-intent-tab` — the leftmost intent category
  // tab (the first tab right of `intent_trigger_sentence`). Captured
  // via callback-ref on the matching <button> during the tab-row render.
  const [leftmostIntentTabBtn, setLeftmostIntentTabBtn] =
    useState<HTMLButtonElement | null>(null);
  // Keep the parent's copy of the internal phase in sync with ours.
  // Using an effect instead of inlining the callback at every setPhase
  // call site keeps the many transitions (run-* failure paths, etc.)
  // from drifting out of sync if someone later forgets to mirror a
  // setPhase with an onPhaseChange.
  useEffect(() => {
    onPhaseChange?.(phase);
  }, [phase, onPhaseChange]);
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
  // Soft "검증 서버 일시 오류" retry modal — captured when validate-sheet
  // returns kind:'server-error' (or fetch throws). The retry callback
  // re-runs the same script handler so the learner doesn't have to
  // re-open the Confirm dialog. NOT a wrong-answer modal — the input
  // may be perfectly correct, so we don't bump intent/trigger attempts.
  const [serverErrorRetry, setServerErrorRetry] = useState<
    (() => void) | null
  >(null);
  const [confirmDialog, setConfirmDialog] = useState<
    'intent' | 'triggers' | null
  >(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Bubble the ConfirmDialog open/closed transitions up so the parent can
  // suppress the Custom Scripts idle tooltip while the blue dialog is up.
  useEffect(() => {
    onConfirmDialogChange?.(confirmDialog !== null);
  }, [confirmDialog, onConfirmDialogChange]);
  // Same story for `running` (script executing) and `menuOpen` (Custom
  // Scripts dropdown open) — both occlude / overlap the tooltip area and
  // the "run the script" copy is stale while the learner is mid-action.
  useEffect(() => {
    onScriptRunningChange?.(running);
  }, [running, onScriptRunningChange]);
  useEffect(() => {
    onScriptMenuOpenChange?.(menuOpen);
  }, [menuOpen, onScriptMenuOpenChange]);

  // Forward the element that currently matches the active internal phase
  // up to the parent for GuidanceTooltip anchoring. While Custom Scripts
  // menu is open on a `run-*` phase, the script menu item is the better
  // anchor (closer to the actual click target); while the menu is
  // closed, the menu button itself is the anchor so the tooltip can
  // nudge the learner to open the menu first.
  useEffect(() => {
    if (!onAnchorEl) return;
    let el: HTMLElement | null = null;
    if (phase === 'add-intent') {
      // Trigger-sentence tab → leftmost intent category tab (nudges
      // the learner toward picking a domain). Intent category tab →
      // "+ 인텐트 행 추가" button. If the intent row button hasn't
      // mounted yet (rare — only during the tab-switch animation) we
      // fall back to the leftmost intent tab rather than returning null
      // so the tooltip doesn't flicker off-screen mid-transition.
      if (activeTabId === 'intent_trigger_sentence') {
        el = leftmostIntentTabBtn;
      } else {
        el = addIntentBtn ?? leftmostIntentTabBtn;
      }
    } else if (phase === 'run-intent-script')
      el = menuOpen ? intentScriptItem : customScriptsBtn;
    else if (phase === 'add-triggers') el = addTriggerBtn;
    else if (phase === 'run-trigger-script')
      el = menuOpen ? triggerScriptItem : customScriptsBtn;
    onAnchorEl(el);
  }, [
    phase,
    activeTabId,
    menuOpen,
    addIntentBtn,
    leftmostIntentTabBtn,
    customScriptsBtn,
    intentScriptItem,
    triggerScriptItem,
    addTriggerBtn,
    onAnchorEl,
  ]);

  // Report the active tab id up to the parent so it can feed the
  // guidance resolver's new `sheetActiveTabId` ctx key. Fires on mount
  // with the initial value and on every subsequent tab change.
  useEffect(() => {
    onActiveTabChange?.(activeTabId);
  }, [activeTabId, onActiveTabChange]);

  // Per-column DOM refs for the newly-added intent row. Used for
  // anchoring the intent → leadSentence → prompt tooltip sequence.
  // The <td> is the natural anchor (stable across edit ↔ read mode
  // within the same commit frame); the input/textarea element inside
  // would churn on every edit-state toggle.
  const [intentCellEls, setIntentCellEls] = useState<{
    intent: HTMLElement | null;
    leadSentence: HTMLElement | null;
    prompt: HTMLElement | null;
  }>({ intent: null, leadSentence: null, prompt: null });
  // Stable per-column setter factory. IntentSheetTable uses these as
  // <td> callback-refs via `ref={...}` — React re-invokes the ref on
  // unmount with null and on mount with the element, so we get free
  // cleanup. We only care about the currently-added row's cells, so
  // the table passes the setters only on the row where `isAdded`.
  const setIntentCellEl = useCallback(
    (colId: 'intent' | 'leadSentence' | 'prompt', el: HTMLElement | null) => {
      setIntentCellEls((prev) => {
        if (prev[colId] === el) return prev;
        return { ...prev, [colId]: el };
      });
    },
    [],
  );
  // Forward the cell refs up to the parent whenever they change.
  useEffect(() => {
    if (!onIntentRowCellEl) return;
    onIntentRowCellEl('intent', intentCellEls.intent);
    onIntentRowCellEl('leadSentence', intentCellEls.leadSentence);
    onIntentRowCellEl('prompt', intentCellEls.prompt);
  }, [intentCellEls, onIntentRowCellEl]);


  const [intentAttempts, setIntentAttempts] = useState(0);
  const [triggerAttempts, setTriggerAttempts] = useState(0);

  const addedIntentRow = useMemo<IntentRow | null>(() => {
    if (!addedIntent) return null;
    if (addedIntent.sheetId === 'intent_trigger_sentence') return null;
    const rows =
      intentRowsBySheet[
        addedIntent.sheetId as Exclude<SheetId, 'intent_trigger_sentence'>
      ];
    return rows.find((r) => r.id === addedIntent.rowId) ?? null;
  }, [addedIntent, intentRowsBySheet]);

  // Forward the fill state of the newly-added intent row. `null` when
  // no row has been added yet (the parent keeps showing the "+ 인텐트
  // 행 추가" tooltip in that state). Once the row exists, the object
  // reports which editable columns are non-empty.
  useEffect(() => {
    if (!onIntentRowFilled) return;
    if (!addedIntentRow) {
      onIntentRowFilled(null);
      return;
    }
    onIntentRowFilled({
      intent: Boolean(addedIntentRow.intent?.trim()),
      leadSentence: Boolean(addedIntentRow.leadSentence?.trim()),
      prompt: Boolean(addedIntentRow.prompt?.trim()),
    });
  }, [
    addedIntentRow,
    addedIntentRow?.intent,
    addedIntentRow?.leadSentence,
    addedIntentRow?.prompt,
    onIntentRowFilled,
  ]);

  const handleTabClick = (id: SheetId) => {
    setEditing(null);
    setActiveTabId(id);
  };

  const handleAddIntentRow = (sheetId: SheetId) => {
    if (sheetId === 'intent_trigger_sentence' || phase !== 'add-intent') return;
    // One intent row per Stage 3 — after the learner adds it (even empty),
    // the button is locked. Triggers stay multi-add.
    if (addedIntent) return;
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
      // Transient server error → "try again" modal, don't bump attempts
      // and don't reset phase (learner can retry from the same Confirm
      // dialog state without re-opening Custom Scripts).
      if (data?.kind === 'server-error') {
        setPhase('add-intent');
        setServerErrorRetry(() => runIntentScript);
        return;
      }
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
      // Network blip / fetch threw — same UX as kind:'server-error'.
      setServerErrorRetry(() => runIntentScript);
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
      // Transient server error → "try again" modal, don't bump attempts.
      if (data?.kind === 'server-error') {
        setPhase('add-triggers');
        setServerErrorRetry(() => runTriggerScript);
        return;
      }
      if (data?.pass) {
        setTriggerAttempts(0);
        setPhase('complete');
        const summary = `학사 시트에 '${addedIntentRow.intent}' 인텐트 신설 + Prompt 작성, intent_trigger_sentence 에 트리거 ${triggers.length}건 등록. Update Intent Prompts (dev) · Update Intent Triggers (dev) 스크립트 실행 완료.`;
        const artifact: SheetArtifact = {
          addedIntent: {
            sheetId: CORRECT_INTENT_SHEET_ID,
            intent: addedIntentRow.intent,
            leadSentence: addedIntentRow.leadSentence,
            prompt: addedIntentRow.prompt,
            createdAt: addedIntentRow.createdAt,
          },
          triggers: triggerRows
            .filter((t) => newTriggerIds.includes(t.id))
            .map((t) => ({ intent: t.intent, sentence: t.sentence })),
          snapshotAt: Date.now(),
        };
        onComplete(summary, artifact);
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
      // Network blip / fetch threw — same UX as kind:'server-error'.
      setServerErrorRetry(() => runTriggerScript);
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
            ref={setCustomScriptsBtn}
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
                ref={setIntentScriptItem}
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
                ref={setTriggerScriptItem}
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

      {/* Tabs. While the learner is on the default trigger-sentence tab
          during the `add-intent` phase, the four intent-category tabs
          get a soft orange ring + gentle pulse so it's obvious they
          need to pick one. The highlight falls off as soon as any
          intent tab becomes active (or Stage 3 advances past add-intent). */}
      <style>{`
        @keyframes cc-tab-group-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 157, 0, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(255, 157, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 157, 0, 0); }
        }
        .cc-tab-group-pulse {
          border-radius: 6px;
          box-shadow: 0 0 0 0 rgba(255, 157, 0, 0.5);
          animation: cc-tab-group-pulse 2s ease-in-out infinite;
        }
      `}</style>
      <div className="flex items-center gap-1 border-b border-[#e0e0e0] bg-white px-3 py-1.5">
        {(() => {
          const highlightIntentTabs =
            phase === 'add-intent' &&
            activeTabId === 'intent_trigger_sentence';
          // Group the 4 intent tabs inside a wrapper so the orange
          // ring+pulse surrounds them as a unit. The trigger-sentence
          // tab renders outside the wrapper and keeps its plain styling.
          const triggerTabId: SheetId = 'intent_trigger_sentence';
          return (
            <>
              <button
                key={triggerTabId}
                onClick={() => handleTabClick(triggerTabId)}
                className={`rounded-t px-3 py-1 text-xs ${
                  activeTabId === triggerTabId
                    ? 'border-x border-t border-[rgba(55,53,47,0.12)] bg-white text-[#37352f]'
                    : 'text-gray-500 hover:bg-[rgba(55,53,47,0.04)]'
                }`}
              >
                {triggerTabId}
              </button>
              <div
                className={`flex items-center gap-1 ${
                  highlightIntentTabs
                    ? 'cc-tab-group-pulse ring-2 ring-[#FF9D00]'
                    : ''
                }`}
              >
                {INTENT_CATEGORY_TAB_IDS.map((id) => (
                  <button
                    key={id}
                    ref={
                      id === LEFTMOST_INTENT_TAB_ID
                        ? setLeftmostIntentTabBtn
                        : undefined
                    }
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
            </>
          );
        })()}
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
            isEditable={(rowId, colId) =>
              isEditable(activeTabId, rowId, colId)
            }
            onAddedRowCellEl={setIntentCellEl}
          />
        )}

        {phase === 'add-intent' && activeTabId !== 'intent_trigger_sentence' ? (
          <div className="mt-2">
            <button
              ref={setAddIntentBtn}
              onClick={() => handleAddIntentRow(activeTabId)}
              disabled={!!addedIntent}
              // Highlight only on the correct (학사) tab so the orange
              // ring isn't a spoiler when the learner is still scanning
              // tabs. Once the row is added, the button flips to its
              // disabled/dim styling and the highlight falls off.
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-[#3c4043] disabled:cursor-not-allowed disabled:opacity-40 ${
                !addedIntent && activeTabId === CORRECT_INTENT_SHEET_ID
                  ? 'border border-transparent bg-[#FFF8E1] ring-2 ring-[#FF9D00] hover:bg-[#FFEDB8]'
                  : 'border border-[#e0e0e0] bg-white hover:bg-[rgba(60,64,67,0.04)] disabled:hover:bg-white'
              }`}
            >
              <Play size={12} className="text-[#0F9D58]" />+ 인텐트 행 추가
            </button>
          </div>
        ) : null}
        {phase === 'add-triggers' &&
        activeTabId === 'intent_trigger_sentence' ? (
          <div className="mt-2">
            <button
              ref={setAddTriggerBtn}
              onClick={handleAddTriggerRow}
              // Highlight the "add trigger" button when no trigger cell
              // is actively being edited — once the learner is typing in
              // a row, the orange-ring cell owns the spotlight and the
              // button drops back to plain styling to avoid competing.
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-[#3c4043] ${
                !editing
                  ? 'border border-transparent bg-[#FFF8E1] ring-2 ring-[#FF9D00] hover:bg-[#FFEDB8]'
                  : 'border border-[#e0e0e0] bg-white hover:bg-[rgba(60,64,67,0.04)]'
              }`}
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

      {phase === 'add-intent' || phase === 'run-intent-script' ? (
        <RelatedInfoCard
          onCopyButtonEl={onRelatedInfoCopyButtonEl}
          onCopy={onRelatedInfoCopy}
        />
      ) : null}

      {feedback ? (
        <FeedbackModal
          correct={false}
          message={feedback}
          onClose={() => setFeedback(null)}
        />
      ) : null}

      {serverErrorRetry ? (
        <ValidationErrorModal
          onRetry={() => {
            const retry = serverErrorRetry;
            setServerErrorRetry(null);
            retry();
          }}
          onClose={() => setServerErrorRetry(null)}
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
  isEditable,
}: {
  rows: TriggerRow[];
  newTriggerIds: string[];
  editing: { sheetId: SheetId; rowId: string; colId: string } | null;
  draft: string;
  setDraft: (s: string) => void;
  startEdit: (sheetId: SheetId, rowId: string, colId: string) => void;
  commitEdit: () => void;
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
                        onBlur={() => commitEdit()}
                        onKeyDown={(e) => {
                          // Commit on Enter/Escape; clicking outside also
                          // commits via onBlur. No Tab/Ctrl+Enter gymnastics.
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            commitEdit();
                          }
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
  isEditable,
  onAddedRowCellEl,
}: {
  sheetId: SheetId;
  rows: IntentRow[];
  addedRowId: string | null;
  editing: { sheetId: SheetId; rowId: string; colId: string } | null;
  draft: string;
  setDraft: (s: string) => void;
  startEdit: (sheetId: SheetId, rowId: string, colId: string) => void;
  commitEdit: () => void;
  isEditable: (rowId: string, colId: string) => boolean;
  // Callback-ref for the 3 editable columns of the newly-added row.
  // Only the new row reports its <td> elements; all other rows skip
  // the ref so SheetEditPage's intent-cell map tracks exactly one row
  // (the current spotlight target).
  onAddedRowCellEl?: (
    colId: 'intent' | 'leadSentence' | 'prompt',
    el: HTMLElement | null,
  ) => void;
}) {
  // Stable per-column ref callbacks. React re-invokes a ref callback
  // whenever its identity changes; if we built the callback inline
  // inside the <td> we'd get a null→el flip every render. Memo-ing on
  // the stable `onAddedRowCellEl` keeps identity stable across
  // renders, so the callback only fires on actual mount/unmount.
  const addedRowRefs = useMemo(
    () => ({
      intent: (el: HTMLTableCellElement | null) =>
        onAddedRowCellEl?.('intent', el),
      leadSentence: (el: HTMLTableCellElement | null) =>
        onAddedRowCellEl?.('leadSentence', el),
      prompt: (el: HTMLTableCellElement | null) =>
        onAddedRowCellEl?.('prompt', el),
    }),
    [onAddedRowCellEl],
  );
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
                // Only the 3 editable columns of the added row report
                // their <td> up as a guidance anchor. readonly column
                // (`createdAt`) and non-added rows skip the ref.
                const cellRef =
                  isAdded &&
                  (c.id === 'intent' ||
                    c.id === 'leadSentence' ||
                    c.id === 'prompt')
                    ? addedRowRefs[c.id]
                    : undefined;
                return (
                  <td
                    key={c.id}
                    ref={cellRef}
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
                          onBlur={() => commitEdit()}
                          onKeyDown={(e) => {
                            // Enter stays as newline for prompt bodies;
                            // commit lives on outside-click (onBlur) only.
                            // Escape gives an explicit escape hatch.
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
                          onBlur={() => commitEdit()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              commitEdit();
                            }
                          }}
                          className="w-full bg-transparent text-sm outline-none"
                        />
                      )
                    ) : val ? (
                      c.id === 'prompt' ? (
                        // Prompt bodies can run long — cap the read-mode
                        // height to roughly 4 lines and let the cell scroll
                        // vertically so the row doesn't balloon.
                        <div
                          className="whitespace-pre-wrap overflow-y-auto pr-1"
                          style={{ maxHeight: '6.5em', lineHeight: 1.45 }}
                        >
                          {val}
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{val}</span>
                      )
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
