import { Router, Request, Response } from 'express';
import Ain from '@ainblockchain/ain-js';

export function createKnowledgeRouter(ain: Ain): Router {
  const router = Router();

  // GET /explore/:topicPath — get explorations for a topic
  router.get('/explore/*', async (req: Request, res: Response) => {
    try {
      const topicPath = (req.params as any)[0] || req.params.topicPath;
      if (!topicPath) {
        res.status(400).json({ error: 'Missing topicPath' });
        return;
      }

      // Get all explorers for this topic
      const explorers = await ain.knowledge.getExplorers(topicPath);
      const allExplorations: Record<string, any> = {};

      for (const addr of explorers) {
        const explorations = await ain.knowledge.getExplorations(addr, topicPath);
        if (explorations) {
          allExplorations[addr] = explorations;
        }
      }

      res.json({ topicPath, explorations: allExplorations });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /frontier/:topic — frontier map stats
  router.get('/frontier/*', async (req: Request, res: Response) => {
    try {
      const topic = (req.params as any)[0] || req.params.topic;
      const frontier = await ain.knowledge.getFrontier(topic);
      res.json(frontier);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /graph — full knowledge graph
  router.get('/graph', async (_req: Request, res: Response) => {
    try {
      const graph = await ain.knowledge.getGraph();
      res.json(graph);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /curate — LLM-generated deep analysis
  router.post('/curate', async (req: Request, res: Response) => {
    try {
      const { question, nodeIds } = req.body;
      if (!question) {
        res.status(400).json({ error: 'Missing question' });
        return;
      }

      const analysis = await ain.knowledge.aiAnalyze(question, nodeIds || []);
      res.json({ question, analysis });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
