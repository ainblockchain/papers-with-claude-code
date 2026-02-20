// Core logic for the Anthropic API reverse proxy
// Replaces the dummy API key from sandbox Pod requests with the real key,
// then forwards to api.anthropic.com. Uses raw piping without body parser for SSE streaming.
//
// Note: Middleware must not be mounted on a path basis.
// Express's router.use('/v1/*', handler) strips req.path,
// and router.use('/v1', proxy) removes the /v1 prefix when forwarding upstream.
// Therefore, it must be mounted at root level to preserve the full path.

import { createProxyMiddleware } from 'http-proxy-middleware';
import { Router, Request, Response, NextFunction } from 'express';
import { rateLimiter } from './rate-limiter.js';

// Only proxy allowed API paths. Block access to admin APIs.
const ALLOWED_PATHS = ['/v1/messages', '/v1/messages/count_tokens'];

const ANTHROPIC_API_URL = 'https://api.anthropic.com';

export function createProxyRouter(): Router {
  const router = Router();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
  }

  // Path whitelist check — mounted at root level to prevent req.path stripping
  const pathCheck = (req: Request, res: Response, next: NextFunction): void => {
    const reqPath = req.path;
    const isAllowed = ALLOWED_PATHS.some(
      (path) => reqPath === path || reqPath.startsWith(path + '/')
    );

    if (!isAllowed) {
      console.warn(`[BLOCKED] ${req.method} ${reqPath} from ${req.ip}`);
      res.status(403).json({
        error: {
          type: 'forbidden',
          message: `Path ${reqPath} is not allowed through this proxy.`,
        },
      });
      return;
    }

    next();
  };

  // Proxy — mounted at root level to forward the full path (/v1/messages) to upstream as-is
  const proxy = createProxyMiddleware({
    target: ANTHROPIC_API_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Replace dummy key with the real key
        proxyReq.setHeader('x-api-key', apiKey);
        if (proxyReq.getHeader('authorization')) {
          proxyReq.setHeader('authorization', `Bearer ${apiKey}`);
        }
        console.log(`[PROXY] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
      },
      proxyRes: (proxyRes, req) => {
        console.log(`[PROXY] Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
      },
      error: (err, req, res) => {
        console.error(`[PROXY ERROR] ${err.message}`);
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          (res as any).writeHead(502, { 'Content-Type': 'application/json' });
          (res as any).end(
            JSON.stringify({
              error: {
                type: 'proxy_error',
                message: 'Failed to connect to upstream API.',
              },
            })
          );
        }
      },
    },
  });

  // Chain in order: pathCheck -> rateLimiter -> proxy (all mounted at root level)
  router.use(pathCheck, rateLimiter, proxy);

  return router;
}
