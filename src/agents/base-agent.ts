import * as core from '@actions/core';
import OpenAI from 'openai';
import { DryAnalysis, CodeChange, AgentResult } from './types';
import { promptLoader } from '../utils/prompt-loader';

/**
 * 베이스 Agent 클래스
 * 모든 전문 Agent가 상속받는 공통 로직
 */
export abstract class BaseAgent {
  protected openai: OpenAI;
  protected model: string;
  protected agentType: string;

  constructor(apiKey: string, model: string, agentType: string) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
    this.agentType = agentType;
  }

  /**
   * Agent 분석 실행
   */
  async analyze(dryAnalysis: DryAnalysis, changes: CodeChange[]): Promise<AgentResult> {
    core.info(`[${this.agentType}] Starting analysis...`);

    try {
      const changedFiles = changes.map(c => c.filename).join(', ');
      const diff = changes
        .map(c => `File: ${c.filename}\n${c.patch || ''}`)
        .join('\n\n');

      // 프롬프트 로드
      const prompt = await promptLoader.buildPrompt({
        systemPrompt: this.getSystemPromptName(),
        taskCategory: 'code-review',
        taskName: 'review-agent',
        variables: {
          dryAnalysis: JSON.stringify(dryAnalysis, null, 2),
          changedFiles,
          diff: this.truncate(diff, 6000),
          agentType: this.agentType,
        },
        includeExamples: ['good-review'],
      });

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);
      core.info(`[${this.agentType}] Analysis completed - ${result.issues?.length || 0} issues found`);

      return {
        agentType: this.agentType,
        ...result,
      };
    } catch (error) {
      core.error(`[${this.agentType}] Analysis failed: ${error}`);
      return this.createFallbackResult();
    }
  }

  /**
   * Agent별 시스템 프롬프트 이름 반환
   */
  protected abstract getSystemPromptName(): string;

  /**
   * Fallback 결과 생성
   */
  protected createFallbackResult(): AgentResult {
    return {
      agentType: this.agentType,
      issues: [],
      summary: `${this.agentType} analysis failed`,
    };
  }

  /**
   * 텍스트 truncate
   */
  protected truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return `${text.substring(0, maxLength)}\n\n... (truncated)`;
  }
}
