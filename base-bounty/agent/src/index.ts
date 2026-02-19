import { loadConfig } from './config.js';
import { CogitoNode } from './cogito.js';

async function main() {
  const config = loadConfig();
  const node = new CogitoNode(config);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\n[Cogito] Received shutdown signal...');
    await node.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await node.start();
  console.log(`[Cogito] Node is running.`);
  console.log(`[Cogito] x402 server: http://localhost:${config.x402Port}`);
  console.log(`[Cogito] Status:      http://localhost:${config.x402Port}/status`);
  console.log('[Cogito] Press Ctrl+C to stop.');
}

main().catch((err) => {
  console.error('[Cogito] Fatal error:', err);
  process.exit(1);
});
