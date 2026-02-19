import Ain from '@ainblockchain/ain-js';

export class AlignmentEngine {
  private ain: Ain;
  private address: string;
  private listening = false;

  constructor(ain: Ain, address: string) {
    this.ain = ain;
    this.address = address;
  }

  /**
   * Start listening for new explorations from other nodes via AIN event subscriptions.
   */
  async startListening(): Promise<void> {
    if (this.listening) return;
    this.listening = true;

    console.log('[Alignment] Starting event listener for new explorations...');

    try {
      // Subscribe to exploration events via ain.em
      const filter = {
        config: {
          type: 'VALUE_CHANGED',
          path: '/apps/knowledge/explorations/$addr/$topic_key/$entry_id',
        },
      };

      await this.ain.em.connect(this.ain.eventHandlerUrl || 'ws://localhost:5100');

      this.ain.em.subscribe(
        'exploration_watcher',
        filter.config,
        (event: any) => {
          this.handleNewExploration(event).catch((err: any) => {
            console.error(`[Alignment] Error handling exploration event: ${err.message}`);
          });
        }
      );

      console.log('[Alignment] Subscribed to exploration events.');
    } catch (err: any) {
      console.error(`[Alignment] Failed to start listener: ${err.message}`);
      this.listening = false;
    }
  }

  /**
   * Handle a new exploration event from another node.
   */
  async handleNewExploration(event: any): Promise<void> {
    const { path, value } = event;
    if (!value || !path) return;

    // Extract address from path
    const pathParts = path.split('/');
    const explorerAddr = pathParts[4]; // /apps/knowledge/explorations/{addr}/...

    // Skip our own explorations
    if (explorerAddr === this.address) return;

    console.log(`[Alignment] New exploration detected from ${explorerAddr}: "${value.title}"`);

    // Cross-reference with our own work
    if (value.topic_path) {
      await this.crossReference(value.topic_path, explorerAddr);
    }
  }

  /**
   * Cross-reference a topic: read other nodes' work, identify gaps.
   */
  async crossReference(topicPath: string, peerAddress: string): Promise<string | null> {
    try {
      // Get our explorations on this topic
      const ours = await this.ain.knowledge.getExplorations(this.address, topicPath);
      const theirs = await this.ain.knowledge.getExplorations(peerAddress, topicPath);

      if (!theirs) return null;

      const ourSummaries = ours
        ? Object.values(ours).map(e => e.summary).join('; ')
        : 'none yet';

      const theirSummaries = Object.values(theirs)
        .map(e => `"${e.title}": ${e.summary}`)
        .join('\n');

      const analysis = await this.ain.llm.chat([
        {
          role: 'system',
          content: 'Identify knowledge gaps between two sets of explorations on the same topic. Be concise.',
        },
        {
          role: 'user',
          content: `Topic: ${topicPath}\n\nOur explorations: ${ourSummaries}\n\nPeer explorations:\n${theirSummaries}\n\nWhat gaps should we fill?`,
        },
      ]);

      console.log(`[Alignment] Cross-reference for ${topicPath}: ${analysis.substring(0, 150)}...`);
      return analysis;
    } catch (err: any) {
      console.error(`[Alignment] Cross-reference failed: ${err.message}`);
      return null;
    }
  }

  stop(): void {
    this.listening = false;
    try {
      this.ain.em.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
}
