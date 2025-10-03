import { BaseAgent } from './base-agent';

/**
 * Performance Expert Agent
 * 성능 최적화 분석 전문
 */
export class PerformanceAgent extends BaseAgent {
  constructor(apiKey: string, model: string) {
    super(apiKey, model, 'performance');
  }

  protected getSystemPromptName(): string {
    return 'performance-expert';
  }
}
