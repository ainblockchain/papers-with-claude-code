// 🔌 ADAPTER 🔗 CROSS-TEAM — Real-time friend presence
import { FriendPosition, Notification, LeaderboardEntry } from '@/types/social';

export interface FriendPresenceAdapter {
  subscribeToFriendPositions(callback: (friends: FriendPosition[]) => void): () => void;
  updateMyPosition(position: { x: number; y: number; scene: string }): void;
}

export interface NotificationAdapter {
  subscribeToNotifications(callback: (notif: Notification) => void): () => void;
}

export interface LeaderboardAdapter {
  getLeaderboard(): Promise<LeaderboardEntry[]>;
}

const MOCK_FRIENDS: FriendPosition[] = [
  {
    userId: 'friend-a',
    username: 'Alice',
    avatarUrl: '',
    position: { x: 15, y: 10 },
    currentScene: 'dungeon',
    currentPaperId: 'bitdance-2602',
    currentStage: 2,
    isOnline: true,
  },
  {
    userId: 'friend-b',
    username: 'Bob',
    avatarUrl: '',
    position: { x: 30, y: 20 },
    currentScene: 'village',
    isOnline: true,
  },
  {
    userId: 'friend-c',
    username: 'Carol',
    avatarUrl: '',
    position: { x: 42, y: 15 },
    currentScene: 'dungeon',
    currentPaperId: 'moonshine-2410',
    currentStage: 3,
    isOnline: false,
  },
];

class MockFriendPresenceAdapter implements FriendPresenceAdapter {
  subscribeToFriendPositions(callback: (friends: FriendPosition[]) => void): () => void {
    callback(MOCK_FRIENDS);
    const interval = setInterval(() => {
      // Slightly randomize positions
      const updated = MOCK_FRIENDS.map(f => ({
        ...f,
        position: {
          x: f.position.x + Math.floor(Math.random() * 3) - 1,
          y: f.position.y + Math.floor(Math.random() * 3) - 1,
        },
      }));
      callback(updated);
    }, 5000);
    return () => clearInterval(interval);
  }

  updateMyPosition(): void {
    // Mock: no-op
  }
}

class MockNotificationAdapter implements NotificationAdapter {
  subscribeToNotifications(callback: (notif: Notification) => void): () => void {
    // Fire a mock notification after 10s, then every 30s
    const timeouts: NodeJS.Timeout[] = [];
    const notifications = [
      { username: 'Alice', message: 'cleared Stage 2 of BitDance Dungeon!', paperId: 'bitdance-2602', stageNumber: 2 },
      { username: 'Bob', message: 'joined the Moonshine Dungeon!', paperId: 'moonshine-2410' },
      { username: 'Carol', message: 'cleared Stage 3 of Moonshine Dungeon!', paperId: 'moonshine-2410', stageNumber: 3 },
    ];
    let idx = 0;
    const fire = () => {
      const n = notifications[idx % notifications.length];
      callback({
        id: `notif-${Date.now()}`,
        type: n.stageNumber ? 'stage_clear' : 'friend_join',
        userId: `friend-${n.username.toLowerCase()[0]}`,
        username: n.username,
        message: n.message,
        paperId: n.paperId,
        stageNumber: n.stageNumber,
        timestamp: new Date().toISOString(),
      });
      idx++;
      timeouts.push(setTimeout(fire, 30000));
    };
    timeouts.push(setTimeout(fire, 10000));
    return () => timeouts.forEach(clearTimeout);
  }
}

class MockLeaderboardAdapter implements LeaderboardAdapter {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return [
      { rank: 1, userId: 'friend-c', username: 'Carol', avatarUrl: '', paperId: 'moonshine-2410', paperTitle: 'Moonshine', currentStage: 3, totalStages: 7 },
      { rank: 2, userId: 'friend-a', username: 'Alice', avatarUrl: '', paperId: 'bitdance-2602', paperTitle: 'BitDance', currentStage: 2, totalStages: 5 },
      { rank: 3, userId: 'me', username: 'Me', avatarUrl: '', paperId: 'bitdance-2602', paperTitle: 'BitDance', currentStage: 1, totalStages: 5 },
    ];
  }
}

export const friendPresenceAdapter: FriendPresenceAdapter = new MockFriendPresenceAdapter();
export const notificationAdapter: NotificationAdapter = new MockNotificationAdapter();
export const leaderboardAdapter: LeaderboardAdapter = new MockLeaderboardAdapter();
