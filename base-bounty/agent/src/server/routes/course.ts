import { Router, Request, Response } from 'express';
import Ain from '@ainblockchain/ain-js';

export function createCourseRouter(ain: Ain): Router {
  const router = Router();

  // POST /unlock-stage — generate/retrieve a course stage
  router.post('/unlock-stage', async (req: Request, res: Response) => {
    try {
      const { topicPath, stageIndex } = req.body;
      if (!topicPath) {
        res.status(400).json({ error: 'Missing topicPath' });
        return;
      }

      // Get explorations for this topic
      const address = ain.signer.getAddress();
      const explorations = await ain.knowledge.getExplorations(address, topicPath);
      if (!explorations || Object.keys(explorations).length === 0) {
        res.status(404).json({ error: 'No explorations found for this topic' });
        return;
      }

      const explorationList = Object.values(explorations);

      // Generate course stages
      const stages = await ain.knowledge.aiGenerateCourse(topicPath, explorationList);

      const idx = stageIndex || 0;
      if (idx >= stages.length) {
        res.status(404).json({ error: `Stage ${idx} not found. Total stages: ${stages.length}` });
        return;
      }

      res.json({
        topicPath,
        stageIndex: idx,
        totalStages: stages.length,
        stage: stages[idx],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
