'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import {
  INTENT_CATALOG,
  TRIGGER_SENTENCES,
  type IntentCategory,
  type IntentRow,
} from '@/data/courses/fix-intent-5min/intent-catalog';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TabId = IntentCategory | 'trigger';

const TABS: { id: TabId; label: string }[] = [
  { id: '일반', label: '일반' },
  { id: '재무', label: '재무' },
  { id: '학사', label: '학사' },
  { id: '국제', label: '국제' },
  { id: 'trigger', label: 'intent_trigger_sentence' },
];

// Tab color strip mirroring Stage 3's Google-Sheets clone so the two
// surfaces read as the same spreadsheet.
const TAB_ACCENT: Record<TabId, string> = {
  일반: 'transparent',
  재무: 'rgb(244, 204, 204)',
  학사: 'rgb(255, 242, 204)',
  국제: 'rgb(207, 226, 243)',
  trigger: 'transparent',
};

function formatCreatedAt(iso: string): string {
  // Keep the raw ISO visible — this surface is a "sheet preview", so a
  // timestamp that reads like a cell value feels right.
  return iso.replace('T', ' ').replace('Z', '');
}

export function IntentCatalogModal({ open, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('일반');

  const rowsByCategory = useMemo(() => {
    const byCat: Record<IntentCategory, IntentRow[]> = {
      일반: [],
      재무: [],
      학사: [],
      국제: [],
    };
    for (const r of INTENT_CATALOG) byCat[r.category].push(r);
    return byCat;
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
      role="dialog"
      aria-modal="true"
      aria-label="인텐트 목록 확인"
      onClick={onClose}
    >
      <div
        className="flex h-[min(90vh,780px)] w-[min(95vw,1100px)] flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[rgba(55,53,47,0.08)] px-6 pt-5 pb-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#37352f]">
              인텐트 목록 확인
            </h2>
            <p className="mt-1.5 text-[13px] leading-[20px] text-[rgba(55,53,47,0.72)]">
              현재 등록된 인텐트를 확인해 봤을 때,{' '}
              <span className="font-semibold text-[#37352f]">
                시험을 못 볼 경우와 관련한 인텐트는 존재하지 않아요.
              </span>
              <br />
              아래 시트를 살펴보고, 어떤 Work Type 으로 처리하면 좋을지 판단해
              보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[rgba(55,53,47,0.55)] hover:bg-[rgba(55,53,47,0.06)] hover:text-[#37352f]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab bar (bottom sheet-tab style, echoing Stage 3) */}
        <div className="flex shrink-0 items-center gap-0.5 border-b border-[#e0e0e0] bg-[#f8f9fa] px-3 py-1">
          {TABS.map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`relative flex shrink-0 items-center gap-1 whitespace-nowrap rounded-t-md px-3 py-1 text-[12px] ${
                  active
                    ? 'border-x border-t border-[#e0e0e0] bg-white font-medium text-[#3c4043]'
                    : 'text-[#5f6368] hover:bg-[rgba(60,64,67,0.06)]'
                }`}
                style={active ? { marginBottom: -1 } : undefined}
              >
                {TAB_ACCENT[t.id] !== 'transparent' ? (
                  <span
                    aria-hidden="true"
                    className="mr-1 inline-block h-2 w-2 rounded-full"
                    style={{ background: TAB_ACCENT[t.id] }}
                  />
                ) : null}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body — read-only sheet */}
        <div className="flex-1 overflow-auto bg-white">
          {activeTab === 'trigger' ? (
            <TriggerTable />
          ) : (
            <IntentTable rows={rowsByCategory[activeTab]} />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end border-t border-[rgba(55,53,47,0.08)] bg-white px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#FF9D00] px-4 py-1.5 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-[#E68E00]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function IntentTable({ rows }: { rows: IntentRow[] }) {
  return (
    <table
      className="w-full border-collapse text-[11pt] text-[#202124]"
      style={{ fontFamily: 'Roboto, Arial, sans-serif' }}
    >
      <thead className="sticky top-0 z-10">
        <tr>
          <Th width="46px">#</Th>
          <Th width="200px">Intent</Th>
          <Th width="260px">대표Sentence(참고용)</Th>
          <Th>Prompt</Th>
          <Th width="170px">created_at</Th>
          <Th width="120px">Note</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.intent}>
            <RowHeadCell>{i + 1}</RowHeadCell>
            <Td>
              <span className="font-medium">{r.intent}</span>
            </Td>
            <Td>{r.representativeSentence}</Td>
            <Td>
              <pre className="whitespace-pre-wrap font-sans text-[12px] leading-[18px] text-[#37352f]">
                {r.prompt}
              </pre>
            </Td>
            <Td>
              <span className="text-[12px] text-[#5f6368]">
                {formatCreatedAt(r.createdAt)}
              </span>
            </Td>
            <Td>{r.note ?? ''}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TriggerTable() {
  return (
    <table
      className="w-full border-collapse text-[11pt] text-[#202124]"
      style={{ fontFamily: 'Roboto, Arial, sans-serif' }}
    >
      <thead className="sticky top-0 z-10">
        <tr>
          <Th width="46px">#</Th>
          <Th width="220px">Intent</Th>
          <Th>Sentence</Th>
          <Th width="120px">Column1</Th>
        </tr>
      </thead>
      <tbody>
        {TRIGGER_SENTENCES.map((t, i) => (
          <tr key={`${t.intent}-${i}`}>
            <RowHeadCell>{i + 1}</RowHeadCell>
            <Td>
              <span className="font-medium">{t.intent}</span>
            </Td>
            <Td>{t.sentence}</Td>
            <Td>{t.column1 ?? ''}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ width, children }: { width?: string; children: React.ReactNode }) {
  return (
    <th
      className="border-b border-r border-[#e0e0e0] bg-[#f8f9fa] px-[6px] py-1 text-left text-[11px] font-normal text-[#5f6368]"
      style={width ? { width, minWidth: width } : undefined}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-r border-[#e0e0e0] bg-white px-[6px] py-[3px] align-top text-[13px]">
      {children}
    </td>
  );
}

function RowHeadCell({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-r border-[#e0e0e0] bg-[#f8f9fa] px-[6px] py-[3px] text-center align-top text-[11px] text-[#5f6368]">
      {children}
    </td>
  );
}
