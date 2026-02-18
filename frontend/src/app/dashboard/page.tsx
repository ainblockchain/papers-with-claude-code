'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Trophy, Flame, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuthStore } from '@/stores/useAuthStore';
import { progressAdapter } from '@/lib/adapters/progress';
import { papersAdapter } from '@/lib/adapters/papers';
import { UserProgress } from '@/types/learning';
import { Paper } from '@/types/paper';

interface ProgressWithPaper extends UserProgress {
  paper?: Paper;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [progressList, setProgressList] = useState<ProgressWithPaper[]>([]);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const allProgress = await progressAdapter.loadAllProgress(user.id);
      const withPapers = await Promise.all(
        allProgress.map(async (p) => {
          const paper = await papersAdapter.getPaperById(p.paperId);
          return { ...p, paper: paper ?? undefined };
        })
      );
      setProgressList(withPapers);
    }
    load();
  }, [user]);

  const totalStagesCleared = progressList.reduce(
    (sum, p) => sum + p.completedStages.length,
    0
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      {/* Profile */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-16 w-16 rounded-full bg-[#FF9D00] flex items-center justify-center text-white text-2xl font-bold">
          {user?.username[0].toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">{user?.username || 'User'}</h1>
          <p className="text-sm text-[#6B7280]">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg">
          <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
            <BookOpen className="h-4 w-4" />
            Papers Started
          </div>
          <p className="text-2xl font-bold text-[#111827]">{progressList.length}</p>
        </div>
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg">
          <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
            <Trophy className="h-4 w-4" />
            Stages Cleared
          </div>
          <p className="text-2xl font-bold text-[#111827]">{totalStagesCleared}</p>
        </div>
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg">
          <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
            <Flame className="h-4 w-4" />
            Current Streak
          </div>
          <p className="text-2xl font-bold text-[#111827]">1 day</p>
        </div>
      </div>

      {/* Active Courses */}
      <h2 className="text-lg font-bold text-[#111827] mb-4">Active Courses</h2>
      {progressList.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E5E7EB] rounded-lg">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">No courses started yet.</p>
          <Link href="/explore">
            <Button className="mt-4 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white" size="sm">
              Explore Papers
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {progressList.map((p) => (
            <div
              key={p.paperId}
              className="flex items-center gap-4 p-4 bg-white border border-[#E5E7EB] rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm text-[#111827] truncate">
                  {p.paper?.title || p.paperId}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Progress
                    value={(p.completedStages.length / p.totalStages) * 100}
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-[#6B7280] whitespace-nowrap">
                    Stage {p.currentStage}/{p.totalStages}
                  </span>
                </div>
              </div>
              <Link href={`/learn/${p.paperId}`}>
                <Button size="sm" className="bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white">
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Continue
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
