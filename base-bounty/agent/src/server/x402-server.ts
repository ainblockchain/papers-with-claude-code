import { EventEmitter } from 'events';
import express from 'express';
import { ethers } from 'ethers';
import Ain, { AinInstance } from '../ain-import.js';
import { AgentConfig } from '../config.js';
import { createKnowledgeRouter } from './routes/knowledge.js';
import { createCourseRouter } from './routes/course.js';

export interface X402ServerOptions {
  ain: AinInstance;
  config: AgentConfig;
  baseAddress: string;
  getStatus: () => any;
  getEmitter?: () => EventEmitter;
  addChatMessage?: (msg: string) => number;
}

async function setupX402Middleware(app: express.Application, ain: AinInstance, config: AgentConfig, baseAddress: string): Promise<boolean> {
  try {
    const { paymentMiddlewareFromConfig } = await import('@x402/express');
    const { ExactEvmScheme } = await import('@x402/evm');

    // Get private key from ain-js wallet (managed by the node)
    const defaultAddress = ain.wallet.defaultAccount?.address;
    const account = defaultAddress ? (ain.wallet as any).accounts?.[defaultAddress] : null;
    const privateKey = account?.private_key;

    if (!privateKey || !baseAddress) {
      console.log('[x402] No wallet key or base address — payment gating disabled');
      return false;
    }

    const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    const payTo = baseAddress;
    const makeRoute = (price: string, description: string) => ({
      accepts: { scheme: 'exact', network: 'base:8453', payTo, price },
      description,
    });

    const routesConfig: Record<string, any> = {
      'POST /course/unlock-stage': makeRoute('$0.001', 'Unlock course stage'),
      'GET /knowledge/explore/*': makeRoute('$0.005', 'Access explorations'),
      'GET /knowledge/frontier/*': makeRoute('$0.002', 'Access frontier map'),
      'POST /knowledge/curate': makeRoute('$0.05', 'Curated analysis'),
      'GET /knowledge/graph': makeRoute('$0.01', 'Access knowledge graph'),
    };

    const scheme = new ExactEvmScheme(signer as any);
    const facilitatorUrl = config.x402FacilitatorUrl;
    app.use(paymentMiddlewareFromConfig(
      routesConfig,
      [facilitatorUrl] as any,
      [{ network: 'base:8453', server: scheme }] as any,
      undefined, // paywallConfig
      undefined, // paywall
      false,     // syncFacilitatorOnStart — defer until first real payment
    ));
    console.log('[x402] Payment middleware enabled');
    return true;
  } catch (err: any) {
    console.log(`[x402] Payment gating disabled: ${err.message}`);
    return false;
  }
}

export async function createX402Server({ ain, config, baseAddress, getStatus, getEmitter, addChatMessage }: X402ServerOptions): Promise<express.Application> {
  const app = express();
  app.use(express.json());

  // -------------------------------------------------------------------------
  // Unauthenticated, free endpoints (before x402 middleware)
  // -------------------------------------------------------------------------
  app.get('/status', (_req, res) => {
    res.json(getStatus());
  });

  app.get('/health', async (_req, res) => {
    const checks: Record<string, boolean> = {
      server: true,
    };
    try {
      await ain.knowledge.listTopics();
      checks.ainNode = true;
    } catch {
      checks.ainNode = false;
    }
    const healthy = checks.ainNode;
    res.status(healthy ? 200 : 503).json({ healthy, checks });
  });

  // SSE stream endpoint — streams agent cycle events in real-time
  app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Send current status
    const status = getStatus();
    res.write(`event: status\ndata: ${JSON.stringify(status)}\n\n`);

    const emitter = getEmitter?.();
    if (!emitter) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: 'Emitter not available' })}\n\n`);
      return;
    }

    function onCycleStart(data: any) { res.write(`event: cycle_start\ndata: ${JSON.stringify(data)}\n\n`); }
    function onThinking(data: any) { res.write(`event: thinking\ndata: ${JSON.stringify(data)}\n\n`); }
    function onExploration(data: any) { res.write(`event: exploration\ndata: ${JSON.stringify(data)}\n\n`); }
    function onCycleEnd(data: any) { res.write(`event: cycle_end\ndata: ${JSON.stringify(data)}\n\n`); }
    function onUserMessageAck(data: any) { res.write(`event: user_message_ack\ndata: ${JSON.stringify(data)}\n\n`); }

    emitter.on('cycle_start', onCycleStart);
    emitter.on('thinking', onThinking);
    emitter.on('exploration', onExploration);
    emitter.on('cycle_end', onCycleEnd);
    emitter.on('user_message_ack', onUserMessageAck);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      emitter.off('cycle_start', onCycleStart);
      emitter.off('thinking', onThinking);
      emitter.off('exploration', onExploration);
      emitter.off('cycle_end', onCycleEnd);
      emitter.off('user_message_ack', onUserMessageAck);
    });
  });

  // User chat endpoint — queue messages for the agent's next think cycle
  app.post('/chat', (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message field is required' });
    }

    const position = addChatMessage?.(message) ?? 0;
    res.json({ queued: true, position });
  });

  // -------------------------------------------------------------------------
  // x402 payment middleware
  // -------------------------------------------------------------------------
  const x402Enabled = await setupX402Middleware(app, ain, config, baseAddress);

  // -------------------------------------------------------------------------
  // Knowledge routes (x402 gated when enabled)
  // -------------------------------------------------------------------------
  app.use('/knowledge', createKnowledgeRouter(ain));

  // -------------------------------------------------------------------------
  // Course routes (x402 gated when enabled)
  // -------------------------------------------------------------------------
  app.use('/course', createCourseRouter(ain));

  return app;
}

export async function startX402Server(options: X402ServerOptions): Promise<void> {
  const app = await createX402Server(options);
  return new Promise((resolve) => {
    app.listen(options.config.x402Port, () => {
      console.log(`[x402] Server listening on port ${options.config.x402Port}`);
      resolve();
    });
  });
}
