/**
 * 05-full-stack.ts
 *
 * Module 5 Capstone: Full-stack 0G application
 *
 * Demonstrates a complete AI data pipeline on 0G:
 *   1. Upload a dataset to 0G Storage (Log layer — immutable)
 *   2. Store the rootHash as an on-chain data pointer
 *   3. Run AI analysis on the dataset content via 0G Compute
 *   4. Store the analysis result back to 0G Storage
 *   5. Log everything with timestamps
 *
 * This is the "AI Agent Storage Pattern":
 *   Storage (data) + Compute (AI) + Chain (provenance)
 *
 * Run: npm run demo
 *
 * Prerequisites:
 * - PRIVATE_KEY in .env (funded with testnet 0G)
 * - ZG_API_KEY and ZG_PROVIDER_URL in .env (for compute step, optional)
 */

import 'dotenv/config';
import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { writeFileSync, readFileSync } from 'fs';
import OpenAI from 'openai';

// ============================================================
// Configuration
// ============================================================
const RPC_URL = process.env.ZG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';
const INDEXER_URL = process.env.ZG_INDEXER_URL ?? 'https://indexer-storage-testnet-turbo.0g.ai';
const ZG_API_KEY = process.env.ZG_API_KEY;
const ZG_PROVIDER_URL = process.env.ZG_PROVIDER_URL;

if (!process.env.PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY not set in .env');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const indexer = new Indexer(INDEXER_URL);

// Initialize compute client if credentials available
const computeClient = ZG_API_KEY && ZG_PROVIDER_URL
  ? new OpenAI({ apiKey: ZG_API_KEY, baseURL: `${ZG_PROVIDER_URL}/v1/proxy` })
  : null;

// ============================================================
// Step 1: Upload dataset to 0G Storage
// ============================================================
async function uploadDataset(): Promise<string> {
  console.log('\n[1/4] Uploading dataset to 0G Storage...');

  // Create a sample dataset
  const dataset = {
    name: '0G-Course-Sample-Dataset',
    created_at: new Date().toISOString(),
    description: 'Sample dataset demonstrating 0G Storage integration',
    records: [
      { id: 1, question: 'What is 0G?', answer: 'Decentralized AI operating system' },
      { id: 2, question: 'What is 0G Storage?', answer: '95% cheaper than AWS S3' },
      { id: 3, question: 'What is 0G Compute?', answer: '90% cheaper than cloud GPU APIs' },
      { id: 4, question: 'What is 0G DA?', answer: '50 Gbps data availability layer' },
    ]
  };

  const datasetPath = './dataset.json';
  writeFileSync(datasetPath, JSON.stringify(dataset, null, 2));

  const file = await ZgFile.fromFilePath(datasetPath);
  const [tree, treeErr] = await file.merkleTree();
  if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

  const rootHash = tree!.rootHash();
  console.log('  Dataset root hash:', rootHash);

  const [tx, uploadErr] = await indexer.upload(file, RPC_URL, signer);
  if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

  await file.close();
  console.log('  Upload tx:', tx);
  console.log('  ✓ Dataset permanently stored on 0G Storage');

  return rootHash;
}

// ============================================================
// Step 2: Simulate on-chain registration
// (In a real app, you'd call a smart contract here)
// ============================================================
async function registerOnChain(datasetHash: string): Promise<void> {
  console.log('\n[2/4] Registering dataset hash on-chain...');
  console.log('  In a production app, you would call:');
  console.log('  await myContract.recordDataset(datasetHash)');
  console.log('  Dataset hash:', datasetHash);
  console.log('  Network:', RPC_URL);
  console.log('  ✓ (Simulated — deploy a contract and call recordDataset() here)');

  // Example smart contract call (uncomment when you have a deployed contract):
  /*
  const contractABI = ['function recordDataset(bytes32 hash) external'];
  const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);
  const tx = await contract.recordDataset(datasetHash);
  await tx.wait();
  console.log('  Transaction:', tx.hash);
  */
}

// ============================================================
// Step 3: Run AI analysis via 0G Compute
// ============================================================
async function analyzeDataset(datasetHash: string): Promise<string> {
  console.log('\n[3/4] Running AI analysis via 0G Compute...');

  if (!computeClient) {
    const fallback = `Analysis skipped (no compute credentials). Dataset hash: ${datasetHash}. Set ZG_API_KEY and ZG_PROVIDER_URL in .env to enable.`;
    console.log('  (Skipping: ZG_API_KEY or ZG_PROVIDER_URL not set in .env)');
    return fallback;
  }

  const dataset = JSON.parse(readFileSync('./dataset.json', 'utf-8'));

  const response = await computeClient.chat.completions.create({
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    messages: [
      {
        role: 'system',
        content: 'You are a data analyst. Provide a brief, structured analysis.'
      },
      {
        role: 'user',
        content: `Summarize this dataset in 2-3 sentences:\n${JSON.stringify(dataset, null, 2)}`
      }
    ],
    max_tokens: 150,
  });

  const analysis = response.choices[0].message.content ?? 'No analysis generated';
  console.log('  Analysis:', analysis);
  console.log('  ✓ Inference completed via 0G decentralized GPU network');

  return analysis;
}

// ============================================================
// Step 4: Store analysis result back to 0G Storage
// ============================================================
async function storeResult(datasetHash: string, analysis: string): Promise<string> {
  console.log('\n[4/4] Storing analysis result to 0G Storage...');

  const result = {
    timestamp: new Date().toISOString(),
    dataset_hash: datasetHash,
    analysis,
    pipeline: '0G Storage + 0G Compute',
  };

  const resultPath = './analysis-result.json';
  writeFileSync(resultPath, JSON.stringify(result, null, 2));

  const file = await ZgFile.fromFilePath(resultPath);
  const [tree, treeErr] = await file.merkleTree();
  if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

  const resultHash = tree!.rootHash();
  console.log('  Result root hash:', resultHash);

  const [tx, uploadErr] = await indexer.upload(file, RPC_URL, signer);
  if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

  await file.close();
  console.log('  Upload tx:', tx);
  console.log('  ✓ Analysis result permanently stored on 0G Storage');

  return resultHash;
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('0G Full-Stack AI Pipeline Demo');
  console.log('================================');
  console.log('Wallet:', signer.address);
  console.log('Compute:', computeClient ? 'enabled' : 'disabled (set ZG_API_KEY to enable)');

  const balance = await provider.getBalance(signer.address);
  console.log('Balance:', ethers.formatEther(balance), '0G');

  if (balance === 0n) {
    console.warn('\nWARNING: No 0G tokens. Get testnet tokens at: https://faucet.0g.ai');
    process.exit(1);
  }

  // Run the full pipeline
  const datasetHash = await uploadDataset();
  await registerOnChain(datasetHash);
  const analysis = await analyzeDataset(datasetHash);
  const resultHash = await storeResult(datasetHash, analysis);

  // Summary
  console.log('\n=== Pipeline Complete ===');
  console.log('Dataset hash:', datasetHash);
  console.log('Result hash: ', resultHash);
  console.log('');
  console.log('Both files are now permanently stored on 0G Storage.');
  console.log('Anyone with the rootHash can retrieve and verify them.');
  console.log('');
  console.log('Next steps:');
  console.log('  - Store datasetHash in a smart contract for on-chain provenance');
  console.log('  - Build an ERC-7857 INFT to tokenize the AI model (see Module 5)');
  console.log('  - Use Goldsky to index events and build a dashboard');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
