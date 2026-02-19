import Ain from '@ainblockchain/ain-js';

const AIN_PROVIDER_URL = process.env.NEXT_PUBLIC_AIN_PROVIDER_URL || 'https://devnet-api.ainetwork.ai';

let ainInstance: Ain | null = null;

export function getAin(): Ain {
  if (!ainInstance) {
    ainInstance = new Ain(AIN_PROVIDER_URL);
  }
  return ainInstance;
}
