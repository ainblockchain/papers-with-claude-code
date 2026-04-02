'use client';

import { useEffect } from 'react';
import { HeroSection } from '@/components/explore/HeroSection';
import { PaperCard } from '@/components/explore/PaperCard';
import { SeriesCard } from '@/components/explore/SeriesCard';
import { PurchaseModal } from '@/components/purchase/PurchaseModal';
import { useExploreStore } from '@/stores/useExploreStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { useCourses } from '@/hooks/useCourses';
import { useSeries } from '@/hooks/useSeries';

export default function ExplorePage() {
  const { filteredPapers, filteredSeries, activeTab, setPapers, setSeries, setLoading, isLoading } =
    useExploreStore();
  const { initializeAccess, restoreFromBlockchain } = usePurchaseStore();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: series, isLoading: seriesLoading } = useSeries();

  useEffect(() => {
    setLoading(coursesLoading || seriesLoading);
  }, [coursesLoading, seriesLoading, setLoading]);

  useEffect(() => {
    if (courses && courses.length > 0) {
      const sorted = [...courses].sort((a, b) => {
        const aPin = a.id?.includes('comcom-ojt-web3-blockchain-ai') ? 1 : 0;
        const bPin = b.id?.includes('comcom-ojt-web3-blockchain-ai') ? 1 : 0;
        return bPin - aPin;
      });
      setPapers(sorted);
      initializeAccess(courses);
      restoreFromBlockchain();
    }
  }, [courses, setPapers, initializeAccess, restoreFromBlockchain]);

  useEffect(() => {
    if (series && series.length > 0) {
      setSeries(series);
    }
  }, [series, setSeries]);

  const SkeletonCards = () => (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-5 border-t border-[#E5E7EB] animate-pulse">
          <div className="w-[160px] h-[200px] bg-gray-200 rounded-lg" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="w-[140px] space-y-2">
            <div className="h-9 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-8 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      <HeroSection />
      <PurchaseModal />

      {activeTab === 'courses' && (
        <div>
          {isLoading ? (
            <SkeletonCards />
          ) : filteredPapers.length === 0 ? (
            <div className="text-center py-16 text-[#6B7280]">
              <p className="text-lg">No courses found.</p>
              <p className="text-sm mt-1">Try adjusting your search query.</p>
            </div>
          ) : (
            filteredPapers.map((paper) => <PaperCard key={paper.id} paper={paper} />)
          )}
        </div>
      )}

      {activeTab === 'series' && (
        <div>
          {isLoading ? (
            <SkeletonCards />
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-16 text-[#6B7280]">
              <p className="text-lg">No series found.</p>
              <p className="text-sm mt-1">Try adjusting your search query.</p>
            </div>
          ) : (
            filteredSeries.map((s) => <SeriesCard key={s.id} series={s} />)
          )}
        </div>
      )}
    </div>
  );
}
