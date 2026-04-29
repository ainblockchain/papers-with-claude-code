'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Trophy, Flame, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Fingerprint } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { progressAdapter } from '@/lib/adapters/progress';
import { papersAdapter } from '@/lib/adapters/papers';
import { calculateStreak, extractActivityTimestamps, getStreakStyle } from '@/lib/utils/streak';
import { Paper } from '@/types/paper';
import { UserProgress } from '@/types/learning';

interface ProgressWithPaper extends UserProgress {
  paper?: Paper;
}

export default function DashboardPage() {
  const { user, passkeyInfo } = useAuthStore();
  const [progressList, setProgressList] = useState<ProgressWithPaper[]>([]);
  const [streak, setStreak] = useState(0);
  const [ranking, setRanking] = useState<{ topPercent: number | null; userRank: number; totalUsers: number } | null>(null);

  const loadingRef = useRef(false);

  useEffect(() => {
    async function load() {
      if (!user || loadingRef.current) return;
      loadingRef.current = true;

      try {
        const allProgress = await progressAdapter.loadMergedProgress(user.id, passkeyInfo?.evmAddress);
        const withPapers = await Promise.all(
          allProgress.map(async (p) => {
            const paper = await papersAdapter.getPaperById(p.paperId);
            return {
              ...p,
              paper: paper ?? undefined,
              totalStages: paper?.totalStages ?? p.totalStages,
            };
          })
        );
        setProgressList(withPapers);
        const timestamps = extractActivityTimestamps(withPapers);
        setStreak(calculateStreak(timestamps));

        // Fetch ranking
        if (passkeyInfo?.evmAddress) {
          try {
            const res = await fetch(`/api/knowledge/ranking?address=${encodeURIComponent(passkeyInfo.evmAddress)}`);
            const json = await res.json();
            if (json.ok) setRanking({ topPercent: json.data.topPercent, userRank: json.data.userRank, totalUsers: json.data.totalUsers });
          } catch {
            // ranking unavailable
          }
        }
      } finally {
        loadingRef.current = false;
      }
    }
    load();
  }, [user, passkeyInfo]);

  const activeCourses = progressList.filter(p => p.completedStages.length < p.totalStages);
  const completedCourses = progressList.filter(p => p.completedStages.length >= p.totalStages);

  const streakStyle = getStreakStyle(streak);
  const totalStagesCleared = progressList.reduce(
    (sum, p) => sum + p.completedStages.length,
    0
  );

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8">
      {/* Profile */}
      <div className="flex items-center gap-4 mb-8">
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.username}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-[#FF9D00] flex items-center justify-center text-white text-2xl font-bold">
            {user?.username[0].toUpperCase() || '?'}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">{user?.username || 'User'}</h1>
          <p className="text-sm text-[#6B7280]">{user?.email}</p>
          {passkeyInfo && (
            <p className="flex items-center gap-1 text-xs text-[#6B7280] mt-0.5 font-mono">
              <Fingerprint className="h-3 w-3" />
              AIN Wallet: {passkeyInfo.ainAddress}
            </p>
          )}
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
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
              <Trophy className="h-4 w-4" />
              Stages Cleared
            </div>
            <p className="text-2xl font-bold text-[#111827]">{totalStagesCleared}</p>
          </div>
          {ranking?.topPercent != null && ranking.userRank != null && (
            ranking.userRank <= 3 ? (
              <span className="text-xs font-semibold text-white bg-[#FF9D00] px-2 py-0.5 rounded-full">
                Rank {ranking.userRank} {ranking.userRank === 1 ? '🥇' : ranking.userRank === 2 ? '🥈' : '🥉'}
              </span>
            ) : (
              <span className="text-xs font-semibold text-[#FF9D00] bg-[#FF9D00]/10 px-2 py-0.5 rounded-full">
                Top {ranking.topPercent}%
              </span>
            )
          )}
        </div>
        <div className="p-4 bg-white border border-[#E5E7EB] rounded-lg">
          <div className="flex items-center gap-2 text-[#6B7280] text-sm mb-1">
            <Flame
              className={`h-4 w-4 transition-all duration-300 ${streakStyle.animate ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`}
              style={{ color: streakStyle.color, ...streakStyle.iconStyle }}
            />
            Current Streak
          </div>
          <p className="text-2xl font-bold transition-colors duration-300" style={{ color: streakStyle.color }}>
            {streak} {streak === 1 ? 'day' : 'days'}
          </p>
        </div>
      </div>

      {/* Active Courses */}
      <h2 className="text-lg font-bold text-[#111827] mb-4 flex items-center gap-2">
        Active Courses
        {activeCourses.length > 0 && (
          <span className="text-xs font-medium text-[#FF9D00] bg-[#FF9D00]/10 px-2 py-0.5 rounded-full">
            {activeCourses.length}
          </span>
        )}
      </h2>
      {activeCourses.length === 0 && completedCourses.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E5E7EB] rounded-lg">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-[#6B7280] text-sm">No courses started yet.</p>
          <Link href="/explore">
            <Button className="mt-4 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white" size="sm">
              Explore Papers
            </Button>
          </Link>
        </div>
      ) : activeCourses.length === 0 ? (
        <div className="text-center py-6 bg-white border border-[#E5E7EB] rounded-lg">
          <p className="text-[#6B7280] text-sm">No active courses.</p>
          <Link href="/explore">
            <Button className="mt-3 bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white" size="sm">
              Explore Papers
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activeCourses.map((p) => (
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
                    Stage {p.completedStages.length}/{p.totalStages}
                  </span>
                </div>
              </div>
              <Link href={`/learn/${p.paperId}`}>
                <Button size="sm" className="bg-[#FF9D00] hover:bg-[#FF9D00]/90 text-white w-[100px] justify-center">
                  <Play className="h-3.5 w-3.5 mr-1" />
                  Continue
                </Button>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <>
          <h2 className="text-lg font-bold text-[#111827] mb-4 mt-8 flex items-center gap-2">
            Completed Courses
            <span className="text-xs font-medium text-[#059669] bg-[#059669]/10 px-2 py-0.5 rounded-full">
              {completedCourses.length}
            </span>
          </h2>
          <div className="space-y-3">
            {completedCourses.map((p) => (
              <div
                key={p.paperId}
                className="flex items-center gap-4 p-4 bg-[#FCFEFC] border border-[#E5E7EB] rounded-lg"
              >
                <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-[#111827] truncate">
                    {p.paper?.title || p.paperId}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={100} className="h-2 flex-1 [&>[data-slot=progress-indicator]]:bg-[#059669] bg-[#D1FAE5]" />
                    <span className="text-xs text-[#6B7280] whitespace-nowrap">
                      {p.totalStages} {p.totalStages === 1 ? 'stage' : 'stages'}
                    </span>
                  </div>
                </div>
                <Link href={`/learn/${p.paperId}`}>
                  <Button size="sm" className="bg-[#059669] hover:bg-[#059669]/90 text-white w-[100px] justify-center">
                    <Trophy className="h-3.5 w-3.5 mr-1" />
                    Review
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
