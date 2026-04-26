'use client';

import { useMemo, useState } from 'react';
import {
  Bold,
  ChevronDown,
  DollarSign,
  Info,
  Italic,
  Menu as MenuIcon,
  MoreHorizontal,
  Paintbrush,
  Percent,
  Plus,
  Printer,
  Redo2,
  Search,
  Sparkles,
  Star,
  Strikethrough,
  Undo2,
  X,
} from 'lucide-react';
import {
  INTENT_SHEET_TABS,
  buildInitialGrids,
  type IntentSheetTabId,
} from '@/data/courses/fix-intent-5min/intent-catalog';
import {
  WORK_TYPES,
  type WorkTypeKey,
} from '@/data/courses/fix-intent-5min/work-types';
import { workTypeHints } from '@/data/courses/fix-intent-5min/notion-options';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TabId = IntentSheetTabId;

// Matches SheetEditPage.tsx so the two surfaces render identical ghost
// area + selection borders.
const GHOST_ROWS = 18;
const GHOST_COLS = 7;

const GRIDS = buildInitialGrids();

export function IntentCatalogModal({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('intent_trigger_sentence');
  const [selected, setSelected] = useState<{ r: number; c: number }>({
    r: 0,
    c: 0,
  });
  // Which WORK_TYPES badge is currently hovered/focused in the taxonomy
  // strip below the info banner. Null → placeholder caption prompting
  // the learner to hover a badge. Used to reveal each type's
  // description inline instead of rendering six tooltips stacked.
  const [hoveredWorkType, setHoveredWorkType] =
    useState<WorkTypeKey | null>(null);

  const dataRowCount = GRIDS[activeTab].length;
  const dataColCount = GRIDS[activeTab][0]?.length ?? 0;
  const totalRows = dataRowCount + GHOST_ROWS;
  const totalCols = dataColCount + GHOST_COLS;
  const columnLetters = useMemo(
    () =>
      Array.from({ length: totalCols }, (_, i) =>
        String.fromCharCode(65 + i),
      ),
    [totalCols],
  );

  if (!open) return null;

  const activeCellRef = `${String.fromCharCode(65 + selected.c)}${selected.r + 1}`;
  const activeCellValue = GRIDS[activeTab][selected.r]?.[selected.c] ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="인텐트 목록 확인"
      onClick={onClose}
    >
      <div
        className="flex h-[min(92vh,860px)] w-[min(96vw,1280px)] flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] text-[#3c4043]"
        onClick={(e) => e.stopPropagation()}
      >
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
              <span className="ml-1 inline-flex items-center gap-1 rounded-md bg-[#f1f3f4] px-1.5 py-0.5 text-[11px] text-[#5f6368]">
                View only
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex -space-x-1">
              <div
                className="h-7 w-7 rounded-full border-2 border-white"
                style={{ background: '#137333' }}
                title="Seongmin"
                aria-hidden="true"
              />
              <div
                className="h-7 w-7 rounded-full border-2 border-white"
                style={{ background: '#b80672' }}
                title="Laeyoung"
                aria-hidden="true"
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-[#FF9D00] px-3.5 py-1.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-[#E68E00]"
            >
              확인
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[rgba(55,53,47,0.55)] hover:bg-[rgba(55,53,47,0.06)] hover:text-[#37352f]"
            >
              <X size={18} />
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
            <span
              key={m}
              className="rounded px-2 py-0.5 text-[rgba(60,64,67,0.55)]"
            >
              {m}
            </span>
          ))}
          <span className="flex items-center gap-0.5 rounded px-2 py-0.5 text-[rgba(60,64,67,0.55)]">
            Custom Scripts
            <ChevronDown size={14} />
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 overflow-hidden border-b border-[#e0e0e0] bg-[#f9fbfd] px-3 py-1 text-[#444746]">
          <div className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[12px] text-[#5f6368] shadow-[inset_0_0_0_1px_#e0e0e0]">
            <Search size={14} />
            Menus
          </div>
          <ToolbarDivider />
          <ToolbarBtn label="Undo">
            <Undo2 size={16} />
          </ToolbarBtn>
          <ToolbarBtn label="Redo">
            <Redo2 size={16} />
          </ToolbarBtn>
          <ToolbarBtn label="Print">
            <Printer size={16} />
          </ToolbarBtn>
          <ToolbarBtn label="Paint format">
            <Paintbrush size={16} />
          </ToolbarBtn>
          <ToolbarDivider />
          <span className="flex h-7 items-center gap-1 rounded px-2 text-[12px] text-[rgba(60,64,67,0.55)]">
            100%
            <ChevronDown size={12} />
          </span>
          <ToolbarDivider />
          <ToolbarBtn label="Currency">
            <DollarSign size={16} />
          </ToolbarBtn>
          <ToolbarBtn label="Percent">
            <Percent size={16} />
          </ToolbarBtn>
          <span className="flex h-7 items-center gap-1 rounded px-2 text-[12px] text-[rgba(60,64,67,0.55)]">
            123
            <ChevronDown size={12} />
          </span>
          <ToolbarDivider />
          <span className="flex h-7 w-[110px] items-center justify-between rounded px-2 text-[13px] text-[rgba(60,64,67,0.55)]">
            <span className="truncate">Roboto</span>
            <ChevronDown size={12} />
          </span>
          <ToolbarDivider />
          <span className="flex h-7 items-center gap-1 rounded px-2 text-[13px] text-[rgba(60,64,67,0.55)]">
            10
            <ChevronDown size={12} />
          </span>
          <ToolbarDivider />
          <ToolbarBtn label="Bold">
            <Bold size={16} />
          </ToolbarBtn>
          <ToolbarBtn label="Italic">
            <Italic size={16} />
          </ToolbarBtn>
          <ToolbarBtn label="Strikethrough">
            <Strikethrough size={16} />
          </ToolbarBtn>
          <ToolbarBtn label="Text color">
            <span className="flex h-4 w-4 items-center justify-center text-[11px] font-semibold">
              A
            </span>
          </ToolbarBtn>
          <ToolbarDivider />
          <ToolbarBtn label="More">
            <MoreHorizontal size={16} />
          </ToolbarBtn>
        </div>

        {/* Formula bar */}
        <div className="flex items-center border-b border-[#e0e0e0] bg-white px-2 py-1 text-[13px]">
          <div className="flex h-7 w-[70px] items-center justify-between rounded border border-[#dadce0] bg-white px-2 text-[12px] text-[#3c4043]">
            <span className="truncate">{activeCellRef}</span>
            <ChevronDown size={12} className="text-[#5f6368]" />
          </div>
          <div className="mx-2 h-5 w-px bg-[#e0e0e0]" />
          <div className="flex h-7 w-7 items-center justify-center text-[#5f6368]">
            <span className="font-serif italic text-[13px]">fx</span>
          </div>
          <div className="mx-2 h-5 w-px bg-[#e0e0e0]" />
          <div className="flex-1 truncate text-[13px] text-[#3c4043]">
            {activeCellValue}
          </div>
          <span className="ml-2 flex items-center gap-1.5 rounded-full border border-[#dadce0] bg-white px-3 py-1 text-[12px] text-[rgba(60,64,67,0.55)]">
            <Sparkles size={13} />
            Summarize this data
          </span>
        </div>

        {/* Info banner — sits between the sheet chrome and the grid, same
            weight as Sheets' blue notice stripes. */}
        <div className="flex shrink-0 items-start gap-2 border-b border-[#FFE7A8] bg-[#FFF8E1] px-4 py-2 text-[13px] text-[#826200]">
          <Info size={14} className="mt-[2px] shrink-0" />
          <span>
            현재 등록된 인텐트를 확인해 봤을 때,{' '}
            <span className="font-semibold text-[#5B4500]">
              시험을 못 볼 경우와 관련한 인텐트는 존재하지 않아요.
            </span>{' '}
            아래 시트를 둘러본 뒤 오른쪽 위 "확인" 을 눌러 닫고, 어떤 Work
            Type 으로 처리할지 골라 보세요.
          </span>
        </div>

        {/* Work Type taxonomy strip — the 6 canonical WORK_TYPES shown with
            the same Notion-style colored labels WorkTypeField's popover
            uses (bg/text tokens live in work-types.ts; TagChip in
            WorkTypeField.tsx is the canonical renderer). Hover/focus
            highlights a pill with an orange accent ring AND swaps the
            caption line below for that type's description from
            `workTypeHints`. Lets the learner cross-reference the catalog
            rows and the available work-type labels in the same view. */}
        <div className="flex shrink-0 flex-col gap-1.5 border-b border-[#e0e0e0] bg-white px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5f6368]">
              Work Type
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {WORK_TYPES.map((wt) => {
                const isHovered = hoveredWorkType === wt.key;
                return (
                  <button
                    key={wt.key}
                    type="button"
                    onMouseEnter={() => setHoveredWorkType(wt.key)}
                    onMouseLeave={() =>
                      setHoveredWorkType((curr) =>
                        curr === wt.key ? null : curr,
                      )
                    }
                    onFocus={() => setHoveredWorkType(wt.key)}
                    onBlur={() =>
                      setHoveredWorkType((curr) =>
                        curr === wt.key ? null : curr,
                      )
                    }
                    aria-describedby={
                      isHovered ? 'catalog-worktype-desc' : undefined
                    }
                    className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-0.5 text-[12px] leading-[18px] transition-shadow focus:outline-none ${
                      isHovered
                        ? 'ring-2 ring-[#FF9D00]/50 ring-offset-1'
                        : ''
                    }`}
                    style={{ background: wt.bg, color: wt.text }}
                  >
                    {wt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p
            id="catalog-worktype-desc"
            role="tooltip"
            className="min-h-[18px] pl-[74px] text-[12px] leading-[18px] text-[#5f6368]"
          >
            {hoveredWorkType
              ? workTypeHints[hoveredWorkType]
              : '각 Work Type 에 마우스를 올리면 어떤 작업인지 설명을 볼 수 있어요.'}
          </p>
        </div>

        {/* Grid */}
        <div
          className="flex-1 overflow-auto bg-white"
          style={{ fontFamily: 'Roboto, Arial, sans-serif' }}
        >
          <table className="border-collapse text-[10pt] text-[#202124]">
            <thead>
              <tr>
                <th
                  className="sticky left-0 top-0 z-20 h-[24px] w-[46px] border-b border-r border-[#e0e0e0] bg-[#f8f9fa]"
                  aria-hidden="true"
                />
                {columnLetters.map((letter, c) => {
                  const highlighted = selected.c === c;
                  return (
                    <th
                      key={letter}
                      className={`sticky top-0 z-10 h-[24px] min-w-[140px] border-b border-r border-[#e0e0e0] text-[11px] font-normal ${
                        highlighted
                          ? 'bg-[#d2e3fc] text-[#1a73e8]'
                          : 'bg-[#f8f9fa] text-[#5f6368]'
                      }`}
                    >
                      {letter}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: totalRows }).map((_, r) => {
                const row = GRIDS[activeTab][r] ?? [];
                const rowHighlighted = selected.r === r;
                return (
                  <tr key={r}>
                    <th
                      className={`sticky left-0 z-10 h-[22px] w-[46px] border-b border-r border-[#e0e0e0] text-[11px] font-normal ${
                        rowHighlighted
                          ? 'bg-[#d2e3fc] text-[#1a73e8]'
                          : 'bg-[#f8f9fa] text-[#5f6368]'
                      }`}
                    >
                      {r + 1}
                    </th>
                    {columnLetters.map((_letter, c) => {
                      const val = row[c] ?? '';
                      const isSelected =
                        selected.r === r && selected.c === c;
                      const isHeaderCell = r === 0 && c < dataColCount;
                      return (
                        <td
                          key={c}
                          onClick={() => setSelected({ r, c })}
                          className={`relative h-[22px] min-w-[140px] cursor-cell border-b border-r border-[#e0e0e0] px-[5px] py-[2px] ${
                            isHeaderCell
                              ? 'bg-[#f8f9fa] font-medium text-[#202124]'
                              : 'bg-white'
                          }`}
                          style={
                            isSelected
                              ? { boxShadow: 'inset 0 0 0 2px #1a73e8' }
                              : undefined
                          }
                        >
                          <span className="block whitespace-nowrap">
                            {val}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom sheet tab bar */}
        <div className="flex shrink-0 items-center border-t border-[#e0e0e0] bg-white px-1 py-1 text-[#5f6368]">
          <button
            type="button"
            aria-label="Add sheet"
            disabled
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[rgba(95,99,104,0.5)]"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            aria-label="All sheets"
            disabled
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[rgba(95,99,104,0.5)]"
          >
            <MenuIcon size={16} />
          </button>
          <div className="mx-1 h-5 w-px shrink-0 bg-[#e0e0e0]" />
          <div className="flex min-w-0 flex-1 items-center overflow-hidden">
            {INTENT_SHEET_TABS.map((t) => {
              const active = activeTab === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setActiveTab(t);
                    setSelected({ r: 0, c: 0 });
                  }}
                  className={`relative flex shrink-0 items-center gap-1 whitespace-nowrap rounded-t-md px-2 py-1 text-[12px] ${
                    active
                      ? 'border-x border-t border-[#e0e0e0] bg-white font-medium text-[#3c4043]'
                      : 'text-[#5f6368] hover:bg-[rgba(60,64,67,0.06)]'
                  }`}
                  style={active ? { marginBottom: -1 } : undefined}
                >
                  {t}
                  {active ? (
                    <ChevronDown size={12} className="text-[#5f6368]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded text-[rgba(68,71,70,0.55)]"
    >
      {children}
    </span>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-[#e0e0e0]" />;
}
