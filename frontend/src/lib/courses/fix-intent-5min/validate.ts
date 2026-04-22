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
    case 'status':
      return { pass: value === statusAnswer };
    case 'workType': {
      // Multi-select: comma-separated serialization (e.g. "newIntent,add").
      // Pass only if every required key is present in the selection.
      const selected = new Set(
        value.split(',').map((s) => s.trim()).filter(Boolean),
      );
      return { pass: workTypeAnswer.every((k) => selected.has(k)) };
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
