'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  heading: string;
  active: boolean;
  filled: boolean;
  disabled?: boolean;
  value: string | null;
  placeholder?: string;
  onSubmit: (value: string) => void;
  // When true, the editor is a contentEditable surface that accepts rich
  // paste (HTML tables stay as tables, TSV becomes a table). The submitted
  // value is an HTML string. Default is a plain <textarea>.
  rich?: boolean;
}

// Sanitize HTML for safe rendering — allow common block/inline tags and
// table elements, strip everything else (incl. event handlers, styles,
// scripts). Used on both paste (before inserting) and filled view (before
// innerHTML) to defend against clipboard-borne XSS.
const ALLOWED_TAGS = new Set([
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TH',
  'TD',
  'P',
  'BR',
  'DIV',
  'SPAN',
  'STRONG',
  'EM',
  'B',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
]);
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan']),
};

function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';
  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (!ALLOWED_TAGS.has(child.tagName)) {
        const text = child.textContent ?? '';
        const replacement = document.createTextNode(text);
        node.replaceChild(replacement, child);
        return;
      }
      const allow = ALLOWED_ATTRS[child.tagName] ?? new Set<string>();
      Array.from(child.attributes).forEach((attr) => {
        if (!allow.has(attr.name)) child.removeAttribute(attr.name);
      });
      walk(child);
    });
  };
  walk(doc.body);
  return doc.body.innerHTML;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Detect TSV: multi-line block where every line has the same non-zero tab
// count. Conservative — singles or inconsistent tab counts fall through.
function looksLikeTsv(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 1) return false;
  const counts = lines.map((l) => (l.match(/\t/g) || []).length);
  if (counts[0] < 1) return false;
  return counts.every((c) => c === counts[0]);
}

function tsvToHtmlTable(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return '';
  const rows = lines.map((l) => l.split('\t'));
  const [headers, ...data] = rows;
  const thead = `<thead><tr>${headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join('')}</tr></thead>`;
  const tbody =
    data.length > 0
      ? `<tbody>${data
          .map(
            (row) =>
              `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`,
          )
          .join('')}</tbody>`
      : '';
  return `<table>${thead}${tbody}</table>`;
}

// Tailwind styles for rendered tables / block content inside rich fields.
const RICH_PROSE_CLASS =
  // Keep small and Notion-tone. `::before` pseudo element provides the
  // placeholder when the editor is empty.
  `min-h-[112px] w-full rounded border border-[#FF9D00] bg-white px-3 py-2 text-sm text-[#37352f] outline-none focus:ring-2 focus:ring-[#FF9D00]/40 ` +
  `[&_table]:my-2 [&_table]:border-collapse ` +
  `[&_th]:border [&_th]:border-[rgba(55,53,47,0.16)] [&_th]:bg-[rgba(55,53,47,0.04)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold ` +
  `[&_td]:border [&_td]:border-[rgba(55,53,47,0.16)] [&_td]:px-2 [&_td]:py-1 [&_td]:align-top ` +
  `[&_p]:my-1`;

const RICH_READONLY_CLASS =
  `text-sm text-[#37352f] ` +
  `[&_table]:my-2 [&_table]:border-collapse ` +
  `[&_th]:border [&_th]:border-[rgba(55,53,47,0.16)] [&_th]:bg-[rgba(55,53,47,0.04)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-semibold ` +
  `[&_td]:border [&_td]:border-[rgba(55,53,47,0.16)] [&_td]:px-2 [&_td]:py-1 [&_td]:align-top ` +
  `[&_p]:my-1 whitespace-pre-wrap`;

export function BlockField({
  heading,
  active,
  filled,
  disabled,
  value,
  placeholder,
  onSubmit,
  rich,
}: Props) {
  const [draft, setDraft] = useState('');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Seed the contentEditable on mount (active transition) so pre-existing
  // value or prior draft is preserved when the field re-enters active state.
  useEffect(() => {
    if (!rich || !active || !editorRef.current) return;
    if (!editorRef.current.innerHTML) {
      editorRef.current.innerHTML = sanitizeHtml(value ?? '');
      setIsEmpty(!editorRef.current.textContent?.trim());
    }
  }, [rich, active, value]);

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    // Prefer rich HTML when it contains a <table> — insert sanitized version.
    if (html) {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (doc.querySelector('table')) {
        e.preventDefault();
        insertHtmlAtCursor(sanitizeHtml(doc.body.innerHTML));
        setIsEmpty(!editorRef.current?.textContent?.trim());
        return;
      }
    }
    // Fall back to TSV detection in plain text — build a table.
    if (text && looksLikeTsv(text)) {
      e.preventDefault();
      insertHtmlAtCursor(tsvToHtmlTable(text));
      setIsEmpty(!editorRef.current?.textContent?.trim());
      return;
    }
    // Otherwise let the browser paste as plain text (normalised — strip HTML).
    if (text) {
      e.preventDefault();
      insertHtmlAtCursor(escapeHtml(text).replace(/\r?\n/g, '<br>'));
      setIsEmpty(!editorRef.current?.textContent?.trim());
    }
  };

  const handleSubmit = () => {
    if (disabled) return;
    if (rich) {
      const el = editorRef.current;
      if (!el) return;
      const content = el.innerHTML.trim();
      const plain = el.textContent?.trim() ?? '';
      if (!plain) return;
      onSubmit(sanitizeHtml(content));
    } else if (draft.trim()) {
      onSubmit(draft.trim());
    }
  };

  return (
    <div className="px-0 pt-[22px] pb-1">
      <h2 className="pb-1.5 text-[1.25em] font-semibold leading-[1.3] text-[#37352f]">
        {heading}
      </h2>
      {filled ? (
        rich ? (
          <div
            className={RICH_READONLY_CLASS}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(value ?? '') }}
          />
        ) : (
          <div className="text-sm text-[#37352f] whitespace-pre-wrap">
            {value}
          </div>
        )
      ) : !active ? (
        <div className="text-sm text-gray-300 italic">
          {placeholder ?? '이 스테이지에서 작성합니다.'}
        </div>
      ) : rich ? (
        <div>
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable={!disabled}
              suppressContentEditableWarning
              onPaste={handlePaste}
              onInput={() =>
                setIsEmpty(!editorRef.current?.textContent?.trim())
              }
              onKeyDown={(e) => {
                if (disabled) return;
                if (
                  e.key === 'Enter' &&
                  (e.metaKey || e.ctrlKey) &&
                  editorRef.current?.textContent?.trim()
                ) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className={RICH_PROSE_CLASS}
            />
            {isEmpty ? (
              <div className="pointer-events-none absolute left-3 top-2 text-sm italic text-gray-300">
                {placeholder ?? '이 스테이지에서 작성합니다.'}
              </div>
            ) : null}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-[11px] text-gray-400">
              {disabled
                ? '검증 중…'
                : '텍스트 혹은 테이블을 붙여넣을 수 있어요. Cmd/Ctrl + Enter로 제출.'}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isEmpty || disabled}
              className="rounded bg-[#FF9D00] px-3 py-1 text-xs text-white disabled:opacity-30"
            >
              {disabled ? '검증 중…' : '제출'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && draft.trim()) {
                onSubmit(draft.trim());
              }
            }}
            placeholder={placeholder}
            rows={5}
            className="w-full bg-white border border-[#FF9D00] rounded px-3 py-2 text-sm text-[#37352f] outline-none focus:ring-2 focus:ring-[#FF9D00]/40 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <div className="text-[11px] text-gray-400">
              {disabled ? '검증 중…' : 'Cmd/Ctrl + Enter로 제출'}
            </div>
            <button
              onClick={() => !disabled && draft.trim() && onSubmit(draft.trim())}
              disabled={!draft.trim() || disabled}
              className="px-3 py-1 bg-[#FF9D00] disabled:opacity-30 text-white rounded text-xs"
            >
              {disabled ? '검증 중…' : '제출'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Insert HTML at the caret inside the currently focused contentEditable.
// Falls back to innerHTML append if there's no selection (e.g. first paste
// before the user clicks into the editor).
function insertHtmlAtCursor(html: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    // No selection — append to the focused contentEditable if any.
    const el = document.activeElement;
    if (el && (el as HTMLElement).isContentEditable) {
      (el as HTMLElement).innerHTML += html;
    }
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const frag = document.createDocumentFragment();
  let lastNode: ChildNode | null = null;
  while (wrap.firstChild) {
    lastNode = wrap.firstChild;
    frag.appendChild(lastNode);
  }
  range.insertNode(frag);
  if (lastNode) {
    const after = document.createRange();
    after.setStartAfter(lastNode);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }
}
