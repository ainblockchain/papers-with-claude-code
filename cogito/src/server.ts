/**
 * Cogito Container — Main entry point.
 *
 * 1. Watches AIN blockchain for new lesson_learned entries
 * 2. Enriches lessons with related papers + code via vLLM
 * 3. Serves x402-gated educational content via Express
 */

import { AinClient } from './ain-client.js';
import { LessonWatcher } from './lesson-watcher.js';
import { createServer } from './x402-server.js';

const AIN_PROVIDER_URL = process.env.AIN_PROVIDER_URL || 'http://localhost:8080';
const AIN_PRIVATE_KEY = process.env.AIN_PRIVATE_KEY || '';
const PORT = parseInt(process.env.X402_PORT || '3402');

async function main() {
  console.log('=== Cogito Container ===');
  console.log('Lesson watcher + x402 content server');
  console.log(`AIN Node: ${AIN_PROVIDER_URL}`);
  console.log(`vLLM: ${process.env.VLLM_URL || 'http://localhost:8000'}`);
  console.log('');

  if (!AIN_PRIVATE_KEY) {
    console.error('ERROR: AIN_PRIVATE_KEY is required');
    process.exit(1);
  }

  // Init AIN client
  const ain = new AinClient(AIN_PROVIDER_URL, AIN_PRIVATE_KEY);
  await ain.init();
  console.log(`[Cogito] Address: ${ain.getAddress()}`);

  // Register base topics
  const baseTopics = ['lessons', 'lessons/architecture', 'lessons/engineering', 'lessons/ai'];
  for (const topic of baseTopics) {
    try { await ain.registerTopic(topic); } catch {}
  }

  // Start lesson watcher
  const watcher = new LessonWatcher(ain);
  watcher.start();

  // Start x402 content server
  const app = createServer(ain);
  app.listen(PORT, () => {
    console.log(`[Cogito] x402 server listening on port ${PORT}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[Cogito] Shutting down...');
    watcher.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
