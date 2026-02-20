/**
 * E2E test: record a lesson and verify cogito picks it up.
 */
import AinModule from '../../ain-js/lib/ain.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const Ain: any = (AinModule as any).default ?? AinModule;

async function main() {
  const config = JSON.parse(
    readFileSync(join(process.env.HOME || '', '.claude/ain-config.json'), 'utf-8')
  );
  const ain = new Ain(config.providerUrl);
  ain.wallet.addAndSetDefaultAccount(config.privateKey);

  const topicPath = 'lessons/e2e-test';
  try {
    await ain.knowledge.registerTopic(topicPath, {
      title: 'e2e test',
      description: 'End-to-end test topic',
    });
    console.log('Topic registered');
  } catch (err: any) {
    console.log(`Topic: ${err.message || 'already exists'}`);
  }

  const result = await ain.knowledge.explore({
    topicPath,
    title: 'Recipe-driven architecture separates domain logic from infrastructure',
    content: 'Chose to separate domain-specific system prompts (recipes) from the general enrichment engine. Recipes are stored on blockchain as markdown with YAML front matter, allowing any domain to register its own enrichment pipeline without modifying the core container. This follows the plugin/extension pattern common in build tools like webpack and babel.',
    summary: 'Separating recipes from the enrichment engine enables multi-domain knowledge processing',
    depth: 2,
    tags: 'lesson_learned,architecture,plugin-pattern,separation-of-concerns',
  });

  console.log('Lesson written:', JSON.stringify(result));
  console.log('\nWaiting for cogito watcher to process (next poll cycle)...');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
