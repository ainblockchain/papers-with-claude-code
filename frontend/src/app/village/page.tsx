'use client';

import { useEffect } from 'react';
import { VillageCanvas } from '@/components/village/VillageCanvas';
import { VillageSidebar } from '@/components/village/VillageSidebar';
import { NotificationToast } from '@/components/shared/NotificationToast';
import { PurchaseModal } from '@/components/purchase/PurchaseModal';
import { useVillageStore } from '@/stores/useVillageStore';
import { useSocialStore } from '@/stores/useSocialStore';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { papersAdapter } from '@/lib/adapters/papers';
import {
  friendPresenceAdapter,
  notificationAdapter,
  leaderboardAdapter,
} from '@/lib/adapters/friends';

export default function VillagePage() {
  const { setFriends } = useVillageStore();
  const { addNotification, setLeaderboard } = useSocialStore();
  const { initializeAccess } = usePurchaseStore();

  useEffect(() => {
    papersAdapter.fetchTrendingPapers('daily').then((papers) => {
      initializeAccess(papers);
    });
  }, [initializeAccess]);

  useEffect(() => {
    const unsubFriends = friendPresenceAdapter.subscribeToFriendPositions(setFriends);
    const unsubNotifs = notificationAdapter.subscribeToNotifications(addNotification);
    leaderboardAdapter.getLeaderboard().then(setLeaderboard);

    return () => {
      unsubFriends();
      unsubNotifs();
    };
  }, [setFriends, addNotification, setLeaderboard]);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Main: Village Canvas */}
      <div className="flex-1 relative">
        <VillageCanvas />
        <NotificationToast />
        <PurchaseModal />
      </div>

      {/* Right Sidebar */}
      <div className="w-[280px] border-l border-[#E5E7EB] bg-white overflow-y-auto">
        <VillageSidebar />
      </div>
    </div>
  );
}
