'use client';

import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLearningStore } from '@/stores/useLearningStore';
import { renderContent } from '@/lib/markdown/renderer';
import { splitContentIntoPages } from '@/lib/markdown/splitPages';
import { cn } from '@/lib/utils';

export function ConceptOverlay() {
  const { stages, currentStageIndex, activeConceptId, setActiveConcept, markConceptViewed } = useLearningStore();

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStage = stages[currentStageIndex];
  const concept = currentStage?.concepts.find((c) => c.id === activeConceptId);
  const pages = useMemo(() => (concept ? splitContentIntoPages(concept.content) : []), [concept]);
  const isMultiPage = pages.length > 1;
  const isLastPage = currentPageIndex >= pages.length - 1;
  const isFirstPage = currentPageIndex === 0;

  // Reset page index when concept changes
  useEffect(() => {
    setCurrentPageIndex(0);
    setDirection('forward');
    setAnimKey((k) => k + 1);
  }, [activeConceptId]);

  // Scroll to top on page change
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (viewport) viewport.scrollTop = 0;
  }, [currentPageIndex]);

  const close = useCallback(() => {
    setActiveConcept(null);
  }, [setActiveConcept]);

  const gotIt = useCallback(() => {
    if (activeConceptId) markConceptViewed(activeConceptId);
    setActiveConcept(null);
  }, [activeConceptId, setActiveConcept, markConceptViewed]);

  const goNext = useCallback(() => {
    if (!isLastPage) {
      setDirection('forward');
      setCurrentPageIndex((i) => i + 1);
      setAnimKey((k) => k + 1);
    }
  }, [isLastPage]);

  const goPrev = useCallback(() => {
    if (!isFirstPage) {
      setDirection('backward');
      setCurrentPageIndex((i) => i - 1);
      setAnimKey((k) => k + 1);
    }
  }, [isFirstPage]);

  const goToPage = useCallback((index: number) => {
    setDirection(index > currentPageIndex ? 'forward' : 'backward');
    setCurrentPageIndex(index);
    setAnimKey((k) => k + 1);
  }, [currentPageIndex]);

  // Keyboard: Escape, Left, Right
  useEffect(() => {
    if (!activeConceptId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === 'ArrowLeft' && isMultiPage) {
        e.preventDefault();
        e.stopPropagation();
        goPrev();
      } else if (e.key === 'ArrowRight' && isMultiPage) {
        e.preventDefault();
        e.stopPropagation();
        goNext();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [activeConceptId, close, goNext, goPrev, isMultiPage]);

  if (!currentStage || !activeConceptId || !concept || pages.length === 0) return null;

  const currentPage = pages[currentPageIndex];

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#1F2937] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-white font-bold text-base truncate">{concept.title}</h2>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {isMultiPage && (
            <span className="text-gray-400 text-sm">
              {currentPageIndex + 1} / {pages.length}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={close}
            className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1 min-h-0 bg-white">
        {/* Sidebar TOC — hidden below lg */}
        {isMultiPage && (
          <nav className="hidden lg:flex flex-col w-56 shrink-0 border-r border-gray-200 bg-gray-50 py-4 overflow-y-auto">
            <span className="px-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Contents
            </span>
            {pages.map((page, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-left text-sm transition-colors',
                  i === currentPageIndex
                    ? 'bg-white border-l-2 border-[#FF9D00] text-[#1F2937] font-medium'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-l-2 border-transparent'
                )}
              >
                {i < currentPageIndex && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
                <span className="truncate">{page.title}</span>
              </button>
            ))}
          </nav>
        )}

        {/* Content Area */}
        <ScrollArea ref={scrollRef} className="flex-1">
          <div className="flex justify-center px-6 py-8">
            <div
              key={animKey}
              className={cn(
                'w-full max-w-2xl',
                direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'
              )}
            >
              <div className="text-sm text-[#374151] leading-relaxed">
                {renderContent(currentPage.content)}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        {/* Previous */}
        <div className="w-28">
          {isMultiPage && !isFirstPage && (
            <Button
              variant="outline"
              size="sm"
              onClick={goPrev}
              className="gap-1 text-gray-600"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
          )}
        </div>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {isMultiPage &&
            pages.map((_, i) => (
              <button
                key={i}
                onClick={() => goToPage(i)}
                className={cn(
                  'rounded-full transition-all',
                  i === currentPageIndex
                    ? 'w-2.5 h-2.5 bg-[#FF9D00]'
                    : i < currentPageIndex
                      ? 'w-2 h-2 bg-emerald-400'
                      : 'w-2 h-2 bg-gray-300'
                )}
              />
            ))}
        </div>

        {/* Next / Got it */}
        <div className="w-28 flex justify-end">
          {isLastPage ? (
            <Button
              size="sm"
              onClick={gotIt}
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white"
            >
              Got it!
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={goNext}
              className="gap-1 text-gray-600"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
