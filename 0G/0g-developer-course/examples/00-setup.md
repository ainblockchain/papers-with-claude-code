# Setting Up Your 0G Development Environment

This guide gets you from zero to running your first 0G Storage upload in about 10 minutes.

## Prerequisites

- Node.js 18+ (`node --version`)
- A terminal

## Step 1: Install Dependencies

```bash
cd examples/
npm install
```

## Step 2: Set Up Your Wallet

You need an Ethereum-compatible wallet. Create one with:

```bash
node -e "const { ethers } = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

⚠️ **Save both values.** The private key is your identity — lose it and you lose access.

## Step 3: Get Testnet Tokens

1. Go to **https://faucet.0g.ai**
2. Paste your wallet address
3. Click "Faucet" — you'll receive 0.1 0G (refreshes daily)

These tokens cover gas fees for all examples in this course.

## Step 4: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your `PRIVATE_KEY` (without the `0x` prefix).

## Step 5: Run Your First Example

```bash
# Upload a file to 0G Storage
npm run upload

# Or run the full-stack demo
npm run demo
```

## Network Reference

| Network | Chain ID | RPC URL | Explorer |
|---|---|---|---|
| Testnet (Galileo) | 16602 | https://evmrpc-testnet.0g.ai | https://chainscan-galileo.0g.ai |
| Mainnet (Aristotle) | 16661 | https://evmrpc.0g.ai | https://chainscan.0g.ai |

## Contract Addresses (Testnet)

| Contract | Address |
|---|---|
| Flow (Storage) | `0x22E03a6A89B950F1c82ec5e74F8eCa321a105296` |
| DAEntrance | `0xE75A073dA5bb7b0eC622170Fd268f35E675a957B` |
| Compute Ledger | `0xE70830508dAc0A97e6c087c75f402f9Be669E406` |
| DASigners (precompile) | `0x0000000000000000000000000000000000001000` |
| WrappedOGBase (precompile) | `0x0000000000000000000000000000000000001001` |

## For Compute Examples (Module 3)

Install the Compute CLI and set up your account:

```bash
# Install CLI
pnpm add @0glabs/0g-serving-broker -g

# Log in with your wallet
0g-compute-cli login

# Deposit tokens to your account
0g-compute-cli deposit --amount 10

# List available GPU providers
0g-compute-cli inference list-providers

# Fund a specific provider and get your API key
0g-compute-cli transfer-fund --provider <PROVIDER_ADDRESS> --amount 5
0g-compute-cli inference acknowledge-provider --provider <PROVIDER_ADDRESS>
0g-compute-cli inference get-secret --provider <PROVIDER_ADDRESS>
# Copy the output (app-sk-...) to ZG_API_KEY in your .env
```

## Troubleshooting

**"Insufficient funds" error**: Get more testnet 0G at https://faucet.0g.ai

**"Cannot connect to RPC"**: Check your internet connection and the RPC URL in `.env`

**TypeScript errors**: Make sure you're using Node.js 18+ (`node --version`)

**Upload hangs**: The testnet indexer may be slow. Try again in a minute or use a different indexer URL from the 0G documentation.
