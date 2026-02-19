// Anthropic API 역방향 프록시 핵심 로직
// 샌드박스 Pod에서 오는 요청의 더미 API 키를 진짜 키로 교체한 뒤
// api.anthropic.com으로 전달. SSE 스트리밍을 위해 body parser 없이 raw 파이핑.
//
// 주의: 미들웨어를 경로 기반으로 마운트하면 안 됨.
// Express의 router.use('/v1/*', handler)는 req.path를 스트리핑하고,
// router.use('/v1', proxy)는 업스트림 전달 시 /v1 prefix를 제거함.
// 따라서 루트 레벨에 마운트하여 전체 경로를 보존해야 함.

import { createProxyMiddleware } from 'http-proxy-middleware';
import { Router, Request, Response, NextFunction } from 'express';
import { rateLimiter } from './rate-limiter.js';

// 허용된 API 경로만 프록시. 관리 API 접근 차단.
const ALLOWED_PATHS = ['/v1/messages', '/v1/messages/count_tokens'];

const ANTHROPIC_API_URL = 'https://api.anthropic.com';

export function createProxyRouter(): Router {
  const router = Router();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
  }

  // 경로 화이트리스트 체크 — 루트 레벨 마운트로 req.path 스트리핑 방지
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

  // 프록시 — 루트 레벨 마운트로 전체 경로(/v1/messages)를 업스트림에 그대로 전달
  const proxy = createProxyMiddleware({
    target: ANTHROPIC_API_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // 더미 키를 진짜 키로 교체
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

  // pathCheck → rateLimiter → proxy 순서로 체이닝 (모두 루트 레벨 마운트)
  router.use(pathCheck, rateLimiter, proxy);

  return router;
}
