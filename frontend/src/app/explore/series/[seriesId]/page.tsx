'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PaperCard } from '@/components/explore/PaperCard';
import { PurchaseModal } from '@/components/purchase/PurchaseModal';
import { useSeries } from '@/hooks/useSeries';
import { useCourses } from '@/hooks/useCourses';
import type { Paper } from '@/types/paper';

import { usePurchaseStore } from '@/stores/usePurchaseStore';

const ASSETS_BASE = process.env.NEXT_PUBLIC_COURSE_ASSETS_BASE_URL || '';

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const measuredRef = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = measuredRef.current;
    if (!el) return;
    // line-clamp-3 height vs actual content height
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
    setOverflows(el.scrollHeight > lineHeight * 3 + 1);
  }, [text]);

  return (
    <div className="mt-2 max-w-2xl">
      <p
        ref={measuredRef}
        className={cn(
          'text-sm text-[#6B7280]',
          !expanded && overflows && 'line-clamp-2'
        )}
      >
        {text}
      </p>
      {overflows && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-[#FF9D00] hover:underline mt-0.5"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function LanguageTabs({ lang, setLang, enCount, koCount }: {
  lang: 'en' | 'ko';
  setLang: (l: 'en' | 'ko') => void;
  enCount: number;
  koCount: number;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-[#E5E7EB] mb-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLang('en')}
        className={cn(
          'text-sm rounded-none border-b-2 -mb-px px-4',
          lang === 'en'
            ? 'font-semibold text-[#111827] border-[#FF9D00]'
            : 'text-[#6B7280] border-transparent hover:text-[#111827]'
        )}
      >
        English ({enCount})
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLang('ko')}
        className={cn(
          'text-sm rounded-none border-b-2 -mb-px px-4',
          lang === 'ko'
            ? 'font-semibold text-[#111827] border-[#FF9D00]'
            : 'text-[#6B7280] border-transparent hover:text-[#111827]'
        )}
      >
        Korean ({koCount})
      </Button>
    </div>
  );
}

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = params.seriesId as string;

  const { data: allSeries, isLoading: seriesLoading } = useSeries();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { initializeAccess, restoreFromBlockchain } = usePurchaseStore();

  const series = useMemo(
    () => allSeries?.find((s) => s.id === seriesId),
    [allSeries, seriesId]
  );

  const seriesCourses = useMemo((): { en: Paper[]; ko: Paper[] } => {
    if (!series || !courses) return { en: [], ko: [] };

    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const ordered = series.courseIds
      .map((id) => courseMap.get(id))
      .filter((c): c is Paper => c !== undefined);

    // EN first, KO second — within each language group, keep series order
    const en = ordered.filter((c) => !c.id.endsWith('-ko'));
    const ko = ordered.filter((c) => c.id.endsWith('-ko'));
    return { en, ko };
  }, [series, courses]);

  useEffect(() => {
    if (courses && courses.length > 0) {
      initializeAccess(courses);
      restoreFromBlockchain();
    }
  }, [courses, initializeAccess, restoreFromBlockchain]);

  const [lang, setLang] = useState<'en' | 'ko'>('en');

  const isLoading = seriesLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="space-y-4 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-5 border-t border-[#E5E7EB]">
                <div className="w-[160px] h-[200px] bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!series) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 text-center">
        <p className="text-lg text-[#6B7280]">Series not found.</p>
        <Button variant="ghost" onClick={() => router.push('/explore')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Explore
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      <PurchaseModal />

      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/explore')}
          className="text-[#6B7280] hover:text-[#111827] -ml-2 mb-3"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Explore
        </Button>
        <div className="flex gap-5 items-start">
          {series.thumbnailUrl && ASSETS_BASE && (
            <img
              src={`${ASSETS_BASE}/${series.thumbnailUrl}`}
              alt={series.title}
              className="w-[140px] h-[108px] rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="min-w-0">
            <div className="flex items-end gap-3">
              <h1 className="text-3xl font-bold text-[#111827] leading-tight">{series.title}</h1>
              <span className="text-xs text-[#9CA3AF] whitespace-nowrap pb-1">
                {series.courseIds.length} course{series.courseIds.length !== 1 ? 's' : ''}
              </span>
            </div>
            {series.description && (
              <ExpandableText text={series.description} />
            )}
          </div>
        </div>
      </div>

      {/* Language tabs */}
      {seriesCourses.en.length > 0 && seriesCourses.ko.length > 0 && (
        <LanguageTabs
          lang={lang}
          setLang={setLang}
          enCount={seriesCourses.en.length}
          koCount={seriesCourses.ko.length}
        />
      )}

      {/* Course list */}
      <div>
        {(lang === 'en' ? seriesCourses.en : seriesCourses.ko).map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </div>
  );
}
