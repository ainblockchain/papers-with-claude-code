// Pod IP-based request rate limiting
// Uses a sliding window approach to limit requests per minute and prevent API abuse

import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // Max requests per minute

// Periodically clean up stale entries (prevent memory leaks)
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
  // Fall back to direct connection IP if X-Forwarded-For is absent (intra-cluster communication)
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let entry = store.get(clientIp);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(clientIp, entry);
  }

  // Remove timestamps outside the sliding window
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
