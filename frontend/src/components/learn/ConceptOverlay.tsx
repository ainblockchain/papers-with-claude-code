'use client';

import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLearningStore } from '@/stores/useLearningStore';
import { renderContent, extractImageSrcs } from '@/lib/markdown/renderer';
import { preloadImages } from '@/lib/markdown/imageCache';
import { buildFlatPageList, type FlatPage } from '@/lib/markdown/splitPages';
import { cn } from '@/lib/utils';

export function ConceptOverlay() {
  const {
    stages,
    currentStageIndex,
    activeConceptId,
    setActiveConcept,
    markConceptViewed,
  } = useLearningStore();

  const [currentFlatIndex, setCurrentFlatIndex] = useState(0);
  const [expandedConcepts, setExpandedConcepts] = useState<Set<string>>(new Set());
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentStage = stages[currentStageIndex];

  // Build flat page list from all concepts in the stage
  const flatPages = useMemo<FlatPage[]>(
    () => (currentStage ? buildFlatPageList(currentStage.concepts) : []),
    [currentStage],
  );

  // Derive current state
  const currentPage = flatPages[currentFlatIndex] as FlatPage | undefined;
  const isFirstPage = currentFlatIndex === 0;
  const isLastPage = currentFlatIndex >= flatPages.length - 1;

  // Concept boundaries: { conceptId → { start, end } } for sidebar & dot grouping
  const conceptBounds = useMemo(() => {
    const bounds = new Map<string, { start: number; end: number }>();
    for (const page of flatPages) {
      const existing = bounds.get(page.conceptId);
      if (!existing) {
        bounds.set(page.conceptId, { start: page.flatIndex, end: page.flatIndex });
      } else {
        existing.end = page.flatIndex;
      }
    }
    return bounds;
  }, [flatPages]);

  // Unique concept list (preserving order)
  const conceptList = useMemo(() => {
    const seen = new Set<string>();
    return flatPages
      .filter((p) => {
        if (seen.has(p.conceptId)) return false;
        seen.add(p.conceptId);
        return true;
      })
      .map((p) => ({
        id: p.conceptId,
        title: p.conceptTitle,
        index: p.conceptIndex,
      }));
  }, [flatPages]);

  // Reset to the target concept when activeConceptId changes
  useEffect(() => {
    if (!activeConceptId || flatPages.length === 0) return;
    const targetIndex = flatPages.findIndex((p) => p.conceptId === activeConceptId);
    if (targetIndex >= 0) {
      setCurrentFlatIndex(targetIndex);
      setExpandedConcepts(new Set([activeConceptId]));
      setDirection('forward');
      setAnimKey((k) => k + 1);
    }
  }, [activeConceptId, flatPages]);

  // Scroll content to top on page change
  useEffect(() => {
    const viewport = scrollRef.current?.querySelector('[data-slot="scroll-area-viewport"]');
    if (viewport) viewport.scrollTop = 0;
  }, [currentFlatIndex]);

  // Preload image dimensions for all pages in the stage so navigation is shift-free
  useEffect(() => {
    if (flatPages.length === 0) return;
    const srcs = flatPages.flatMap((p) => extractImageSrcs(p.pageContent));
    if (srcs.length > 0) preloadImages(srcs);
  }, [flatPages]);

  // --- Navigation ---

  const close = useCallback(() => {
    setActiveConcept(null);
  }, [setActiveConcept]);

  const gotIt = useCallback(() => {
    // Mark all concepts in this stage as viewed
    if (currentStage) {
      for (const concept of currentStage.concepts) {
        markConceptViewed(concept.id);
      }
    }
    setActiveConcept(null);
  }, [currentStage, markConceptViewed, setActiveConcept]);

  const goNext = useCallback(() => {
    if (isLastPage) return;
    const prevPage = flatPages[currentFlatIndex];
    const nextPage = flatPages[currentFlatIndex + 1];
    // Auto-expand the new concept when crossing boundary
    if (prevPage && nextPage && prevPage.conceptId !== nextPage.conceptId) {
      setExpandedConcepts((prev) => new Set(prev).add(nextPage.conceptId));
    }
    setDirection('forward');
    setCurrentFlatIndex((i) => i + 1);
    setAnimKey((k) => k + 1);
  }, [isLastPage, flatPages, currentFlatIndex]);

  const goPrev = useCallback(() => {
    if (isFirstPage) return;
    setDirection('backward');
    setCurrentFlatIndex((i) => i - 1);
    setAnimKey((k) => k + 1);
  }, [isFirstPage]);

  const goToFlatIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= flatPages.length) return;
      setDirection(index > currentFlatIndex ? 'forward' : 'backward');
      setCurrentFlatIndex(index);
      setAnimKey((k) => k + 1);
    },
    [currentFlatIndex, flatPages.length],
  );

  // Toggle a concept's expanded state in the sidebar
  const toggleConcept = useCallback(
    (conceptId: string) => {
      setExpandedConcepts((prev) => {
        const next = new Set(prev);
        if (next.has(conceptId)) {
          next.delete(conceptId);
        } else {
          next.add(conceptId);
          // Navigate to first page of this concept when expanding
          const bounds = conceptBounds.get(conceptId);
          if (bounds) goToFlatIndex(bounds.start);
        }
        return next;
      });
    },
    [conceptBounds, goToFlatIndex],
  );

  // Keyboard: Escape, Left, Right
  useEffect(() => {
    if (!activeConceptId) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        goNext();
      }
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [activeConceptId, close, goNext, goPrev]);

  // --- Early return ---

  if (!currentStage || !activeConceptId || !currentPage || flatPages.length === 0) return null;

  // --- Dot indicators: group by concept ---
  const useCompactDots = flatPages.length > 15;

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#1F2937] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-white font-bold text-base truncate">
            {currentStage.title}
          </h2>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-gray-400 text-sm">
            {currentFlatIndex + 1} / {flatPages.length}
          </span>
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
        {/* Accordion Sidebar — hidden below lg */}
        <nav className="hidden lg:flex flex-col w-60 shrink-0 border-r border-gray-200 bg-gray-50 py-4 overflow-y-auto">
          <span className="px-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Contents
          </span>
          {conceptList.map((concept) => {
            const bounds = conceptBounds.get(concept.id);
            if (!bounds) return null;
            const isExpanded = expandedConcepts.has(concept.id);
            const isActiveConcept = currentPage.conceptId === concept.id;

            // Collect pages for this concept
            const conceptPages = flatPages.slice(bounds.start, bounds.end + 1);

            return (
              <div key={concept.id}>
                {/* Concept header (accordion trigger) */}
                <button
                  onClick={() => toggleConcept(concept.id)}
                  className={cn(
                    'flex items-center gap-2 w-full px-4 py-2 text-left text-sm transition-colors border-l-2',
                    isActiveConcept
                      ? 'bg-white border-[#FF9D00] text-[#1F2937] font-medium'
                      : isExpanded
                        ? 'bg-gray-100 border-gray-300 text-[#1F2937] font-medium'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 transition-transform',
                      isExpanded ? 'rotate-0' : '-rotate-90',
                    )}
                  />
                  <span className="truncate">{concept.title}</span>
                </button>

                {/* Pages (expanded content) */}
                {isExpanded && (
                  <div className="ml-4 border-l border-gray-200">
                    {conceptPages.map((page) => {
                      const isCurrent = page.flatIndex === currentFlatIndex;
                      return (
                        <button
                          key={page.flatIndex}
                          onClick={() => goToFlatIndex(page.flatIndex)}
                          className={cn(
                            'flex items-center gap-2 w-full pl-4 pr-4 py-1.5 text-left text-xs transition-colors',
                            isCurrent
                              ? 'text-[#FF9D00] font-medium bg-orange-50'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
                          )}
                        >
                          <span className="truncate">{page.pageTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Content Area */}
        <ScrollArea ref={scrollRef} className="flex-1">
          <div className="flex justify-center px-6 py-8">
            <div
              key={animKey}
              className={cn(
                'w-full max-w-2xl',
                direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left',
              )}
            >
              {/* Concept title badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {currentPage.conceptTitle}
                </span>
                {currentPage.totalPagesInConcept > 1 && (
                  <span className="text-xs text-gray-400">
                    {currentPage.pageIndexInConcept + 1} / {currentPage.totalPagesInConcept}
                  </span>
                )}
              </div>
              <div className="text-sm text-[#374151] leading-relaxed">
                {renderContent(currentPage.pageContent)}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200 shrink-0">
        {/* Previous */}
        <div className="w-28">
          {!isFirstPage && (
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

        {/* Dot indicators — grouped by concept */}
        <div className="flex items-center gap-1">
          {useCompactDots
            ? // Compact: one dot per concept
              conceptList.map((concept) => {
                const bounds = conceptBounds.get(concept.id);
                if (!bounds) return null;
                const isCurrent =
                  currentFlatIndex >= bounds.start && currentFlatIndex <= bounds.end;
                return (
                  <button
                    key={concept.id}
                    onClick={() => goToFlatIndex(bounds.start)}
                    className={cn(
                      'rounded-full transition-all',
                      isCurrent
                        ? 'w-3 h-3 bg-[#FF9D00]'
                        : 'w-2.5 h-2.5 bg-gray-300',
                    )}
                  />
                );
              })
            : // Full: one dot per page, grouped
              conceptList.map((concept, ci) => {
                const bounds = conceptBounds.get(concept.id);
                if (!bounds) return null;
                const pages = flatPages.slice(bounds.start, bounds.end + 1);
                return (
                  <div key={concept.id} className={cn('flex items-center gap-1', ci > 0 && 'ml-1.5')}>
                    {pages.map((page) => {
                      const isCurrent = page.flatIndex === currentFlatIndex;
                      return (
                        <button
                          key={page.flatIndex}
                          onClick={() => goToFlatIndex(page.flatIndex)}
                          className={cn(
                            'rounded-full transition-all',
                            isCurrent
                              ? 'w-2.5 h-2.5 bg-[#FF9D00]'
                              : 'w-2 h-2 bg-gray-300',
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
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
