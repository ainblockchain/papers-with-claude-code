// Per-user paper learning progress query API

import { Router, Request, Response } from 'express';
import { ProgressStore } from '../db/progress.js';

export function createProgressRouter(progressStore: ProgressStore): Router {
  const router = Router();

  router.get('/progress/:userId/:courseId', (req: Request, res: Response) => {
    const { userId, courseId } = req.params as { userId: string; courseId: string };
    const progress = progressStore.getProgress(userId, courseId);
    const payments = progressStore.getPayments(userId, courseId);
    res.json({
      ...progress,
      unlockedStages: payments,
    });
  });

  router.get('/progress/:userId', (req: Request, res: Response) => {
    const { userId } = req.params as { userId: string };
    res.json(progressStore.getAllProgress(userId));
  });

  return router;
}
