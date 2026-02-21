// MCP Server 진입점 — Hedera 블록체인 도구를 stdin/stdout JSON-RPC 2.0으로 노출
// OpenClaw mcp-adapter 또는 Claude Code가 이 서버를 subprocess로 실행하여 도구 호출

import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools.js';

const server = new McpServer({
  name: 'hedera-knowledge-tools',
  version: '0.1.0',
});

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
