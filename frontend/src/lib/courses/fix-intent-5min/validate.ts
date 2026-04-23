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

export interface ValidateResult {
  pass: boolean;
  // LLM-authored hint for free-input fields; ignored for deterministic fields.
  hint?: string;
}

export async function validateNotionField(
  fieldId: NotionFieldId,
  value: string,
  context: ValidateContext,
): Promise<ValidateResult> {
  switch (fieldId) {
    case 'agent':
      return { pass: value === agentAnswer };
    case 'assignee':
      // Assignee must match the logged-in user's GitHub ID — i.e. the user
      // assigned the Task to themselves. Falls back to false if unauth'd.
      return { pass: !!context.username && value === context.username };
    case 'season':
      return { pass: value === seasonAnswer };
    case 'status': {
      // Stage 4 result page: the task is completed, so Done is the answer.
      const expected =
        context.phase === 'stage4-result-page' ? 'Done' : statusAnswer;
      return { pass: value === expected };
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
      return {
        pass:
          selected.size === workTypeAnswer.length &&
          workTypeAnswer.every((k) => selected.has(k)),
      };
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
    return {
      pass: !!data?.pass,
      hint: typeof data?.hint === 'string' && data.hint ? data.hint : undefined,
    };
  } catch {
    return { pass: false };
  }
}
