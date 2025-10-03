import { BaseAgent } from './base-agent';

/**
 * Architecture Expert Agent
 * 아키텍처 일관성 분석 전문
 */
export class ArchitectureAgent extends BaseAgent {
  constructor(apiKey: string, model: string) {
    super(apiKey, model, 'architecture');
  }

  protected getSystemPromptName(): string {
    return 'architecture-expert';
  }
}
