import { BaseAgent } from './base-agent';

/**
 * Security Expert Agent
 * 보안 취약점 분석 전문
 */
export class SecurityAgent extends BaseAgent {
  constructor(apiKey: string, model: string) {
    super(apiKey, model, 'security');
  }

  protected getSystemPromptName(): string {
    return 'security-expert';
  }
}
