/**
 * 01-storage-upload.ts
 *
 * Module 2 Example: Upload a file to 0G Storage
 *
 * Demonstrates:
 * - ZgFile creation and Merkle tree computation
 * - Indexer initialization and file upload
 * - rootHash extraction (your permanent file identifier)
 *
 * Run: npm run upload
 *
 * Prerequisites:
 * - PRIVATE_KEY in .env (funded with testnet 0G)
 * - npm install
 */

import 'dotenv/config';
import { ZgFile, Indexer } from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { writeFileSync, existsSync } from 'fs';

// ============================================================
// Configuration
// ============================================================
const RPC_URL = process.env.ZG_RPC_URL ?? 'https://evmrpc-testnet.0g.ai';
const INDEXER_URL = process.env.ZG_INDEXER_URL ?? 'https://indexer-storage-testnet-turbo.0g.ai';

if (!process.env.PRIVATE_KEY) {
  console.error('Error: PRIVATE_KEY not set in .env file');
  console.error('See 00-setup.md for setup instructions');
  process.exit(1);
}

// ============================================================
// Setup: Provider, Signer, Indexer
// ============================================================
const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const indexer = new Indexer(INDEXER_URL);

console.log('0G Storage Upload Example');
console.log('=========================');
console.log('Network:', RPC_URL);
console.log('Wallet:', signer.address);

// ============================================================
// Create a sample file to upload
// ============================================================
const sampleFilePath = './sample-data.txt';
if (!existsSync(sampleFilePath)) {
  const content = `0G Developer Course - Sample Dataset
Timestamp: ${new Date().toISOString()}
Lines: This is sample data uploaded to 0G decentralized storage.
Line 2: 0G Storage is 95% cheaper than AWS S3.
Line 3: Files are identified by their rootHash, not filename.
Line 4: Merkle proofs ensure data integrity on download.
`;
  writeFileSync(sampleFilePath, content);
  console.log('\nCreated sample file:', sampleFilePath);
}

// ============================================================
// Core Upload Function
// ============================================================
async function uploadFile(filePath: string): Promise<string> {
  console.log('\nStep 1: Creating ZgFile from', filePath);
  const file = await ZgFile.fromFilePath(filePath);

  console.log('Step 2: Computing Merkle tree...');
  const [tree, treeErr] = await file.merkleTree();
  if (treeErr) throw new Error(`Merkle tree error: ${treeErr}`);

  const rootHash = tree!.rootHash();
  console.log('  Root hash (SAVE THIS!):', rootHash);
  console.log('  This hash is your file\'s permanent identifier on 0G Storage');

  console.log('\nStep 3: Uploading to 0G Storage network...');
  console.log('  (This submits an on-chain transaction via the Flow contract)');
  const [tx, uploadErr] = await indexer.upload(file, RPC_URL, signer);
  if (uploadErr) throw new Error(`Upload error: ${uploadErr}`);

  console.log('  Upload transaction:', tx);

  await file.close(); // Always close to release the file handle
  console.log('\nUpload complete!');

  return rootHash;
}

// ============================================================
// Main
// ============================================================
async function main() {
  const balance = await provider.getBalance(signer.address);
  console.log('Balance:', ethers.formatEther(balance), '0G');

  if (balance === 0n) {
    console.warn('\nWARNING: Wallet has no 0G tokens.');
    console.warn('Get testnet tokens at: https://faucet.0g.ai');
    process.exit(1);
  }

  const rootHash = await uploadFile(sampleFilePath);

  // Save the rootHash for the next example
  writeFileSync('./last-root-hash.txt', rootHash);
  console.log('\nRoot hash saved to: last-root-hash.txt');
  console.log('Use this with 02-storage-download.ts to retrieve your file.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
