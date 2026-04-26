import type { NotionFieldId, SelectedIntent } from './course-state';
import {
  agentAnswer,
  seasonAnswer,
  statusAnswer,
  workTypeAnswer,
} from '@/data/courses/fix-intent-5min/notion-options';

export interface ValidateContext {
  representativeIntent: SelectedIntent | null;
  // Logged-in user's GitHub ID — used to validate the assignee field
  // (correct answer = "the user assigned the task to themselves").
  username?: string | null;
  // Per-field attempt count (1-based). Used server-side to escalate hint
  // specificity for free-input fields — e.g. solutionDirection starts
  // abstract and reveals more after repeated misses.
  attempt?: number;
  // Which flow is the learner in? Used to flip the status correct-answer
  // between 'In Progress' (Stage 1, work is starting) and 'Done' (Stage 4
  // result page, work is complete).
  phase?: string;
}

// Discriminated union so callers can tell a real validation failure
// (`fail`) apart from a transient server error (`server-error`). The
// latter is rendered as a soft "try again" modal that does NOT count
// against attempt counters, while `fail` keeps the existing red
// FeedbackModal + hint-escalation behaviour.
export type ValidateResult =
  | { kind: 'pass' }
  | { kind: 'fail'; hint?: string }
  | { kind: 'server-error' };

export async function validateNotionField(
  fieldId: NotionFieldId,
  value: string,
  context: ValidateContext,
): Promise<ValidateResult> {
  switch (fieldId) {
    case 'agent':
      return value === agentAnswer ? { kind: 'pass' } : { kind: 'fail' };
    case 'assignee':
      // Assignee must match the logged-in user's GitHub ID — i.e. the user
      // assigned the Task to themselves. Falls back to false if unauth'd.
      return !!context.username && value === context.username
        ? { kind: 'pass' }
        : { kind: 'fail' };
    case 'season':
      return value === seasonAnswer ? { kind: 'pass' } : { kind: 'fail' };
    case 'status': {
      // Stage 4 result page: the task is completed, so Done is the answer.
      const expected =
        context.phase === 'stage4-result-page' ? 'Done' : statusAnswer;
      return value === expected ? { kind: 'pass' } : { kind: 'fail' };
    }
    case 'workType': {
      // Multi-select: comma-separated serialization (e.g. "newIntent,add").
      // Require an EXACT set match — every required key present AND no
      // extras. Previously we only checked containment, which let
      // [newIntent, add, <anythingElse>] pass since the required pair was
      // still in there. The per-wrong-key hint (computeWorkTypeHint) only
      // fires on validate-fail, so permissive containment also meant
      // wrong extras never got explained.
      const selected = new Set(
        value.split(',').map((s) => s.trim()).filter(Boolean),
      );
      const ok =
        selected.size === workTypeAnswer.length &&
        workTypeAnswer.every((k) => selected.has(k));
      return ok ? { kind: 'pass' } : { kind: 'fail' };
    }
  }
  // Free-input fields → server endpoint (LLM-backed for title/problemAnalysis,
  // stub-pass for the rest).
  try {
    const res = await fetch('/api/courses/fix-intent-5min/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldId, value, context }),
    });
    const data = await res.json();
    // Server-side transient error (Azure 5xx after retries / JSON parse
    // failure / network blip). Surface as `server-error` so the client
    // can show a "try again" modal instead of a red wrong-answer modal.
    if (data?.kind === 'server-error') {
      return { kind: 'server-error' };
    }
    if (data?.pass === true) {
      return { kind: 'pass' };
    }
    return {
      kind: 'fail',
      hint: typeof data?.hint === 'string' && data.hint ? data.hint : undefined,
    };
  } catch {
    // Network catch (fetch threw) — also a server-error from the
    // learner's perspective: their input may be perfectly correct.
    return { kind: 'server-error' };
  }
}
