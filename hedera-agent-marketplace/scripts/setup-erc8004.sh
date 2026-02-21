#!/usr/bin/env bash
# ERC-8004 Sepolia wallet setup script
# Creates a Sepolia wallet and adds the key to .env.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env"

echo "=== ERC-8004 Sepolia Wallet Setup ==="
echo ""

# Generate wallet using Node.js with ethers
WALLET_OUTPUT=$(node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log(JSON.stringify({
  address: wallet.address,
  privateKey: wallet.privateKey,
}));
" 2>/dev/null || npx -y tsx -e "
import { ethers } from 'ethers';
const wallet = ethers.Wallet.createRandom();
console.log(JSON.stringify({
  address: wallet.address,
  privateKey: wallet.privateKey,
}));
")

ADDRESS=$(echo "$WALLET_OUTPUT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).address))")
PRIVATE_KEY=$(echo "$WALLET_OUTPUT" | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).privateKey))")

echo "Wallet created:"
echo "  Address:     $ADDRESS"
echo "  Private Key: ${PRIVATE_KEY:0:10}...${PRIVATE_KEY: -4}"
echo ""

# Update .env file
if [ -f "$ENV_FILE" ]; then
  # Replace existing key if present, otherwise append
  if grep -q "^ERC8004_PRIVATE_KEY=" "$ENV_FILE" 2>/dev/null; then
    echo "ERC8004_PRIVATE_KEY already exists in .env — skipping (delete line to regenerate)"
  else
    echo "" >> "$ENV_FILE"
    echo "# ERC-8004 Sepolia (auto-generated)" >> "$ENV_FILE"
    echo "SEPOLIA_RPC_URL=https://rpc.sepolia.org" >> "$ENV_FILE"
    echo "ERC8004_PRIVATE_KEY=$PRIVATE_KEY" >> "$ENV_FILE"
    echo "Added to .env"
  fi
else
  cp "$PROJECT_DIR/.env.example" "$ENV_FILE"
  echo "" >> "$ENV_FILE"
  echo "# ERC-8004 Sepolia (auto-generated)" >> "$ENV_FILE"
  echo "SEPOLIA_RPC_URL=https://rpc.sepolia.org" >> "$ENV_FILE"
  echo "ERC8004_PRIVATE_KEY=$PRIVATE_KEY" >> "$ENV_FILE"
  echo "Created .env from .env.example with Sepolia keys"
fi

echo ""
echo "=== Next Steps ==="
echo "1. Get Sepolia ETH from faucet: https://www.alchemy.com/faucets/ethereum-sepolia"
echo "   (Paste address: $ADDRESS)"
echo "2. Run: npm run web"
echo "3. ERC-8004 reputation will be recorded on Ethereum Sepolia"
echo ""
