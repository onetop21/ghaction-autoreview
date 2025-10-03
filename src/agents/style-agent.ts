import { BaseAgent } from './base-agent';

/**
 * Style & Convention Expert Agent
 * 코딩 스타일 및 컨벤션 검증 전문
 */
export class StyleAgent extends BaseAgent {
  constructor(apiKey: string, model: string) {
    super(apiKey, model, 'style');
  }

  protected getSystemPromptName(): string {
    return 'style-expert';
  }
}
