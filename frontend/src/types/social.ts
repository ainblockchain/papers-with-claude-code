export interface Friend {
  userId: string;
  username: string;
  avatarUrl: string;
}

export interface FriendPosition {
  userId: string;
  username: string;
  avatarUrl: string;
  position: { x: number; y: number };
  currentScene: 'village' | 'course';
  currentPaperId?: string;
  currentStage?: number;
  isOnline: boolean;
}

export interface Notification {
  id: string;
  type: 'stage_clear' | 'friend_join' | 'achievement';
  userId: string;
  username: string;
  message: string;
  paperId?: string;
  stageNumber?: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string;
  paperId: string;
  paperTitle: string;
  currentStage: number;
  totalStages: number;
}
