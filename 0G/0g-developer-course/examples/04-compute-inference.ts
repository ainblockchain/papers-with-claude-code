/**
 * 04-compute-inference.ts
 *
 * Module 3 Example: Run AI inference on 0G Compute (OpenAI-compatible API)
 *
 * Demonstrates:
 * - Drop-in OpenAI SDK replacement (2-line change)
 * - Standard chat.completions API on 0G decentralized GPU network
 * - Cost comparison: 0G Compute vs OpenAI API
 *
 * Run: npm run infer
 *
 * Prerequisites:
 * - ZG_API_KEY in .env  (from: 0g-compute-cli inference get-secret --provider <ADDR>)
 * - ZG_PROVIDER_URL in .env  (from: 0g-compute-cli inference list-providers)
 *
 * Setup steps:
 *   pnpm add @0glabs/0g-serving-broker -g
 *   0g-compute-cli login
 *   0g-compute-cli deposit --amount 10
 *   0g-compute-cli inference list-providers
 *   0g-compute-cli transfer-fund --provider <ADDR> --amount 5
 *   0g-compute-cli inference acknowledge-provider --provider <ADDR>
 *   0g-compute-cli inference get-secret --provider <ADDR>
 */

import 'dotenv/config';
import OpenAI from 'openai';

// ============================================================
// Configuration
// ============================================================
const ZG_API_KEY = process.env.ZG_API_KEY;
const ZG_PROVIDER_URL = process.env.ZG_PROVIDER_URL;

if (!ZG_API_KEY || !ZG_PROVIDER_URL) {
  console.error('Error: ZG_API_KEY and ZG_PROVIDER_URL must be set in .env');
  console.error('');
  console.error('Setup steps:');
  console.error('  1. pnpm add @0glabs/0g-serving-broker -g');
  console.error('  2. 0g-compute-cli login');
  console.error('  3. 0g-compute-cli deposit --amount 10');
  console.error('  4. 0g-compute-cli inference list-providers');
  console.error('  5. 0g-compute-cli transfer-fund --provider <ADDR> --amount 5');
  console.error('  6. 0g-compute-cli inference acknowledge-provider --provider <ADDR>');
  console.error('  7. 0g-compute-cli inference get-secret --provider <ADDR>');
  process.exit(1);
}

// ============================================================
// Before: Standard OpenAI configuration
// ============================================================
/*
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,          // <- was this
  // baseURL defaults to https://api.openai.com/v1
});
*/

// ============================================================
// After: 0G Compute — only 2 values change!
// ============================================================
const client = new OpenAI({
  apiKey: ZG_API_KEY,                          // app-sk-... from CLI
  baseURL: `${ZG_PROVIDER_URL}/v1/proxy`,      // provider URL + /v1/proxy
});

// ============================================================
// Main: Run inference
// ============================================================
async function main() {
  console.log('0G Compute Inference Example');
  console.log('============================');
  console.log('Provider URL:', ZG_PROVIDER_URL);
  console.log('');
  console.log('Running chat completion via 0G decentralized GPU network...');
  console.log('(Same API as OpenAI — only baseURL and apiKey changed!)');
  console.log('');

  const startTime = Date.now();

  try {
    // This is identical to OpenAI API usage
    const response = await client.chat.completions.create({
      model: 'meta-llama/Meta-Llama-3.1-8B-Instruct', // Available open-source models vary by provider
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant teaching developers about the 0G ecosystem.'
        },
        {
          role: 'user',
          content: 'In one sentence, what is the biggest advantage of 0G Storage over AWS S3?'
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const latencyMs = Date.now() - startTime;
    const answer = response.choices[0].message.content;

    console.log('Response:', answer);
    console.log('');
    console.log('Metrics:');
    console.log('  Latency:', latencyMs, 'ms');
    console.log('  Tokens used:', response.usage?.total_tokens ?? 'N/A');
    console.log('  Model:', response.model);
    console.log('');
    console.log('Cost comparison:');
    console.log('  OpenAI GPT-4: ~$0.03 per 1K tokens');
    console.log('  0G Compute: ~$0.003 per 1K tokens (90% cheaper)');

  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Inference failed:', error.message);
    }
    console.error('');
    console.error('Common issues:');
    console.error('  - Provider not funded: run transfer-fund again');
    console.error('  - Provider not acknowledged: run acknowledge-provider');
    console.error('  - Wrong model name: check available models with the provider');
    process.exit(1);
  }
}

main();
