'use client';

import {
  ChevronDown,
  Clock,
  Link2,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Star,
  Tag,
  Target,
  UserCircle,
  Users,
} from 'lucide-react';
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
import { WORK_TYPES } from '@/data/courses/fix-intent-5min/work-types';
import { useAuthStore } from '@/stores/useAuthStore';
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

// Notion status dot colors — matches Notion's muted palette.
const STATUS_DOT: Record<string, string> = {
  'Not Started': '#9B9A97',
  'In Progress': '#529CCA',
  'Revisions Requested': '#D44C7F',
  Done: '#4DAB9A',
  'Prod Launch': '#9D68D3',
  Close: '#787774',
};

function StatusChip({ value }: { value: string | null }) {
  if (!value) return null;
  const dot = STATUS_DOT[value] ?? '#9B9A97';
  return (
    <span
      className="inline-flex items-center rounded-[10px] bg-[rgba(55,53,47,0.08)] px-2 py-0.5 text-[12px] text-[#37352f]"
      style={{ lineHeight: '20px' }}
    >
      <span
        className="mr-1.5 inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: dot }}
      />
      {value}
    </span>
  );
}

function WorkTypeFilledChips({ value }: { value: string | null }) {
  if (!value) return null;
  const keys = value.split(',').map((s) => s.trim());
  return (
    <div className="flex flex-wrap items-center gap-1">
      {keys.map((k) => {
        const wt = WORK_TYPES.find((w) => w.key === k);
        if (!wt) return null;
        return (
          <span
            key={k}
            className="inline-flex items-center rounded px-1.5 py-0.5 text-[12px]"
            style={{ background: wt.bg, color: wt.text }}
          >
            {wt.label}
          </span>
        );
      })}
    </div>
  );
}

function AgentChip({ value }: { value: string | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] text-[#37352f]">
      <span className="truncate">{value}</span>
    </span>
  );
}

function AssigneeChip({ value }: { value: string | null }) {
  if (!value) return null;
  // Simple initial-in-circle avatar to echo Notion's look without remote URLs.
  const initial = value.trim().charAt(0) || '?';
  return (
    <span className="inline-flex items-center gap-1.5 text-[14px] text-[#37352f]">
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F1F1EF] text-[11px] font-semibold text-[rgba(55,53,47,0.65)]"
      >
        {initial}
      </span>
      <span className="truncate">{value}</span>
    </span>
  );
}

// Compact property chip used in the top-row grid. Header (icon + label, 13px
// gray) sits above the value row. When the field is active, renders the inner
// editor (passed as `editor`); otherwise renders the Notion-style chip
// (`displayFilled`) or an "empty" italic placeholder.
function PropertyChip({
  icon,
  label,
  active,
  filled,
  displayFilled,
  editor,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  filled: boolean;
  displayFilled: React.ReactNode;
  editor: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex items-center gap-1.5 px-1 text-[13px] font-medium text-[rgba(55,53,47,0.5)]">
        <span className="flex h-3.5 w-3.5 items-center justify-center text-[rgba(55,53,47,0.5)]">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="min-h-[30px] min-w-0 rounded px-1 py-1">
        {active ? (
          editor
        ) : filled ? (
          displayFilled
        ) : (
          <span className="text-[14px] italic text-[rgba(55,53,47,0.35)]">
            비어 있음
          </span>
        )}
      </div>
    </div>
  );
}

// Row-layout property used in the "속성" section (160px label + value).
function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 py-1 hover:bg-[rgba(55,53,47,0.03)] rounded">
      <div className="flex w-[160px] shrink-0 items-center gap-2 px-1.5 text-[14px] text-[rgba(55,53,47,0.5)]">
        <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 flex-1 px-1.5 text-[14px]">{children}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 px-1 py-2 text-[13px] font-medium text-[rgba(55,53,47,0.5)]">
      {children}
    </div>
  );
}

function Breadcrumb({ title }: { title: string | null }) {
  return (
    <div className="flex h-11 items-center gap-1 border-b border-[rgba(55,53,47,0.08)] bg-white px-3 text-[13px] text-[rgba(55,53,47,0.65)]">
      <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-[rgba(55,53,47,0.06)]">
        <span
          aria-hidden="true"
          className="inline-flex h-4 w-4 items-center justify-center rounded bg-[rgba(224,101,1,0.13)] text-[11px]"
        >
          🏠
        </span>
        <span>General</span>
      </span>
      <span className="text-[rgba(55,53,47,0.3)]">/</span>
      <span className="rounded px-1.5 py-0.5 text-[rgba(55,53,47,0.5)] hover:bg-[rgba(55,53,47,0.06)]">
        ...
      </span>
      <span className="text-[rgba(55,53,47,0.3)]">/</span>
      <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-[rgba(55,53,47,0.06)]">
        <MessageSquare size={14} className="text-[rgba(55,53,47,0.45)]" />
        <span>Tasks</span>
      </span>
      <span className="text-[rgba(55,53,47,0.3)]">/</span>
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-[rgba(55,53,47,0.06)]">
        <span aria-hidden="true" className="inline-flex h-4 w-4 items-center justify-center text-[rgba(55,53,47,0.45)]">
          💬
        </span>
        <span className="truncate">{title?.trim() || '새 작업'}</span>
      </span>
      <div className="ml-auto flex items-center gap-1 text-[rgba(55,53,47,0.5)]">
        <span className="rounded-full bg-[#c2e7ff] px-3 py-1 text-[12px] font-medium text-[#001d35]">
          공유
        </span>
        <button
          type="button"
          aria-label="링크 복사"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-[rgba(55,53,47,0.06)]"
        >
          <Link2 size={16} />
        </button>
        <button
          type="button"
          aria-label="즐겨찾기"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-[rgba(55,53,47,0.06)]"
        >
          <Star size={16} />
        </button>
        <button
          type="button"
          aria-label="더보기"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-[rgba(55,53,47,0.06)]"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

export function NotionTaskPage({
  notion,
  currentFieldId,
  disabled,
  onSubmit,
}: Props) {
  // Assignee dropdown prepends the logged-in user's GitHub ID, so the
  // correct answer — "assign to yourself" — is a real selectable option
  // and gets persisted to the blockchain as that concrete ID.
  const githubUsername = useAuthStore((s) => s.user?.username ?? null);
  const assigneeChoices = githubUsername
    ? [githubUsername, ...assigneeOptions]
    : assigneeOptions;

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
  const workContentS = computeState(
    'workContent',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.workContent,
  );
  const resultS = computeState(
    'result',
    currentFieldId,
    ALL_FIELD_ORDER,
    notion.result,
  );

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-white text-[#37352f] font-[family:ui-sans-serif,-apple-system,BlinkMacSystemFont,'Segoe_UI','Noto_Sans_KR',Arial,sans-serif]">
      <Breadcrumb title={notion.title} />

      {/* Page content */}
      <div className="mx-auto w-full max-w-[960px] px-6 pb-24">
        {/* Icon — reserves space as if a cover were above it */}
        <div className="mt-16 mb-2 flex h-[78px] w-[78px] items-center justify-center text-[64px] leading-none">
          💬
        </div>

        {/* Layout hint row (Notion shows these on hover) */}
        <div className="mb-2 flex gap-2 text-[13px] text-[rgba(55,53,47,0.45)]">
          <span className="rounded px-1.5 py-1 hover:bg-[rgba(55,53,47,0.06)]">
            커버 추가
          </span>
          <span className="rounded px-1.5 py-1 hover:bg-[rgba(55,53,47,0.06)]">
            레이아웃 사용자 지정
          </span>
        </div>

        {/* Title — TitleField renders its own h1 styling; we own padding. */}
        <div className="mb-4">
          <TitleField
            active={titleS.active}
            filled={titleS.filled}
            disabled={disabled}
            value={notion.title}
            placeholder="새 작업"
            onSubmit={(v) => onSubmit('title', v)}
          />
        </div>

        {/* Top property row — Agent / Work Type / Assignee / Status.
            Notion renders this as an auto-fit wrap grid above the "속성"
            section; at panel width it collapses to as many columns as fit. */}
        <div className="grid gap-y-3 gap-x-4 pb-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          <PropertyChip
            icon={<Target size={14} />}
            label="Agent"
            active={agentS.active}
            filled={agentS.filled}
            displayFilled={<AgentChip value={notion.agent} />}
            editor={
              <DropdownField
                label=""
                options={agentOptions}
                active={agentS.active}
                filled={agentS.filled}
                disabled={disabled}
                value={notion.agent}
                onSubmit={(v) => onSubmit('agent', v)}
              />
            }
          />
          {/* Work Type's editor fans out 6 tags + enter button, which is
              too wide for a single minmax(160px) grid cell. When it's the
              active field, stretch the chip across the whole row so the
              tags stay on one line and don't line-wrap per label. */}
          <div style={workTypeS.active ? { gridColumn: '1 / -1' } : undefined}>
            <PropertyChip
              icon={<Tag size={14} />}
              label="Work Type"
              active={workTypeS.active}
              filled={workTypeS.filled}
              displayFilled={<WorkTypeFilledChips value={notion.workType} />}
              editor={
                <WorkTypeField
                  label=""
                  active={workTypeS.active}
                  filled={workTypeS.filled}
                  disabled={disabled}
                  value={notion.workType}
                  onSubmit={(v) => onSubmit('workType', v)}
                />
              }
            />
          </div>
          <PropertyChip
            icon={<Users size={14} />}
            label="Assignee"
            active={assigneeS.active}
            filled={assigneeS.filled}
            displayFilled={<AssigneeChip value={notion.assignee} />}
            editor={
              <DropdownField
                label=""
                options={assigneeChoices}
                active={assigneeS.active}
                filled={assigneeS.filled}
                disabled={disabled}
                value={notion.assignee}
                onSubmit={(v) => onSubmit('assignee', v)}
              />
            }
          />
          <PropertyChip
            icon={
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-[rgba(55,53,47,0.35)]" />
            }
            label="Status"
            active={statusS.active}
            filled={statusS.filled}
            displayFilled={<StatusChip value={notion.status} />}
            editor={
              <DropdownField
                label=""
                options={statusOptions}
                active={statusS.active}
                filled={statusS.filled}
                disabled={disabled}
                value={notion.status}
                onSubmit={(v) => onSubmit('status', v)}
              />
            }
          />
        </div>

        {/* 속성 section */}
        <SectionLabel>속성</SectionLabel>
        <div className="flex flex-col gap-0.5 border-t border-[rgba(55,53,47,0.08)] pt-1">
          <PropertyRow
            icon={<MessageSquare size={14} className="text-[rgba(55,53,47,0.45)]" />}
            label="Season"
          >
            {seasonS.filled ? (
              <span className="rounded bg-[rgba(55,53,47,0.08)] px-2 py-0.5 text-[13px]">
                {notion.season}
              </span>
            ) : seasonS.active ? (
              <DropdownField
                label=""
                options={seasonOptions}
                active
                filled={false}
                disabled={disabled}
                value={notion.season}
                onSubmit={(v) => onSubmit('season', v)}
              />
            ) : (
              <span className="italic text-[rgba(55,53,47,0.35)]">비어 있음</span>
            )}
          </PropertyRow>
          <PropertyRow
            icon={<UserCircle size={14} className="text-[rgba(55,53,47,0.45)]" />}
            label="Reported by"
          >
            {githubUsername ? (
              <span className="inline-flex items-center gap-1.5 text-[14px]">
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F1F1EF] text-[11px] font-semibold text-[rgba(55,53,47,0.65)]"
                >
                  {githubUsername.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <span>{githubUsername}</span>
              </span>
            ) : (
              <span className="italic text-[rgba(55,53,47,0.35)]">비어 있음</span>
            )}
          </PropertyRow>
          <PropertyRow
            icon={<Clock size={14} className="text-[rgba(55,53,47,0.45)]" />}
            label="Created time"
          >
            <span className="text-[14px] text-[rgba(55,53,47,0.85)]">
              {new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </PropertyRow>
          <button
            type="button"
            className="mt-1 flex w-fit items-center gap-1 rounded px-1.5 py-1 text-[14px] text-[rgba(55,53,47,0.45)] hover:bg-[rgba(55,53,47,0.04)]"
          >
            <ChevronDown size={12} />
            속성 5개 더 보기
          </button>
        </div>

        {/* 관계형 section */}
        <SectionLabel>관계형</SectionLabel>
        <button
          type="button"
          className="flex w-fit items-center gap-1.5 rounded px-1.5 py-1 text-[14px] text-[rgba(55,53,47,0.45)] hover:bg-[rgba(55,53,47,0.04)]"
        >
          <Plus size={14} />
          Sub-tasks 추가
        </button>

        {/* 댓글 section */}
        <SectionLabel>댓글</SectionLabel>
        <div className="flex items-center gap-2 border-b border-[rgba(55,53,47,0.08)] pb-4">
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F1F1EF] text-[11px] font-semibold text-[rgba(55,53,47,0.65)]"
          >
            본
          </span>
          <span className="text-[14px] text-[rgba(55,53,47,0.35)]">
            댓글 추가
          </span>
        </div>

        {/* Content sections */}
        <BlockField
          heading="문제 상황 분석"
          active={problemS.active}
          filled={problemS.filled}
          disabled={disabled}
          value={notion.problemAnalysis}
          placeholder="발견한 문제에 대해 자신의 생각과 상황을 정리. 첨부할 이미지가 있다면 추가"
          onSubmit={(v) => onSubmit('problemAnalysis', v)}
        />

        {/* Image placeholder — purely visual, not an editable field */}
        <div className="my-2 flex h-[96px] w-full items-center justify-center rounded-[4px] border border-dashed border-[rgba(55,53,47,0.16)] bg-[rgba(55,53,47,0.02)] text-[13px] text-[rgba(55,53,47,0.35)]">
          이미지를 드래그하거나 클릭해서 추가
        </div>

        <BlockField
          heading="해결방향 정리"
          active={solutionS.active}
          filled={solutionS.filled}
          disabled={disabled}
          value={notion.solutionDirection}
          placeholder="어떤 방향으로 해결하고자 하는지 생각 정리"
          onSubmit={(v) => onSubmit('solutionDirection', v)}
        />

        <BlockField
          heading="작업내용"
          active={workContentS.active}
          filled={workContentS.filled}
          disabled={disabled}
          value={notion.workContent}
          placeholder="에이전트 오너가 수정된 내용을 빠르게 파악할 수 있도록 정리합니다."
          onSubmit={(v) => onSubmit('workContent', v)}
        />

        {/* Static bulleted list + nested 2-col table (visual, non-editable) */}
        <ul className="mt-1 space-y-1 pl-5 text-[14px] text-[rgba(55,53,47,0.85)] list-disc marker:text-[rgba(55,53,47,0.5)]">
          <li>
            트리거링 문장 추가
            <div className="mt-2 mb-3 overflow-hidden rounded border border-[rgba(55,53,47,0.16)]">
              <table className="w-full text-[13px]">
                <thead className="bg-[rgba(55,53,47,0.04)]">
                  <tr>
                    <th className="border-r border-[rgba(55,53,47,0.09)] px-3 py-1.5 text-left font-medium">
                      인텐트
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium">
                      트리거링 문장
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[rgba(55,53,47,0.09)]">
                    <td className="border-r border-[rgba(55,53,47,0.09)] px-3 py-1.5">
                      &nbsp;
                    </td>
                    <td className="px-3 py-1.5">&nbsp;</td>
                  </tr>
                  <tr className="border-t border-[rgba(55,53,47,0.09)]">
                    <td className="border-r border-[rgba(55,53,47,0.09)] px-3 py-1.5">
                      &nbsp;
                    </td>
                    <td className="px-3 py-1.5">&nbsp;</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </li>
          <li>인텐트 업데이트</li>
          <li>새로운 인텐트 추가</li>
        </ul>

        <BlockField
          heading="결과"
          active={resultS.active}
          filled={resultS.filled}
          disabled={disabled}
          value={notion.result}
          placeholder="위 내용을 업데이트한 후 개선된 응답 결과를 캡처해서 첨부합니다."
          onSubmit={(v) => onSubmit('result', v)}
        />
      </div>
    </div>
  );
}
