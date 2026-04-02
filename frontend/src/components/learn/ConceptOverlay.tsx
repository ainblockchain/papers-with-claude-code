'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningStore } from '@/stores/useLearningStore';

const URL_RE = /(https?:\/\/[^\s,)]+)/g;
const CODE_BLOCK_RE = /```[\w]*\n([\s\S]*?)```/g;
const INLINE_CODE_RE = /`([^`]+)`/g;

/** Render inline: bold, URLs, inline code */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  // 1) split by bold
  return text.split(/(\*\*[^*]+\*\*)/).flatMap((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
    }
    // 2) split by inline code
    return part.split(INLINE_CODE_RE).map((seg, j) =>
      j % 2 === 1 ? (
        <code
          key={`${keyPrefix}-c${i}-${j}`}
          className="px-1 py-0.5 rounded bg-[#F3F4F6] text-[#1F2937] text-xs font-mono"
        >
          {seg}
        </code>
      ) : (
        // 3) split by URLs
        seg.split(URL_RE).map((urlSeg, k) =>
          URL_RE.test(urlSeg) ? (
            <a
              key={`${keyPrefix}-u${i}-${j}-${k}`}
              href={urlSeg}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#7C3AED] text-xs font-medium no-underline transition-colors hover:bg-[#E5E7EB]"
            >
              {urlSeg.replace(/^https?:\/\//, '')}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          ) : urlSeg
        )
      )
    );
  });
}

/** Render a single line with inline formatting */
function renderLine(line: string, keyPrefix: string): ReactNode {
  // Check for headers
  if (line.startsWith('### ')) {
    return (
      <h4 key={keyPrefix} className="text-sm font-bold text-[#1F2937] mt-3 mb-1">
        {renderInline(line.slice(4), `${keyPrefix}-h4`)}
      </h4>
    );
  }
  if (line.startsWith('## ')) {
    return (
      <h3 key={keyPrefix} className="text-base font-bold text-[#1F2937] mt-4 mb-2">
        {renderInline(line.slice(3), `${keyPrefix}-h3`)}
      </h3>
    );
  }
  // Check for bullet list items
  if (line.startsWith('- ')) {
    return (
      <li key={keyPrefix} className="ml-4 list-disc list-outside">
        {renderInline(line.slice(2), `${keyPrefix}-li`)}
      </li>
    );
  }
  // Regular paragraph line
  if (line.trim()) {
    return <span key={keyPrefix}>{renderInline(line, `${keyPrefix}-p`)}</span>;
  }
  return null;
}

/** Render full content: code blocks, headers, lists, inline formatting */
function renderContent(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIdx = 0;

  // First extract code blocks
  for (const match of text.matchAll(CODE_BLOCK_RE)) {
    const before = text.slice(lastIdx, match.index);
    if (before) {
      parts.push(...renderTextBlock(before, `t${lastIdx}`));
    }
    parts.push(
      <pre
        key={`code-${match.index}`}
        className="my-2 p-3 rounded-lg bg-[#1F2937] text-[#E5E7EB] text-xs font-mono overflow-x-auto whitespace-pre"
      >
        {match[1]}
      </pre>
    );
    lastIdx = match.index! + match[0].length;
  }

  const remaining = text.slice(lastIdx);
  if (remaining) {
    parts.push(...renderTextBlock(remaining, `t${lastIdx}`));
  }
  return parts;
}

/** Check if a line is a table row */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

/** Check if a line is a table separator (|---|---|) */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return isTableRow(line) && /^\|[\s\-:|]+\|$/.test(trimmed);
}

/** Parse table cells from a row */
function parseTableCells(line: string): string[] {
  return line
    .trim()
    .slice(1, -1) // Remove leading and trailing |
    .split('|')
    .map((cell) => cell.trim());
}

/** Render a markdown table */
function renderTable(tableLines: string[], keyPrefix: string): ReactNode {
  const rows = tableLines.filter((line) => !isTableSeparator(line));
  if (rows.length === 0) return null;

  const headerCells = parseTableCells(rows[0]);
  const bodyRows = rows.slice(1);

  return (
    <div key={keyPrefix} className="my-3 overflow-x-auto">
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {headerCells.map((cell, i) => (
              <th
                key={`${keyPrefix}-th-${i}`}
                className="px-2 py-1.5 text-left font-semibold text-gray-700 border border-gray-300"
              >
                {renderInline(cell, `${keyPrefix}-th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIdx) => {
            const cells = parseTableCells(row);
            return (
              <tr key={`${keyPrefix}-tr-${rowIdx}`} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {cells.map((cell, cellIdx) => (
                  <td
                    key={`${keyPrefix}-td-${rowIdx}-${cellIdx}`}
                    className="px-2 py-1.5 text-gray-600 border border-gray-300"
                  >
                    {renderInline(cell, `${keyPrefix}-td-${rowIdx}-${cellIdx}`)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Render a blockquote */
function renderBlockquote(quoteLines: string[], keyPrefix: string): ReactNode {
  const content = quoteLines
    .map((line) => line.replace(/^>\s?/, ''))
    .join('\n');

  return (
    <blockquote
      key={keyPrefix}
      className="my-3 pl-3 border-l-4 border-[#7C3AED] bg-[#F9FAFB] py-2 pr-3 text-gray-600 italic"
    >
      {renderTextBlock(content, `${keyPrefix}-bq`)}
    </blockquote>
  );
}

/** Render a text block (without code blocks) into headers, lists, tables, blockquotes, paragraphs */
function renderTextBlock(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split('\n');
  const result: ReactNode[] = [];
  let listItems: ReactNode[] = [];
  let paragraphLines: ReactNode[] = [];
  let tableLines: string[] = [];
  let quoteLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      result.push(
        <p key={`${keyPrefix}-para-${result.length}`} className="mb-2">
          {paragraphLines}
        </p>
      );
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      result.push(
        <ul key={`${keyPrefix}-ul-${result.length}`} className="mb-2 space-y-0.5">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableLines.length > 0) {
      result.push(renderTable(tableLines, `${keyPrefix}-table-${result.length}`));
      tableLines = [];
    }
  };

  const flushBlockquote = () => {
    if (quoteLines.length > 0) {
      result.push(renderBlockquote(quoteLines, `${keyPrefix}-quote-${result.length}`));
      quoteLines = [];
    }
  };

  lines.forEach((line, i) => {
    const lineKey = `${keyPrefix}-l${i}`;

    // Blockquote
    if (line.startsWith('> ') || line === '>') {
      flushParagraph();
      flushList();
      flushTable();
      quoteLines.push(line);
    }
    // Table row
    else if (isTableRow(line)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      tableLines.push(line);
    }
    // Horizontal rule
    else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      flushParagraph();
      flushList();
      flushTable();
      flushBlockquote();
      result.push(<hr key={lineKey} className="my-4 border-t border-gray-300" />);
    } else if (line.startsWith('## ') || line.startsWith('### ')) {
      flushParagraph();
      flushList();
      flushTable();
      flushBlockquote();
      result.push(renderLine(line, lineKey));
    } else if (line.startsWith('- ')) {
      flushParagraph();
      flushTable();
      flushBlockquote();
      listItems.push(renderLine(line, lineKey));
    } else if (line.trim() === '') {
      flushParagraph();
      flushList();
      flushTable();
      flushBlockquote();
    } else {
      flushList();
      flushTable();
      flushBlockquote();
      const rendered = renderLine(line, lineKey);
      if (rendered) {
        if (paragraphLines.length > 0) {
          paragraphLines.push(' ');
        }
        paragraphLines.push(rendered);
      }
    }
  });

  flushParagraph();
  flushList();
  flushTable();
  flushBlockquote();

  return result;
}

export function ConceptOverlay() {
  const { stages, currentStageIndex, activeConceptId, setActiveConcept, markConceptViewed } = useLearningStore();

  const close = useCallback(() => {
    setActiveConcept(null);
  }, [setActiveConcept]);

  const gotIt = useCallback(() => {
    if (activeConceptId) markConceptViewed(activeConceptId);
    setActiveConcept(null);
  }, [activeConceptId, setActiveConcept, markConceptViewed]);

  useEffect(() => {
    if (!activeConceptId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [activeConceptId, close]);

  const currentStage = stages[currentStageIndex];
  if (!currentStage || !activeConceptId) return null;

  const concept = currentStage.concepts.find((c) => c.id === activeConceptId);
  if (!concept) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 bg-[#1F2937] shrink-0">
          <h3 className="text-white font-bold text-sm">{concept.title}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="h-6 w-6 p-0 text-white hover:bg-white/20 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto min-h-0">
          <div className="text-sm text-[#374151] whitespace-pre-wrap">
            {renderContent(concept.content)}
          </div>
        </div>
        <div className="px-4 pb-4 shrink-0">
          <Button
            size="sm"
            onClick={gotIt}
            className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white"
          >
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}
