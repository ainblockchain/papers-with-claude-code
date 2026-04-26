'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  BarChart3,
  BarChartHorizontal,
  ChevronDown,
  Info,
  LayoutGrid,
  Link2,
  List,
  Maximize2,
  MessageSquare,
  PieChart,
  Plus,
  SlidersHorizontal,
  Star,
  Table2,
  User,
} from 'lucide-react';
import {
  WORK_TYPES,
  getWorkType,
  type WorkTypeKey,
} from '@/data/courses/fix-intent-5min/work-types';

interface Props {
  onCreate: () => void;
  onStray?: (event: React.MouseEvent) => void;
  // Parent reports the "새로 만들기" button element back up so the
  // GuidanceTooltip can anchor its nudge at the real call-to-action.
  onPrimaryActionRef?: (el: HTMLButtonElement | null) => void;
  // Parent receives the full list of "새로 만들기" button elements on
  // mount / unmount so it can pick the best tooltip anchor (e.g.
  // topmost-then-leftmost) and compute a sensible side/align.
  onCreateButtonsRef?: (els: HTMLButtonElement[]) => void;
  // When true (default), each of the 5 "새로 만들기" buttons pulses with
  // a subtle orange ring so the learner sees every valid target on the
  // Stage 1 Notion landing. Parent can set false to disable.
  highlightCreateButtons?: boolean;
}

// Shared pulse class applied to every "새로 만들기" button on the Stage 1
// landing. The keyframes are injected once via a scoped <style> tag below.
const CREATE_PULSE_CLASS = 'cc-new-task-pulse';

const TASKS: {
  title: string;
  agent: string;
  status: string;
  workType: WorkTypeKey;
  season: string;
  created: string;
}[] = [
  {
    title: '[출결내규] 공결 세부 절차 미안내',
    agent: '궁금하냥',
    status: 'Done',
    workType: 'update',
    season: '2026 S1',
    created: '2026. 4. 14.',
  },
  {
    title: '[학사일정] 중간고사 일정 누락',
    agent: '궁금하냥',
    status: 'In progress',
    workType: 'add',
    season: '2026 S1',
    created: '2026. 4. 18.',
  },
  {
    title: '[수강신청] 정정 기간 답변 부정확',
    agent: '궁금하냥',
    status: 'Done',
    workType: 'update',
    season: '2026 S1',
    created: '2026. 4. 9.',
  },
  {
    title: '[장학금] 신청 기한 혼동 응답',
    agent: '알려주냥',
    status: 'Not started',
    workType: 'newIntent',
    season: '2026 S1',
    created: '2026. 4. 20.',
  },
  {
    title: '[성적정정] 이의신청 폼 오류',
    agent: '알려주냥',
    status: 'In progress',
    workType: 'bug',
    season: '2026 S1',
    created: '2026. 4. 21.',
  },
  {
    title: '[도서관] 좌석 예약 쿼리 연동',
    agent: '도와주냥',
    status: 'Not started',
    workType: 'sql',
    season: '2026 S1',
    created: '2026. 4. 22.',
  },
  {
    title: '[AI 상담] 신규 인텐트 + 백엔드 연동',
    agent: '궁금하냥',
    status: 'Not started',
    workType: 'newIntentDev',
    season: '2026 S1',
    created: '2026. 4. 22.',
  },
];

const AGENTS = [
  { name: '궁금하냥', role: '학사 일반 문의', status: 'Active', issues: 12 },
  { name: '알려주냥', role: '장학/등록금', status: 'Active', issues: 7 },
  { name: '도와주냥', role: '학생 지원', status: 'Beta', issues: 3 },
];

function StatusChip({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Done: 'bg-[#DBEDDB] text-[#448361]',
    'In progress': 'bg-[#D3E5EF] text-[#337EA9]',
    'Not started': 'bg-[#E3E2E0] text-[rgba(55,53,47,0.65)]',
    Active: 'bg-[#DBEDDB] text-[#448361]',
    Beta: 'bg-[#FDECC8] text-[#997C1E]',
  };
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[12px] ${
        styles[status] ?? 'bg-[#E3E2E0] text-[rgba(55,53,47,0.65)]'
      }`}
    >
      {status}
    </span>
  );
}

function Tag({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'blue' | 'purple' | 'orange' }) {
  const map: Record<string, string> = {
    gray: 'bg-[#E3E2E0] text-[rgba(55,53,47,0.75)]',
    blue: 'bg-[#D3E5EF] text-[#337EA9]',
    purple: 'bg-[#E8DEEE] text-[#6940A5]',
    orange: 'bg-[#FADEC9] text-[#C4704F]',
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[12px] ${map[tone]}`}>
      {children}
    </span>
  );
}

function WorkTypeTag({ workType }: { workType: WorkTypeKey }) {
  const wt = getWorkType(workType);
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[12px]"
      style={{ background: wt.bg, color: wt.text }}
    >
      {wt.label}
    </span>
  );
}

function NotionPillButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-8 max-w-[220px] items-center gap-1.5 rounded-[20px] bg-[rgba(55,53,47,0.08)] px-[10px] py-[6px] text-[14px] font-medium leading-[1.2] text-[#37352f] hover:bg-[rgba(55,53,47,0.12)]"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">{icon}</span>
      <span className="truncate">{label}</span>
      <ChevronDown size={14} className="shrink-0 opacity-60" />
    </button>
  );
}

function NotionIconButton({
  icon,
  ariaLabel,
}: {
  icon: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-[rgba(55,53,47,0.6)] hover:bg-[rgba(55,53,47,0.06)] hover:text-[#37352f]"
    >
      {icon}
    </button>
  );
}

function NotionSplitCreateButton({
  onClick,
  primaryButtonRef,
  highlight,
}: {
  onClick: () => void;
  primaryButtonRef?: (el: HTMLButtonElement | null) => void;
  highlight?: boolean;
}) {
  // Stop propagation so the NotionLanding root onClick (onStray) doesn't
  // also fire when the user clicks the correct button.
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };
  // The pulse is applied to the primary 새로 만들기 <button> itself via
  // an animated outline. Outline draws OUTSIDE the element's box and is
  // not clipped by overflow:hidden ancestors (the wrapper below keeps
  // overflow-hidden for its rounded-corner split-button look). We keep
  // the ring on the primary half so it clearly points at the correct
  // click target rather than the chevron affordance.
  const primaryExtra = highlight ? ` ${CREATE_PULSE_CLASS}` : '';
  return (
    <div
      className="ml-[6px] inline-flex h-7 overflow-hidden rounded-[6px] text-[14px] font-medium text-white"
    >
      <button
        ref={primaryButtonRef}
        type="button"
        onClick={handle}
        className={`inline-flex items-center bg-[#2383E2] px-2 hover:bg-[#1A73D1]${primaryExtra}`}
      >
        새로 만들기
      </button>
      <button
        type="button"
        onClick={handle}
        aria-label="추가 옵션 더 보기"
        className="inline-flex w-6 items-center justify-center bg-[#2383E2] shadow-[inset_1px_0_0_rgba(255,255,255,0.2)] hover:bg-[#1A73D1]"
      >
        <ChevronDown size={12} strokeWidth={2.5} />
      </button>
    </div>
  );
}

function NotionCard({
  title,
  subtext,
  pillIcon,
  pillLabel,
  onCreate,
  primaryButtonRef,
  highlight,
  chartHeight = 300,
  children,
}: {
  title: string;
  subtext?: string;
  pillIcon: React.ReactNode;
  pillLabel: string;
  onCreate: () => void;
  primaryButtonRef?: (el: HTMLButtonElement | null) => void;
  highlight?: boolean;
  chartHeight?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <h4 className="px-[6px] pb-[6px] pt-[22px] text-[1.25em] font-semibold leading-[1.3] text-[#37352f]">
        {title}
      </h4>
      {subtext ? (
        <div className="px-[6px] py-[6px] text-[14px] text-[#a19e99]">
          {subtext}
        </div>
      ) : null}
      <div className="flex h-10 items-center px-[6px]">
        <NotionPillButton icon={pillIcon} label={pillLabel} />
        <div className="ml-auto flex items-center gap-0.5">
          <NotionIconButton
            icon={<Maximize2 size={14} />}
            ariaLabel="전체 페이지로 열기"
          />
          <NotionIconButton
            icon={<SlidersHorizontal size={14} />}
            ariaLabel="설정"
          />
          <NotionSplitCreateButton
            onClick={onCreate}
            primaryButtonRef={primaryButtonRef}
            highlight={highlight}
          />
        </div>
      </div>
      <div
        className="px-[8px] pt-[8px]"
        style={{ height: `${chartHeight}px` }}
      >
        {children}
      </div>
    </div>
  );
}

function IssueStatusDonut() {
  const slices = [
    { label: 'Prod Launch', value: 25, color: 'rgba(191,142,218,1)' },
    { label: 'Done', value: 17, color: 'rgba(114,188,143,1)' },
    { label: 'In Progress', value: 2, color: 'rgba(94,159,232,1)' },
  ];
  const total = slices.reduce((s, x) => s + x.value, 0);
  const cx = 226;
  const cy = 140;
  const rOuter = 90;
  const rInner = 62;

  let acc = -Math.PI / 2;
  const paths = slices.map((s) => {
    const angle = (s.value / total) * Math.PI * 2;
    const start = acc;
    const end = acc + angle;
    acc = end;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = cx + rOuter * Math.cos(start);
    const y1 = cy + rOuter * Math.sin(start);
    const x2 = cx + rOuter * Math.cos(end);
    const y2 = cy + rOuter * Math.sin(end);
    const x3 = cx + rInner * Math.cos(end);
    const y3 = cy + rInner * Math.sin(end);
    const x4 = cx + rInner * Math.cos(start);
    const y4 = cy + rInner * Math.sin(start);
    const mid = (start + end) / 2;
    const labelR = rOuter + 24;
    const labelX = cx + labelR * Math.cos(mid);
    const labelY = cy + labelR * Math.sin(mid);
    const leaderFrom = {
      x: cx + rOuter * Math.cos(mid),
      y: cy + rOuter * Math.sin(mid),
    };
    const pct = ((s.value / total) * 100).toFixed(1);
    const d = `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    return { ...s, d, labelX, labelY, leaderFrom, pct };
  });

  return (
    <div className="relative h-full w-full">
      <svg
        viewBox="0 0 451 300"
        width="100%"
        height="100%"
        className="block"
        aria-label="이슈 등록 및 진행현황"
      >
        {paths.map((p) => (
          <path
            key={p.label}
            d={p.d}
            fill={p.color}
            stroke="#fff"
            strokeWidth={1}
            strokeLinejoin="round"
          />
        ))}
        {paths.map((p) => (
          <line
            key={`leader-${p.label}`}
            x1={p.leaderFrom.x}
            y1={p.leaderFrom.y}
            x2={p.labelX}
            y2={p.labelY}
            stroke="rgba(230,229,227,1)"
            strokeWidth={1}
          />
        ))}
        {paths.map((p) => (
          <text
            key={`label-${p.label}`}
            x={p.labelX}
            y={p.labelY}
            textAnchor={p.labelX > cx ? 'start' : 'end'}
            dominantBaseline="middle"
            fill="#a19e99"
            fontSize={10}
          >
            {p.value} ({p.pct}%)
          </text>
        ))}
        <text
          x={cx}
          y={282}
          textAnchor="middle"
          fill="#7d7a75"
          fontSize={12}
        >
          [ 집계기간: 2026년 4/2~4/22 ]
        </text>
      </svg>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-[56%] flex-col items-center"
      >
        <div className="text-[38px] font-semibold leading-[51px] text-[#2c2c2b]">
          {total}
        </div>
        <div className="text-[12px] leading-[15px] text-[#7d7a75]">합계</div>
      </div>
    </div>
  );
}

function ProjectProgressChart() {
  const rows = [
    { label: '학사 FAQ', value: 18, color: 'rgba(114,188,143,1)' },
    { label: '장학/등록금', value: 12, color: 'rgba(94,159,232,1)' },
    { label: '학생 지원', value: 9, color: 'rgba(191,142,218,1)' },
    { label: '캠퍼스 생활', value: 5, color: 'rgba(235,174,119,1)' },
  ];
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col justify-center gap-3 px-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <div className="w-[88px] shrink-0 text-[12px] text-[rgba(55,53,47,0.75)]">
              {r.label}
            </div>
            <div className="flex-1">
              <div
                className="h-[16px] rounded-[2px]"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
              />
            </div>
            <div className="w-[28px] shrink-0 text-right text-[12px] tabular-nums text-[rgba(55,53,47,0.65)]">
              {r.value}
            </div>
          </div>
        ))}
      </div>
      <div className="pb-2 text-center text-[12px] text-[#7d7a75]">
        [ 집계기간: 2026년 4/2~4/22 ]
      </div>
    </div>
  );
}

const MY_CONTRIBUTION_DATA = [
  { label: '2025년 9월', todo: 2, progress: 0, done: 13 },
  { label: '2025년 11월', todo: 0, progress: 1, done: 4 },
  { label: '2026년 1월', todo: 0, progress: 0, done: 2 },
  { label: '2026년 3월', todo: 0, progress: 0, done: 6 },
  { label: '이번달', todo: 0, progress: 1, done: 10 },
];

const MY_CONTRIBUTION_SERIES = [
  { key: 'todo' as const, label: '할 일', color: 'rgba(199,198,196,1)' },
  { key: 'progress' as const, label: 'In Progress', color: 'rgba(94,159,232,1)' },
  { key: 'done' as const, label: '완료', color: 'rgba(114,188,143,1)' },
];

function MyContributionColumnChart() {
  const W = 451;
  const H = 320;
  const plot = { top: 28, bottom: 32, left: 32, right: 18 };
  const plotW = W - plot.left - plot.right;
  const plotH = H - plot.top - plot.bottom;
  const yTicks = [0, 4, 8, 12, 16];
  const yMax = 16;
  const yFor = (v: number) => plot.top + plotH * (1 - v / yMax);
  const colStep = plotW / MY_CONTRIBUTION_DATA.length;
  const barW = 16;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          className="block"
        >
          {/* dashed horizontal gridlines */}
          {yTicks.map((t) => (
            <line
              key={`grid-${t}`}
              x1={plot.left}
              x2={W - plot.right}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="rgba(230,229,227,1)"
              strokeWidth={1}
              strokeDasharray="1,3"
            />
          ))}
          {/* y-axis labels */}
          {yTicks.map((t) => (
            <text
              key={`ylabel-${t}`}
              x={plot.left - 8}
              y={yFor(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#a19e99"
              fontSize={12}
            >
              {t}
            </text>
          ))}
          {/* stacked columns */}
          {MY_CONTRIBUTION_DATA.map((d, i) => {
            const cx = plot.left + colStep * (i + 0.5);
            const total = d.todo + d.progress + d.done;
            let yCursor = yFor(0);
            return (
              <g key={d.label}>
                {MY_CONTRIBUTION_SERIES.map((s) => {
                  const v = d[s.key];
                  if (v === 0) return null;
                  const h = plotH * (v / yMax);
                  yCursor -= h;
                  return (
                    <rect
                      key={s.key}
                      x={cx - barW / 2}
                      y={yCursor}
                      width={barW}
                      height={h}
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth={0.5}
                      rx={2}
                    />
                  );
                })}
                {total > 0 ? (
                  <text
                    x={cx}
                    y={yFor(total) - 6}
                    textAnchor="middle"
                    fill="#7d7a75"
                    fontSize={12}
                  >
                    {total}
                  </text>
                ) : null}
                {/* x label — skip the second entry to mimic Notion's skipped-label behavior */}
                {i !== 1 ? (
                  <text
                    x={cx}
                    y={H - 10}
                    textAnchor="middle"
                    fill="#7d7a75"
                    fontSize={12}
                  >
                    {d.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex shrink-0 justify-center gap-4 pt-2">
        {MY_CONTRIBUTION_SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-[2px]"
              style={{ background: s.color }}
            />
            <span className="text-[12px] text-[#7d7a75]">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="shrink-0 pb-2 pt-1 text-center text-[12px] text-[#7d7a75]">
        [ 집계기간: 2025년 9월~이번달 ]
      </div>
    </div>
  );
}

const RANKING_SERIES = WORK_TYPES.map((w) => ({
  key: w.key,
  label: w.label,
  color: w.chartColor,
}));

type RankingRow = { name: string } & Record<WorkTypeKey, number>;

const RANKING_DATA: RankingRow[] = [
  { name: 'Minjae Lee', add: 10, newIntent: 4, update: 4, newIntentDev: 2, sql: 0, bug: 0 },
  { name: 'Laeyoung Chang', add: 17, newIntent: 1, update: 0, newIntentDev: 2, sql: 0, bug: 0 },
  { name: 'yeji lee', add: 5, newIntent: 3, update: 1, newIntentDev: 2, sql: 0, bug: 0 },
  { name: 'Seonghwa Yun', add: 0, newIntent: 2, update: 0, newIntentDev: 1, sql: 3, bug: 0 },
  { name: 'DiDi', add: 0, newIntent: 1, update: 0, newIntentDev: 1, sql: 3, bug: 0 },
  { name: 'eunjung jo', add: 1, newIntent: 1, update: 0, newIntentDev: 1, sql: 0, bug: 0 },
  { name: 'Hyemin Kwak', add: 0, newIntent: 0, update: 0, newIntentDev: 1, sql: 0, bug: 1 },
  { name: 'Yoojin Ko', add: 0, newIntent: 0, update: 0, newIntentDev: 0, sql: 0, bug: 1 },
];

function ContributionRankingBarChart() {
  const W = 451;
  const H = 300;
  const plot = { top: 12, bottom: 28, left: 140, right: 36 };
  const plotW = W - plot.left - plot.right;
  const plotH = H - plot.top - plot.bottom;
  const xTicks = [0, 6, 12, 18, 24];
  const xMax = 24;
  const xFor = (v: number) => plot.left + plotW * (v / xMax);
  const rowStep = plotH / RANKING_DATA.length;
  const barH = 16;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="none"
          className="block"
        >
          {/* vertical dashed gridlines */}
          {xTicks.map((t) => (
            <line
              key={`vgrid-${t}`}
              x1={xFor(t)}
              x2={xFor(t)}
              y1={plot.top}
              y2={plot.top + plotH}
              stroke="rgba(230,229,227,1)"
              strokeWidth={1}
              strokeDasharray="1,3"
            />
          ))}
          {/* rows */}
          {RANKING_DATA.map((row, i) => {
            const cy = plot.top + rowStep * (i + 0.5);
            const total = RANKING_SERIES.reduce((s, ser) => s + row[ser.key], 0);
            let xCursor = xFor(0);
            const initial = (row.name[0] ?? '?').toUpperCase();
            return (
              <g key={row.name}>
                {/* avatar circle */}
                <circle cx={plot.left - 116} cy={cy} r={12} fill="#F1F1EF" />
                <text
                  x={plot.left - 116}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#37352f"
                  fontSize={11}
                  fontWeight={600}
                >
                  {initial}
                </text>
                {/* name */}
                <text
                  x={plot.left - 100}
                  y={cy}
                  dominantBaseline="central"
                  fill="#7d7a75"
                  fontSize={12}
                >
                  {row.name}
                </text>
                {/* stacked segments */}
                {RANKING_SERIES.map((s) => {
                  const v = row[s.key];
                  if (v === 0) return null;
                  const w = plotW * (v / xMax);
                  const seg = (
                    <rect
                      key={s.key}
                      x={xCursor}
                      y={cy - barH / 2}
                      width={w}
                      height={barH}
                      fill={s.color}
                      stroke="#fff"
                      strokeWidth={0.5}
                      rx={2}
                    />
                  );
                  xCursor += w;
                  return seg;
                })}
                {/* total label */}
                {total > 0 ? (
                  <text
                    x={xFor(total) + 6}
                    y={cy}
                    dominantBaseline="central"
                    fill="#7d7a75"
                    fontSize={12}
                  >
                    {total}
                  </text>
                ) : null}
              </g>
            );
          })}
          {/* x-axis labels */}
          {xTicks.map((t) => (
            <text
              key={`xlabel-${t}`}
              x={xFor(t)}
              y={H - 10}
              textAnchor="middle"
              fill="#a19e99"
              fontSize={12}
            >
              {t}
            </text>
          ))}
        </svg>
      </div>
      <div className="mx-auto grid shrink-0 max-w-[320px] grid-cols-2 gap-x-4 gap-y-1 pt-2">
        {RANKING_SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
              style={{ background: s.color }}
            />
            <span className="truncate text-[12px] text-[#7d7a75]">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="shrink-0 pb-2 pt-1 text-center text-[12px] text-[#7d7a75]">
        [ 집계기간: 2026년 4/2~4/22 ]
      </div>
    </div>
  );
}

export function NotionLanding({
  onCreate,
  onStray,
  onPrimaryActionRef,
  onCreateButtonsRef,
  highlightCreateButtons = true,
}: Props) {
  // Collect refs for each of the 5 "새로 만들기" buttons (4 in-card cards
  // + 1 bottom sticky CTA). We bucket them by stable index so each
  // callback can write independently, then report the ordered array to
  // the parent. On unmount we ping with an empty list so the parent can
  // drop the anchor.
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([null, null, null, null, null]);
  // Stable latest-callback refs so slot ref callbacks below don't need
  // to change identity when the parent rebinds onCreateButtonsRef /
  // onPrimaryActionRef. React re-invokes ref callbacks with null/el
  // each time their identity flips, which here would double-report the
  // buttons on every parent render.
  const onCreateButtonsRefLatest = useRef(onCreateButtonsRef);
  const onPrimaryActionRefLatest = useRef(onPrimaryActionRef);
  useEffect(() => {
    onCreateButtonsRefLatest.current = onCreateButtonsRef;
  }, [onCreateButtonsRef]);
  useEffect(() => {
    onPrimaryActionRefLatest.current = onPrimaryActionRef;
  }, [onPrimaryActionRef]);

  const reportButtons = useCallback(() => {
    const cb = onCreateButtonsRefLatest.current;
    if (!cb) return;
    const live = buttonsRef.current.filter(
      (el): el is HTMLButtonElement => el !== null,
    );
    cb(live);
  }, []);

  // Slot 4 is the bottom sticky 새로 만들기 — it's also the canonical
  // anchor reported via onPrimaryActionRef for backwards-compat with
  // earlier wiring. Each ref callback is memoized with an empty dep
  // list so its identity is stable across renders (React would
  // otherwise re-invoke the ref with null → el on every parent render
  // and fire phantom reports to the parent).
  const slot0Ref = useCallback((el: HTMLButtonElement | null) => {
    buttonsRef.current[0] = el;
    reportButtons();
  }, [reportButtons]);
  const slot1Ref = useCallback((el: HTMLButtonElement | null) => {
    buttonsRef.current[1] = el;
    reportButtons();
  }, [reportButtons]);
  const slot2Ref = useCallback((el: HTMLButtonElement | null) => {
    buttonsRef.current[2] = el;
    reportButtons();
  }, [reportButtons]);
  const slot3Ref = useCallback((el: HTMLButtonElement | null) => {
    buttonsRef.current[3] = el;
    reportButtons();
  }, [reportButtons]);
  const slot4Ref = useCallback((el: HTMLButtonElement | null) => {
    buttonsRef.current[4] = el;
    onPrimaryActionRefLatest.current?.(el);
    reportButtons();
  }, [reportButtons]);

  useEffect(() => {
    return () => {
      onCreateButtonsRefLatest.current?.([]);
      onPrimaryActionRefLatest.current?.(null);
    };
  }, []);

  return (
    <div
      onClick={onStray}
      className="h-full w-full overflow-auto bg-white font-[family:-apple-system,BlinkMacSystemFont,'Segoe_UI','Noto_Sans_KR',sans-serif] text-[#37352f]"
    >
      {/* Scoped keyframes for the subtle orange pulse on "새로 만들기"
           targets. Kept inline (not global CSS) so the animation is
           colocated with the only component that uses it. Tint: brand
           orange #FF9D00 at ~0.55 alpha, fading to 0 at 70% for a soft
           "breathing" ring rather than a harsh blink.

           Implementation note: we animate `outline` (not `box-shadow`).
           Outline draws OUTSIDE the border-box. The split button wrapper
           keeps overflow-hidden for its rounded corners (the split
           buttons are the small top-right cards; their pulse radius is
           small enough to be OK). The bottom sticky "새로 만들기"
           previously sat inside an overflow-hidden table wrapper which
           clipped 3 of 4 sides of the ring — that wrapper has since been
           switched to overflow-visible (see the Tasks Table block
           below), so all 4 sides of the pulse now render. */}
      <style>{`
        @keyframes cc-new-task-pulse {
          0% {
            outline-color: rgba(255, 157, 0, 0.55);
            outline-offset: 0px;
          }
          70% {
            outline-color: rgba(255, 157, 0, 0);
            outline-offset: 6px;
          }
          100% {
            outline-color: rgba(255, 157, 0, 0);
            outline-offset: 6px;
          }
        }
        .cc-new-task-pulse {
          outline: 2px solid rgba(255, 157, 0, 0.55);
          outline-offset: 0px;
          animation: cc-new-task-pulse 1.8s ease-in-out infinite;
        }
      `}</style>
      {/* Cover */}
      <div
        className="relative h-[180px] w-full bg-white bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/maps/courses/curious-nyang-intent-guide/fix-intent-5min/agents-intents-cover.png')",
        }}
      />

      {/* Page content */}
      <div className="mx-auto w-full max-w-[960px] px-10">
        {/* Emoji overlapping cover */}
        <div className="relative z-10 -mt-[46px] mb-2">
          <div className="flex h-[78px] w-[78px] items-center justify-center text-[70px] leading-none">
            🧠
          </div>
        </div>

        {/* Breadcrumb-like row */}
        <div className="mb-2 flex items-center gap-2 text-[12px] text-[rgba(55,53,47,0.5)]">
          <span>comcom</span>
          <span>/</span>
          <span>Agents & Intents</span>
        </div>

        {/* Title */}
        <h1 className="mb-3 text-[40px] font-bold leading-[1.2] tracking-[-0.01em]">
          🤖 Agents & Intents
        </h1>

        {/* Subtitle */}
        <p className="mb-6 text-[15px] leading-relaxed text-[rgba(55,53,47,0.75)]">
          에이전트는 똑똑하지만 애매해. 에이전트를 운영하며 발견되는 이슈와 이를 해결하기 위한 Task 를 추적합니다.
        </p>

        {/* Tip callout */}
        <div className="mb-5 flex items-start gap-3 rounded-[4px] bg-[#F1F1EF] px-4 py-3">
          <span className="text-[18px] leading-none">💡</span>
          <div className="text-[14px] leading-relaxed text-[rgba(55,53,47,0.85)]">
            <span className="font-semibold">Tip.</span> This template contains two connected databases — <b>Agents</b> 와{' '}
            <b>Tasks</b>. 에이전트별로 발견된 이슈를 Task 로 연결해 추적하세요.
          </div>
        </div>

        {/* Bulleted list */}
        <ul className="mb-5 space-y-1 pl-1 text-[15px] leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#37352f]" />
            <span>
              <b className="underline decoration-[rgba(55,53,47,0.25)] underline-offset-2">Agents</b> — 등록된 AI 에이전트 목록과 인텐트 커버리지
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-[#37352f]" />
            <span>
              <b className="underline decoration-[rgba(55,53,47,0.25)] underline-offset-2">Tasks</b> — 발견된 인텐트 이슈와 수정 작업
            </span>
          </li>
        </ul>

        {/* Linked page */}
        <div className="mb-6 flex items-center gap-2 rounded-[3px] px-1 py-1 text-[15px] text-[rgba(55,53,47,0.85)] hover:bg-[rgba(55,53,47,0.04)]">
          <span className="text-[16px]">📘</span>
          <span className="underline decoration-[rgba(55,53,47,0.25)] underline-offset-2">시즌별 운영정책</span>
        </div>

        {/* Two-column dashboard 1 */}
        <div className="mb-4 grid grid-cols-2 gap-[46px]">
          <NotionCard
            title="이슈 등록 및 진행현황"
            pillIcon={<PieChart size={16} />}
            pillLabel="Total issues(Cycle)"
            onCreate={onCreate}
            primaryButtonRef={slot0Ref}
            highlight={highlightCreateButtons}
          >
            <IssueStatusDonut />
          </NotionCard>
          <NotionCard
            title="프로젝트별 진행현황"
            pillIcon={<BarChart3 size={16} />}
            pillLabel="By project"
            onCreate={onCreate}
            primaryButtonRef={slot1Ref}
            highlight={highlightCreateButtons}
          >
            <ProjectProgressChart />
          </NotionCard>
        </div>

        {/* Two-column dashboard 2 */}
        <div className="mb-6 grid grid-cols-2 gap-[46px]">
          <NotionCard
            title="나의 기여현황"
            subtext="(본인 항목만 표시됨)"
            pillIcon={<BarChart3 size={16} />}
            pillLabel="My contribution (monthly)"
            chartHeight={400}
            onCreate={onCreate}
            primaryButtonRef={slot2Ref}
            highlight={highlightCreateButtons}
          >
            <MyContributionColumnChart />
          </NotionCard>
          <NotionCard
            title="개인별 기여도 랭킹"
            subtext="(이번 주기 작업완료항목만 표시됨)"
            pillIcon={<BarChartHorizontal size={16} />}
            pillLabel="contribution point by work type"
            chartHeight={400}
            onCreate={onCreate}
            primaryButtonRef={slot3Ref}
            highlight={highlightCreateButtons}
          >
            <ContributionRankingBarChart />
          </NotionCard>
        </div>

        {/* Callout: 작업프로세스 */}
        <div className="mb-3 flex items-start gap-3 rounded-[4px] bg-[#EBF0F7] px-4 py-3">
          <Info size={18} className="mt-0.5 shrink-0 text-[#337EA9]" />
          <div className="text-[14px] leading-relaxed text-[rgba(55,53,47,0.85)]">
            <Link2 size={12} className="mr-1 inline text-[#337EA9]" />
            <span className="underline decoration-[rgba(55,53,47,0.25)] underline-offset-2">작업프로세스</span> — 이슈 발견 → Task 등록 → Agent 수정 → 검수
          </div>
        </div>

        {/* Callout: 에이전트 안보일 때 */}
        <div className="mb-5 flex items-start gap-3 rounded-[4px] bg-[#FBF3DB] px-4 py-3">
          <span className="text-[18px] leading-none">👉</span>
          <div className="text-[14px] leading-relaxed text-[rgba(55,53,47,0.85)]">
            에이전트가 안보일 경우 — <b>필터</b>를 초기화하거나 <b>Season</b> 을 확인하세요.
          </div>
        </div>

        {/* Database: Tasks */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-[20px] font-bold">
            <span>📋</span>
            <span>Tasks</span>
          </div>

          {/* Tabs */}
          <div className="mb-0 flex items-center gap-0 border-b border-[rgba(55,53,47,0.09)] text-[14px]">
            {[
              { label: 'Me', icon: <User size={14} />, active: true },
              { label: 'Simple List', icon: <List size={14} /> },
              { label: 'By project', icon: <LayoutGrid size={14} /> },
              { label: 'Load per person', icon: <BarChart3 size={14} /> },
              { label: 'Form builder', icon: <MessageSquare size={14} /> },
            ].map((t) => (
              <button
                key={t.label}
                className={`flex items-center gap-1.5 px-2 py-1.5 ${
                  t.active
                    ? 'border-b-2 border-[#37352f] font-semibold text-[#37352f]'
                    : 'text-[rgba(55,53,47,0.55)] hover:text-[rgba(55,53,47,0.85)]'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
            <button className="ml-1 flex items-center gap-1 px-2 py-1.5 text-[rgba(55,53,47,0.5)] hover:text-[rgba(55,53,47,0.85)]">
              <Plus size={14} />
            </button>
            <div className="ml-auto flex items-center gap-1 pr-1">
              <button className="rounded px-2 py-1 text-[13px] text-[rgba(55,53,47,0.55)] hover:bg-[rgba(55,53,47,0.06)]">
                Filter
              </button>
              <button className="rounded px-2 py-1 text-[13px] text-[rgba(55,53,47,0.55)] hover:bg-[rgba(55,53,47,0.06)]">
                Sort
              </button>
            </div>
          </div>

          {/* Table. NOTE: wrapper intentionally uses overflow-visible (not
               overflow-hidden) so the animated outline pulse on the bottom
               sticky "새로 만들기" button — which lives inside this same
               wrapper — is not clipped on its bottom/left/right edges. The
               table itself has no rounded outer border, so there is nothing
               visually requiring overflow-hidden here. */}
          <div className="overflow-visible">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="border-b border-[rgba(55,53,47,0.09)] text-[12px] text-[rgba(55,53,47,0.5)]">
                  <th className="px-2 py-2 text-left font-normal">
                    <div className="flex items-center gap-1.5">
                      <Table2 size={12} />
                      Task name
                    </div>
                  </th>
                  <th className="px-2 py-2 text-left font-normal">Agent</th>
                  <th className="px-2 py-2 text-left font-normal">Status</th>
                  <th className="px-2 py-2 text-left font-normal">Work Type</th>
                  <th className="px-2 py-2 text-left font-normal">Season</th>
                  <th className="px-2 py-2 text-left font-normal">
                    <div className="flex items-center gap-1">
                      Created time
                      <ChevronDown size={12} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {TASKS.map((t) => (
                  <tr
                    key={t.title}
                    className="border-b border-[rgba(55,53,47,0.06)] hover:bg-[rgba(55,53,47,0.03)]"
                  >
                    <td className="px-2 py-2 text-[rgba(55,53,47,0.95)]">{t.title}</td>
                    <td className="px-2 py-2">
                      <Tag tone="purple">
                        {t.agent === '궁금하냥' ? '🦁' : '🐱'} {t.agent}
                      </Tag>
                    </td>
                    <td className="px-2 py-2">
                      <StatusChip status={t.status} />
                    </td>
                    <td className="px-2 py-2">
                      <WorkTypeTag workType={t.workType} />
                    </td>
                    <td className="px-2 py-2">
                      <Tag tone="gray">{t.season}</Tag>
                    </td>
                    <td className="px-2 py-2 text-[rgba(55,53,47,0.55)]">{t.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* New button — the canonical "하단 새로 만들기" target the
                 mission bar refers to. Reported via slot 4 (which also
                 forwards to onPrimaryActionRef for backwards-compat).
                 A subtle orange pulse ring is applied when
                 highlightCreateButtons is on, mirroring the four in-card
                 create buttons above. */}
            <button
              ref={slot4Ref}
              onClick={(e) => {
                e.stopPropagation();
                onCreate();
              }}
              className={`flex w-full items-center gap-1.5 rounded-[4px] px-2 py-2 text-left text-[14px] text-[rgba(55,53,47,0.45)] transition-colors hover:bg-[rgba(55,53,47,0.04)] hover:text-[rgba(55,53,47,0.85)]${
                highlightCreateButtons ? ` ${CREATE_PULSE_CLASS}` : ''
              }`}
            >
              <Plus size={14} />
              새로 만들기
            </button>
          </div>

          <div className="mt-1 flex items-center gap-2 px-2 py-1 text-[12px] text-[rgba(55,53,47,0.5)]">
            <span>COUNT {TASKS.length}</span>
          </div>
        </div>

        {/* Database: Agents (gallery) */}
        <div className="mb-12">
          <div className="mb-2 flex items-center gap-2 text-[20px] font-bold">
            <span>🤖</span>
            <span>Agents</span>
          </div>

          <div className="mb-3 flex items-center gap-0 border-b border-[rgba(55,53,47,0.09)] text-[14px]">
            <button className="flex items-center gap-1.5 border-b-2 border-[#37352f] px-2 py-1.5 font-semibold">
              <LayoutGrid size={14} />
              Gallery
            </button>
            <button className="flex items-center gap-1.5 px-2 py-1.5 text-[rgba(55,53,47,0.55)] hover:text-[rgba(55,53,47,0.85)]">
              <List size={14} />
              By status
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {AGENTS.map((a) => (
              <div
                key={a.name}
                className="rounded-[6px] border border-[rgba(55,53,47,0.09)] p-3 shadow-[0_1px_2px_rgba(15,15,15,0.04)] hover:shadow-[0_2px_8px_rgba(15,15,15,0.08)]"
              >
                <div className="mb-3 flex h-[72px] items-center justify-center rounded-[4px] bg-[#F7F6F3] text-[42px]">
                  {a.name === '궁금하냥' ? '🦁' : '🐱'}
                </div>
                <div className="mb-1 text-[14px] font-semibold">{a.name}</div>
                <div className="mb-2 text-[12px] text-[rgba(55,53,47,0.55)]">{a.role}</div>
                <div className="flex items-center justify-between">
                  <StatusChip status={a.status} />
                  <span className="flex items-center gap-1 text-[11px] text-[rgba(55,53,47,0.5)]">
                    <Star size={10} />
                    {a.issues} issues
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
