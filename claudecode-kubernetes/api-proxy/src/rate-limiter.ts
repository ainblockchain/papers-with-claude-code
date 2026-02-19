// Pod IP 기반 요청 속도 제한
// 슬라이딩 윈도우 방식으로 분당 요청 수를 제한하여 API 남용 방지

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1분
const MAX_REQUESTS = 30;  // 분당 최대 요청 수

// 오래된 엔트리를 주기적으로 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, WINDOW_MS);

export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  // X-Forwarded-For가 없으면 직접 연결 IP 사용 (클러스터 내부 통신)
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = store.get(clientIp);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(clientIp, entry);
  }

  // 윈도우 밖의 오래된 타임스탬프 제거
  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.timestamps[0]! + WINDOW_MS - now) / 1000);
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      error: {
        type: 'rate_limit_error',
        message: `Rate limit exceeded. Max ${MAX_REQUESTS} requests per minute. Retry after ${retryAfter}s.`,
      },
    });
    return;
  }

  entry.timestamps.push(now);
  next();
}
