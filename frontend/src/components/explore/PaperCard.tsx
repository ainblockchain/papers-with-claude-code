'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, FileText, Play, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paper } from '@/types/paper';
import { usePurchaseStore } from '@/stores/usePurchaseStore';

interface PaperCardProps {
  paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
  const router = useRouter();
  const { getAccessStatus, setPurchaseModal } = usePurchaseStore();
  const access = getAccessStatus(paper.id);
  const canLearn = access === 'owned' || access === 'purchased';

  const formatStars = (stars?: number) => {
    if (!stars) return null;
    if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
    return stars.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <article className="flex gap-4 py-5 border-t border-[#E5E7EB] first:border-t-0">
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-[160px] h-[200px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200">
          <FileText className="h-12 w-12 text-gray-400" />
        </div>
        {paper.organization && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 text-[10px] bg-white/90 backdrop-blur-sm"
          >
            {paper.organization.name}
          </Badge>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm px-2 py-1.5">
          <p className="text-[11px] text-white truncate">
            Submitted by <span className="font-medium">@{paper.submittedBy}</span>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Link
          href={`/learn/${paper.id}`}
          className="hover:underline"
        >
          <h3 className="font-bold text-[18px] text-[#111827] leading-tight line-clamp-2">
            {paper.title}
          </h3>
        </Link>
        <p className="mt-1.5 text-sm text-[#6B7280] line-clamp-2">{paper.description}</p>
        {paper.courses && paper.courses.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {paper.courses.map((course) => (
              <Badge
                key={course.slug}
                variant="outline"
                className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200"
              >
                {course.name}
                <span className="ml-1 text-blue-400">{course.totalConcepts}c</span>
              </Badge>
            ))}
          </div>
        )}
        <div className="mt-auto pt-3 flex items-center gap-2 text-sm text-[#6B7280]">
          <div className="flex items-center gap-1">
            {paper.authors.slice(0, 3).map((author) => (
              <div
                key={author.id}
                className="h-5 w-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] font-medium text-white"
                title={author.name}
              >
                {author.name[0]}
              </div>
            ))}
            {paper.authors.length > 3 && (
              <span className="text-xs">+{paper.authors.length - 3}</span>
            )}
            <span className="ml-1 text-xs">{paper.authors.length} authors</span>
          </div>
          <span className="text-xs">·</span>
          <span className="text-xs">Published on {formatDate(paper.publishedAt)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex-shrink-0 flex flex-col gap-1.5 w-[140px]">
        {canLearn ? (
          <Button
            onClick={() => router.push(`/learn/${paper.id}`)}
            className="bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white text-sm h-9"
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            Learn
          </Button>
        ) : (
          <Button
            onClick={() => setPurchaseModal(paper.id, paper)}
            className="bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white text-sm h-9"
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1" />
            Purchase
          </Button>
        )}
        {paper.githubUrl && (
          <a href={paper.githubUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full text-xs h-8">
              <Star className="h-3 w-3 mr-1" />
              GitHub
              {paper.githubStars != null && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                  {formatStars(paper.githubStars)}
                </Badge>
              )}
            </Button>
          </a>
        )}
        <a href={paper.arxivUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="w-full text-xs h-8">
            <FileText className="h-3 w-3 mr-1" />
            arXiv Page
          </Button>
        </a>
      </div>
    </article>
  );
}
