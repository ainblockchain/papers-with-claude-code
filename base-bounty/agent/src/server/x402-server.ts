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

export async function createX402Server({ ain, config, baseAddress, getStatus }: X402ServerOptions): Promise<express.Application> {
  const app = express();
  app.use(express.json());

  const x402Enabled = await setupX402Middleware(app, ain, config, baseAddress);

  // -------------------------------------------------------------------------
  // Unauthenticated endpoints
  // -------------------------------------------------------------------------
  app.get('/status', (_req, res) => {
    res.json(getStatus());
  });

  app.get('/health', async (_req, res) => {
    const checks: Record<string, boolean> = {
      server: true,
      x402: x402Enabled,
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
