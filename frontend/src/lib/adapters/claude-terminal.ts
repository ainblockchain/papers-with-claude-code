// 🔌 ADAPTER — Claude Code web terminal integration
// ⚠️ NEEDS_INPUT — Claude Code API spec needed
import { StageContext } from '@/types/learning';

export interface TerminalMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ClaudeTerminalAdapter {
  sendMessage(message: string, context: StageContext): Promise<string>;
  getStageIntroduction(context: StageContext): Promise<string>;
  presentQuiz(context: StageContext): Promise<string>;
  validateQuizAnswer(context: StageContext, answer: string): Promise<{ correct: boolean; feedback: string }>;
}

class MockClaudeTerminalAdapter implements ClaudeTerminalAdapter {
  async sendMessage(message: string, context: StageContext): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return `Great question about "${context.stageTitle}"! Based on the concepts we've covered (${context.concepts.map(c => c.title).join(', ')}), here's what I can tell you:\n\nThis is a mock response. In production, Claude Code will provide detailed, contextual explanations related to the paper "${context.paperTitle}".`;
  }

  async getStageIntroduction(context: StageContext): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return `Welcome to **Stage ${context.stageNumber}: ${context.stageTitle}**!\n\nIn this stage, you'll learn about:\n${context.concepts.map((c, i) => `${i + 1}. **${c.title}** — ${c.content.substring(0, 80)}...`).join('\n')}\n\nExplore the room and interact with the blackboards to learn each concept. When you're ready, approach the door to take the quiz!`;
  }

  async presentQuiz(context: StageContext): Promise<string> {
    return `**Quiz Time!**\n\nYou've explored all the concepts in this stage. Now let's test your understanding.\n\nType your answer or select from the options provided.`;
  }

  async validateQuizAnswer(_context: StageContext, answer: string): Promise<{ correct: boolean; feedback: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Mock: accept any non-empty answer
    if (answer.trim().length > 0) {
      return { correct: true, feedback: 'Correct! Great job. The door to the next stage is now unlocked.' };
    }
    return { correct: false, feedback: 'Not quite. Try again! Hint: Review the concepts on the blackboards.' };
  }
}

export const claudeTerminalAdapter: ClaudeTerminalAdapter = new MockClaudeTerminalAdapter();
