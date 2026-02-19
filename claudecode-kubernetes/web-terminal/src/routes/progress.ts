// 유저별 논문 학습 진행도 조회 API

import { Router, Request, Response } from 'express';
import { ProgressStore } from '../db/progress.js';

export function createProgressRouter(progressStore: ProgressStore): Router {
  const router = Router();

  router.get('/progress/:userId/:paperId', (req: Request, res: Response) => {
    const { userId, paperId } = req.params as { userId: string; paperId: string };
    res.json(progressStore.getProgress(userId, paperId));
  });

  router.get('/progress/:userId', (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    res.json(progressStore.getAllProgress(userId));
  });

  return router;
}
