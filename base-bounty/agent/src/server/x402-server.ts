import express from 'express';
import Ain from '@ainblockchain/ain-js';
import { AgentConfig } from '../config.js';
import { createKnowledgeRouter } from './routes/knowledge.js';
import { createCourseRouter } from './routes/course.js';

export interface X402ServerOptions {
  ain: Ain;
  config: AgentConfig;
  getStatus: () => any;
}

export function createX402Server({ ain, config, getStatus }: X402ServerOptions): express.Application {
  const app = express();
  app.use(express.json());

  // -------------------------------------------------------------------------
  // x402 payment middleware setup
  // In production, this uses @x402/express paymentMiddleware to gate routes.
  // The middleware intercepts requests and requires x402 payment before
  // forwarding to the actual handler.
  // -------------------------------------------------------------------------
  let paymentMiddleware: any = null;
  try {
    // Dynamic import to handle optional dependency
    const x402Express = require('@x402/express');
    paymentMiddleware = x402Express.paymentMiddleware;
  } catch {
    console.log('[x402] @x402/express not available, running without payment gating');
  }

  // Payment configuration per route
  const paymentConfig: Record<string, string> = {
    '/course/unlock-stage': '0.001',
    '/knowledge/explore': '0.005',
    '/knowledge/frontier': '0.002',
    '/knowledge/curate': '0.05',
    '/knowledge/graph': '0.01',
  };

  // Apply payment middleware if available
  if (paymentMiddleware) {
    for (const [path, price] of Object.entries(paymentConfig)) {
      app.use(path, paymentMiddleware({
        price,
        currency: 'USDC',
        facilitatorUrl: config.x402FacilitatorUrl,
        payTo: config.basePrivateKey, // Address derived from key
      }));
    }
  }

  // -------------------------------------------------------------------------
  // Unauthenticated status endpoint
  // -------------------------------------------------------------------------
  app.get('/status', (_req, res) => {
    res.json(getStatus());
  });

  // -------------------------------------------------------------------------
  // Knowledge routes (x402 gated)
  // -------------------------------------------------------------------------
  app.use('/knowledge', createKnowledgeRouter(ain));

  // -------------------------------------------------------------------------
  // Course routes (x402 gated)
  // -------------------------------------------------------------------------
  app.use('/course', createCourseRouter(ain));

  return app;
}

export function startX402Server(options: X402ServerOptions): Promise<void> {
  return new Promise((resolve) => {
    const app = createX402Server(options);
    app.listen(options.config.x402Port, () => {
      console.log(`[x402] Server listening on port ${options.config.x402Port}`);
      resolve();
    });
  });
}
