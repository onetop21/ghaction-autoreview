import { BaseAgent } from './base-agent';

/**
 * Code Quality Expert Agent
 * 코드 품질 분석 전문
 */
export class QualityAgent extends BaseAgent {
  constructor(apiKey: string, model: string) {
    super(apiKey, model, 'quality');
  }

  protected getSystemPromptName(): string {
    return 'quality-expert';
  }
}
