'use client';

import { useRef, useState } from 'react';
import {
  Bold,
  ChevronDown,
  DollarSign,
  Italic,
  Loader2,
  Menu as MenuIcon,
  MoreHorizontal,
  Paintbrush,
  Percent,
  Play,
  Plus,
  Printer,
  Redo2,
  Search,
  Sparkles,
  Star,
  Strikethrough,
  Undo2,
} from 'lucide-react';
import {
  INTENT_SHEET_TABS,
  buildInitialGrids,
  type IntentSheetTabId,
} from '@/data/courses/fix-intent-5min/intent-catalog';

interface Props {
  disabled?: boolean;
  onComplete: (summary: string) => void;
}

// Tab ids + initial grids come from the shared intent catalog so this
// editable sheet stays in lockstep with Stage 1's read-only preview.
const TABS = INTENT_SHEET_TABS;
type TabId = IntentSheetTabId;

type Grid = string[][];

// Ghost rows/cols beyond the seeded data so the grid reads as a real sheet
// (not a compact table). They're inert — clicking selects, never edits.
const GHOST_ROWS = 18;
const GHOST_COLS = 7;

const INITIAL_GRIDS: Record<TabId, Grid> = buildInitialGrids();

export function SheetEditPage({ disabled, onComplete }: Props) {
  const [grids, setGrids] = useState<Record<TabId, Grid>>(INITIAL_GRIDS);
  const [activeTab, setActiveTab] = useState<TabId>('intent_trigger_sentence');
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [selected, setSelected] = useState<{ r: number; c: number }>({
    r: 0,
    c: 0,
  });
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const editsRef = useRef<
    { tab: TabId; cell: string; prev: string; next: string }[]
  >([]);

  const dataRowCount = grids[activeTab].length;
  const dataColCount = grids[activeTab][0]?.length ?? 0;
  const totalRows = dataRowCount + GHOST_ROWS;
  const totalCols = dataColCount + GHOST_COLS;
  const columnLetters = Array.from({ length: totalCols }, (_, i) =>
    String.fromCharCode(65 + i),
  );

  const selectCell = (r: number, c: number) => {
    setSelected({ r, c });
    if (running || disabled) return;
    if (r === 0) return; // header row — selectable, not editable
    if (r >= dataRowCount || c >= dataColCount) return; // ghost cell
    setEditing({ r, c });
    setDraft(grids[activeTab][r][c]);
  };

  const commitEdit = () => {
    if (!editing) return;
    const { r, c } = editing;
    const prev = grids[activeTab][r][c];
    if (draft !== prev) {
      const cellId = `${String.fromCharCode(65 + c)}${r + 1}`;
      editsRef.current.push({ tab: activeTab, cell: cellId, prev, next: draft });
      setGrids((g) => {
        const rows = g[activeTab].map((row) => [...row]);
        rows[r] = [...rows[r]];
        rows[r][c] = draft;
        return { ...g, [activeTab]: rows };
      });
    }
    setEditing(null);
    setDraft('');
  };

  const runUpdate = async () => {
    if (disabled || running) return;
    if (editsRef.current.length === 0) return;
    setMenuOpen(false);
    setRunning(true);
    // Simulate App Script latency so the UI beat has weight.
    await new Promise((resolve) => setTimeout(resolve, 900));
    const last = editsRef.current[editsRef.current.length - 1];
    const summary = `${last.tab} ${last.cell}: "${last.prev}" → "${last.next}" (총 ${editsRef.current.length}건 편집) · Update 스크립트 실행 완료`;
    setRunning(false);
    onComplete(summary);
  };

  const canRun = editsRef.current.length > 0 && !disabled && !running;

  const activeCellRef = `${String.fromCharCode(65 + selected.c)}${selected.r + 1}`;
  const activeCellValue = editing
    ? draft
    : (grids[activeTab][selected.r]?.[selected.c] ?? '');

  return (
    <div className="relative h-full w-full bg-white text-[#3c4043] flex flex-col">
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-[#e0e0e0] bg-white px-4 py-2">
        {/* Sheets logo */}
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
              className="rounded-full p-1 text-[#5f6368] hover:bg-[rgba(60,64,67,0.08)]"
              aria-label="Star"
              type="button"
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
            onClick={() => setMenuOpen((v) => !v)}
            disabled={disabled || running}
            className={`flex items-center gap-0.5 rounded px-2 py-0.5 hover:bg-[rgba(60,64,67,0.08)] disabled:opacity-40 ${
              menuOpen ? 'bg-[rgba(60,64,67,0.12)]' : ''
            }`}
          >
            Custom Scripts
            <ChevronDown size={14} className="text-[#5f6368]" />
          </button>
          {menuOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-md border border-[#e0e0e0] bg-white py-1 shadow-[0_2px_6px_2px_rgba(60,64,67,0.15)]">
              <button
                onClick={runUpdate}
                disabled={!canRun}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[rgba(60,64,67,0.08)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play size={14} className="text-[#0F9D58]" />
                Update 스크립트 실행
              </button>
              {!canRun && editsRef.current.length === 0 ? (
                <div className="px-3 pb-2 text-[11px] text-[#5f6368]">
                  셀을 먼저 편집한 뒤 실행할 수 있습니다.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
        <button
          type="button"
          className="flex h-7 items-center gap-1 rounded px-2 text-[12px] hover:bg-[rgba(60,64,67,0.08)]"
        >
          100%
          <ChevronDown size={12} className="text-[#5f6368]" />
        </button>
        <ToolbarDivider />
        <ToolbarBtn label="Currency">
          <DollarSign size={16} />
        </ToolbarBtn>
        <ToolbarBtn label="Percent">
          <Percent size={16} />
        </ToolbarBtn>
        <button
          type="button"
          className="flex h-7 items-center gap-1 rounded px-2 text-[12px] hover:bg-[rgba(60,64,67,0.08)]"
        >
          123
          <ChevronDown size={12} className="text-[#5f6368]" />
        </button>
        <ToolbarDivider />
        <button
          type="button"
          className="flex h-7 w-[110px] items-center justify-between rounded px-2 text-[13px] hover:bg-[rgba(60,64,67,0.08)]"
        >
          <span className="truncate">Roboto</span>
          <ChevronDown size={12} className="text-[#5f6368]" />
        </button>
        <ToolbarDivider />
        <button
          type="button"
          className="flex h-7 items-center gap-1 rounded px-2 text-[13px] hover:bg-[rgba(60,64,67,0.08)]"
        >
          10
          <ChevronDown size={12} className="text-[#5f6368]" />
        </button>
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
        <button
          type="button"
          className="ml-2 flex items-center gap-1.5 rounded-full border border-[#dadce0] bg-white px-3 py-1 text-[12px] text-[#3c4043] hover:bg-[rgba(60,64,67,0.04)]"
        >
          <Sparkles size={13} className="text-[#3c4043]" />
          Summarize this data
        </button>
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
              const row = grids[activeTab][r] ?? [];
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
                    const isEditing =
                      editing && editing.r === r && editing.c === c;
                    const isHeaderCell = r === 0 && c < dataColCount;
                    const isDataCell =
                      r < dataRowCount && c < dataColCount;
                    return (
                      <td
                        key={c}
                        onClick={() => selectCell(r, c)}
                        className={`relative h-[22px] min-w-[140px] border-b border-r border-[#e0e0e0] px-[5px] py-[2px] ${
                          isHeaderCell
                            ? 'bg-[#f8f9fa] font-medium text-[#202124]'
                            : 'bg-white'
                        } ${
                          isDataCell && r !== 0 ? 'cursor-text' : 'cursor-cell'
                        }`}
                        style={
                          isSelected
                            ? { boxShadow: 'inset 0 0 0 2px #1a73e8' }
                            : undefined
                        }
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit();
                              if (e.key === 'Escape') {
                                setEditing(null);
                                setDraft('');
                              }
                            }}
                            className="w-full bg-transparent text-[10pt] outline-none"
                          />
                        ) : (
                          <span className="block whitespace-nowrap">
                            {val}
                          </span>
                        )}
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-[rgba(60,64,67,0.08)]"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          aria-label="All sheets"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded hover:bg-[rgba(60,64,67,0.08)]"
        >
          <MenuIcon size={16} />
        </button>
        <div className="mx-1 h-5 w-px shrink-0 bg-[#e0e0e0]" />
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          {TABS.map((t) => {
            const active = activeTab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setEditing(null);
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

      {running ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
          <div className="flex items-center gap-2 rounded-md bg-white px-4 py-2 shadow">
            <Loader2 className="h-4 w-4 animate-spin text-[#0F9D58]" />
            <span className="text-sm">Update 스크립트 실행 중…</span>
          </div>
        </div>
      ) : null}
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
    <button
      type="button"
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded text-[#444746] hover:bg-[rgba(60,64,67,0.08)]"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-1 h-5 w-px bg-[#e0e0e0]" />;
}
