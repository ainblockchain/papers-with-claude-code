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
}

export async function validateNotionField(
  fieldId: NotionFieldId,
  value: string,
  context: ValidateContext,
): Promise<boolean> {
  switch (fieldId) {
    case 'agent':
      return value === agentAnswer;
    case 'assignee':
      // Assignee must match the logged-in user's GitHub ID — i.e. the user
      // assigned the Task to themselves. Falls back to false if unauth'd.
      return !!context.username && value === context.username;
    case 'season':
      return value === seasonAnswer;
    case 'status':
      return value === statusAnswer;
    case 'workType': {
      // Multi-select: comma-separated serialization (e.g. "update,add").
      // Pass if the user's selection includes the required answer.
      const selected = value.split(',').map((s) => s.trim());
      return selected.includes(workTypeAnswer);
    }
  }
  // Free-input fields → server endpoint (LLM-backed, currently hardcoded pass)
  try {
    const res = await fetch('/api/courses/fix-intent-5min/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldId, value, context }),
    });
    const data = await res.json();
    return !!data?.pass;
  } catch {
    return false;
  }
}
