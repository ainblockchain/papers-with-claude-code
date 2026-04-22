'use client';

import { useRef, useState } from 'react';
import { ChevronDown, Play, Loader2 } from 'lucide-react';

interface Props {
  disabled?: boolean;
  onComplete: (summary: string) => void;
}

const TABS = ['tab1', 'tab2', 'tab3', 'tab4', 'tab5'] as const;
type TabId = (typeof TABS)[number];

type Grid = string[][];

const INITIAL_GRIDS: Record<TabId, Grid> = {
  tab1: [
    ['Intent', 'Trigger', 'Prompt'],
    ['출결내규', '공결, 결석', '출결 내규에 따르면...'],
    ['학사일정', '시험 일정, 방학', '학사 일정은...'],
    ['수강신청', '정정 기간, 폐강', '수강신청 기간은...'],
  ],
  tab2: [
    ['Intent', 'Trigger', 'Prompt'],
    ['장학금', '신청, 기한', '장학금 신청 기한은...'],
    ['등록금', '납부, 연체', '등록금 납부는...'],
  ],
  tab3: [
    ['Intent', 'Trigger', 'Prompt'],
    ['교환학생', '지원, 해외', '교환학생 지원 절차...'],
  ],
  tab4: [
    ['Intent', 'Trigger', 'Prompt'],
    ['도서관', '좌석, 예약', '도서관 좌석 예약은...'],
  ],
  tab5: [
    ['Intent', 'Trigger', 'Prompt'],
    ['기숙사', '입사, 퇴사', '기숙사 입사 절차...'],
  ],
};

export function SheetEditPage({ disabled, onComplete }: Props) {
  const [grids, setGrids] = useState<Record<TabId, Grid>>(INITIAL_GRIDS);
  const [activeTab, setActiveTab] = useState<TabId>('tab1');
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const editsRef = useRef<
    { tab: TabId; cell: string; prev: string; next: string }[]
  >([]);

  const startEdit = (r: number, c: number) => {
    if (running || disabled) return;
    if (r === 0) return; // header row, read-only
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

  return (
    <div className="relative h-full w-full bg-white text-[#37352f] flex flex-col">
      {/* Sheet toolbar */}
      <div className="flex items-center justify-between border-b border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-[#0F9D58]">◆</span>
          <span>Dev Google Sheet — 인텐트 편집</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={disabled || running}
            className="flex items-center gap-1.5 rounded-md border border-[rgba(55,53,47,0.12)] bg-white px-3 py-1 text-xs font-medium hover:bg-[rgba(55,53,47,0.04)] disabled:opacity-40"
          >
            Custom Scripts
            <ChevronDown size={12} />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-10 mt-1 w-60 rounded-md border border-[rgba(55,53,47,0.12)] bg-white py-1 shadow-lg">
              <button
                onClick={runUpdate}
                disabled={!canRun}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[rgba(55,53,47,0.04)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play size={12} className="text-[#0F9D58]" />
                Update 스크립트 실행
              </button>
              {!canRun && editsRef.current.length === 0 ? (
                <div className="px-3 pb-2 text-[10px] text-gray-400">
                  셀을 먼저 편집한 뒤 실행할 수 있습니다.
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[rgba(55,53,47,0.09)] bg-white px-3 py-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setEditing(null);
              setActiveTab(t);
            }}
            className={`rounded-t px-3 py-1 text-xs ${
              activeTab === t
                ? 'border-x border-t border-[rgba(55,53,47,0.12)] bg-white text-[#37352f]'
                : 'text-gray-500 hover:bg-[rgba(55,53,47,0.04)]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <table className="border-collapse text-sm">
          <tbody>
            {grids[activeTab].map((row, r) => (
              <tr key={r}>
                <td className="w-8 border border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] text-center text-[10px] text-gray-400">
                  {r + 1}
                </td>
                {row.map((val, c) => {
                  const isEditing =
                    editing && editing.r === r && editing.c === c;
                  const header = r === 0;
                  return (
                    <td
                      key={c}
                      onClick={() => startEdit(r, c)}
                      className={`min-w-[160px] border border-[rgba(55,53,47,0.09)] px-2 py-1 ${
                        header
                          ? 'bg-[#f8f8f7] font-semibold text-[#37352f]'
                          : 'cursor-text bg-white hover:bg-[#fff8e1]'
                      }`}
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
                          className="w-full bg-transparent text-sm outline-none"
                        />
                      ) : (
                        <span>{val || <span className="text-gray-300">—</span>}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

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
