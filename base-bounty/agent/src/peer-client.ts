import { AgentIdentity } from './base-chain/identity.js';

export class PeerClient {
  private identity: AgentIdentity;
  private fetchFn: typeof fetch;

  constructor(identity: AgentIdentity) {
    this.identity = identity;
    this.fetchFn = globalThis.fetch;
  }

  /**
   * Set a custom fetch function (e.g. @x402/fetch for auto-payment).
   */
  setFetch(fetchFn: typeof fetch): void {
    this.fetchFn = fetchFn;
  }

  /**
   * Buy an exploration from a peer via x402.
   */
  async buyExploration(peerUrl: string, topicPath: string): Promise<any> {
    const url = `${peerUrl}/knowledge/explore/${topicPath}`;
    const response = await this.fetchFn(url);

    if (response.status === 402) {
      console.log(`[Peer] Payment required for ${url} — using x402 auto-pay`);
      // When using @x402/fetch, the 402 is handled automatically
      // For manual flow, the caller would need to handle payment
    }

    if (!response.ok) {
      throw new Error(`[Peer] Failed to buy exploration: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Buy frontier map from a peer via x402.
   */
  async buyFrontierMap(peerUrl: string, topic: string): Promise<any> {
    const url = `${peerUrl}/knowledge/frontier/${topic}`;
    const response = await this.fetchFn(url);

    if (!response.ok) {
      throw new Error(`[Peer] Failed to buy frontier map: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Discover peer endpoints from the ERC-8004 registry.
   */
  async discoverPeers(): Promise<Array<{ address: string; name: string; endpoint: string }>> {
    const addresses = await this.identity.getAllRegisteredNodes();
    const myAddress = this.identity.getAddress();

    const peers: Array<{ address: string; name: string; endpoint: string }> = [];

    for (const addr of addresses) {
      if (addr.toLowerCase() === myAddress.toLowerCase()) continue;

      try {
        const info = await this.identity.getIdentity(addr);
        peers.push({
          address: addr,
          name: info.name,
          endpoint: info.serviceEndpoint,
        });
      } catch {
        // Skip peers with invalid identity data
      }
    }

    return peers;
  }

  /**
   * Get status from a peer (unauthenticated endpoint).
   */
  async getPeerStatus(peerUrl: string): Promise<any> {
    const response = await globalThis.fetch(`${peerUrl}/status`);
    if (!response.ok) {
      throw new Error(`[Peer] Failed to get status: ${response.status}`);
    }
    return response.json();
  }
}
