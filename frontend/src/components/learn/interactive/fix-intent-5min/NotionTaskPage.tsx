'use client';

import type {
  NotionFieldId,
  NotionState,
} from '@/lib/courses/fix-intent-5min/course-state';
import {
  agentOptions,
  assigneeOptions,
  seasonOptions,
  statusOptions,
} from '@/data/courses/fix-intent-5min/notion-options';
import { TitleField } from './fields/TitleField';
import { DropdownField } from './fields/DropdownField';
import { BlockField } from './fields/BlockField';
import { WorkTypeField } from './fields/WorkTypeField';

export const STAGE1_FIELD_ORDER: NotionFieldId[] = [
  'agent',
  'title',
  'assignee',
  'status',
  'season',
  'workType',
  'problemAnalysis',
];

export const STAGE2_FIELD_ORDER: NotionFieldId[] = ['solutionDirection'];

export const STAGE3_FIELD_ORDER: NotionFieldId[] = ['workContent'];

export const STAGE4_FIELD_ORDER: NotionFieldId[] = ['result'];

// Unified order across stages — used for filled-state tracking so fields
// completed in an earlier stage still render as filled when viewing a later
// stage's page. The `currentFieldId` prop is what drives the "active" field.
const ALL_FIELD_ORDER: NotionFieldId[] = [
  ...STAGE1_FIELD_ORDER,
  ...STAGE2_FIELD_ORDER,
  ...STAGE3_FIELD_ORDER,
  ...STAGE4_FIELD_ORDER,
];

interface Props {
  notion: NotionState;
  currentFieldId: NotionFieldId | null;
  disabled?: boolean;
  onSubmit: (fieldId: NotionFieldId, value: string) => void;
}

function computeState(
  id: NotionFieldId,
  current: NotionFieldId | null,
  order: NotionFieldId[],
  value: string | null,
) {
  if (current === null) {
    return { active: false, filled: value != null };
  }
  const idx = order.indexOf(id);
  const currentIdx = order.indexOf(current);
  if (!order.includes(id)) {
    return { active: false, filled: value != null };
  }
  return {
    active: idx === currentIdx,
    filled: idx < currentIdx,
  };
}

export function NotionTaskPage({
  notion,
  currentFieldId,
  disabled,
  onSubmit,
}: Props) {
  // Keep the current field visibly active even while validating so the user's
  // typed draft doesn't disappear; submission is gated by `disabled` prop.
  const titleS = computeState('title', currentFieldId, ALL_FIELD_ORDER, notion.title);
  const agentS = computeState('agent', currentFieldId, ALL_FIELD_ORDER, notion.agent);
  const assigneeS = computeState(
    'assignee',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.assignee,
  );
  const statusS = computeState(
    'status',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.status,
  );
  const seasonS = computeState(
    'season',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.season,
  );
  const workTypeS = computeState(
    'workType',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.workType,
  );
  const problemS = computeState(
    'problemAnalysis',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.problemAnalysis,
  );
  const solutionS = computeState(
    'solutionDirection',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.solutionDirection,
  );

  return (
    <div className="flex flex-col h-full w-full bg-white text-[#37352f] overflow-auto">
      <div className="max-w-3xl w-full mx-auto">
        <TitleField
          active={titleS.active}
          filled={titleS.filled}
          disabled={disabled}
          value={notion.title}
          placeholder="제목 없음"
          onSubmit={(v) => onSubmit('title', v)}
        />
        <div className="px-12 py-4 border-y border-gray-100 bg-gray-50/60">
          <DropdownField
            label="Agent"
            options={agentOptions}
            active={agentS.active}
            filled={agentS.filled}
            disabled={disabled}
            value={notion.agent}
            onSubmit={(v) => onSubmit('agent', v)}
          />
          <DropdownField
            label="Assignee"
            options={assigneeOptions}
            active={assigneeS.active}
            filled={assigneeS.filled}
            disabled={disabled}
            value={notion.assignee}
            onSubmit={(v) => onSubmit('assignee', v)}
          />
          <DropdownField
            label="Status"
            options={statusOptions}
            active={statusS.active}
            filled={statusS.filled}
            disabled={disabled}
            value={notion.status}
            onSubmit={(v) => onSubmit('status', v)}
          />
          <DropdownField
            label="Season"
            options={seasonOptions}
            active={seasonS.active}
            filled={seasonS.filled}
            disabled={disabled}
            value={notion.season}
            onSubmit={(v) => onSubmit('season', v)}
          />
          <WorkTypeField
            label="Work Type"
            active={workTypeS.active}
            filled={workTypeS.filled}
            disabled={disabled}
            value={notion.workType}
            onSubmit={(v) => onSubmit('workType', v)}
          />
        </div>
        <BlockField
          heading="문제 상황 분석"
          active={problemS.active}
          filled={problemS.filled}
          disabled={disabled}
          value={notion.problemAnalysis}
          placeholder="대시보드에서 확인한 문제 상황을 구체적으로 설명하세요."
          onSubmit={(v) => onSubmit('problemAnalysis', v)}
        />
        <BlockField
          heading="해결 방향"
          active={solutionS.active}
          filled={solutionS.filled}
          disabled={disabled}
          value={notion.solutionDirection}
          placeholder="어떤 방향으로 수정할지 자연어로 설명하세요. (트리거 문장 수정 / 프롬프트 수정 / 신규 인텐트 등록 중 하나 이상)"
          onSubmit={(v) => onSubmit('solutionDirection', v)}
        />
      </div>
    </div>
  );
}
