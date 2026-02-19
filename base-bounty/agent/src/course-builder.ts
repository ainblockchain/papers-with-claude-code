import Ain, { AinInstance } from './ain-import.js';

interface CourseStage {
  title: string;
  content: string;
  exercise: string;
}

export class CourseBuilder {
  private ain: AinInstance;

  constructor(ain: AinInstance) {
    this.ain = ain;
  }

  /**
   * Transform explorations on a topic into a structured course.
   * Uses ain.knowledge.aiGenerateCourse() which calls the node's LLM.
   */
  async transformToCourse(topicPath: string): Promise<CourseStage[]> {
    const address = this.ain.signer.getAddress();
    const explorations = await this.ain.knowledge.getExplorations(address, topicPath);

    if (!explorations || Object.keys(explorations).length === 0) {
      throw new Error(`No explorations found for topic: ${topicPath}`);
    }

    const explorationList = Object.values(explorations);
    console.log(`[CourseBuilder] Generating course from ${explorationList.length} explorations on "${topicPath}"`);

    const result = await this.ain.knowledge.aiGenerateCourse(topicPath, explorationList);
    console.log(`[CourseBuilder] Generated ${result.stages.length} course stages`);

    return result.stages;
  }

  /**
   * Publish course stages as gated x402 content on the AIN blockchain.
   * Each stage becomes a separate gated exploration entry.
   */
  async publishStages(
    topicPath: string,
    stages: CourseStage[],
    gatewayBaseUrl: string,
    pricePerStage: string = '0.001',
  ): Promise<string[]> {
    const entryIds: string[] = [];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      console.log(`[CourseBuilder] Publishing stage ${i + 1}/${stages.length}: "${stage.title}"`);

      const result = await this.ain.knowledge.publishCourse({
        topicPath,
        title: `[Course] ${stage.title}`,
        content: `${stage.content}\n\n---\n\nExercise: ${stage.exercise}`,
        summary: `Course stage ${i + 1}: ${stage.title}`,
        depth: Math.min(i + 1, 5) as 1 | 2 | 3 | 4 | 5,
        tags: `course,stage-${i + 1}`,
        price: pricePerStage,
        gatewayBaseUrl,
      });

      entryIds.push(result.entryId);
    }

    console.log(`[CourseBuilder] Published ${entryIds.length} stages for "${topicPath}"`);
    return entryIds;
  }

  /**
   * End-to-end: generate and publish a course for a topic.
   */
  async buildAndPublish(
    topicPath: string,
    gatewayBaseUrl: string,
    pricePerStage?: string,
  ): Promise<{ stages: CourseStage[]; entryIds: string[] }> {
    const stages = await this.transformToCourse(topicPath);
    const entryIds = await this.publishStages(topicPath, stages, gatewayBaseUrl, pricePerStage);
    return { stages, entryIds };
  }
}
