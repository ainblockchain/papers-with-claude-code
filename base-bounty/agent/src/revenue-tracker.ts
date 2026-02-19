interface RevenueEvent {
  timestamp: number;
  amount: number;
  type: 'income' | 'cost';
  source: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export class RevenueTracker {
  private events: RevenueEvent[] = [];

  recordIncome(amount: number, source: string): void {
    this.events.push({ timestamp: Date.now(), amount, type: 'income', source });
  }

  recordCost(amount: number, source: string): void {
    this.events.push({ timestamp: Date.now(), amount, type: 'cost', source });
  }

  getIncomeLast24h(): number {
    const cutoff = Date.now() - DAY_MS;
    return this.events
      .filter(e => e.type === 'income' && e.timestamp >= cutoff)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getCostLast24h(): number {
    const cutoff = Date.now() - DAY_MS;
    return this.events
      .filter(e => e.type === 'cost' && e.timestamp >= cutoff)
      .reduce((sum, e) => sum + e.amount, 0);
  }

  getSustainabilityRatio(): number {
    const cost = this.getCostLast24h();
    if (cost === 0) return Infinity;
    return this.getIncomeLast24h() / cost;
  }

  getSnapshot() {
    return {
      incomeLast24h: this.getIncomeLast24h(),
      costLast24h: this.getCostLast24h(),
      sustainabilityRatio: this.getSustainabilityRatio(),
      totalEvents: this.events.length,
    };
  }

  // Clean up old events (>7 days) to prevent unbounded growth
  prune(): void {
    const cutoff = Date.now() - 7 * DAY_MS;
    this.events = this.events.filter(e => e.timestamp >= cutoff);
  }
}
