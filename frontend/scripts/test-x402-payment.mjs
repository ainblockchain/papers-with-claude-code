#!/usr/bin/env node
// Test x402 payment flow end-to-end against the local Next.js server
// Uses @x402/fetch to handle the full 402 -> sign -> retry flow automatically
// Usage:
//   node scripts/test-x402-payment.mjs                    # Test Kite chain
//   node scripts/test-x402-payment.mjs --chain base       # Test Base Sepolia
//   TEST_PRIVATE_KEY=0x... node scripts/test-x402-payment.mjs --chain base

import { createWalletClient, createPublicClient, http, defineChain, publicActions } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { wrapFetchWithPaymentFromConfig } from '@x402/fetch';
import { ExactEvmScheme } from '@x402/evm';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CHAIN = process.argv.includes('--chain')
  ? process.argv[process.argv.indexOf('--chain') + 1]
  : 'kite';

// Kite testnet chain definition
const kiteTestnet = defineChain({
  id: 2368,
  name: 'Kite Testnet',
  nativeCurrency: { name: 'KITE', symbol: 'KITE', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-testnet.gokite.ai/'] },
  },
  blockExplorers: {
    default: { name: 'KiteScan', url: 'https://testnet.kitescan.ai' },
  },
});

const KITE_TEST_USDT = '0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63';
const BASE_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const MERCHANT = '0xc0078d495e80fd3b1e92f0803d0bc7c279165d8c';

const ERC20_ABI = [
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
];

async function main() {
  console.log(`=== x402 Payment Test — Chain: ${CHAIN} ===\n`);

  // Step 1: Test /api/x402/status
  console.log('1. Testing /api/x402/status...');
  const statusRes = await fetch(`${BASE_URL}/api/x402/status`);
  const status = await statusRes.json();
  console.log(`   Status: ${statusRes.status}, Configured: ${status.configured}`);
  console.log(`   Merchant: ${status.walletAddress}\n`);

  // Step 2: Create/load wallet
  const privateKey = process.env.TEST_PRIVATE_KEY || generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  console.log(`2. Test wallet: ${account.address}`);
  if (!process.env.TEST_PRIVATE_KEY) {
    console.log(`   Private key (new random): ${privateKey}`);
    console.log('   TIP: Fund this wallet and rerun with TEST_PRIVATE_KEY=<key>');
  }

  // Chain-specific config
  const chain = CHAIN === 'base' ? baseSepolia : kiteTestnet;
  const tokenAddress = CHAIN === 'base' ? BASE_USDC : KITE_TEST_USDT;
  const tokenDecimals = CHAIN === 'base' ? 6 : 18;
  const networkId = CHAIN === 'base' ? 'eip155:84532' : 'eip155:2368';
  const chainSuffix = CHAIN === 'base' ? '?chain=base' : '';

  // Check balances
  const publicClient = createPublicClient({ chain, transport: http() });
  try {
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    console.log(`   Token Balance: ${balance} (${Number(balance) / 10**tokenDecimals})`);
  } catch (e) {
    console.log(`   Could not read token balance: ${e.message}`);
  }

  try {
    const nativeBalance = await publicClient.getBalance({ address: account.address });
    console.log(`   Native Balance: ${nativeBalance} (${Number(nativeBalance) / 1e18})\n`);
  } catch (e) {
    console.log(`   Could not read native balance: ${e.message}\n`);
  }

  // Step 3: Create x402-enabled fetch
  console.log('3. Setting up x402 payment-enabled fetch...');

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  }).extend(publicActions);

  const signer = {
    address: account.address,
    signTypedData: (args) => walletClient.signTypedData(args),
    readContract: (args) => walletClient.readContract(args),
  };

  const evmScheme = new ExactEvmScheme(signer);

  const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
    schemes: [{ network: networkId, client: evmScheme }],
  });

  console.log(`   x402 fetch configured for ${networkId}\n`);

  // Step 4: Test enroll
  console.log(`4. Testing /api/x402/enroll${chainSuffix} (with x402 auto-payment)...`);
  try {
    const res = await fetchWithPayment(`${BASE_URL}/api/x402/enroll${chainSuffix}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId: 'attention-is-all-you-need--bible' }),
    });

    console.log(`   Status: ${res.status}`);
    logPaymentHeaders(res);
    const bodyText = await res.text();
    console.log(`   Body: ${bodyText.substring(0, 500)}`);

    if (res.status === 200) {
      const data = JSON.parse(bodyText);
      console.log(`\n   SUCCESS! Enrollment confirmed.`);
      if (data.explorerUrl) console.log(`   Explorer: ${data.explorerUrl}`);
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
    if (e.cause) console.log(`   Cause: ${JSON.stringify(e.cause)}`);
  }

  // Step 5: Test unlock-stage
  console.log(`\n5. Testing /api/x402/unlock-stage${chainSuffix} (with x402 auto-payment)...`);
  try {
    const res = await fetchWithPayment(`${BASE_URL}/api/x402/unlock-stage${chainSuffix}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: 'attention-is-all-you-need--bible',
        stageNum: 1,
        score: 80,
      }),
    });

    console.log(`   Status: ${res.status}`);
    logPaymentHeaders(res);
    const bodyText = await res.text();
    console.log(`   Body: ${bodyText.substring(0, 500)}`);

    if (res.status === 200) {
      const data = JSON.parse(bodyText);
      console.log(`\n   SUCCESS!`);
      if (data.txHash) console.log(`   TX Hash: ${data.txHash}`);
      if (data.explorerUrl) console.log(`   Explorer: ${data.explorerUrl}`);
    }
  } catch (e) {
    console.log(`   Error: ${e.message}`);
    if (e.cause) console.log(`   Cause: ${JSON.stringify(e.cause)}`);
  }

  console.log('\n=== Test Complete ===');
}

function logPaymentHeaders(res) {
  res.headers.forEach((value, key) => {
    if (key === 'payment-required' || key === 'payment-response') {
      try {
        const decoded = JSON.parse(Buffer.from(value, 'base64').toString());
        console.log(`   ${key}: ${JSON.stringify(decoded, null, 4)}`);
      } catch { console.log(`   ${key}: ${value.substring(0, 200)}`); }
    }
  });
}

main().catch(console.error);
