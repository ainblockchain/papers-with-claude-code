/**
 * x402 Content Server.
 * Express app serving educational content with x402 payment gating.
 */

import { createServer as createHttpServer } from 'http';
import { AinClient } from './ain-client.js';
import { ContentListing } from './types.js';

// Minimal Express-like HTTP server (avoids express dependency in container)
type Handler = (req: any, res: any) => void | Promise<void>;

interface Route {
  method: string;
  path: string;
  handler: Handler;
}

function createApp() {
  const routes: Route[] = [];

  const app = {
    get(path: string, handler: Handler) { routes.push({ method: 'GET', path, handler }); },
    post(path: string, handler: Handler) { routes.push({ method: 'POST', path, handler }); },
    listen(port: number, cb?: () => void) {
      const server = createHttpServer(async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        const url = new URL(req.url || '/', `http://localhost:${port}`);
        const method = req.method || 'GET';

        // Match route (simple prefix matching with params)
        for (const route of routes) {
          if (route.method !== method) continue;

          const match = matchRoute(route.path, url.pathname);
          if (match) {
            (req as any).params = match;
            (req as any).query = Object.fromEntries(url.searchParams);

            const json = (data: any, status = 200) => {
              res.writeHead(status, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(data));
            };
            (res as any).json = json;
            (res as any).status = (code: number) => {
              return { json: (data: any) => json(data, code) };
            };

            try {
              await route.handler(req, res);
            } catch (err: any) {
              console.error(`[Server] Error: ${err.message}`);
              json({ error: 'Internal server error' }, 500);
            }
            return;
          }
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      server.listen(port, cb);
      return server;
    },
  };

  return app;
}

function matchRoute(pattern: string, pathname: string): Record<string, string> | null {
  // Convert :param patterns to regex
  const paramNames: string[] = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  }).replace(/\*/g, '(.*)');

  const regex = new RegExp(`^${regexStr}$`);
  const match = pathname.match(regex);
  if (!match) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, i) => {
    params[name] = match[i + 1];
  });
  return params;
}

/**
 * Create the x402 content server.
 */
export function createServer(ain: AinClient) {
  const app = createApp();

  // Health check
  app.get('/health', (_req: any, res: any) => {
    res.json({ status: 'ok', address: ain.getAddress() });
  });

  // List all available content (free)
  app.get('/content', async (_req: any, res: any) => {
    try {
      const explorations = await ain.getAllExplorations();
      const listings: ContentListing[] = [];

      if (explorations) {
        for (const [topicKey, entries] of Object.entries(explorations)) {
          if (!entries || typeof entries !== 'object') continue;
          for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
            const tags = (entry.tags || '').split(',').map((t: string) => t.trim());
            listings.push({
              id: `${topicKey}/${entryId}`,
              title: entry.title || 'Untitled',
              summary: entry.summary || '',
              tags,
              price: entry.price || '0',
              created_at: entry.created_at || 0,
              paperCount: tags.filter((t: string) => t.startsWith('arxiv:')).length,
              hasCode: tags.includes('has-code'),
            });
          }
        }
      }

      // Sort by created_at descending
      listings.sort((a, b) => b.created_at - a.created_at);
      res.json({ count: listings.length, listings });
    } catch (err: any) {
      (res as any).status(500).json({ error: err.message });
    }
  });

  // Get specific content by ID
  // If gated (has price), return 402 unless payment proof provided
  app.get('/content/:topicKey/:entryId', async (req: any, res: any) => {
    try {
      const topicPath = req.params.topicKey.replace(/_/g, '/');
      const explorations = await ain.getExplorations(topicPath);

      if (!explorations || !explorations[req.params.entryId]) {
        (res as any).status(404).json({ error: 'Content not found' });
        return;
      }

      const entry = explorations[req.params.entryId];
      const price = entry.price;

      // If content is gated and no payment proof
      if (price && parseFloat(price) > 0) {
        // TODO: Verify x402 payment proof from headers
        // For now, return 402 with payment details
        res.json({
          status: 402,
          title: entry.title,
          summary: entry.summary,
          tags: (entry.tags || '').split(','),
          price,
          currency: 'USDC',
          chain: 'base',
          payTo: ain.getAddress(),
          message: 'Payment required. Send USDC to payTo address on Base chain.',
        }, 402);
        return;
      }

      // Free content — return full
      res.json({
        title: entry.title,
        summary: entry.summary,
        content: entry.content,
        tags: (entry.tags || '').split(','),
        depth: entry.depth,
        created_at: entry.created_at,
      });
    } catch (err: any) {
      (res as any).status(500).json({ error: err.message });
    }
  });

  // Get content by topic
  app.get('/content/topic/:topicPath', async (req: any, res: any) => {
    try {
      const topicPath = req.params.topicPath.replace(/_/g, '/');
      const explorations = await ain.getExplorations(topicPath);

      if (!explorations) {
        res.json({ count: 0, entries: [] });
        return;
      }

      const entries = Object.entries(explorations).map(([id, entry]: [string, any]) => ({
        id,
        title: entry.title,
        summary: entry.summary,
        tags: (entry.tags || '').split(','),
        price: entry.price || '0',
        created_at: entry.created_at,
      }));

      res.json({ count: entries.length, entries });
    } catch (err: any) {
      (res as any).status(500).json({ error: err.message });
    }
  });

  // Get lessons only (free summaries)
  app.get('/lessons', async (_req: any, res: any) => {
    try {
      const explorations = await ain.getAllExplorations();
      const lessons: any[] = [];

      if (explorations) {
        for (const [topicKey, entries] of Object.entries(explorations)) {
          if (!entries || typeof entries !== 'object') continue;
          for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
            const tags = (entry.tags || '').toLowerCase();
            if (tags.includes('lesson_learned')) {
              lessons.push({
                id: `${topicKey}/${entryId}`,
                title: entry.title,
                summary: entry.summary,
                tags: entry.tags,
                created_at: entry.created_at,
              });
            }
          }
        }
      }

      lessons.sort((a, b) => b.created_at - a.created_at);
      res.json({ count: lessons.length, lessons });
    } catch (err: any) {
      (res as any).status(500).json({ error: err.message });
    }
  });

  // Record a lesson (called by /lesson skill script)
  app.post('/lesson', async (req: any, res: any) => {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);

      if (!data.title || !data.content) {
        (res as any).status(400).json({ error: 'title and content required' });
        return;
      }

      const topicPath = data.topicPath || 'lessons';
      const result = await ain.writeLesson(topicPath, {
        title: data.title,
        content: data.content,
        summary: data.summary || data.content.slice(0, 200),
        tags: data.tags || [],
      });

      res.json({ success: true, entryId: result.entryId, topicPath });
    } catch (err: any) {
      (res as any).status(500).json({ error: err.message });
    }
  });

  // Knowledge graph stats
  app.get('/stats', async (_req: any, res: any) => {
    try {
      const frontier = await ain.getFrontierMap();
      const graph = await ain.getGraph();

      res.json({
        address: ain.getAddress(),
        topics: frontier.length,
        graphNodes: Object.keys(graph.nodes || {}).length,
        graphEdges: Object.keys(graph.edges || {}).length,
        frontier,
      });
    } catch (err: any) {
      (res as any).status(500).json({ error: err.message });
    }
  });

  return app;
}
