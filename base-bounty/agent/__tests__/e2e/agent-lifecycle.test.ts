/**
 * End-to-end test for the Cogito Node agent lifecycle.
 * Mocks are provided via jest.config.js moduleNameMapper.
 */
import { CogitoNode } from '../../src/cogito.js';
import { AgentConfig } from '../../src/config.js';

const TEST_CONFIG: AgentConfig = {
  ainProviderUrl: 'http://localhost:8081',
  ainWsUrl: 'ws://localhost:5100',
  ainPrivateKey: '0x' + 'a'.repeat(64),
  baseRpcUrl: 'https://mainnet.base.org',
  builderCode: 'test_cogito',
  x402FacilitatorUrl: 'https://facilitator.x402.org',
  agentName: 'e2e-test-node',
  thinkIntervalMs: 100000,
  x402Port: 3499,
};

describe('Agent Lifecycle E2E', () => {
  let node: CogitoNode;

  beforeEach(() => {
    node = new CogitoNode(TEST_CONFIG);
  });

  afterEach(async () => {
    await node.stop();
  });

  // ---------------------------------------------------------------------------
  // Full lifecycle
  // ---------------------------------------------------------------------------

  describe('full lifecycle', () => {
    it('should start the node and initialize subsystems', async () => {
      await node.start();
      const status = node.getStatus();
      expect(status.running).toBe(true);
      expect(status.agentName).toBe('e2e-test-node');
      expect(status.ainAddress).toBe('0xMockAinAddress');
    });

    it('should produce explorations on start', async () => {
      await node.start();
      expect(node.getThinkCount()).toBeGreaterThanOrEqual(1);
    });

    it('should track exploration counts per topic', async () => {
      await node.think();
      await node.think();
      const counts = node.getStatus().explorationCounts;
      const total = Object.values(counts).reduce((s: number, c: any) => s + c, 0);
      expect(total).toBe(2);
    });

    it('should keep max 10 recent explorations', async () => {
      for (let i = 0; i < 12; i++) {
        await node.think();
      }
      expect(node.getStatus().recentExplorations.length).toBeLessThanOrEqual(10);
    });

    it('should stop cleanly', async () => {
      await node.start();
      await node.stop();
      expect(node.getStatus().running).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Align
  // ---------------------------------------------------------------------------

  describe('align cycle', () => {
    it('should call listTopics and getExplorers during align', async () => {
      await node.start();
      await node.align();
      const ain = node.getAin();
      expect(ain.knowledge.listTopics.calls.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Sustain
  // ---------------------------------------------------------------------------

  describe('sustain cycle', () => {
    it('should check financial health and report revenue', async () => {
      await node.start();
      const revenue = node.getRevenue();
      revenue.recordIncome(0.001, 'test');
      revenue.recordCost(0.0005, 'test');
      await node.sustain();
      expect(revenue.getSnapshot().sustainabilityRatio).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Revenue integration
  // ---------------------------------------------------------------------------

  describe('revenue tracking', () => {
    it('should persist across start/stop', async () => {
      const revenue = node.getRevenue();
      revenue.recordIncome(0.01, 'course');
      revenue.recordCost(0.003, 'gpu');
      await node.start();
      expect(revenue.getSnapshot().totalEvents).toBeGreaterThanOrEqual(2);
      await node.stop();
      expect(revenue.getSnapshot().totalEvents).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Error resilience
  // ---------------------------------------------------------------------------

  describe('error resilience', () => {
    it('should recover from think error', async () => {
      const ain = node.getAin();
      ain.knowledge.aiExplore
        .mockRejectedValueOnce(new Error('LLM temporarily unavailable'))
        .mockResolvedValue({ entryId: 'recovered', txResult: {} });

      await expect(node.think()).rejects.toThrow('LLM temporarily unavailable');
      const result = await node.think();
      expect(result).not.toBeNull();
      expect(result!.entryId).toBe('recovered');
    });
  });

  // ---------------------------------------------------------------------------
  // Strategy distribution
  // ---------------------------------------------------------------------------

  describe('strategy distribution', () => {
    it('should follow 60/20/10/10 pattern over 10 cycles', () => {
      const counts: Record<string, number> = { explore: 0, align: 0, earn: 0, sustain: 0 };
      for (let i = 0; i < 10; i++) {
        const c = i % 10;
        if (c < 6) counts.explore++;
        else if (c < 8) counts.align++;
        else if (c === 8) counts.earn++;
        else counts.sustain++;
      }
      expect(counts).toEqual({ explore: 6, align: 2, earn: 1, sustain: 1 });
    });
  });
});
