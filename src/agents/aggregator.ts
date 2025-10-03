import * as core from '@actions/core';
import OpenAI from 'openai';
import { DryAnalysis, AgentResult, AgentIssue, AggregatedReview } from './types';
import { promptLoader } from '../utils/prompt-loader';

/**
 * Aggregator Agent
 * 여러 전문 Agent의 결과를 취합하여 통합 리포트 생성
 */
export class AggregatorAgent {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * 여러 Agent 결과를 취합하여 통합 리뷰 생성
   */
  async aggregate(dryAnalysis: DryAnalysis, agentResults: AgentResult[]): Promise<AggregatedReview> {
    core.info('[Aggregator] Aggregating agent results...');

    try {
      // 간단한 취합 (GPT 호출 없이)
      const aggregated = this.aggregateLocally(dryAnalysis, agentResults);

      // GPT로 최종 리포트 생성 (마크다운)
      const markdown = await this.generateMarkdownReport(dryAnalysis, aggregated);

      return {
        ...aggregated,
        markdown,
      } as any;
    } catch (error) {
      core.error(`[Aggregator] Failed to aggregate: ${error}`);
      return this.createFallbackAggregation(dryAnalysis, agentResults);
    }
  }

  /**
   * 로컬에서 이슈 취합 (우선순위, 중복 제거)
   */
  private aggregateLocally(dryAnalysis: DryAnalysis, agentResults: AgentResult[]): AggregatedReview {
    const allIssues: AgentIssue[] = [];

    // 모든 이슈 수집
    for (const result of agentResults) {
      if (result.issues) {
        allIssues.push(...result.issues);
      }
    }

    // 심각도별 분류
    const criticalIssues = allIssues.filter(i => i.severity === 'Critical');
    const highPriorityIssues = allIssues.filter(i => i.severity === 'High');
    const mediumLowIssues = allIssues.filter(i => ['Medium', 'Low'].includes(i.severity));

    // 통계
    const statistics = {
      critical: criticalIssues.length,
      high: highPriorityIssues.length,
      medium: allIssues.filter(i => i.severity === 'Medium').length,
      low: allIssues.filter(i => i.severity === 'Low').length,
      total: allIssues.length,
    };

    // 긍정적 피드백 수집
    const positives: string[] = [];
    for (const result of agentResults) {
      if ((result as any).positives) {
        positives.push(...(result as any).positives);
      }
    }

    // 전체 평가
    const overallAssessment = this.calculateOverallAssessment(statistics);
    const mergeRecommendation = this.getMergeRecommendation(statistics);

    // 품질 점수 계산
    const qualityScores = this.calculateQualityScores(agentResults);

    // 다음 단계 제안
    const nextSteps = this.generateNextSteps(criticalIssues, highPriorityIssues);

    return {
      summary: {
        changeType: dryAnalysis.changeType,
        affectedModules: dryAnalysis.affectedModules,
        overallAssessment,
        mergeRecommendation,
      },
      positives: positives.slice(0, 5), // 상위 5개만
      criticalIssues: criticalIssues,
      highPriorityIssues: highPriorityIssues,
      mediumLowPriorityIssues: mediumLowIssues,
      statistics: statistics,
      qualityScores: qualityScores,
      nextSteps: nextSteps,
    };
  }

  /**
   * 전체 평가 계산
   */
  private calculateOverallAssessment(stats: any): 'Good' | 'Acceptable' | 'Needs Improvement' {
    if (stats.critical > 0 || stats.high > 3) {
      return 'Needs Improvement';
    }
    if (stats.high > 0 || stats.medium > 5) {
      return 'Acceptable';
    }
    return 'Good';
  }

  /**
   * 머지 권장 계산
   */
  private getMergeRecommendation(stats: any): 'Yes' | 'Conditional' | 'No' {
    if (stats.critical > 0) {
      return 'No';
    }
    if (stats.high > 0) {
      return 'Conditional';
    }
    return 'Yes';
  }

  /**
   * 품질 점수 계산 (5점 만점)
   */
  private calculateQualityScores(agentResults: AgentResult[]): any {
    const scores: any = {
      security: 5,
      performance: 5,
      quality: 5,
      consistency: 5,
    };

    for (const result of agentResults) {
      const issueCount = result.issues?.length || 0;
      const criticalCount = result.issues?.filter(i => i.severity === 'Critical').length || 0;

      let deduction = 0;
      if (criticalCount > 0) deduction = 3;
      else if (issueCount > 5) deduction = 2;
      else if (issueCount > 2) deduction = 1;

      if (result.agentType === 'security') scores.security -= deduction;
      else if (result.agentType === 'performance') scores.performance -= deduction;
      else if (result.agentType === 'quality') scores.quality -= deduction;
      else if (result.agentType === 'style' || result.agentType === 'architecture') {
        scores.consistency -= deduction / 2;
      }
    }

    // 최소 1점
    Object.keys(scores).forEach(key => {
      scores[key] = Math.max(1, scores[key]);
    });

    return scores;
  }

  /**
   * 다음 단계 제안 생성
   */
  private generateNextSteps(criticalIssues: AgentIssue[], highIssues: AgentIssue[]): string[] {
    const steps: string[] = [];

    if (criticalIssues.length > 0) {
      steps.push(`🔴 즉시 수정: ${criticalIssues.length}개의 Critical 이슈 해결`);
    }

    if (highIssues.length > 0) {
      steps.push(`🟡 머지 전 검토: ${highIssues.length}개의 High Priority 이슈 검토`);
    }

    if (steps.length === 0) {
      steps.push('✅ 코드 품질이 양호합니다. 머지 가능합니다.');
    }

    return steps;
  }

  /**
   * 마크다운 리포트 생성
   */
  private async generateMarkdownReport(dryAnalysis: DryAnalysis, aggregated: AggregatedReview): Promise<string> {
    // 간단한 템플릿 기반 생성 (GPT 호출 대신)
    const sections: string[] = [];

    sections.push('## 🤖 AI 코드 리뷰\n');

    sections.push('### 📊 전체 요약');
    sections.push(`- **변경 유형**: ${dryAnalysis.changeType}`);
    sections.push(`- **영향 범위**: ${dryAnalysis.affectedModules.join(', ')}`);
    sections.push(`- **전체 평가**: ${aggregated.summary.overallAssessment}`);
    sections.push(`- **머지 권장**: ${this.getMergeEmoji(aggregated.summary.mergeRecommendation)} ${aggregated.summary.mergeRecommendation}\n`);

    if (aggregated.positives.length > 0) {
      sections.push('### ✅ 잘된 부분');
      aggregated.positives.forEach(p => sections.push(`- ${p}`));
      sections.push('');
    }

    if (aggregated.criticalIssues.length > 0) {
      sections.push('### 🔴 Critical Issues (즉시 수정 필요)');
      aggregated.criticalIssues.forEach((issue, idx) => {
        sections.push(`#### ${idx + 1}. [${issue.category}] ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        sections.push(`- **문제**: ${issue.description}`);
        sections.push(`- **해결**: ${issue.recommendation}\n`);
      });
    }

    if (aggregated.highPriorityIssues.length > 0) {
      sections.push('### 🟡 High Priority Issues (머지 전 검토 필요)');
      aggregated.highPriorityIssues.slice(0, 10).forEach((issue, idx) => {
        sections.push(`#### ${idx + 1}. [${issue.category}] ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        sections.push(`- **문제**: ${issue.description}`);
        sections.push(`- **해결**: ${issue.recommendation}\n`);
      });
      if (aggregated.highPriorityIssues.length > 10) {
        sections.push(`... 외 ${aggregated.highPriorityIssues.length - 10}개 이슈\n`);
      }
    }

    sections.push('### 📈 통계');
    sections.push(`- Critical: ${aggregated.statistics.critical}개`);
    sections.push(`- High: ${aggregated.statistics.high}개`);
    sections.push(`- Medium: ${aggregated.statistics.medium}개`);
    sections.push(`- Low: ${aggregated.statistics.low}개`);
    sections.push(`- **총 이슈**: ${aggregated.statistics.total}개\n`);

    sections.push('### 🏆 코드 품질 점수');
    sections.push(`- 보안: ${'⭐'.repeat(aggregated.qualityScores.security)} (${aggregated.qualityScores.security}/5)`);
    sections.push(`- 성능: ${'⭐'.repeat(aggregated.qualityScores.performance)} (${aggregated.qualityScores.performance}/5)`);
    sections.push(`- 품질: ${'⭐'.repeat(aggregated.qualityScores.quality)} (${aggregated.qualityScores.quality}/5)`);
    sections.push(`- 일관성: ${'⭐'.repeat(Math.round(aggregated.qualityScores.consistency))} (${Math.round(aggregated.qualityScores.consistency)}/5)\n`);

    sections.push('### 💡 다음 단계');
    aggregated.nextSteps.forEach((step, idx) => sections.push(`${idx + 1}. ${step}`));

    return sections.join('\n');
  }

  /**
   * 머지 권장 이모지
   */
  private getMergeEmoji(recommendation: string): string {
    if (recommendation === 'Yes') return '✅';
    if (recommendation === 'Conditional') return '⚠️';
    return '❌';
  }

  /**
   * Fallback 취합
   */
  private createFallbackAggregation(dryAnalysis: DryAnalysis, agentResults: AgentResult[]): AggregatedReview {
    return {
      summary: {
        changeType: dryAnalysis.changeType,
        affectedModules: dryAnalysis.affectedModules,
        overallAssessment: 'Acceptable',
        mergeRecommendation: 'Conditional',
      },
      positives: [],
      criticalIssues: [],
      highPriorityIssues: [],
      mediumLowPriorityIssues: [],
      statistics: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
      qualityScores: { security: 3, performance: 3, quality: 3, consistency: 3 },
      nextSteps: ['리뷰 생성에 실패했습니다. 수동 검토가 필요합니다.'],
    };
  }
}
