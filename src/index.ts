import * as core from '@actions/core';
import * as github from '@actions/github';
import { reviewCode } from './review';
import { generateDocumentation } from './documentation';

async function run(): Promise<void> {
  try {
    const openaiApiKey = core.getInput('openai-api-key', { required: true });
    const githubToken = core.getInput('github-token', { required: true });
    const model = core.getInput('model') || 'gpt-5-codex';

    const context = github.context;
    const octokit = github.getOctokit(githubToken);

    // PR 리뷰 처리
    if (context.eventName === 'pull_request') {
      core.info('Running code review on pull request...');
      await reviewCode(octokit, context, openaiApiKey, model);
    }

    // main/master 브랜치 merge 시 문서 생성/업데이트
    if (
      context.eventName === 'push' &&
      (context.ref === 'refs/heads/main' || context.ref === 'refs/heads/master')
    ) {
      core.info('Generating/updating documentation...');
      await generateDocumentation(octokit, context, openaiApiKey, model);
    }

    core.info('✅ Auto review completed successfully');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
