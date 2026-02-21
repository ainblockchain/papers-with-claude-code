// Hedera 네트워크 유틸리티 — HashScan 탐색기 링크 생성

export function hashscanUrl(type: 'topic' | 'token' | 'transaction' | 'account', id: string): string {
  return `https://hashscan.io/testnet/${type}/${id}`;
}
