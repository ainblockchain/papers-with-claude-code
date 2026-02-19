// 🔌 ADAPTER 🔗 CROSS-TEAM — Real-time friend presence
import { FriendPosition, Notification, LeaderboardEntry } from '@/types/social';
import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import type { UserLocation } from '@/lib/ain/location-types';

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
    currentScene: 'course',
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
    currentScene: 'course',
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
      { username: 'Alice', message: 'cleared Stage 2 of BitDance Course!', paperId: 'bitdance-2602', stageNumber: 2 },
      { username: 'Bob', message: 'joined the Moonshine Course!', paperId: 'moonshine-2410' },
      { username: 'Carol', message: 'cleared Stage 3 of Moonshine Course!', paperId: 'moonshine-2410', stageNumber: 3 },
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

/** AIN blockchain-backed friend presence — reads locations from on-chain state */
class AinFriendPresenceAdapter implements FriendPresenceAdapter {
  private _ownAddress: string | null = null;
  private static _friendNames: Record<string, string> = {};
  private static _nextNameIdx = 0;
  private static readonly NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank'];

  private static nameFor(address: string): string {
    if (!this._friendNames[address]) {
      this._friendNames[address] = this.NAMES[this._nextNameIdx % this.NAMES.length];
      this._nextNameIdx++;
    }
    return this._friendNames[address];
  }

  private locationToFriend(address: string, loc: UserLocation): FriendPosition {
    const isRecent = Date.now() - loc.updatedAt < 60_000; // online if updated within 60s
    return {
      userId: address,
      username: AinFriendPresenceAdapter.nameFor(address),
      avatarUrl: '',
      position: { x: loc.x, y: loc.y },
      currentScene: loc.scene,
      currentPaperId: loc.paperId,
      currentStage: loc.stageIndex,
      isOnline: isRecent,
    };
  }

  subscribeToFriendPositions(callback: (friends: FriendPosition[]) => void): () => void {
    const poll = async () => {
      try {
        const all = await ainAdapter.getAllLocations();
        const friends: FriendPosition[] = [];
        for (const [address, loc] of Object.entries(all)) {
          if (address === this._ownAddress) continue;
          friends.push(this.locationToFriend(address, loc));
        }
        callback(friends);
      } catch {
        // silent — keep previous state
      }
    };

    poll();
    const interval = setInterval(poll, 10_000);
    return () => clearInterval(interval);
  }

  updateMyPosition(position: { x: number; y: number; scene: string }): void {
    const location: UserLocation = {
      x: position.x,
      y: position.y,
      direction: 'down',
      scene: position.scene as 'village' | 'course',
      updatedAt: Date.now(),
    };
    ainAdapter.updateLocation(location);
  }

  setOwnAddress(address: string) {
    this._ownAddress = address;
  }
}

const USE_AIN_CHAIN = process.env.NEXT_PUBLIC_USE_AIN_CHAIN === 'true';

export const friendPresenceAdapter: FriendPresenceAdapter = USE_AIN_CHAIN
  ? new AinFriendPresenceAdapter()
  : new MockFriendPresenceAdapter();
export const notificationAdapter: NotificationAdapter = new MockNotificationAdapter();
export const leaderboardAdapter: LeaderboardAdapter = new MockLeaderboardAdapter();
