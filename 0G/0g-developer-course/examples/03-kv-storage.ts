/**
 * 03-kv-storage.ts
 *
 * Module 2 Example: Read and write to the 0G Key-Value storage layer
 *
 * Demonstrates:
 * - Batcher for batched KV writes (multiple ops in one tx)
 * - KvClient for reading values
 * - Stream ID as a namespace for organizing KV data
 *
 * Run: npm run kv
 *
 * Prerequisites:
 * - PRIVATE_KEY in .env (funded with testnet 0G)
 * - ZG_KV_NODE_URL in .env (optional, has fallback)
 */

import 'dotenv/config';
import { Indexer, Batcher, KvClient } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';

// ============================================================
// Configuration
// ============================================================
const RPC_URL = process.env.ZG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';
const INDEXER_URL = process.env.ZG_INDEXER_URL ?? 'https://indexer-storage-testnet-turbo.0g.ai';
const KV_NODE_URL = process.env.ZG_KV_NODE_URL ?? 'http://kv-testnet.0g.ai:6789';

// The Flow contract address handles storage payments
const FLOW_CONTRACT = '0x22E03a6A89B950F1c82ec5e74F8eCa321a105296';

// Stream ID: a bytes32 namespace for your application's KV store.
// Each application should use a unique streamId to avoid key collisions.
// In production, generate a random one and store it in your config.
const STREAM_ID = '0x' + '0'.repeat(63) + '1'; // Example: last byte = 1

if (!process.env.PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY not set in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const indexer = new Indexer(INDEXER_URL);

// ============================================================
// Helper: encode string as Uint8Array
// ============================================================
function encodeStr(s: string): Uint8Array {
  return Uint8Array.from(Buffer.from(s, 'utf-8'));
}

// ============================================================
// Write: Batch multiple KV operations into one transaction
// ============================================================
async function kvWrite(entries: Record<string, string>): Promise<string | null> {
  console.log(`\nWriting ${Object.keys(entries).length} KV entries to stream ${STREAM_ID}...`);

  // Select a storage node to send the KV data to
  const [nodes, selectErr] = await indexer.selectNodes(1);
  if (selectErr) throw new Error(`Node selection failed: ${selectErr}`);

  // Batcher batches multiple KV writes into a single on-chain transaction
  const batcher = new Batcher(1, nodes, FLOW_CONTRACT, RPC_URL);

  for (const [key, value] of Object.entries(entries)) {
    const keyBytes = encodeStr(key);
    const valueBytes = encodeStr(value);
    batcher.streamDataBuilder.set(STREAM_ID, keyBytes, valueBytes);
    console.log(`  set("${key}", "${value}")`);
  }

  const [tx, batchErr] = await batcher.exec();
  if (batchErr) throw new Error(`Batch write failed: ${batchErr}`);

  console.log('  Transaction:', tx);
  return tx;
}

// ============================================================
// Read: Query a KV value from a KV node
// ============================================================
async function kvRead(key: string): Promise<string | null> {
  const kvClient = new KvClient(KV_NODE_URL);
  const keyBytes = encodeStr(key);
  const encodedKey = ethers.encodeBase64(keyBytes);

  try {
    const value = await kvClient.getValue(STREAM_ID, encodedKey);
    if (!value) return null;
    // Decode the base64-encoded value back to a string
    return Buffer.from(value, 'base64').toString('utf-8');
  } catch (err) {
    // KV node may not be available in all testnet configurations
    console.warn(`  KV read warning: ${err}`);
    return null;
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('0G KV Storage Example');
  console.log('=====================');
  console.log('Network:', RPC_URL);
  console.log('Wallet:', signer.address);
  console.log('Stream ID:', STREAM_ID);

  const balance = await provider.getBalance(signer.address);
  console.log('Balance:', ethers.formatEther(balance), '0G');

  if (balance === 0n) {
    console.warn('\nWARNING: No 0G tokens. Get some at https://faucet.0g.ai');
    process.exit(1);
  }

  // Write a batch of key-value pairs
  await kvWrite({
    'agent-version': 'v1.2.0',
    'last-trained': new Date().toISOString(),
    'model-accuracy': '0.94',
    'dataset-root': '0x' + '0'.repeat(64), // Replace with actual rootHash
  });

  console.log('\nWaiting for transaction to propagate...');
  await new Promise(r => setTimeout(r, 3000));

  // Read back the values
  console.log('\nReading values back from KV node...');
  const version = await kvRead('agent-version');
  const accuracy = await kvRead('model-accuracy');

  if (version !== null) {
    console.log('  agent-version:', version);
    console.log('  model-accuracy:', accuracy);
  } else {
    console.log('  (KV node not available or values not yet propagated)');
    console.log('  The writes were submitted on-chain. Try reading again in a few seconds.');
  }

  console.log('\nKV Storage Notes:');
  console.log('  - Log Layer (files): immutable, use rootHash to retrieve');
  console.log('  - KV Layer (this example): mutable, organized by streamId + key');
  console.log('  - Use KV for agent state, configs, counters that change over time');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
