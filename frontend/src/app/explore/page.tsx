'use client';

import { useEffect } from 'react';
import { HeroSection } from '@/components/explore/HeroSection';
import { PaperCard } from '@/components/explore/PaperCard';
import { PurchaseModal } from '@/components/purchase/PurchaseModal';
import { useExploreStore } from '@/stores/useExploreStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { useCourses } from '@/hooks/useCourses';

export default function ExplorePage() {
  const { filteredPapers, setPapers, setLoading, isLoading } = useExploreStore();
  const { initializeAccess } = usePurchaseStore();
  const { data: courses, isLoading: coursesLoading } = useCourses();

  useEffect(() => {
    setLoading(coursesLoading);
  }, [coursesLoading, setLoading]);

  useEffect(() => {
    if (courses && courses.length > 0) {
      setPapers(courses);
      initializeAccess(courses);
    }
  }, [courses, setPapers, initializeAccess]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      <HeroSection />
      <PurchaseModal />
      <div>
        {isLoading ? (
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
        ) : filteredPapers.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280]">
            <p className="text-lg">No papers found.</p>
            <p className="text-sm mt-1">Try adjusting your search query.</p>
          </div>
        ) : (
          filteredPapers.map((paper) => <PaperCard key={paper.id} paper={paper} />)
        )}
      </div>
    </div>
  );
}
