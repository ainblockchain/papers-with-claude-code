/**
 * Server-side AIN blockchain client singleton.
 * Configured via environment variables.
 */

let ainInstance: any = null;

export function getAinClient(): any {
  if (ainInstance) return ainInstance;

  const Ain = require('@ainblockchain/ain-js').default;
  const providerUrl = process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
  ainInstance = new Ain(providerUrl);

  // If a private key is configured, set it as the default account
  const privateKey = process.env.AIN_PRIVATE_KEY;
  if (privateKey) {
    ainInstance.wallet.addAndSetDefaultAccount(privateKey);
  }

  return ainInstance;
}

export function getProviderUrl(): string {
  return process.env.AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';
}
