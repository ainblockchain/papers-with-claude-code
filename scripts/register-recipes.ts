/**
 * Register domain-specific recipes to the AIN blockchain.
 * Reads .md files from cogito-recipes/ and calls ain.cogito.registerRecipe() for each.
 *
 * Usage: npx tsx scripts/register-recipes.ts
 *
 * Requires AIN_PROVIDER_URL and AIN_PRIVATE_KEY env vars (or ~/.claude/ain-config.json).
 */

import { readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Use local ain-js build (includes cogito module)
import AinModule from '../../ain-js/lib/ain.js';
const Ain: any = (AinModule as any).default ?? AinModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
const RECIPES_DIR = resolve(__dirname, '../cogito-recipes');

async function main() {
  // Load config: try ain-config.json first, then env vars
  let providerUrl = process.env.AIN_PROVIDER_URL || '';
  let privateKey = process.env.AIN_PRIVATE_KEY || '';

  try {
    const configPath = join(process.env.HOME || '', '.claude/ain-config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    providerUrl = providerUrl || config.providerUrl || 'https://testnet-api.ainetwork.ai';
    privateKey = privateKey || config.privateKey || '';
  } catch {}

  if (!privateKey) {
    console.error('ERROR: No private key found. Set AIN_PRIVATE_KEY or configure ~/.claude/ain-config.json');
    process.exit(1);
  }

  const ain = new Ain(providerUrl);
  const address = ain.wallet.addAndSetDefaultAccount(privateKey);
  console.log(`Address: ${address}`);
  console.log(`Provider: ${providerUrl}`);
  console.log(`Recipes dir: ${RECIPES_DIR}`);
  console.log('');

  // Ensure /apps/cogito exists with write rules
  console.log('Setting up /apps/cogito...');
  try {
    const createResult = await ain.sendTransaction({
      operation: {
        type: 'SET_VALUE',
        ref: `/manage_app/cogito/create/${Date.now()}`,
        value: { admin: { [address]: true } },
      },
    });
    const code = createResult?.result?.code;
    if (code === 0 || code === undefined) {
      console.log('  App created (or already exists)');
    } else {
      console.log(`  App create result: code=${code} ${createResult?.result?.message || ''}`);
    }
  } catch (err: any) {
    console.log(`  App setup: ${err.message}`);
  }

  // Set write rule: any authenticated user can write to their own recipes path
  try {
    const ruleResult = await ain.sendTransaction({
      operation: {
        type: 'SET_RULE',
        ref: '/apps/cogito/recipes/$address',
        value: {
          '.rule': {
            write: 'auth.addr === $address',
          },
        },
      },
    });
    const code = ruleResult?.result?.code;
    if (code === 0 || code === undefined) {
      console.log('  Write rule set');
    } else {
      console.log(`  Rule result: code=${code} ${ruleResult?.result?.message || ''}`);
    }
  } catch (err: any) {
    console.log(`  Rule setup: ${err.message}`);
  }
  console.log('');

  const files = readdirSync(RECIPES_DIR).filter(f => f.endsWith('.md'));
  if (files.length === 0) {
    console.log('No .md recipe files found in cogito-recipes/');
    return;
  }

  for (const file of files) {
    const markdown = readFileSync(join(RECIPES_DIR, file), 'utf-8');
    console.log(`Registering: ${file}...`);

    try {
      const result = await ain.cogito.registerRecipe(markdown);
      console.log(`  OK: ${JSON.stringify(result?.result || 'done')}`);
    } catch (err: any) {
      console.error(`  FAILED: ${err.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
