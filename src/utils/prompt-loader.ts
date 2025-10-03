import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 프롬프트 파일을 로드하고 변수를 치환하는 유틸리티
 */
export class PromptLoader {
  private promptsDir: string;
  private cache: Map<string, string>;

  constructor(promptsDir?: string) {
    this.promptsDir = promptsDir || path.join(process.cwd(), 'prompts');
    this.cache = new Map();
  }

  /**
   * 시스템 프롬프트 로드
   */
  async loadSystemPrompt(agentType: string): Promise<string> {
    const cacheKey = `system:${agentType}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const promptPath = path.join(this.promptsDir, 'system', `${agentType}.md`);
    const content = await fs.readFile(promptPath, 'utf-8');
    this.cache.set(cacheKey, content);
    return content;
  }

  /**
   * 태스크 프롬프트 로드
   */
  async loadTaskPrompt(category: string, taskName: string, variables?: Record<string, any>): Promise<string> {
    const promptPath = path.join(this.promptsDir, 'tasks', category, `${taskName}.md`);
    let content = await fs.readFile(promptPath, 'utf-8');

    // 변수 치환
    if (variables) {
      content = this.replaceVariables(content, variables);
    }

    return content;
  }

  /**
   * 예시 프롬프트 로드
   */
  async loadExample(exampleName: string): Promise<string> {
    const cacheKey = `example:${exampleName}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const promptPath = path.join(this.promptsDir, 'examples', `${exampleName}.md`);
    const content = await fs.readFile(promptPath, 'utf-8');
    this.cache.set(cacheKey, content);
    return content;
  }

  /**
   * 변수 치환 (Mustache-style: {{variable}})
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in variables) {
        const value = variables[key];
        // 객체/배열은 JSON으로 변환
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2);
        }
        return String(value);
      }
      return match; // 변수가 없으면 그대로 유지
    });
  }

  /**
   * 전체 프롬프트 구성 (시스템 + 태스크 + 예시)
   */
  async buildPrompt(config: {
    systemPrompt: string;
    taskCategory: string;
    taskName: string;
    variables?: Record<string, any>;
    includeExamples?: string[];
  }): Promise<{ system: string; user: string }> {
    const systemPrompt = await this.loadSystemPrompt(config.systemPrompt);
    const taskPrompt = await this.loadTaskPrompt(config.taskCategory, config.taskName, config.variables);

    let userPrompt = taskPrompt;

    // 예시 추가
    if (config.includeExamples && config.includeExamples.length > 0) {
      const examples = await Promise.all(config.includeExamples.map(ex => this.loadExample(ex)));
      userPrompt = `${examples.join('\n\n---\n\n')}\n\n---\n\n${userPrompt}`;
    }

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 싱글톤 인스턴스
export const promptLoader = new PromptLoader();
