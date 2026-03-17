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

/** Render full content: code blocks + inline formatting */
function renderContent(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let lastIdx = 0;

  for (const match of text.matchAll(CODE_BLOCK_RE)) {
    const before = text.slice(lastIdx, match.index);
    if (before) parts.push(...renderInline(before, `t${lastIdx}`));
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
  if (remaining) parts.push(...renderInline(remaining, `t${lastIdx}`));
  return parts;
}

export function ConceptOverlay() {
  const { stages, currentStageIndex, activeConceptId, setActiveConcept, markConceptViewed } = useLearningStore();

  const close = useCallback(() => {
    if (activeConceptId) markConceptViewed(activeConceptId);
    setActiveConcept(null);
  }, [activeConceptId, setActiveConcept, markConceptViewed]);

  useEffect(() => {
    if (!activeConceptId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
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
            onClick={() => setActiveConcept(null)}
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
            onClick={() => setActiveConcept(null)}
            className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white"
          >
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
}
