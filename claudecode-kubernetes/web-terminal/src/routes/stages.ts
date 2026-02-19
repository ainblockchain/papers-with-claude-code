// 논문 레포 CLAUDE.md에서 스테이지 정의를 파싱하여 반환하는 API

import { Router, Request, Response } from 'express';
import { AppConfig } from '../types.js';
import { PodManager } from '../k8s/pod-manager.js';
import { getSession } from './sessions.js';

const podManager = new PodManager();

function extractStagesJson(markdown: string): unknown[] {
  const match = markdown.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed.stages) ? parsed.stages : [];
  } catch {
    return [];
  }
}

export function createStagesRouter(_config: AppConfig): Router {
  const router = Router();

  router.get('/sessions/:id/stages', async (req: Request, res: Response) => {
    const session = getSession(req.params.id as string);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    if (session.status !== 'running') {
      res.status(400).json({ error: 'Session is not running' });
      return;
    }

    try {
      const content = await podManager.execInPod(
        session.podName,
        session.namespace,
        ['cat', '/home/claude/paper/CLAUDE.md']
      );
      const stages = extractStagesJson(content);
      res.json(stages);
    } catch (err) {
      console.error('[stages] Failed to read CLAUDE.md:', err);
      res.status(500).json({ error: 'Failed to read stage definitions' });
    }
  });

  return router;
}
