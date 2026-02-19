import { jest } from '@jest/globals';
import { PeerClient } from '../../src/peer-client.js';

function createMockIdentity(overrides: any = {}) {
  return {
    getAllRegisteredNodes: jest.fn().mockResolvedValue([]),
    getAddress: jest.fn().mockReturnValue('0xMyAddress'),
    getIdentity: jest.fn().mockResolvedValue({
      name: 'peer-node',
      serviceEndpoint: 'http://peer:3402',
      metadata: '{}',
    }),
    ...overrides,
  } as any;
}

function createMockFetch(response: any = {}) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
    ...response,
  });
}

describe('PeerClient', () => {
  let identity: ReturnType<typeof createMockIdentity>;
  let client: PeerClient;

  beforeEach(() => {
    identity = createMockIdentity();
    client = new PeerClient(identity);
  });

  // ---------------------------------------------------------------------------
  // discoverPeers
  // ---------------------------------------------------------------------------

  describe('discoverPeers', () => {
    it('should return empty array when no registered nodes', async () => {
      identity.getAllRegisteredNodes.mockResolvedValue([]);

      const peers = await client.discoverPeers();
      expect(peers).toEqual([]);
    });

    it('should exclude own address from peers', async () => {
      identity.getAllRegisteredNodes.mockResolvedValue(['0xMyAddress', '0xPeer1']);
      identity.getIdentity.mockResolvedValue({
        name: 'peer1',
        serviceEndpoint: 'http://peer1:3402',
        metadata: '{}',
      });

      const peers = await client.discoverPeers();

      expect(peers).toHaveLength(1);
      expect(peers[0].address).toBe('0xPeer1');
      expect(peers[0].name).toBe('peer1');
      expect(peers[0].endpoint).toBe('http://peer1:3402');
    });

    it('should handle case-insensitive address comparison', async () => {
      identity.getAddress.mockReturnValue('0xMyAddress');
      identity.getAllRegisteredNodes.mockResolvedValue(['0xmyaddress', '0xPeer1']);
      identity.getIdentity.mockResolvedValue({
        name: 'peer1',
        serviceEndpoint: 'http://peer1:3402',
        metadata: '{}',
      });

      const peers = await client.discoverPeers();
      expect(peers).toHaveLength(1);
    });

    it('should skip peers with invalid identity data', async () => {
      identity.getAllRegisteredNodes.mockResolvedValue(['0xPeer1', '0xPeer2']);
      identity.getIdentity
        .mockRejectedValueOnce(new Error('Invalid data'))
        .mockResolvedValueOnce({
          name: 'peer2',
          serviceEndpoint: 'http://peer2:3402',
          metadata: '{}',
        });

      const peers = await client.discoverPeers();

      expect(peers).toHaveLength(1);
      expect(peers[0].address).toBe('0xPeer2');
    });
  });

  // ---------------------------------------------------------------------------
  // buyExploration
  // ---------------------------------------------------------------------------

  describe('buyExploration', () => {
    it('should fetch exploration from peer URL', async () => {
      const mockFetch = createMockFetch({ title: 'Test', content: 'Content' });
      client.setFetch(mockFetch as any);

      const result = await client.buyExploration('http://peer:3402', 'ai/transformers');

      expect(mockFetch).toHaveBeenCalledWith('http://peer:3402/knowledge/explore/ai/transformers');
      expect(result).toEqual({ title: 'Test', content: 'Content' });
    });

    it('should throw on non-ok response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });
      client.setFetch(mockFetch as any);

      await expect(client.buyExploration('http://peer:3402', 'test'))
        .rejects.toThrow('Failed to buy exploration: 500 Internal Server Error');
    });
  });

  // ---------------------------------------------------------------------------
  // buyFrontierMap
  // ---------------------------------------------------------------------------

  describe('buyFrontierMap', () => {
    it('should fetch frontier map from peer URL', async () => {
      const mapData = { topic: 'ai/transformers', stats: { explorer_count: 5 } };
      const mockFetch = createMockFetch(mapData);
      client.setFetch(mockFetch as any);

      const result = await client.buyFrontierMap('http://peer:3402', 'ai/transformers');

      expect(mockFetch).toHaveBeenCalledWith('http://peer:3402/knowledge/frontier/ai/transformers');
      expect(result).toEqual(mapData);
    });

    it('should throw on non-ok response', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 402,
        statusText: 'Payment Required',
      });
      client.setFetch(mockFetch as any);

      await expect(client.buyFrontierMap('http://peer:3402', 'test'))
        .rejects.toThrow('Failed to buy frontier map: 402 Payment Required');
    });
  });

  // ---------------------------------------------------------------------------
  // getPeerStatus
  // ---------------------------------------------------------------------------

  describe('getPeerStatus', () => {
    it('should fetch status from peer /status endpoint', async () => {
      const statusData = { agentName: 'peer', thinkCount: 42, running: true };

      // Mock globalThis.fetch
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(statusData),
      }) as any;

      try {
        const result = await client.getPeerStatus('http://peer:3402');
        expect(result).toEqual(statusData);
        expect(globalThis.fetch).toHaveBeenCalledWith('http://peer:3402/status');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('should throw on non-ok response', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }) as any;

      try {
        await expect(client.getPeerStatus('http://peer:3402'))
          .rejects.toThrow('Failed to get status: 404');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  // ---------------------------------------------------------------------------
  // setFetch
  // ---------------------------------------------------------------------------

  describe('setFetch', () => {
    it('should replace the internal fetch function', async () => {
      const customFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ custom: true }),
      });

      client.setFetch(customFetch as any);

      await client.buyExploration('http://peer:3402', 'test');

      expect(customFetch).toHaveBeenCalled();
    });
  });
});
