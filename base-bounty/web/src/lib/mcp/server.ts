/**
 * MCP Server singleton.
 * Registers all cogito-mcp tools and exposes them via Streamable HTTP transport.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchArxivSchema, searchArxiv } from './tools/search-arxiv';
import { findGithubRepoSchema, findGithubRepo } from './tools/find-github-repo';
import { publicationGuideSchema, publicationGuide } from './tools/publication-guide';
import { checkPublicationStatusSchema, checkPublicationStatus } from './tools/check-publication-status';

/** Create a fresh McpServer with all tools registered. */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'cogito-mcp',
    version: '1.0.0',
  });

  // ── search_arxiv ──────────────────────────────────────────────────
  server.tool(
    'search_arxiv',
    'Search arXiv for academic papers matching a query',
    searchArxivSchema,
    async (args) => {
      const result = await searchArxiv(args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── find_github_repo ──────────────────────────────────────────────
  server.tool(
    'find_github_repo',
    'Find the official GitHub repository for a given paper',
    findGithubRepoSchema,
    async (args) => {
      const result = await findGithubRepo(args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── publication_guide ─────────────────────────────────────────────
  server.tool(
    'publication_guide',
    'Enrich a lesson with related papers and code repos into a publication-ready guide',
    publicationGuideSchema,
    async (args) => {
      const result = await publicationGuide(args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  // ── check_publication_status ─────────────────────────────────────
  server.tool(
    'check_publication_status',
    'Check if similar enriched content already exists on the AIN blockchain to prevent duplicate publications',
    checkPublicationStatusSchema,
    async (args) => {
      const result = await checkPublicationStatus(args);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    },
  );

  return server;
}

/** @deprecated Use createMcpServer() instead — singleton can't reconnect transports. */
export const getMcpServer = createMcpServer;
