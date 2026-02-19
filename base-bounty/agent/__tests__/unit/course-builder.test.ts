import { jest } from '@jest/globals';
import { CourseBuilder } from '../../src/course-builder.js';

function createMockAin() {
  return {
    signer: {
      getAddress: jest.fn().mockReturnValue('0xTestAddress'),
    },
    knowledge: {
      getExplorations: jest.fn(),
      aiGenerateCourse: jest.fn(),
      publishCourse: jest.fn(),
    },
  } as any;
}

describe('CourseBuilder', () => {
  let ain: ReturnType<typeof createMockAin>;
  let builder: CourseBuilder;

  beforeEach(() => {
    ain = createMockAin();
    builder = new CourseBuilder(ain);
  });

  // ---------------------------------------------------------------------------
  // transformToCourse
  // ---------------------------------------------------------------------------

  describe('transformToCourse', () => {
    it('should get explorations and generate course stages', async () => {
      ain.knowledge.getExplorations.mockResolvedValue({
        entry1: { title: 'Attention', summary: 'Attention summary', depth: 1, content: 'Content 1' },
        entry2: { title: 'Multi-Head', summary: 'Multi-head summary', depth: 2, content: 'Content 2' },
      });

      const stages = [
        { title: 'Intro', content: 'Intro content', exercise: 'What is attention?' },
        { title: 'Advanced', content: 'Advanced content', exercise: 'Explain multi-head' },
      ];
      ain.knowledge.aiGenerateCourse.mockResolvedValue({ stages, thinking: null });

      const result = await builder.transformToCourse('ai/transformers');

      expect(ain.knowledge.getExplorations).toHaveBeenCalledWith('0xTestAddress', 'ai/transformers');
      expect(ain.knowledge.aiGenerateCourse).toHaveBeenCalledWith(
        'ai/transformers',
        expect.arrayContaining([
          expect.objectContaining({ title: 'Attention' }),
          expect.objectContaining({ title: 'Multi-Head' }),
        ])
      );
      expect(result).toEqual(stages);
    });

    it('should throw when no explorations found', async () => {
      ain.knowledge.getExplorations.mockResolvedValue(null);

      await expect(builder.transformToCourse('empty/topic'))
        .rejects.toThrow('No explorations found for topic: empty/topic');
    });

    it('should throw when explorations object is empty', async () => {
      ain.knowledge.getExplorations.mockResolvedValue({});

      await expect(builder.transformToCourse('empty/topic'))
        .rejects.toThrow('No explorations found for topic: empty/topic');
    });
  });

  // ---------------------------------------------------------------------------
  // publishStages
  // ---------------------------------------------------------------------------

  describe('publishStages', () => {
    it('should publish each stage as a gated exploration', async () => {
      ain.knowledge.publishCourse
        .mockResolvedValueOnce({ entryId: 'stage1_id' })
        .mockResolvedValueOnce({ entryId: 'stage2_id' });

      const stages = [
        { title: 'Stage 1', content: 'Content 1', exercise: 'Exercise 1' },
        { title: 'Stage 2', content: 'Content 2', exercise: 'Exercise 2' },
      ];

      const entryIds = await builder.publishStages(
        'ai/transformers',
        stages,
        'http://gateway.example.com',
        '0.002'
      );

      expect(entryIds).toEqual(['stage1_id', 'stage2_id']);
      expect(ain.knowledge.publishCourse).toHaveBeenCalledTimes(2);

      // Verify first stage call
      const firstCall = ain.knowledge.publishCourse.mock.calls[0][0];
      expect(firstCall.topicPath).toBe('ai/transformers');
      expect(firstCall.title).toBe('[Course] Stage 1');
      expect(firstCall.content).toContain('Content 1');
      expect(firstCall.content).toContain('Exercise 1');
      expect(firstCall.price).toBe('0.002');
      expect(firstCall.gatewayBaseUrl).toBe('http://gateway.example.com');
      expect(firstCall.depth).toBe(1);
      expect(firstCall.tags).toBe('course,stage-1');

      // Verify second stage call
      const secondCall = ain.knowledge.publishCourse.mock.calls[1][0];
      expect(secondCall.depth).toBe(2);
      expect(secondCall.tags).toBe('course,stage-2');
    });

    it('should use default price of 0.001', async () => {
      ain.knowledge.publishCourse.mockResolvedValue({ entryId: 'id' });

      await builder.publishStages(
        'test',
        [{ title: 'S', content: 'C', exercise: 'E' }],
        'http://gw.example.com'
      );

      expect(ain.knowledge.publishCourse.mock.calls[0][0].price).toBe('0.001');
    });

    it('should cap depth at 5 for stages beyond 5', async () => {
      ain.knowledge.publishCourse.mockResolvedValue({ entryId: 'id' });

      const manyStages = Array.from({ length: 7 }, (_, i) => ({
        title: `Stage ${i + 1}`,
        content: `Content ${i + 1}`,
        exercise: `Exercise ${i + 1}`,
      }));

      await builder.publishStages('test', manyStages, 'http://gw.example.com');

      // Stage 6 should have depth 5 (capped)
      expect(ain.knowledge.publishCourse.mock.calls[5][0].depth).toBe(5);
      expect(ain.knowledge.publishCourse.mock.calls[6][0].depth).toBe(5);
    });
  });

  // ---------------------------------------------------------------------------
  // buildAndPublish
  // ---------------------------------------------------------------------------

  describe('buildAndPublish', () => {
    it('should transform then publish in sequence', async () => {
      ain.knowledge.getExplorations.mockResolvedValue({
        e1: { title: 'E1', summary: 'S1', depth: 1, content: 'C1' },
      });

      const stages = [
        { title: 'Only Stage', content: 'Content', exercise: 'Exercise' },
      ];
      ain.knowledge.aiGenerateCourse.mockResolvedValue({ stages, thinking: null });
      ain.knowledge.publishCourse.mockResolvedValue({ entryId: 'published_id' });

      const result = await builder.buildAndPublish('test/topic', 'http://gw.example.com', '0.005');

      expect(result.stages).toEqual(stages);
      expect(result.entryIds).toEqual(['published_id']);
    });
  });
});
