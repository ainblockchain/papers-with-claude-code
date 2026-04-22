import { useEffect, type ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { probeImage, useImageDims } from './imageCache';

const URL_RE = /(https?:\/\/[^\s,)]+)/g;
const CODE_BLOCK_RE = /```[\w]*\n([\s\S]*?)```/g;
const INLINE_CODE_RE = /`([^`]+)`/g;
const IMAGE_RE = /^!\[([^\]]*)\]\(([^)]+)\)$/;
const YOUTUBE_RE =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})(?:[&?][\w=]*)*$/;

const ASSETS_BASE = 'https://raw.githubusercontent.com/ainblockchain/awesome-papers-with-claude-code/main/assets';

/** Render inline: bold, URLs, inline code */
export function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/).flatMap((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-b${i}`}>{part.slice(2, -2)}</strong>;
    }
    return part.split(INLINE_CODE_RE).map((seg, j) =>
      j % 2 === 1 ? (
        <code
          key={`${keyPrefix}-c${i}-${j}`}
          className="px-1 py-0.5 rounded bg-[#F3F4F6] text-[#1F2937] text-xs font-mono"
        >
          {seg}
        </code>
      ) : (
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

/** Check if a URL uses an allowed protocol (http/https only) */
function isAllowedMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Resolve image src: absolute URLs pass through, relative paths get ASSETS_BASE prefix */
function resolveImageSrc(src: string): string {
  if (/^https?:\/\//.test(src)) return src;
  return ASSETS_BASE ? `${ASSETS_BASE}/${src}` : src;
}

/** Image component that reserves space based on probed dimensions to avoid CLS */
function MarkdownImage({ alt, src }: { alt: string; src: string }) {
  const dims = useImageDims(src);

  useEffect(() => {
    probeImage(src);
  }, [src]);

  const aspectStyle = dims ? { aspectRatio: `${dims.w} / ${dims.h}` } : undefined;

  return (
    <figure className="my-4">
      <div
        className="w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
        style={aspectStyle}
      >
        {dims && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            width={dims.w}
            height={dims.h}
            loading="lazy"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>
      {alt && (
        <figcaption className="mt-1.5 text-xs text-gray-400 text-center italic">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}

/** Render a markdown image as a figure with optional caption */
function renderImage(alt: string, rawSrc: string, keyPrefix: string): ReactNode {
  const src = resolveImageSrc(rawSrc);
  if (/^https?:\/\//.test(src) && !isAllowedMediaUrl(src)) return null;
  return <MarkdownImage key={keyPrefix} alt={alt} src={src} />;
}

/** Render a YouTube video as a responsive 16:9 iframe embed */
function renderYouTubeEmbed(videoId: string, keyPrefix: string): ReactNode {
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}`;
  return (
    <div key={keyPrefix} className="my-4">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedUrl}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-presentation"
          loading="lazy"
          className="absolute inset-0 w-full h-full rounded-lg"
        />
      </div>
    </div>
  );
}

/** Render a single line with inline formatting */
export function renderLine(line: string, keyPrefix: string): ReactNode {
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
  if (line.startsWith('- ')) {
    return (
      <li key={keyPrefix} className="ml-4 list-disc list-outside">
        {renderInline(line.slice(2), `${keyPrefix}-li`)}
      </li>
    );
  }
  if (line.trim()) {
    return <span key={keyPrefix}>{renderInline(line, `${keyPrefix}-p`)}</span>;
  }
  return null;
}

/** Check if a line is a table row */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|');
}

/** Check if a line is a table separator */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return isTableRow(line) && /^\|[\s\-:|]+\|$/.test(trimmed);
}

/** Parse table cells from a row */
function parseTableCells(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
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
export function renderTextBlock(text: string, keyPrefix: string): ReactNode[] {
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

    if (line.startsWith('> ') || line === '>') {
      flushParagraph();
      flushList();
      flushTable();
      quoteLines.push(line);
    } else if (isTableRow(line)) {
      flushParagraph();
      flushList();
      flushBlockquote();
      tableLines.push(line);
    } else if (line.trim() === '---' || line.trim() === '***' || line.trim() === '___') {
      flushParagraph();
      flushList();
      flushTable();
      flushBlockquote();
      result.push(<hr key={lineKey} className="my-4 border-t border-gray-300" />);
    } else if (IMAGE_RE.test(line)) {
      flushParagraph();
      flushList();
      flushTable();
      flushBlockquote();
      const m = line.match(IMAGE_RE)!;
      const rendered = renderImage(m[1], m[2], lineKey);
      if (rendered) result.push(rendered);
    } else if (YOUTUBE_RE.test(line.trim())) {
      flushParagraph();
      flushList();
      flushTable();
      flushBlockquote();
      const m = line.trim().match(YOUTUBE_RE)!;
      result.push(renderYouTubeEmbed(m[1], lineKey));
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

/** Scan markdown content and return resolved image src URLs (line-anchored like the renderer). */
export function extractImageSrcs(text: string): string[] {
  const srcs: string[] = [];
  for (const line of text.split('\n')) {
    const m = line.match(IMAGE_RE);
    if (!m) continue;
    const src = resolveImageSrc(m[2]);
    if (/^https?:\/\//.test(src) && !isAllowedMediaUrl(src)) continue;
    srcs.push(src);
  }
  return srcs;
}

/** Render full content: code blocks, headers, lists, inline formatting */
export function renderContent(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIdx = 0;

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
