import type { NotionFieldId } from './course-state';
import type { SheetId } from '@/data/courses/fix-intent-5min/intent-sheets';
import type { MissionPhase, SheetPhase } from './mission-copy';

// Granular per-step phases the guidance system can target. Finer than
// MissionPhase because tooltips escalate per active field / sheet step,
// not per MissionPhase bucket. Keep this list in lockstep with
// `guidanceConfig` below and the copy map in `tooltip-copy.ts`.
export type GuidancePhase =
  | 'dashboard'
  | 'notion-landing'
  | 'notion-field-agent'
  | 'notion-field-title'
  | 'notion-field-assignee'
  | 'notion-field-status'
  | 'notion-field-season'
  | 'notion-field-workType'
  // problemAnalysis walks the learner through a 3-step tooltip sequence:
  // (1) click the in-field "복사하러가기" button → opens CopyIssueModal,
  // (2) inside the modal, click "전체 복사" to fill the clipboard, and
  // (3) back in the field, confirm paste and hit submit. Each sub-phase
  // owns its own anchor and copy; `resolveActiveGuidancePhase` picks
  // the current sub-phase from `copyIssueOpen` + `problemAnalysisCopied`.
  | 'notion-field-problemAnalysis-copy'
  | 'notion-field-problemAnalysis-copy-modal'
  | 'notion-field-problemAnalysis-submit'
  | 'stage2-solutionDirection'
  // Stage 3 step 1 splits on the active sheet tab:
  // - `sheet-add-intent-tab` fires while the learner is still on the
  //   default `intent_trigger_sentence` tab and has not yet navigated
  //   into a domain tab. Anchor = leftmost intent category tab.
  // - `sheet-add-intent-row` fires once the learner is on any of the 4
  //   intent category tabs (일반 / 재무 / 학사 / 국제). Anchor = the
  //   "+ 인텐트 행 추가" button on that tab. Side='right' avoids the
  //   clipping the old bottom-anchored tooltip used to hit.
  | 'sheet-add-intent-tab'
  | 'sheet-add-intent-row'
  // After "+ 인텐트 행 추가" is clicked, the blank row needs 3 columns
  // filled (Intent, 대표 Sentence, Prompt). We walk through them one at
  // a time with anchored tooltips so the learner never wonders "now
  // what?". `sheet-field-intent` → `sheet-field-leadSentence` advance
  // strictly on the previous column becoming non-empty. The Prompt
  // column splits on whether the learner has already clicked the
  // Related Information "복사" button this session:
  // - Not yet copied → `sheet-related-copy` anchors at the Related
  //   Information card's "복사" button, nudging them to grab the
  //   reference first.
  // - Copy fired → `sheet-field-prompt-paste` anchors at the Prompt
  //   cell with "붙여넣어 주세요" guidance.
  | 'sheet-field-intent'
  | 'sheet-field-leadSentence'
  | 'sheet-related-copy'
  | 'sheet-field-prompt-paste'
  | 'sheet-run-intent-script'
  | 'sheet-add-triggers'
  | 'sheet-run-trigger-script'
  | 'chatbot-before'
  | 'chatbot-after'
  | 'stage4-status'
  // Stage 4 result-field tooltip walks through a 3-step sequence:
  // (1) click "작업 내용 불러오기" to auto-fill the workContent block,
  // (2) click "테스트 결과 불러오기" to reveal the chatbot Q&A capture,
  // (3) write the result + click submit to end the course. Each sub-phase
  // owns its own anchor/copy; `resolveActiveGuidancePhase` picks based on
  // `workAutoFilled` (has notion.workContent been auto-filled yet?) and
  // `captureVisible` (is the capture card shown yet?).
  | 'stage4-result-load-work'
  | 'stage4-result-load-capture'
  | 'stage4-result-submit';

export interface GuidanceConfig {
  idleMs: number;
  strayThreshold: number;
  side: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
}

// TEST MODE — when true, every `idleMs` below is clamped to a tiny value
// so tooltips fire almost instantly. Leaves stray thresholds alone so
// the soft/firm escalation flow is still observable. Set back to false
// before shipping; idle thresholds are calibrated in the comment below.
const TEST_IMMEDIATE_IDLE = true;
const idle = (realMs: number): number =>
  TEST_IMMEDIATE_IDLE ? 200 : realMs;

// Threshold calibration (production values inside `idle(...)`):
// - 25s on reading/thinking-heavy screens; 20s on simple action screens.
// - sheet-add-intent gets 40s because picking the correct domain tab is
//   the first real judgement the learner exercises in Stage 3.
// - stray thresholds: 3 for form fields (sibling-field exploration is
//   natural), 2 for single-target screens where a miss is actual confusion.
export const guidanceConfig: Record<GuidancePhase, GuidanceConfig> = {
  dashboard: { idleMs: idle(25000), strayThreshold: 3, side: 'top', align: 'start' },
  // notion-landing fires on the FIRST stray click (threshold 1) to
  // preserve the original "click anywhere off-target → hint pops up"
  // behaviour the blocking FeedbackModal used to provide. The tooltip
  // then escalates to the `firm` copy on a second stray after dismiss.
  'notion-landing': { idleMs: idle(20000), strayThreshold: 1, side: 'top', align: 'center' },
  'notion-field-agent': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'center' },
  'notion-field-title': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'center' },
  'notion-field-assignee': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'center' },
  'notion-field-status': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'center' },
  'notion-field-season': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'center' },
  // side='top' for workType because the popover dropdown opens DOWN from
  // the field and occupies ~260px of vertical space. 'right' pushed the
  // tooltip off the task-panel edge (avoidCollisions is off). 'top' keeps
  // the tooltip above the popover footprint and reliably on-screen.
  'notion-field-workType': { idleMs: idle(25000), strayThreshold: 3, side: 'top', align: 'start' },
  // Step 1 — field is active, modal closed, no copy yet. Anchor is the
  // orange "복사하러가기" button rendered just below the block.
  'notion-field-problemAnalysis-copy': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'start' },
  // Step 2 — CopyIssueModal is open. Anchor is the "전체 복사" button in
  // the modal header; `side='bottom'` drops the tooltip into the empty
  // space below the header button. `side='top'` would have clipped the
  // tooltip off the viewport ceiling because the button sits near the
  // modal's top edge (and `avoidCollisions={false}` disables flipping).
  'notion-field-problemAnalysis-copy-modal': { idleMs: idle(20000), strayThreshold: 2, side: 'bottom', align: 'center' },
  // Step 3 — copy has fired at least once. Anchor is the "제출" button
  // on the problemAnalysis BlockField; nudges the learner to paste and submit.
  'notion-field-problemAnalysis-submit': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'start' },
  'stage2-solutionDirection': { idleMs: idle(25000), strayThreshold: 2, side: 'right', align: 'center' },
  // Step 1a — still on the trigger-sentence tab. Anchor = leftmost
  // intent tab; drop down from it with `start` alignment so the arrow
  // sits directly under the tab label.
  'sheet-add-intent-tab': { idleMs: idle(40000), strayThreshold: 2, side: 'bottom', align: 'start' },
  // Step 1b — on an intent category tab. Anchor = "+ 인텐트 행 추가"
  // button. `side=right` pushes the tooltip out into the empty grid
  // area beside the button so it never clips the cell/viewport edge,
  // and the arrow lands on the LEFT side of the tooltip consistently.
  'sheet-add-intent-row': { idleMs: idle(40000), strayThreshold: 3, side: 'right', align: 'center' },
  // Per-column field guidance after the row is added. Anchors are the
  // intent/leadSentence/prompt cells of the new row. Right/start keeps
  // the tooltip out in the open grid area past the narrow cell column.
  'sheet-field-intent': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'start' },
  'sheet-field-leadSentence': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'start' },
  // Anchors at the RelatedInfoCard's "복사" button floating near the
  // bottom of the page; point up at it with center alignment.
  'sheet-related-copy': { idleMs: idle(25000), strayThreshold: 2, side: 'top', align: 'center' },
  'sheet-field-prompt-paste': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'start' },
  'sheet-run-intent-script': { idleMs: idle(25000), strayThreshold: 3, side: 'bottom', align: 'center' },
  // side='right' so the tooltip sits beside the trigger sentence row with
  // the arrow on its left edge — the default 'bottom' clipped against the
  // viewport given how the trigger table sits near the page edge.
  'sheet-add-triggers': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'center' },
  'sheet-run-trigger-script': { idleMs: idle(25000), strayThreshold: 3, side: 'bottom', align: 'center' },
  'chatbot-before': { idleMs: idle(20000), strayThreshold: 2, side: 'top', align: 'center' },
  'chatbot-after': { idleMs: idle(15000), strayThreshold: 2, side: 'top', align: 'center' },
  'stage4-status': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'center' },
  // Step 1 — anchor at the orange "작업 내용 불러오기" button above the
  // workContent block. `side='right'` lands the tooltip in the empty
  // grid area beside the pill so it never clips the page edge.
  'stage4-result-load-work': { idleMs: idle(20000), strayThreshold: 3, side: 'right', align: 'center' },
  // Step 2 — anchor at the orange "테스트 결과 불러오기" button below the
  // result block. Same geometry as step 1 for visual consistency.
  'stage4-result-load-capture': { idleMs: idle(20000), strayThreshold: 3, side: 'right', align: 'center' },
  // Step 3 — anchor at the result field's 제출 button. Right/start keeps
  // the tooltip beside the BlockField's submit bar without covering it.
  'stage4-result-submit': { idleMs: idle(25000), strayThreshold: 3, side: 'right', align: 'start' },
};

export interface GuidanceEntry {
  idleFired: boolean;
  strayCount: number;
  dismissedAt: number | null;
  tone: 'soft' | 'firm';
  firmFired: boolean;
}

export const initialGuidanceEntry: GuidanceEntry = {
  idleFired: false,
  strayCount: 0,
  dismissedAt: null,
  tone: 'soft',
  firmFired: false,
};

export type GuidanceState = Partial<Record<GuidancePhase, GuidanceEntry>>;

export function getGuidanceEntry(
  state: GuidanceState,
  phase: GuidancePhase,
): GuidanceEntry {
  return state[phase] ?? initialGuidanceEntry;
}

export interface ResolveContext {
  phase: MissionPhase;
  currentFieldId: NotionFieldId | null;
  sheetPhase: SheetPhase | null;
  panelOpen: boolean;
  hasChatbotAnswer: boolean;
  // problemAnalysis 3-step guidance inputs. Both are session-local.
  // `copyIssueOpen` — is the CopyIssueModal currently presented?
  // `problemAnalysisCopied` — has the "전체 복사" button fired at least
  //   once this session? Used to advance past step 1 after the modal closes.
  copyIssueOpen: boolean;
  problemAnalysisCopied: boolean;
  // Which Sheet tab is currently active. `null` while outside Stage 3
  // (resolveActiveGuidancePhase only reads this during `sheet-edit`).
  // Used to split the old `sheet-add-intent` guidance into two sub-phases:
  // on the default trigger-sentence tab we nudge toward a domain tab;
  // on any intent category tab we nudge the "+ 인텐트 행 추가" button.
  sheetActiveTabId: SheetId | null;
  // Which of the 3 editable columns on the newly-added intent row are
  // non-empty. Drives the Step 1-B tooltip sequence after "+ 인텐트
  // 행 추가" has been clicked (row exists). `null` for the whole object
  // means "no row added yet" (the resolver keeps showing the tab/row
  // button nudge); once a row exists, the resolver walks through
  // intent → leadSentence → prompt column guidance.
  sheetRowFilled: { intent: boolean; leadSentence: boolean; prompt: boolean } | null;
  // Session-local: has the learner clicked the Related Information
  // card's "복사" button at least once? Toggles the Prompt-column
  // guidance between `sheet-related-copy` (copy first) and
  // `sheet-field-prompt-paste` (paste into the cell).
  relatedInfoCopied: boolean;
  // Stage 4 result-field 3-step guidance inputs.
  // `workAutoFilled` — has the "작업 내용 불러오기" button been clicked
  //   (i.e. notion.workContent now holds the detailed HTML block)?
  // `captureVisible` — has the "테스트 결과 불러오기" button been clicked
  //   (i.e. the chatbot Q&A capture card is now rendered below 결과)?
  workAutoFilled: boolean;
  captureVisible: boolean;
}

// Maps the coarse MissionPhase + active field/sheet-step state onto a
// single GuidancePhase the tooltip system can drive. Returns null when
// no guidance is appropriate (celebrations, intros, completion).
export function resolveActiveGuidancePhase(
  ctx: ResolveContext,
): GuidancePhase | null {
  const {
    phase,
    currentFieldId,
    sheetPhase,
    panelOpen,
    hasChatbotAnswer,
    copyIssueOpen,
    problemAnalysisCopied,
    sheetActiveTabId,
    sheetRowFilled,
    relatedInfoCopied,
    workAutoFilled,
    captureVisible,
  } = ctx;

  switch (phase) {
    case 'dashboard':
      return 'dashboard';

    case 'notion': {
      if (!panelOpen) return 'notion-landing';
      switch (currentFieldId) {
        case 'agent':
          return 'notion-field-agent';
        case 'title':
          return 'notion-field-title';
        case 'assignee':
          return 'notion-field-assignee';
        case 'status':
          return 'notion-field-status';
        case 'season':
          return 'notion-field-season';
        case 'workType':
          return 'notion-field-workType';
        case 'problemAnalysis':
          // Precedence: modal-open > already-copied > initial. The modal
          // takes precedence even after a prior copy (re-opening still
          // re-anchors on "전체 복사"), because that's the only thing
          // the learner can meaningfully do while the modal is up.
          if (copyIssueOpen) return 'notion-field-problemAnalysis-copy-modal';
          if (problemAnalysisCopied) return 'notion-field-problemAnalysis-submit';
          return 'notion-field-problemAnalysis-copy';
        default:
          return null;
      }
    }

    case 'stage2-page':
      return 'stage2-solutionDirection';

    case 'sheet-edit':
      switch (sheetPhase) {
        case 'add-intent': {
          // Branch on the currently active sheet tab. Default tab
          // (intent_trigger_sentence) or any unknown/null value → nudge
          // toward the domain tabs; any of the 4 intent categories →
          // nudge the "+ 인텐트 행 추가" button, UNLESS a row already
          // exists (addedIntent → sheetRowFilled != null). Once the row
          // exists we walk the learner through intent → leadSentence →
          // (related-copy OR prompt-paste) tooltip sequence.
          if (!sheetActiveTabId || sheetActiveTabId === 'intent_trigger_sentence') {
            return 'sheet-add-intent-tab';
          }
          if (!sheetRowFilled) {
            return 'sheet-add-intent-row';
          }
          if (!sheetRowFilled.intent) return 'sheet-field-intent';
          if (!sheetRowFilled.leadSentence) return 'sheet-field-leadSentence';
          if (!sheetRowFilled.prompt) {
            // Must copy the reference first (we want the clipboard to
            // be seeded before they click into the Prompt cell). Once
            // copied, point at the Prompt cell for the paste step.
            return relatedInfoCopied
              ? 'sheet-field-prompt-paste'
              : 'sheet-related-copy';
          }
          // All 3 columns filled — the internal sheet phase should
          // transition to `run-intent-script` imminently; fall back to
          // the add-intent-row anchor until the parent's sheetPhase
          // catches up. (No dedicated "ready to commit" tooltip.)
          return 'sheet-add-intent-row';
        }
        case 'run-intent-script':
          return 'sheet-run-intent-script';
        case 'add-triggers':
          return 'sheet-add-triggers';
        case 'run-trigger-script':
          return 'sheet-run-trigger-script';
        default:
          return null;
      }

    case 'chatbot-test':
      return hasChatbotAnswer ? 'chatbot-after' : 'chatbot-before';

    case 'stage4-result-page':
      if (currentFieldId === 'status') return 'stage4-status';
      if (currentFieldId === 'result') {
        // 3-step sequence: load work → load capture → submit. Advance
        // strictly as the learner completes each action; fall back to
        // submit once both auto-fills have fired.
        if (!workAutoFilled) return 'stage4-result-load-work';
        if (!captureVisible) return 'stage4-result-load-capture';
        return 'stage4-result-submit';
      }
      return null;

    case 'intro':
    case 'quest-clear':
    case 'quest-clear-2':
    case 'quest-clear-3':
    case 'course-complete':
      return null;
  }
}
