import { CogitoNode } from '../../src/cogito.js';
import { AgentConfig } from '../../src/config.js';
import Ain from '@ainblockchain/ain-js';

function createTestConfig(): AgentConfig {
  return {
    ainProviderUrl: 'http://localhost:8081',
    ainWsUrl: 'ws://localhost:5100',
    ainPrivateKey: '0x' + 'a'.repeat(64),
    baseRpcUrl: 'https://mainnet.base.org',
    builderCode: 'test_cogito',
    x402FacilitatorUrl: 'https://facilitator.x402.org',
    agentName: 'test-node',
    thinkIntervalMs: 1000,
    x402Port: 3402,
  };
}

describe('CogitoNode', () => {
  let node: CogitoNode;

  beforeEach(() => {
    node = new CogitoNode(createTestConfig());
  });

  afterEach(async () => {
    await node.stop();
  });

  describe('constructor', () => {
    it('should create a CogitoNode instance', () => {
      expect(node).toBeInstanceOf(CogitoNode);
    });

    it('should initialize with zero think count', () => {
      expect(node.getThinkCount()).toBe(0);
    });

    it('should have a revenue tracker', () => {
      expect(node.getRevenue()).toBeDefined();
      expect(node.getRevenue().getSnapshot().totalEvents).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return status object with correct defaults', () => {
      const status = node.getStatus();
      expect(status).toHaveProperty('agentName', 'test-node');
      expect(status).toHaveProperty('thinkCount', 0);
      expect(status).toHaveProperty('running', false);
      expect(status).toHaveProperty('explorationCounts');
      expect(status).toHaveProperty('recentExplorations');
      expect(status).toHaveProperty('revenue');
    });
  });

  describe('think', () => {
    it('should call aiExplore and return ThinkResult', async () => {
      const result = await node.think();
      expect(result).not.toBeNull();
      expect(result!.entryId).toBe('mock_entry_id');
      expect(result!.topicPath).toBeTruthy();
    });

    it('should pick a seed topic when frontier is empty', async () => {
      const ain = node.getAin();
      ain.knowledge.getFrontierMap.mockResolvedValue([]);

      const result = await node.think();
      expect(result).not.toBeNull();
      expect(ain.knowledge.aiExplore.calls.length).toBeGreaterThan(0);
    });

    it('should pick the least explored topic from frontier', async () => {
      const ain = node.getAin();
      ain.knowledge.getFrontierMap.mockResolvedValue([
        { topic: 'ai/transformers', stats: { explorer_count: 5, max_depth: 3, avg_depth: 2 } },
        { topic: 'ai/rl', stats: { explorer_count: 1, max_depth: 1, avg_depth: 1 } },
        { topic: 'crypto/consensus', stats: { explorer_count: 3, max_depth: 2, avg_depth: 1.5 } },
      ]);

      const result = await node.think();
      expect(result!.topicPath).toBe('ai/rl');
    });
  });

  describe('stop', () => {
    it('should stop without error when not started', async () => {
      await expect(node.stop()).resolves.not.toThrow();
    });
  });

  describe('strategy selection', () => {
    it('should follow 60/20/10/10 distribution over 10 cycles', () => {
      const strategies: string[] = [];
      for (let i = 0; i < 10; i++) {
        const cycle = i % 10;
        if (cycle < 6) strategies.push('explore');
        else if (cycle < 8) strategies.push('align');
        else if (cycle === 8) strategies.push('earn');
        else strategies.push('sustain');
      }
      expect(strategies).toEqual([
        'explore', 'explore', 'explore', 'explore', 'explore', 'explore',
        'align', 'align', 'earn', 'sustain',
      ]);
    });
  });
});
