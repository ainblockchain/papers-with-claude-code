/**
 * Server-side AIN blockchain client singleton.
 * Configured via environment variables.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
let ainInstance: any = null;

export function getAinClient(): any {
  if (ainInstance) return ainInstance;

  const Ain = require('@ainblockchain/ain-js').default;
  const providerUrl = process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
  const chainId = Number(process.env.AIN_CHAIN_ID ?? 0); // 0 = testnet, 1 = mainnet
  ainInstance = new Ain(providerUrl, null, chainId);

  // If a private key is configured, set it as the default account
  const privateKey = process.env.AIN_PRIVATE_KEY;
  if (privateKey) {
    ainInstance.wallet.addAndSetDefaultAccount(privateKey);
  } else {
    // Create a new account for read-only + auto-generated writes
    const addresses = ainInstance.wallet.create(1);
    const addr = Array.isArray(addresses) ? addresses[0] : addresses;
    if (addr) ainInstance.wallet.setDefaultAccount(addr);
  }

  return ainInstance;
}

export function getProviderUrl(): string {
  return process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
}
