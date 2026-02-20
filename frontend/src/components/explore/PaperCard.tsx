// 논문 카드 — 썸네일(HF CDN) + 논문 설명 + 코스 정보 + 저자/날짜 + 액션 버튼
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, FileText, Play, ShoppingCart, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paper } from '@/types/paper';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { useAuthStore } from '@/stores/useAuthStore';

interface PaperCardProps {
  paper: Paper;
}

export function PaperCard({ paper }: PaperCardProps) {
  const router = useRouter();
  const { getAccessStatus, setPurchaseModal } = usePurchaseStore();
  const { isAuthenticated } = useAuthStore();
  const access = getAccessStatus(paper.id);
  const canLearn = access === 'owned' || access === 'purchased';
  const [imgError, setImgError] = useState(false);

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    action();
  };

  const formatStars = (stars?: number) => {
    if (!stars) return null;
    if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
    return stars.toString();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const showThumbnail = paper.thumbnailUrl && !imgError;

  return (
    <article className="flex gap-4 py-5 border-t border-[#E5E7EB] first:border-t-0">
      {/* Thumbnail — HF CDN 이미지 또는 FileText 아이콘 placeholder */}
      <div className="relative flex-shrink-0 w-[160px] h-[200px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
        {showThumbnail ? (
          <img
            src={paper.thumbnailUrl}
            alt={paper.title}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200">
            <FileText className="h-12 w-12 text-gray-400" />
          </div>
        )}
        {paper.organization && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 text-[10px] bg-white/90 backdrop-blur-sm"
          >
            {paper.organization.name}
          </Badge>
        )}
      </div>

      {/* Content — 타이틀 + 논문 설명 + 코스 정보 + 저자/날짜 */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="font-bold text-[18px] text-[#111827] leading-tight line-clamp-2">
          {paper.title}
        </h3>

        {paper.description && (
          <p className="mt-1.5 text-sm text-[#6B7280] line-clamp-2">{paper.description}</p>
        )}

        {paper.courseName && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#6B7280]">
            <BookOpen className="h-3.5 w-3.5 text-[#FF9D00] flex-shrink-0" />
            <span className="font-medium text-[#374151]">{paper.courseName}</span>
            <span>·</span>
            <span>{paper.totalStages} stage{paper.totalStages !== 1 ? 's' : ''}</span>
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center gap-2 text-sm text-[#6B7280]">
          {paper.authors.length > 0 && (
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
              <span className="ml-1 text-xs">
                {paper.authors.length <= 2
                  ? paper.authors.map((a) => a.name).join(', ')
                  : `${paper.authors[0].name} et al.`}
              </span>
            </div>
          )}
          {paper.publishedAt && (
            <>
              {paper.authors.length > 0 && <span className="text-xs">·</span>}
              <span className="text-xs">{formatDate(paper.publishedAt)}</span>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons — Learn/Purchase + GitHub(원 논문 코드) + arXiv */}
      <div className="flex-shrink-0 flex flex-col gap-1.5 w-[140px]">
        {canLearn ? (
          <Button
            onClick={() => requireAuth(() => router.push(`/learn/${paper.id}`))}
            className="bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white text-sm h-9"
          >
            <Play className="h-3.5 w-3.5 mr-1" />
            Learn
          </Button>
        ) : (
          <Button
            onClick={() => requireAuth(() => setPurchaseModal(paper.id, paper))}
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
        {paper.arxivUrl && (
          <a href={paper.arxivUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="w-full text-xs h-8">
              <FileText className="h-3 w-3 mr-1" />
              arXiv
            </Button>
          </a>
        )}
      </div>
    </article>
  );
}
