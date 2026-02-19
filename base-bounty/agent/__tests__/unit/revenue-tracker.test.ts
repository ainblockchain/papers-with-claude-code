import { RevenueTracker } from '../../src/revenue-tracker.js';

describe('RevenueTracker', () => {
  let tracker: RevenueTracker;

  beforeEach(() => {
    tracker = new RevenueTracker();
  });

  // ---------------------------------------------------------------------------
  // recordIncome / recordCost
  // ---------------------------------------------------------------------------

  describe('recording events', () => {
    it('should start with zero income and cost', () => {
      expect(tracker.getIncomeLast24h()).toBe(0);
      expect(tracker.getCostLast24h()).toBe(0);
    });

    it('should record income events', () => {
      tracker.recordIncome(0.001, 'course_stage');
      tracker.recordIncome(0.005, 'graph_query');
      expect(tracker.getIncomeLast24h()).toBeCloseTo(0.006, 6);
    });

    it('should record cost events', () => {
      tracker.recordCost(0.03, 'gpu_power');
      tracker.recordCost(0.01, 'bandwidth');
      expect(tracker.getCostLast24h()).toBeCloseTo(0.04, 6);
    });
  });

  // ---------------------------------------------------------------------------
  // getIncomeLast24h / getCostLast24h
  // ---------------------------------------------------------------------------

  describe('24h window', () => {
    it('should only count events within 24h window', () => {
      // Record some events
      tracker.recordIncome(1.0, 'recent');

      // Manually insert an old event by reaching into the private field
      const oldEvent = {
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        amount: 100.0,
        type: 'income' as const,
        source: 'old',
      };
      (tracker as any).events.push(oldEvent);

      // Only the recent event should count
      expect(tracker.getIncomeLast24h()).toBe(1.0);
    });

    it('should count events right at the 24h boundary', () => {
      // Insert event exactly 23h59m ago — should count
      const almostOld = {
        timestamp: Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000,
        amount: 5.0,
        type: 'income' as const,
        source: 'boundary',
      };
      (tracker as any).events.push(almostOld);

      expect(tracker.getIncomeLast24h()).toBe(5.0);
    });
  });

  // ---------------------------------------------------------------------------
  // getSustainabilityRatio
  // ---------------------------------------------------------------------------

  describe('getSustainabilityRatio', () => {
    it('should return Infinity when cost is 0', () => {
      tracker.recordIncome(1.0, 'test');
      expect(tracker.getSustainabilityRatio()).toBe(Infinity);
    });

    it('should return Infinity when no events exist', () => {
      expect(tracker.getSustainabilityRatio()).toBe(Infinity);
    });

    it('should return correct ratio of income/cost', () => {
      tracker.recordIncome(10.0, 'revenue');
      tracker.recordCost(5.0, 'costs');
      expect(tracker.getSustainabilityRatio()).toBe(2.0);
    });

    it('should return ratio < 1 when costs exceed income', () => {
      tracker.recordIncome(1.0, 'revenue');
      tracker.recordCost(10.0, 'costs');
      expect(tracker.getSustainabilityRatio()).toBe(0.1);
    });

    it('should return 0 when income is 0 but cost exists', () => {
      tracker.recordCost(5.0, 'costs');
      expect(tracker.getSustainabilityRatio()).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // getSnapshot
  // ---------------------------------------------------------------------------

  describe('getSnapshot', () => {
    it('should return a complete snapshot object', () => {
      tracker.recordIncome(0.5, 'course');
      tracker.recordCost(0.1, 'power');
      tracker.recordIncome(0.3, 'query');

      const snapshot = tracker.getSnapshot();

      expect(snapshot).toHaveProperty('incomeLast24h');
      expect(snapshot).toHaveProperty('costLast24h');
      expect(snapshot).toHaveProperty('sustainabilityRatio');
      expect(snapshot).toHaveProperty('totalEvents');

      expect(snapshot.incomeLast24h).toBeCloseTo(0.8, 6);
      expect(snapshot.costLast24h).toBeCloseTo(0.1, 6);
      expect(snapshot.sustainabilityRatio).toBe(8.0);
      expect(snapshot.totalEvents).toBe(3);
    });

    it('should return zeros for empty tracker', () => {
      const snapshot = tracker.getSnapshot();
      expect(snapshot.incomeLast24h).toBe(0);
      expect(snapshot.costLast24h).toBe(0);
      expect(snapshot.sustainabilityRatio).toBe(Infinity);
      expect(snapshot.totalEvents).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // prune
  // ---------------------------------------------------------------------------

  describe('prune', () => {
    it('should remove events older than 7 days', () => {
      tracker.recordIncome(1.0, 'recent');

      // Insert old event (8 days ago)
      const oldEvent = {
        timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
        amount: 100.0,
        type: 'income' as const,
        source: 'ancient',
      };
      (tracker as any).events.push(oldEvent);

      expect((tracker as any).events.length).toBe(2);

      tracker.prune();

      expect((tracker as any).events.length).toBe(1);
    });

    it('should keep events within 7 days', () => {
      tracker.recordIncome(1.0, 'today');
      tracker.recordCost(0.5, 'today');

      // Insert event 6 days ago — should survive
      const recentOld = {
        timestamp: Date.now() - 6 * 24 * 60 * 60 * 1000,
        amount: 2.0,
        type: 'income' as const,
        source: 'six_days_ago',
      };
      (tracker as any).events.push(recentOld);

      tracker.prune();

      expect((tracker as any).events.length).toBe(3);
    });

    it('should handle empty events', () => {
      tracker.prune();
      expect((tracker as any).events.length).toBe(0);
    });
  });
});
