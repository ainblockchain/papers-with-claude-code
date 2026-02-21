// Hedera network utilities — HashScan explorer link generation

export function hashscanUrl(type: 'topic' | 'token' | 'transaction' | 'account', id: string): string {
  return `https://hashscan.io/testnet/${type}/${id}`;
}
