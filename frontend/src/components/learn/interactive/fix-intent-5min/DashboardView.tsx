'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown, Download, Heart, Info, MoreHorizontal, Timer } from 'lucide-react';
import type { ChatLogRow } from '@/data/courses/fix-intent-5min/chat-log-sets';

interface Props {
  title: string;
  setOrder: number;
  totalSets: number;
  rows: ChatLogRow[];
  onRowClick: (row: ChatLogRow) => void;
  hearts: number;
  timerRemaining: number;
  timerTotal: number;
}

// Metabase tokens reused across cells/headers — exported so the Copy-Issue
// modal (and any future Metabase-styled surfaces) can clone the look 1:1.
export const MB_FONT = 'font-[family:var(--font-lato),Arial,sans-serif]';
export const MB_TEXT_PRIMARY = 'text-[rgba(7,23,34,0.84)]';
export const MB_TEXT_SECONDARY = 'text-[rgba(7,23,34,0.62)]';
export const MB_TEXT_TERTIARY = 'text-[rgba(7,23,34,0.44)]';
export const MB_ROW_DIVIDER = 'border-[rgba(7,23,34,0.05)]';
export const MB_HOVER_BG = 'hover:bg-[rgba(80,158,227,0.1)]';
export const MB_CARD =
  'bg-white border border-[#DCDFE0] rounded-[8px] shadow-[0px_1px_4px_2px_rgba(0,0,0,0.08)]';

// Internal aliases preserved so the rest of this file compiles unchanged.
const FONT = MB_FONT;
const TEXT_PRIMARY = MB_TEXT_PRIMARY;
const TEXT_SECONDARY = MB_TEXT_SECONDARY;
const TEXT_TERTIARY = MB_TEXT_TERTIARY;
const ROW_DIVIDER = MB_ROW_DIVIDER;
const HOVER_BG = MB_HOVER_BG;
const CARD = MB_CARD;

// Game-HUD timer bar — sits next to the hearts to convey urgency. Colour
// shifts through green → amber → red as the ratio decays; final quarter
// pulses (animate-pulse) to mirror the heart-critical feedback loop.
function TimerBar({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const safeTotal = Math.max(total, 1);
  const ratio = Math.max(0, Math.min(1, remaining / safeTotal));
  const pct = ratio * 100;
  const color =
    ratio > 0.5 ? '#84BB4C' : ratio > 0.25 ? '#F9CF58' : '#ED6E6E';
  const critical = ratio <= 0.25 && remaining > 0;
  const mm = Math.floor(Math.max(0, remaining) / 60);
  const ss = Math.max(0, remaining) % 60;

  return (
    <div
      className="flex items-center gap-1.5"
      aria-label={`남은 시간 ${mm}분 ${ss}초`}
    >
      <Timer
        size={14}
        strokeWidth={1.75}
        className={`text-[rgba(7,23,34,0.55)] ${critical ? 'animate-pulse' : ''}`}
        style={critical ? { color } : undefined}
      />
      <div className="tabular-nums text-[11px] text-[rgba(7,23,34,0.62)] min-w-[30px]">
        {mm}:{ss.toString().padStart(2, '0')}
      </div>
      <div className="relative h-[6px] w-[88px] overflow-hidden rounded-full bg-[#ECECEC]">
        <div
          className={`h-full rounded-full ${critical ? 'animate-pulse' : ''}`}
          style={{
            width: `${pct}%`,
            background: color,
            transition: 'width 1s linear, background-color 400ms ease',
          }}
        />
      </div>
    </div>
  );
}

// Game-HUD hearts — small indicator tucked into the dashboard header.
// Living hearts pulse gently; the last remaining heart switches to a faster
// "critical" glow; the heart that's just lost plays a one-shot shatter; the
// whole container shakes briefly on damage. Detection is done by comparing
// count against a ref so a prop transition cleanly triggers the animations.
function HeartsIndicator({ count, max = 3 }: { count: number; max?: number }) {
  const prevCountRef = useRef(count);
  const [damagedIdx, setDamagedIdx] = useState<number | null>(null);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (count < prevCountRef.current) {
      // The newly-vacated slot is at index = count (e.g. 3 → 2 empties idx 2).
      setDamagedIdx(count);
      setShaking(true);
      const shatterTimer = setTimeout(() => setDamagedIdx(null), 600);
      const shakeTimer = setTimeout(() => setShaking(false), 420);
      prevCountRef.current = count;
      return () => {
        clearTimeout(shatterTimer);
        clearTimeout(shakeTimer);
      };
    }
    prevCountRef.current = count;
  }, [count]);

  const critical = count === 1;

  return (
    <div
      className={`flex items-center gap-0.5 ${shaking ? 'hearts-shake' : ''}`}
      aria-label={`남은 기회 ${count}개`}
    >
      {Array.from({ length: max }).map((_, i) => {
        const isShattering = i === damagedIdx;
        const isAlive = i < count;
        // A shattering heart still renders filled to make the fade visible.
        const filled = isAlive || isShattering;
        const animClass = isShattering
          ? 'heart-shatter'
          : isAlive
            ? critical
              ? 'heart-critical'
              : 'heart-alive'
            : '';
        return (
          <Heart
            key={i}
            size={14}
            strokeWidth={1.5}
            className={`transition-colors ${animClass} ${
              filled
                ? 'fill-[#ED6E6E] text-[#ED6E6E]'
                : 'fill-transparent text-[#DCDFE0]'
            }`}
          />
        );
      })}
    </div>
  );
}

// Inert visual-only icon — no click. Row is the only interactive surface.
function InertIcon({
  children,
  label,
  className = '',
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`pointer-events-none inline-flex items-center justify-center select-none ${TEXT_TERTIARY} ${className}`}
    >
      {children}
    </span>
  );
}

function CardHeader({
  title,
  titleClassName = '',
}: {
  title: string;
  titleClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pt-3 pb-1">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={`truncate text-[13px] font-bold ${TEXT_PRIMARY} ${titleClassName}`}
        >
          {title}
        </span>
        <InertIcon label="Info">
          <Info size={13} />
        </InertIcon>
      </div>
      <InertIcon label="More">
        <MoreHorizontal size={14} />
      </InertIcon>
    </div>
  );
}

function ScalarCard({
  label,
  value,
  period,
  changePercent,
}: {
  label: string;
  value: string;
  period: string;
  changePercent: number;
}) {
  return (
    <div className={`flex flex-1 min-h-0 flex-col ${CARD}`}>
      <CardHeader title={label} />
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 pb-3">
        <div className={`text-[24px] font-black leading-none ${TEXT_PRIMARY}`}>
          {value}
        </div>
        <div className={`text-[11px] font-bold ${TEXT_PRIMARY}`}>{period}</div>
        <div
          className="flex items-center gap-0.5 text-[11px] font-semibold"
          style={{ color: 'rgb(227, 89, 94)' }}
        >
          <ArrowDown size={11} strokeWidth={2.5} />
          <span>{changePercent}%</span>
        </div>
      </div>
    </div>
  );
}

// Horizontal bar chart — mock data matches the real production dashboard.
const INTENT_BARS: { label: string; value: number }[] = [
  { label: 'no_intent', value: 512 },
  { label: '한양대 소개', value: 149 },
  { label: '에리카 소개', value: 66 },
  { label: '교내 SMART 강좌', value: 64 },
  { label: '강의계획서 안내', value: 57 },
  { label: '뭐해', value: 54 },
  { label: '기숙사 시설', value: 33 },
  { label: '기숙사 안내', value: 24 },
  { label: '기타(2)', value: 35 },
];

function BarChart() {
  const maxValue = 500;
  const maxBarValue = Math.max(...INTENT_BARS.map((b) => b.value));
  const chartMax = Math.max(maxValue, maxBarValue);
  const labelColWidth = 100;
  const valueColWidth = 30;

  return (
    <div className={`flex flex-col overflow-hidden ${CARD}`}>
      <CardHeader title="Monthly Intent Distribution" />
      <div className="flex flex-1 items-stretch overflow-hidden px-4 pb-4 pt-1">
        <svg
          viewBox="0 0 260 220"
          preserveAspectRatio="xMinYMid meet"
          className="h-full w-full"
        >
          {INTENT_BARS.map((bar, i) => {
            const rowH = 180 / INTENT_BARS.length;
            const y = 6 + i * rowH;
            const barH = Math.max(10, rowH * 0.7);
            const widthAvail = 260 - labelColWidth - valueColWidth;
            const barW = (bar.value / chartMax) * widthAvail;
            return (
              <g key={bar.label}>
                <text
                  x={labelColWidth - 6}
                  y={y + barH / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="rgba(7,23,34,0.62)"
                  fontFamily="Lato, Arial, sans-serif"
                >
                  {bar.label}
                </text>
                <rect
                  x={labelColWidth}
                  y={y}
                  width={barW}
                  height={barH}
                  fill="#999AC4"
                />
                <text
                  x={labelColWidth + barW + 4}
                  y={y + barH / 2}
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="rgba(7,23,34,0.62)"
                  fontFamily="Lato, Arial, sans-serif"
                >
                  {bar.value}
                </text>
              </g>
            );
          })}
          {/* x-axis baseline + 0/500 ticks */}
          <line
            x1={labelColWidth}
            y1={190}
            x2={260 - valueColWidth + 10}
            y2={190}
            stroke="#DCDFE0"
          />
          <text
            x={labelColWidth}
            y={202}
            fontSize="9"
            textAnchor="middle"
            fill="rgba(7,23,34,0.62)"
            fontFamily="Lato, Arial, sans-serif"
          >
            0
          </text>
          <text
            x={labelColWidth + (chartMax === 500 ? 130 : 130)}
            y={202}
            fontSize="9"
            textAnchor="middle"
            fill="rgba(7,23,34,0.62)"
            fontFamily="Lato, Arial, sans-serif"
          >
            500
          </text>
        </svg>
      </div>
    </div>
  );
}

// Daily-requests line chart — mocked to mirror the live dashboard shape.
const DAILY_POINTS: number[] = [
  30, 20, 70, 90, 100, 150, 130, 40, 50, 190, 80, 110, 130, 150, 80,
  90, 60, 100, 150, 130, 100, 180, 120, 150, 200, 90, 120, 250, 90, 70,
  100, 130, 110, 90, 150, 170, 120, 140, 180, 100, 250, 300, 200, 150, 120,
  90, 110, 180, 220, 300, 250, 200, 150, 100, 80, 760, 200, 100, 70, 50,
];
const DATE_TICKS = ['7월 1, 2025', '10월 1, 2025', '1월 1, 2026', '4월 1, 2026'];
const Y_TICKS = [0, 200, 400, 600, 800];

function LineChart() {
  const W = 520;
  const H = 220;
  const padL = 40;
  const padR = 10;
  const padT = 12;
  const padB = 34;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const maxY = 800;
  const points = DAILY_POINTS.map((v, i) => {
    const x = padL + (i / (DAILY_POINTS.length - 1)) * innerW;
    const y = padT + innerH - (v / maxY) * innerH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  return (
    <div className={`flex flex-col overflow-hidden ${CARD}`}>
      <CardHeader title="Daily Requests" />
      <div className="flex flex-1 items-stretch overflow-hidden px-4 pb-4 pt-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
        >
          {/* horizontal grid + y labels */}
          {Y_TICKS.map((t) => {
            const y = padT + innerH - (t / maxY) * innerH;
            return (
              <g key={t}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="rgba(7,23,34,0.05)"
                  strokeDasharray="0"
                />
                <text
                  x={padL - 6}
                  y={y}
                  fontSize="10"
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="rgba(7,23,34,0.62)"
                  fontFamily="Lato, Arial, sans-serif"
                >
                  {t}
                </text>
              </g>
            );
          })}
          {/* axis line */}
          <line
            x1={padL}
            y1={padT + innerH}
            x2={W - padR}
            y2={padT + innerH}
            stroke="#DCDFE0"
          />
          {/* line series */}
          <polyline
            points={points}
            fill="none"
            stroke="#509EE3"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* x axis date labels */}
          {DATE_TICKS.map((label, i) => {
            const x = padL + (i / (DATE_TICKS.length - 1)) * innerW;
            return (
              <text
                key={label}
                x={x}
                y={H - 12}
                fontSize="10"
                textAnchor="middle"
                fill="rgba(7,23,34,0.62)"
                fontFamily="Lato, Arial, sans-serif"
              >
                {label}
              </text>
            );
          })}
          {/* y-axis title (rotated) */}
          <text
            x={14}
            y={padT + innerH / 2}
            fontSize="10"
            textAnchor="middle"
            transform={`rotate(-90 14 ${padT + innerH / 2})`}
            fill="rgba(7,23,34,0.62)"
            fontFamily="Lato, Arial, sans-serif"
          >
            카운트
          </text>
          {/* x-axis title */}
          <text
            x={W / 2}
            y={H - 2}
            fontSize="10"
            textAnchor="middle"
            fill="rgba(7,23,34,0.62)"
            fontFamily="Lato, Arial, sans-serif"
          >
            Created At: 일
          </text>
        </svg>
      </div>
    </div>
  );
}

export function DashboardView({
  rows,
  onRowClick,
  hearts,
  timerRemaining,
  timerTotal,
}: Props) {
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden bg-[#F9F9FA] ${TEXT_PRIMARY} ${FONT}`}
    >
      {/* Dashboard top bar */}
      <header className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-[rgba(7,23,34,0.05)]">
        <h2 className="text-[21px] font-bold leading-tight">
          hanyang-agent-production
        </h2>
        <div className="flex items-center gap-3">
          <TimerBar remaining={timerRemaining} total={timerTotal} />
          <HeartsIndicator count={hearts} />
          <InertIcon label="Download" className="h-8 w-8">
            <Download size={16} />
          </InertIcon>
        </div>
      </header>

      {/* Canvas */}
      <main className="mb-scrollbar flex flex-1 flex-col gap-3 overflow-auto px-6 py-4">
        {/* Top row: KPIs + charts */}
        <div className="grid h-[260px] flex-shrink-0 grid-cols-[110px_minmax(0,1fr)_minmax(0,2fr)] gap-3">
          <div className="flex h-full flex-col gap-3">
            <ScalarCard
              label="DAU"
              value="31"
              period="4월 21, 2026"
              changePercent={58.11}
            />
            <ScalarCard
              label="MAU"
              value="1,762"
              period="4월 2026"
              changePercent={42.9}
            />
          </div>
          <BarChart />
          <LineChart />
        </div>

        {/* Table card */}
        <section
          className={`flex flex-1 flex-col overflow-hidden ${CARD} min-h-[320px]`}
        >
          <CardHeader title="All chats in table view" />
          <div
            className={`mb-scrollbar flex-1 overflow-auto border-t ${ROW_DIVIDER}`}
          >
            <table className="w-full border-separate border-spacing-0 text-[12.5px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr>
                  {[
                    'Session ID',
                    'Created At',
                    'Intent',
                    'User: Message',
                    'Assistant: Contents',
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`border-b border-[#DCDFE0] px-3 py-2 text-left font-semibold whitespace-nowrap ${
                        i === 0 ? 'pl-6' : ''
                      }`}
                    >
                      <span className="inline-block rounded-[4px] bg-[#E8F1FB] px-2 py-1 text-[11.5px] text-[rgba(7,23,34,0.62)]">
                        {h}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.sessionId}
                    onClick={() => onRowClick(row)}
                    className={`cursor-pointer transition-colors ${HOVER_BG}`}
                  >
                    <td
                      className={`border-b ${ROW_DIVIDER} px-3 py-3 pl-6 font-mono text-[12px] ${TEXT_SECONDARY} whitespace-nowrap align-top`}
                    >
                      {row.sessionId.slice(0, 8)}…
                    </td>
                    <td
                      className={`border-b ${ROW_DIVIDER} px-3 py-3 ${TEXT_SECONDARY} whitespace-nowrap align-top`}
                    >
                      {row.createdAt}
                    </td>
                    <td
                      className={`border-b ${ROW_DIVIDER} px-3 py-3 font-medium ${TEXT_PRIMARY} whitespace-nowrap align-top`}
                    >
                      {row.intent}
                    </td>
                    <td
                      className={`border-b ${ROW_DIVIDER} px-3 py-3 ${TEXT_PRIMARY} whitespace-nowrap align-top`}
                    >
                      {row.userMessage}
                    </td>
                    <td
                      className={`border-b ${ROW_DIVIDER} px-3 py-3 ${TEXT_SECONDARY} max-w-[520px] whitespace-pre-wrap break-words align-top`}
                    >
                      {row.assistantContent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div
            className={`border-t ${ROW_DIVIDER} px-6 py-2 text-[11px] ${TEXT_TERTIARY}`}
          >
            처음 {rows.length}행 표시 중
          </div>
        </section>
      </main>
    </div>
  );
}
