// 세션 관리 REST API 라우터
// 세션 생성(POST), 목록 조회(GET), 상세 조회(GET :id), 삭제(DELETE :id)를 제공.
// 세션 데이터는 인메모리 Map에 저장 (MVP).

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig, Session } from '../types.js';
import { PodManager } from '../k8s/pod-manager.js';

const sessions = new Map<string, Session>();
const podManager = new PodManager();

/** 세션 ID로 세션을 조회 (server.ts의 WebSocket 핸들러에서도 사용) */
export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

/** 현재 활성 세션 수를 반환 */
export function getActiveSessionCount(): number {
  let count = 0;
  for (const session of sessions.values()) {
    if (session.status === 'creating' || session.status === 'running') {
      count++;
    }
  }
  return count;
}

/** 세션 관리 라우터 생성 */
export function createSessionRouter(config: AppConfig): Router {
  const router = Router();

  // POST /api/sessions — 새 세션 생성
  router.post('/sessions', async (req: Request, res: Response) => {
    try {
      const { repoUrl, userId, resumeStage } = req.body as {
        repoUrl?: string;
        userId?: string;
        resumeStage?: number;
      };

      const activeCount = getActiveSessionCount();
      if (activeCount >= config.maxSessions) {
        res.status(429).json({
          error: 'Max sessions reached',
          maxSessions: config.maxSessions,
          activeSessions: activeCount,
        });
        return;
      }

      const sessionId = uuidv4();
      const session: Session = {
        id: sessionId,
        podName: '',
        namespace: config.sandboxNamespace,
        status: 'creating',
        createdAt: new Date(),
        repoUrl,
        userId,
      };
      sessions.set(sessionId, session);

      console.log(`[sessions] Creating session: ${sessionId}`);

      const podName = await podManager.createPod(sessionId, config, userId);
      session.podName = podName;

      await podManager.waitForPodReady(podName, config.sandboxNamespace);

      // repoUrl이 있으면 Pod 내에서 논문 레포를 클론
      if (repoUrl) {
        console.log(`[sessions] Cloning repo: ${repoUrl}`);
        await podManager.execInPod(session.podName, config.sandboxNamespace, [
          'git', 'clone', '--depth', '1', repoUrl, '/home/claude/papers/current',
        ]);
      }

      // resumeStage가 있으면 재개 컨텍스트를 Pod에 주입
      if (resumeStage != null) {
        console.log(`[sessions] Setting resume stage: ${resumeStage}`);
        await podManager.execInPod(session.podName, config.sandboxNamespace, [
          'bash', '-c', `echo RESUME_FROM_STAGE=${resumeStage} > /tmp/resume-context`,
        ]);
      }

      session.status = 'running';

      console.log(`[sessions] Session ready: ${sessionId} (pod: ${podName})`);

      res.status(201).json({
        sessionId: session.id,
        podName: session.podName,
        status: session.status,
        repoUrl: session.repoUrl,
        userId: session.userId,
      });
    } catch (err) {
      console.error('[sessions] Failed to create session:', err);
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  // GET /api/sessions — 전체 세션 목록
  router.get('/sessions', async (_req: Request, res: Response) => {
    try {
      const result: Session[] = [];

      for (const session of sessions.values()) {
        // running 상태인 세션은 실제 Pod 상태를 확인하여 동기화
        if (session.status === 'running') {
          try {
            const phase = await podManager.getPodStatus(
              session.podName,
              session.namespace
            );
            if (phase !== 'Running') {
              session.status = 'terminated';
            }
          } catch {
            session.status = 'terminated';
          }
        }
        result.push(session);
      }

      res.json(result);
    } catch (err) {
      console.error('[sessions] Failed to list sessions:', err);
      res.status(500).json({ error: 'Failed to list sessions' });
    }
  });

  // GET /api/sessions/:id — 세션 상세 조회
  router.get('/sessions/:id', async (req: Request, res: Response) => {
    const session = sessions.get(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // 실제 Pod 상태를 확인하여 동기화
    if (session.status === 'running') {
      try {
        const phase = await podManager.getPodStatus(
          session.podName,
          session.namespace
        );
        if (phase !== 'Running') {
          session.status = 'terminated';
        }
      } catch {
        session.status = 'terminated';
      }
    }

    res.json(session);
  });

  // DELETE /api/sessions/:id — 세션 삭제
  router.delete('/sessions/:id', async (req: Request, res: Response) => {
    const session = sessions.get(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    try {
      session.status = 'terminating';
      console.log(`[sessions] Deleting session: ${session.id} (pod: ${session.podName})`);

      await podManager.deletePod(session.podName, session.namespace);
      session.status = 'terminated';
      sessions.delete(session.id);

      console.log(`[sessions] Session deleted: ${session.id}`);
      res.status(204).send();
    } catch (err) {
      console.error(`[sessions] Failed to delete session ${session.id}:`, err);
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  return router;
}
