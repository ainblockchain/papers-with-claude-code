import type { NotionFieldId, SelectedIntent } from './course-state';
import {
  agentAnswer,
  assigneeAnswer,
  seasonAnswer,
  statusAnswer,
} from '@/data/courses/fix-intent-5min/notion-options';

export interface ValidateContext {
  representativeIntent: SelectedIntent | null;
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
      return value === assigneeAnswer;
    case 'season':
      return value === seasonAnswer;
    case 'status':
      return value === statusAnswer;
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
