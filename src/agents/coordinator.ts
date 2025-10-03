import * as core from '@actions/core';
import OpenAI from 'openai';
import { DryAnalysis, CodeChange } from './types';
import { promptLoader } from '../utils/prompt-loader';

/**
 * Coordinator Agent
 * 전체 코드 변경사항을 분석하여 DRY(Don't Repeat Yourself) 컨텍스트를 추출
 */
export class CoordinatorAgent {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * 코드 변경사항 분석 및 DRY 컨텍스트 추출
   */
  async analyzePR(changes: CodeChange[]): Promise<DryAnalysis> {
    core.info('[Coordinator] Analyzing PR for context extraction...');

    const changedFiles = changes.map(c => c.filename).join(', ');
    const diff = changes
      .map(c => `File: ${c.filename}\nStatus: ${c.status}\n${c.patch || ''}`)
      .join('\n\n---\n\n');

    // 프롬프트 로드
    const prompt = await promptLoader.buildPrompt({
      systemPrompt: 'coordinator',
      taskCategory: 'code-review',
      taskName: 'coordinator',
      variables: {
        changedFiles,
        diff: this.truncateDiff(diff, 8000), // 토큰 제한 고려
      },
    });

    try {
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

      const analysis = JSON.parse(content) as DryAnalysis;
      core.info('[Coordinator] Context extraction completed');
      core.debug(`[Coordinator] Analysis: ${JSON.stringify(analysis, null, 2)}`);

      return analysis;
    } catch (error) {
      core.error(`[Coordinator] Failed to analyze PR: ${error}`);
      // Fallback: 기본 분석 정보 반환
      return this.createFallbackAnalysis(changes);
    }
  }

  /**
   * Diff 내용을 토큰 제한에 맞게 truncate
   */
  private truncateDiff(diff: string, maxLength: number): string {
    if (diff.length <= maxLength) {
      return diff;
    }

    const truncated = diff.substring(0, maxLength);
    return `${truncated}\n\n... (truncated for token limit)`;
  }

  /**
   * Fallback 분석 (API 실패 시)
   */
  private createFallbackAnalysis(changes: CodeChange[]): DryAnalysis {
    return {
      changeType: 'other',
      purpose: 'Unable to analyze due to API error',
      affectedModules: this.extractModulesFromChanges(changes),
      architecturePattern: 'Unknown',
      technicalStack: [],
      keyChanges: changes.slice(0, 5).map(c => ({
        file: c.filename,
        type: this.mapStatus(c.status),
        description: `${c.additions} additions, ${c.deletions} deletions`,
      })),
      potentialRisks: [],
      testCoverage: 'Unknown',
      breakingChanges: 'Unknown',
      dependencies: [],
    };
  }

  /**
   * 변경된 파일에서 모듈 추출
   */
  private extractModulesFromChanges(changes: CodeChange[]): string[] {
    const modules = new Set<string>();

    for (const change of changes) {
      const parts = change.filename.split('/');
      if (parts.length > 1) {
        modules.add(parts[0]); // 최상위 디렉토리를 모듈로 간주
      }
    }

    return Array.from(modules);
  }

  /**
   * GitHub status를 우리 타입으로 매핑
   */
  private mapStatus(status: string): 'added' | 'modified' | 'deleted' {
    if (status === 'added') return 'added';
    if (status === 'removed') return 'deleted';
    return 'modified';
  }
}
