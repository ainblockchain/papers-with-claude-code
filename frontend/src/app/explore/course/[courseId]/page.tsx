'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, ShoppingCart, Star, FileText, BookOpen, Users, CheckCircle2, ChevronDown, CircleDot } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCourses } from '@/hooks/useCourses';
import { useCourseInfo } from '@/hooks/useCourseInfo';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { PurchaseModal } from '@/components/purchase/PurchaseModal';
import type { Paper } from '@/types/paper';

interface Completer {
  address: string;
  stagesCleared: number;
  avatarUrl?: string;
}

async function fetchCompleters(courseId: string): Promise<Completer[]> {
  const res = await fetch(`/api/courses/${encodeURIComponent(courseId)}/completers`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

function CurriculumTimeline({ stages }: {
  stages: Array<{
    stageNumber: number;
    title: string;
    conceptCount: number;
    hasQuiz: boolean;
    concepts: Array<{ id: string; title: string }>;
  }>;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (stageNumber: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(stageNumber)) next.delete(stageNumber);
      else next.add(stageNumber);
      return next;
    });
  };

  return (
    <div className="relative ml-1">
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const isOpen = expanded.has(stage.stageNumber);
        return (
          <div key={stage.stageNumber} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div className="absolute left-[9px] top-5 bottom-0 w-px bg-[#E5E7EB]" />
            )}
            {/* Dot */}
            <div className="relative flex-shrink-0 mt-0.5 h-[18px] w-[18px] rounded-full border-2 border-[#FF9D00] bg-white flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-[#FF9D00]" />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 -mt-0.5">
              <button
                onClick={() => toggle(stage.stageNumber)}
                className="flex items-center gap-1.5 group text-left w-full"
              >
                <p className="font-medium text-sm text-[#111827] group-hover:text-[#FF9D00] transition-colors">
                  {stage.title}
                </p>
                <ChevronDown className={`h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#FF9D00] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {stage.conceptCount} concept{stage.conceptCount !== 1 ? 's' : ''}
                {stage.hasQuiz && ' · Quiz'}
              </p>
              {/* Expanded concepts */}
              {isOpen && stage.concepts.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {stage.concepts.map((concept) => (
                    <li key={concept.id} className="flex items-center gap-2 text-xs text-[#6B7280]">
                      <CircleDot className="h-3 w-3 text-[#D1D5DB] flex-shrink-0" />
                      {concept.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const { isAuthenticated } = useAuthStore();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const { data: courseInfo, isLoading: infoLoading } = useCourseInfo(courseId);
  const { getAccessStatus, setPurchaseModal, initializeAccess, restoreFromBlockchain } = usePurchaseStore();

  const { data: completers = [], isLoading: completersLoading } = useQuery({
    queryKey: ['course-completers', courseId],
    queryFn: () => fetchCompleters(courseId),
    staleTime: 5 * 60 * 1000,
  });

  const paper = useMemo(
    () => courses?.find((c) => c.id === courseId),
    [courses, courseId],
  );

  useEffect(() => {
    if (courses && courses.length > 0) {
      initializeAccess(courses);
      restoreFromBlockchain();
    }
  }, [courses, initializeAccess, restoreFromBlockchain]);

  const access = getAccessStatus(courseId);
  const canLearn = access === 'owned' || access === 'purchased';
  const totalStages = paper?.totalStages ?? courseInfo?.totalStages ?? 0;
  const fullyCompleted = completers.filter((c) => c.stagesCleared >= totalStages && totalStages > 0);
  const inProgress = completers.filter((c) => c.stagesCleared < totalStages || totalStages === 0);
  const isLoading = coursesLoading || infoLoading;

  const requireAuth = (action: () => void) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    action();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatStars = (stars?: number) => {
    if (!stars) return null;
    if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
    return stars.toString();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-64 bg-gray-200 rounded mt-8" />
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 text-center">
        <p className="text-lg text-[#6B7280]">Course not found.</p>
        <Button variant="ghost" onClick={() => router.push('/explore')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Explore
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 pt-4 pb-8">
      <PurchaseModal />

      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/explore')}
        className="text-[#6B7280] hover:text-[#111827] -ml-2 mb-2"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Explore
      </Button>

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        {/* Thumbnail */}
        <div className="relative flex-shrink-0 w-[160px] h-[200px] rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          {paper.thumbnailUrl ? (
            <img
              src={paper.thumbnailUrl}
              alt={paper.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-200">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex-1 min-w-0 flex flex-col">
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] leading-tight">{paper.title}</h1>

          {paper.description && (
            <p className="mt-1.5 text-sm text-[#6B7280] line-clamp-3">{paper.description}</p>
          )}

          {/* Course info */}
          <div className="mt-1.5 flex items-center gap-3 text-sm text-[#6B7280]">
            {paper.courseName && (
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4 text-[#FF9D00]" />
                <span className="font-medium text-[#374151]">{paper.courseName}</span>
              </span>
            )}
            <span>{totalStages} stage{totalStages !== 1 ? 's' : ''}</span>
            {completers.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {completers.length} learner{completers.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Authors */}
          {paper.authors.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm text-[#6B7280]">
              <div className="flex items-center gap-1">
                {paper.authors.slice(0, 5).map((author) => (
                  <div
                    key={author.id}
                    className="h-5 w-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] font-medium text-white"
                    title={author.name}
                  >
                    {author.name[0]}
                  </div>
                ))}
              </div>
              <span className="text-sm">
                {paper.authors.length <= 3
                  ? paper.authors.map((a) => a.name).join(', ')
                  : `${paper.authors[0].name} et al.`}
              </span>
              {paper.publishedAt && (
                <>
                  <span>·</span>
                  <span>{formatDate(paper.publishedAt)}</span>
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-auto pt-3 flex items-center gap-3">
            {canLearn ? (
              <Button
                onClick={() => requireAuth(() => router.push(`/learn/${paper.id}`))}
                className="bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white text-sm h-9"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Start Learning
              </Button>
            ) : (
              <Button
                onClick={() => requireAuth(() => setPurchaseModal(paper.id, paper))}
                className="bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white text-sm h-9"
              >
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                Purchase
              </Button>
            )}
            {paper.githubUrl && (
              <a href={paper.githubUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-8">
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
            {paper.arxivUrl ? (
              <a href={paper.arxivUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  <FileText className="h-3 w-3 mr-1" />
                  arXiv
                </Button>
              </a>
            ) : paper.docsUrl ? (
              <a href={paper.docsUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  <FileText className="h-3 w-3 mr-1" />
                  Docs
                </Button>
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Curriculum ── */}
      {courseInfo && courseInfo.stages.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-bold text-[#111827] mb-4 flex items-center gap-2">
            Curriculum
            <span className="text-xs font-medium text-[#FF9D00] bg-[#FF9D00]/10 px-2 py-0.5 rounded-full">
              {courseInfo.stages.length}
            </span>
          </h2>
          <CurriculumTimeline stages={courseInfo.stages} />
        </section>
      )}

      {/* ── Learners ── */}
      <section className="mt-6">
        <h2 className="text-lg font-bold text-[#111827] mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Learners
          {completers.length > 0 && (
            <span className="text-xs font-medium text-[#FF9D00] bg-[#FF9D00]/10 px-2 py-0.5 rounded-full">
              {completers.length}
            </span>
          )}
        </h2>

        {completersLoading ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        ) : completers.length === 0 ? (
          <p className="text-[#9CA3AF] text-sm py-6 text-center">
            No learners yet. Be the first to take this course!
          </p>
        ) : (
          <div className="space-y-6">
            {/* Completed */}
            {fullyCompleted.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#059669] mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed ({fullyCompleted.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {fullyCompleted.map((c) => (
                    <div
                      key={c.address}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#059669]/20 bg-[#059669]/5"
                    >
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-[#059669]/20 flex items-center justify-center text-xs font-medium text-[#059669] flex-shrink-0">
                          {c.address.slice(2, 4).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] font-mono">
                          {truncateAddress(c.address)}
                        </p>
                        <p className="text-xs text-[#059669]">
                          {c.stagesCleared}/{totalStages} stages
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* In Progress */}
            {inProgress.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#6B7280] mb-2">
                  In Progress ({inProgress.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {inProgress.map((c) => (
                    <div
                      key={c.address}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]"
                    >
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt="" className="h-8 w-8 rounded-full flex-shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-[#6B7280] flex-shrink-0">
                          {c.address.slice(2, 4).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#111827] font-mono">
                          {truncateAddress(c.address)}
                        </p>
                        <p className="text-xs text-[#9CA3AF]">
                          {c.stagesCleared}/{totalStages} stages
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
