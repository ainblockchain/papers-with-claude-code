/**
 * 02-storage-download.ts
 *
 * Module 2 Example: Download a file from 0G Storage with Merkle proof verification
 *
 * Demonstrates:
 * - Retrieving a file by its rootHash
 * - Merkle proof verification (ensuring data integrity)
 * - Error handling for missing or corrupted files
 *
 * Run: npm run download
 * (Run 01-storage-upload.ts first to get a rootHash)
 *
 * Prerequisites:
 * - PRIVATE_KEY in .env
 * - A rootHash from a previous upload (saved in last-root-hash.txt)
 */

import 'dotenv/config';
import { Indexer } from '@0glabs/0g-ts-sdk';
import { readFileSync, existsSync } from 'fs';

// ============================================================
// Configuration
// ============================================================
const INDEXER_URL = process.env.ZG_INDEXER_URL ?? 'https://indexer-storage-testnet-turbo.0g.ai';

// Get rootHash from file (written by 01-storage-upload.ts) or command line arg
function getRootHash(): string {
  // Check command line: npm run download -- 0xABC123...
  const argHash = process.argv[2];
  if (argHash && argHash.startsWith('0x')) return argHash;

  // Check saved file from previous upload
  if (existsSync('./last-root-hash.txt')) {
    const saved = readFileSync('./last-root-hash.txt', 'utf-8').trim();
    if (saved.startsWith('0x')) return saved;
  }

  console.error('Error: No rootHash found.');
  console.error('Run 01-storage-upload.ts first, or pass the hash:');
  console.error('  npx tsx 02-storage-download.ts 0xYOUR_ROOT_HASH');
  process.exit(1);
}

// ============================================================
// Core Download Function
// ============================================================
async function downloadFile(
  rootHash: string,
  outputPath: string,
  verifyProof = true
): Promise<void> {
  const indexer = new Indexer(INDEXER_URL);

  console.log('Downloading file from 0G Storage...');
  console.log('  Root hash:', rootHash);
  console.log('  Output:', outputPath);
  console.log('  Merkle proof verification:', verifyProof ? 'ENABLED' : 'disabled');
  console.log();

  // The third argument (true) enables Merkle proof verification.
  // This ensures the downloaded data matches the original — any tampering
  // by a malicious storage node is detected and rejected.
  const err = await indexer.download(rootHash, outputPath, verifyProof);

  if (err) {
    throw new Error(`Download failed: ${err}`);
  }
}

// ============================================================
// Main
// ============================================================
async function main() {
  console.log('0G Storage Download Example');
  console.log('============================');
  console.log('Indexer:', INDEXER_URL);

  const rootHash = getRootHash();
  const outputPath = './downloaded-file.txt';

  await downloadFile(rootHash, outputPath, true);

  console.log('Download complete!');
  console.log('File saved to:', outputPath);
  console.log();
  console.log('Why Merkle proof verification matters:');
  console.log('  Without verification, a malicious storage node could return corrupted data.');
  console.log('  With verification (third arg = true), the SDK recomputes the Merkle root');
  console.log('  from the downloaded bytes and confirms it matches your rootHash.');
  console.log('  If even one byte is wrong, the download fails with an error.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  console.error();
  console.error('Common issues:');
  console.error('  - File not yet propagated: wait a few seconds and retry');
  console.error('  - Wrong rootHash: verify you have the correct hash from upload');
  process.exit(1);
});
