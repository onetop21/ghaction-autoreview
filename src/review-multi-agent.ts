import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { Context } from '@actions/github/lib/context';
import { CodeChange } from './agents/types';
import { CoordinatorAgent } from './agents/coordinator';
import { SecurityAgent } from './agents/security-agent';
import { PerformanceAgent } from './agents/performance-agent';
import { QualityAgent } from './agents/quality-agent';
import { StyleAgent } from './agents/style-agent';
import { ArchitectureAgent } from './agents/architecture-agent';
import { AggregatorAgent } from './agents/aggregator';

type Octokit = ReturnType<typeof getOctokit>;

/**
 * Multi-Agent 코드 리뷰 시스템
 */
export async function reviewCodeMultiAgent(
  octokit: Octokit,
  context: Context,
  openaiApiKey: string,
  model: string
): Promise<void> {
  core.info('🚀 Starting Multi-Agent Code Review System...');

  if (!context.payload.pull_request) {
    core.warning('No pull request found in context');
    return;
  }

  const { owner, repo } = context.repo;
  const pullNumber = context.payload.pull_request.number;

  try {
    // 1. PR의 변경된 파일 가져오기
    core.info('[Step 1/5] Fetching changed files...');
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
    });

    const changes: CodeChange[] = files.map(file => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch || '',
    }));

    core.info(`Found ${changes.length} changed files`);

    // 2. Coordinator Agent: DRY 분석
    core.info('[Step 2/5] Coordinator analyzing PR context...');
    const coordinator = new CoordinatorAgent(openaiApiKey, model);
    const dryAnalysis = await coordinator.analyzePR(changes);

    // 3. 전문 Agent들 병렬 실행
    core.info('[Step 3/5] Running specialized agents in parallel...');
    const agents = [
      new SecurityAgent(openaiApiKey, model),
      new PerformanceAgent(openaiApiKey, model),
      new QualityAgent(openaiApiKey, model),
      new StyleAgent(openaiApiKey, model),
      new ArchitectureAgent(openaiApiKey, model),
    ];

    const agentResults = await Promise.all(
      agents.map(agent => agent.analyze(dryAnalysis, changes))
    );

    // 4. Aggregator Agent: 결과 취합
    core.info('[Step 4/5] Aggregating results...');
    const aggregator = new AggregatorAgent(openaiApiKey, model);
    const aggregatedReview = await aggregator.aggregate(dryAnalysis, agentResults);

    // 5. GitHub PR에 코멘트 작성
    core.info('[Step 5/5] Posting review to PR...');
    const markdown = (aggregatedReview as any).markdown || JSON.stringify(aggregatedReview, null, 2);

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: markdown + '\n\n---\n*🤖 Powered by Multi-Agent AI Review System*',
    });

    core.info('✅ Multi-Agent Review completed successfully!');
  } catch (error) {
    core.error(`❌ Multi-Agent Review failed: ${error}`);
    throw error;
  }
}
