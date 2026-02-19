// Terminal Session Adapter — connects to K8s web-terminal backend
const BASE_URL =
  process.env.NEXT_PUBLIC_TERMINAL_API_URL || 'http://101.202.37.120:31000';

export interface SessionCreateRequest {
  repoUrl?: string;
  userId?: string;
  resumeStage?: number;
}

export interface SessionInfo {
  sessionId: string;
  podName: string;
  status: 'creating' | 'running' | 'terminating' | 'terminated';
  repoUrl?: string;
  userId?: string;
}

export interface BackendProgress {
  completedStages: number[];
  isCourseComplete: boolean;
}

export interface TerminalSessionAdapter {
  createSession(req: SessionCreateRequest): Promise<SessionInfo>;
  getSession(sessionId: string): Promise<SessionInfo>;
  deleteSession(sessionId: string): Promise<void>;
  cleanupStaleSessions(): Promise<number>;
  getStages(sessionId: string): Promise<unknown[]>;
  getProgress(userId: string, paperId: string): Promise<BackendProgress>;
  getWebSocketUrl(sessionId: string): string;
}

class RealTerminalSessionAdapter implements TerminalSessionAdapter {
  async createSession(req: SessionCreateRequest): Promise<SessionInfo> {
    const res = await fetch(`${BASE_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (res.status === 429) {
      throw new SessionLimitError(
        'Maximum concurrent sessions reached (4). Please close another session first.',
      );
    }

    if (!res.ok) {
      throw new Error(`Failed to create session: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  async getSession(sessionId: string): Promise<SessionInfo> {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}`);
    if (!res.ok) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return res.json();
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      await fetch(`${BASE_URL}/api/sessions/${sessionId}`, { method: 'DELETE' });
    } catch {
      // Best-effort cleanup — don't throw on unmount
    }
  }

  /** List all sessions, delete any that are terminated or stuck creating. Returns count deleted. */
  async cleanupStaleSessions(): Promise<number> {
    try {
      const res = await fetch(`${BASE_URL}/api/sessions`);
      if (!res.ok) return 0;
      // API list returns { id, ... } while create returns { sessionId, ... }
      const sessions: Array<{ id?: string; sessionId?: string; status: string }> =
        await res.json();
      const stale = sessions.filter(
        (s) => s.status === 'terminated' || s.status === 'creating',
      );
      await Promise.all(
        stale.map((s) => this.deleteSession((s.id ?? s.sessionId)!)),
      );
      return stale.length;
    } catch {
      return 0;
    }
  }

  async getStages(sessionId: string): Promise<unknown[]> {
    const res = await fetch(`${BASE_URL}/api/sessions/${sessionId}/stages`);
    if (!res.ok) return [];
    return res.json();
  }

  async getProgress(userId: string, paperId: string): Promise<BackendProgress> {
    const encoded = encodeURIComponent(paperId);
    const res = await fetch(`${BASE_URL}/api/progress/${userId}/${encoded}`);
    if (!res.ok) return { completedStages: [], isCourseComplete: false };
    return res.json();
  }

  getWebSocketUrl(sessionId: string): string {
    const wsUrl = BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws');
    return `${wsUrl}/ws?sessionId=${sessionId}`;
  }
}

export class SessionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionLimitError';
  }
}

export const terminalSessionAdapter: TerminalSessionAdapter =
  new RealTerminalSessionAdapter();
