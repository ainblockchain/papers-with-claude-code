import Ain from '@ainblockchain/ain-js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const AIN_URL  = process.env.AIN_URL  || 'http://localhost:8081';
const MCP_URL  = process.env.MCP_URL  || 'http://localhost:3000';
const AIN_KEY  = process.env.AIN_TEST_PRIVATE_KEY || '<devnet key>';

// --- seedExploration ---
// Usage: npx tsx helpers.ts seed <topicPath> <title> <tags>
async function seed(topicPath: string, title: string, tags: string) {
  const ain = new Ain(AIN_URL);
  ain.wallet.addAndSetDefaultAccount(AIN_KEY);
  try { await ain.knowledge.setupApp(); } catch {}
  try { await ain.knowledge.registerTopic(topicPath, { title: topicPath, description: 'test' }); } catch {}
  const result = await ain.knowledge.explore({
    topicPath, title, content: `Test content for ${title}`,
    summary: title, depth: 1, tags,
  });
  console.log(JSON.stringify({ entryId: result.entryId }));
}

// --- callMcpTool ---
// Usage: npx tsx helpers.ts mcp-tool <toolName> <argsJson>
async function mcpTool(toolName: string, argsJson: string) {
  const client = new Client({ name: 'test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_URL}/api/mcp`));
  await client.connect(transport);
  const result = await client.callTool({ name: toolName, arguments: JSON.parse(argsJson) });
  await client.close();
  const text = (result.content as any[])[0]?.text;
  console.log(text);  // raw JSON from tool
}

// --- listMcpTools ---
// Usage: npx tsx helpers.ts mcp-list
async function mcpList() {
  const client = new Client({ name: 'test', version: '1.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${MCP_URL}/api/mcp`));
  await client.connect(transport);
  const { tools } = await client.listTools();
  await client.close();
  console.log(JSON.stringify(tools.map(t => t.name).sort()));
}

// CLI dispatcher
const [cmd, ...args] = process.argv.slice(2);
switch (cmd) {
  case 'seed':     seed(args[0], args[1], args[2] || '').then(() => process.exit(0)); break;
  case 'mcp-tool': mcpTool(args[0], args[1]).then(() => process.exit(0)); break;
  case 'mcp-list': mcpList().then(() => process.exit(0)); break;
  default:         console.error(`Unknown command: ${cmd}`); process.exit(1);
}
