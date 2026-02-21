// MCP Server entry point — exposes Hedera blockchain tools via stdin/stdout JSON-RPC 2.0
// OpenClaw mcp-adapter or Claude Code runs this server as a subprocess to invoke tools

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
