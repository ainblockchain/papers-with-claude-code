'use client';

import { useRouter } from 'next/navigation';
import { BookOpen, ChevronRight } from 'lucide-react';
import { Series } from '@/types/paper';

interface SeriesCardProps {
  series: Series;
}

export function SeriesCard({ series }: SeriesCardProps) {
  const router = useRouter();

  return (
    <article
      onClick={() => router.push(`/explore/series/${series.id}`)}
      className="flex gap-4 py-5 border-t border-[#E5E7EB] first:border-t-0 cursor-pointer group hover:bg-gray-50/50 transition-colors"
    >
      {/* Thumbnail placeholder */}
      <div className="relative flex-shrink-0 w-[160px] h-[120px] rounded-lg overflow-hidden bg-gradient-to-br from-[#FF9D00]/10 to-[#FF9D00]/5 border border-[#FF9D00]/20 flex items-center justify-center">
        <BookOpen className="h-10 w-10 text-[#FF9D00]/60" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-bold text-[18px] text-[#111827] leading-tight group-hover:text-[#FF9D00] transition-colors">
          {series.title}
        </h3>

        {series.description && (
          <p className="mt-1.5 text-sm text-[#6B7280] line-clamp-2">
            {series.description}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center gap-2 text-sm text-[#6B7280]">
          <span className="text-xs font-medium">
            {series.courseIds.length} course{series.courseIds.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 flex items-center">
        <ChevronRight className="h-5 w-5 text-[#9CA3AF] group-hover:text-[#FF9D00] transition-colors" />
      </div>
    </article>
  );
}
