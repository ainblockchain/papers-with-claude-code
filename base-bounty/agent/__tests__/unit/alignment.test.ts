import { jest } from '@jest/globals';
import { AlignmentEngine } from '../../src/alignment.js';

function createMockAin() {
  const mockEmitter = {
    connect: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockLlm = {
    chat: jest.fn().mockResolvedValue('Gap analysis: you should explore topic X deeper.'),
  };

  const mockKnowledge = {
    getExplorations: jest.fn().mockResolvedValue(null),
  };

  return {
    em: mockEmitter,
    llm: mockLlm,
    knowledge: mockKnowledge,
    eventHandlerUrl: 'ws://localhost:5100',
  } as any;
}

describe('AlignmentEngine', () => {
  let ain: ReturnType<typeof createMockAin>;
  let alignment: AlignmentEngine;

  beforeEach(() => {
    ain = createMockAin();
    alignment = new AlignmentEngine(ain, '0xMyAddress');
  });

  // ---------------------------------------------------------------------------
  // startListening
  // ---------------------------------------------------------------------------

  describe('startListening', () => {
    it('should connect to event manager and subscribe', async () => {
      await alignment.startListening();

      expect(ain.em.connect).toHaveBeenCalledWith('ws://localhost:5100');
      expect(ain.em.subscribe).toHaveBeenCalledWith(
        'exploration_watcher',
        expect.objectContaining({
          type: 'VALUE_CHANGED',
          path: '/apps/knowledge/explorations/$addr/$topic_key/$entry_id',
        }),
        expect.any(Function)
      );
    });

    it('should not subscribe twice if already listening', async () => {
      await alignment.startListening();
      await alignment.startListening();

      expect(ain.em.connect).toHaveBeenCalledTimes(1);
      expect(ain.em.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should handle connection failure gracefully', async () => {
      ain.em.connect.mockRejectedValue(new Error('WebSocket failed'));

      // Should not throw
      await alignment.startListening();

      // Should not have subscribed
      expect(ain.em.subscribe).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // handleNewExploration
  // ---------------------------------------------------------------------------

  describe('handleNewExploration', () => {
    it('should skip events with no value or path', async () => {
      await alignment.handleNewExploration({ path: null, value: null });
      await alignment.handleNewExploration({ path: '/some/path', value: null });
      await alignment.handleNewExploration({ path: null, value: { title: 'test' } });

      // No LLM calls should be made
      expect(ain.llm.chat).not.toHaveBeenCalled();
    });

    it('should skip own explorations', async () => {
      await alignment.handleNewExploration({
        path: '/apps/knowledge/explorations/0xMyAddress/ai|transformers/entry1',
        value: { title: 'My own exploration', topic_path: 'ai/transformers' },
      });

      expect(ain.knowledge.getExplorations).not.toHaveBeenCalled();
    });

    it('should trigger cross-reference for other nodes explorations', async () => {
      ain.knowledge.getExplorations.mockResolvedValue({
        entry1: { title: 'Peer exploration', summary: 'Summary', topic_path: 'ai/transformers' },
      });

      await alignment.handleNewExploration({
        path: '/apps/knowledge/explorations/0xPeerAddress/ai|transformers/entry1',
        value: { title: 'Peer exploration', topic_path: 'ai/transformers' },
      });

      // Should have called getExplorations for both our and peer's work
      expect(ain.knowledge.getExplorations).toHaveBeenCalledWith('0xMyAddress', 'ai/transformers');
      expect(ain.knowledge.getExplorations).toHaveBeenCalledWith('0xPeerAddress', 'ai/transformers');
    });
  });

  // ---------------------------------------------------------------------------
  // crossReference
  // ---------------------------------------------------------------------------

  describe('crossReference', () => {
    it('should return null if peer has no explorations', async () => {
      ain.knowledge.getExplorations.mockResolvedValue(null);

      const result = await alignment.crossReference('ai/transformers', '0xPeer');
      expect(result).toBeNull();
    });

    it('should use LLM to analyze gaps between our and peer explorations', async () => {
      ain.knowledge.getExplorations
        .mockResolvedValueOnce({
          entry1: { title: 'Our work', summary: 'Our summary' },
        })
        .mockResolvedValueOnce({
          entry2: { title: 'Peer work', summary: 'Peer summary' },
        });

      const result = await alignment.crossReference('ai/transformers', '0xPeer');

      expect(result).toBe('Gap analysis: you should explore topic X deeper.');
      expect(ain.llm.chat).toHaveBeenCalledWith([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({
          role: 'user',
          content: expect.stringContaining('ai/transformers'),
        }),
      ]);
    });

    it('should handle "none yet" when we have no explorations', async () => {
      ain.knowledge.getExplorations
        .mockResolvedValueOnce(null) // Our explorations
        .mockResolvedValueOnce({
          entry1: { title: 'Peer work', summary: 'Peer summary' },
        });

      await alignment.crossReference('ai/transformers', '0xPeer');

      const chatArgs = ain.llm.chat.mock.calls[0][0];
      expect(chatArgs[1].content).toContain('none yet');
    });

    it('should return null on LLM error', async () => {
      ain.knowledge.getExplorations
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          entry1: { title: 'Peer', summary: 'Sum' },
        });
      ain.llm.chat.mockRejectedValue(new Error('LLM down'));

      const result = await alignment.crossReference('test', '0xPeer');
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // stop
  // ---------------------------------------------------------------------------

  describe('stop', () => {
    it('should disconnect the event manager', () => {
      alignment.stop();
      expect(ain.em.disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect errors silently', () => {
      ain.em.disconnect.mockImplementation(() => { throw new Error('Already disconnected'); });

      // Should not throw
      expect(() => alignment.stop()).not.toThrow();
    });
  });
});
