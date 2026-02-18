'use client';

import { useVillageStore } from '@/stores/useVillageStore';
import { useSocialStore } from '@/stores/useSocialStore';
import { Trophy, Users, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FRIEND_COLORS } from '@/constants/game';

export function VillageSidebar() {
  const { friends } = useVillageStore();
  const { leaderboard } = useSocialStore();

  return (
    <div className="p-4 space-y-6">
      {/* Online Friends */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-[#111827] mb-3">
          <Users className="h-4 w-4" />
          Online Friends
        </div>
        <div className="space-y-2">
          {friends.length === 0 ? (
            <p className="text-xs text-[#6B7280]">No friends online</p>
          ) : (
            friends.map((friend, i) => (
              <div key={friend.userId} className="flex items-center gap-2">
                <div className="relative">
                  <div
                    className="h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: FRIEND_COLORS[i % FRIEND_COLORS.length] }}
                  >
                    {friend.username[0]}
                  </div>
                  <div
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white',
                      friend.isOnline ? 'bg-green-500' : 'bg-gray-400'
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#111827] truncate">{friend.username}</p>
                  <p className="text-[10px] text-[#6B7280] truncate">
                    {friend.currentScene === 'dungeon'
                      ? `Stage ${friend.currentStage || '?'}`
                      : 'In village'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-[#111827] mb-3">
          <Trophy className="h-4 w-4 text-[#FF9D00]" />
          Leaderboard
        </div>
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div key={entry.userId} className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-bold w-5 text-center',
                  entry.rank === 1
                    ? 'text-[#FF9D00]'
                    : entry.rank === 2
                    ? 'text-gray-400'
                    : entry.rank === 3
                    ? 'text-amber-700'
                    : 'text-[#6B7280]'
                )}
              >
                {entry.rank}
              </span>
              <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center text-[9px] font-bold text-white">
                {entry.username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[#111827] truncate">{entry.username}</p>
                <p className="text-[10px] text-[#6B7280]">
                  {entry.paperTitle} St.{entry.currentStage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini Map */}
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-[#111827] mb-3">
          <MapPin className="h-4 w-4" />
          World Map
        </div>
        <div className="bg-[#4A7C59] rounded-lg h-32 relative overflow-hidden">
          {/* Simplified minimap */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[10px] text-white/70 font-mono">Village Overview</p>
          </div>
          {/* Player dot */}
          <div
            className="absolute w-2 h-2 bg-blue-400 rounded-full border border-white"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
