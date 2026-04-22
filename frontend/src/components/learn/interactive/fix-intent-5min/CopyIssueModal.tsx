'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Info, X } from 'lucide-react';
import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';
import {
  MB_CARD,
  MB_FONT,
  MB_ROW_DIVIDER,
  MB_TEXT_PRIMARY,
  MB_TEXT_SECONDARY,
  MB_TEXT_TERTIARY,
} from './DashboardView';

interface Props {
  intent: SelectedIntent;
  onClose: () => void;
}

// Write a table to the clipboard in both rich (text/html) and plain
// (markdown) flavors. Rich paste targets (Notion, Docs, Sheets) render a
// real table; plain <textarea> targets get a markdown table that still
// reads as tabular. Falls back to writeText when the multi-format API
// isn't available.
async function writeRichClipboard(
  html: string,
  markdown: string,
): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([markdown], { type: 'text/plain' }),
        }),
      ]);
      return true;
    }
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch {
    return false;
  }
}

// Almost-fullscreen modal that mirrors the DashboardView look 1:1 and
// presents the representative broken-intent row as a single-row table so
// the learner can select / copy the text into their 문제 상황 분석 block.
export function CopyIssueModal({ intent, onClose }: Props) {
  const { row } = intent;
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Esc; focus the dialog on mount so Esc is immediately wired.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    containerRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = async () => {
    // Dual-format clipboard — rich HTML table for rich-paste targets, AND
    // tab-separated plain text (TSV) for targets that only accept text.
    // Notion/Sheets/Docs both auto-detect TSV and build a real table from
    // it; a plain <textarea> shows tabs as whitespace (not a table, but
    // still tabular if we later upgrade the editor).
    const escHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const tsvCell = (s: string) =>
      s.replace(/\t/g, ' ').replace(/\r?\n+/g, ' ');

    const headers = [
      'Session ID',
      'Created At',
      'Intent',
      'User: Message',
      'Assistant: Contents',
    ];
    const values = [
      row.sessionId,
      row.createdAt,
      row.intent,
      row.userMessage,
      row.assistantContent,
    ];

    const html = `<table><thead><tr>${headers
      .map((h) => `<th>${escHtml(h)}</th>`)
      .join('')}</tr></thead><tbody><tr>${values
      .map((v) => `<td>${escHtml(v)}</td>`)
      .join('')}</tr></tbody></table>`;
    // TSV: tab between columns, newline between header row and data row.
    const tsv = `${headers.map(tsvCell).join('\t')}\n${values
      .map(tsvCell)
      .join('\t')}`;

    const ok = await writeRichClipboard(html, tsv);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="발견한 이슈 복사"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`flex h-[min(90vh,820px)] w-[min(95vw,1200px)] flex-col overflow-hidden rounded-[10px] bg-[#F9F9FA] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] ${MB_FONT} ${MB_TEXT_PRIMARY}`}
      >
        {/* Dashboard header clone */}
        <header
          className={`flex items-center justify-between border-b px-6 pt-5 pb-3 ${MB_ROW_DIVIDER}`}
        >
          <h2 className="text-[21px] font-bold leading-tight">
            hanyang-agent-production — 발견한 이슈
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-colors ${
                copied
                  ? 'border border-[#BFDBBF] bg-[#DBEDDB] text-[#448361]'
                  : 'bg-[#FF9D00] text-white hover:bg-[#E68E00]'
              }`}
            >
              {copied ? (
                <Check size={14} />
              ) : (
                <Copy size={14} />
              )}
              {copied ? '복사됨' : '전체 복사'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[rgba(7,23,34,0.55)] hover:bg-[rgba(7,23,34,0.06)] hover:text-[rgba(7,23,34,0.84)]"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Canvas — single-row table inside the same Metabase card */}
        <main className="flex flex-1 flex-col gap-3 overflow-auto px-6 py-4">
          <section className={`flex flex-1 flex-col overflow-hidden ${MB_CARD}`}>
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`truncate text-[13px] font-bold ${MB_TEXT_PRIMARY}`}
                >
                  All chats in table view
                </span>
                <span
                  role="img"
                  aria-label="Info"
                  className={`pointer-events-none inline-flex items-center justify-center select-none ${MB_TEXT_TERTIARY}`}
                >
                  <Info size={13} />
                </span>
              </div>
              <div className={`text-[11px] ${MB_TEXT_TERTIARY}`}>
                텍스트를 드래그해서 본문에 붙여넣으세요
              </div>
            </div>
            <div
              className={`mb-scrollbar flex-1 overflow-auto border-t ${MB_ROW_DIVIDER} select-text`}
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
                  <tr>
                    <td
                      className={`border-b ${MB_ROW_DIVIDER} px-3 py-3 pl-6 font-mono text-[12px] ${MB_TEXT_SECONDARY} whitespace-nowrap align-top`}
                    >
                      {row.sessionId}
                    </td>
                    <td
                      className={`border-b ${MB_ROW_DIVIDER} px-3 py-3 ${MB_TEXT_SECONDARY} whitespace-nowrap align-top`}
                    >
                      {row.createdAt}
                    </td>
                    <td
                      className={`border-b ${MB_ROW_DIVIDER} px-3 py-3 font-medium ${MB_TEXT_PRIMARY} whitespace-nowrap align-top`}
                    >
                      {row.intent}
                    </td>
                    <td
                      className={`border-b ${MB_ROW_DIVIDER} px-3 py-3 ${MB_TEXT_PRIMARY} align-top`}
                    >
                      {row.userMessage}
                    </td>
                    <td
                      className={`border-b ${MB_ROW_DIVIDER} px-3 py-3 ${MB_TEXT_SECONDARY} whitespace-pre-wrap break-words align-top`}
                    >
                      {row.assistantContent}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div
              className={`border-t ${MB_ROW_DIVIDER} px-6 py-2 text-[11px] ${MB_TEXT_TERTIARY}`}
            >
              처음 1행 표시 중
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
