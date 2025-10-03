import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { Context } from '@actions/github/lib/context';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';

type Octokit = ReturnType<typeof getOctokit>;

export async function generateDocumentation(
  octokit: Octokit,
  context: Context,
  openaiApiKey: string,
  model: string
): Promise<void> {
  const openai = new OpenAI({ apiKey: openaiApiKey });
  const { owner, repo } = context.repo;

  // 코드베이스 분석을 위한 주요 파일 수집
  const codebaseFiles = await collectCodebaseFiles();

  // GPT-5 Codex를 통한 문서 생성
  const docPrompt = `
당신은 소프트웨어 아키텍트이자 기술 문서 작성 전문가입니다.
다음 코드베이스를 분석하여 포괄적인 기술 문서를 작성해주세요.

코드베이스:
${JSON.stringify(codebaseFiles, null, 2)}

다음 형식으로 문서를 작성해주세요:

# 프로젝트 아키텍처 문서

## 📐 시스템 아키텍처

### 전체 구조
- (시스템의 전반적인 구조 설명)

### 주요 컴포넌트
- (각 컴포넌트의 역할과 책임)

### 데이터 플로우
- (데이터가 시스템을 통해 흐르는 방식)

## 🔧 기술 스택
- (사용된 기술 및 프레임워크)

## 📂 디렉토리 구조
\`\`\`
(주요 디렉토리 설명)
\`\`\`

## 🔄 핵심 동작 흐름

### [주요 기능 1]
1. (단계별 설명)

### [주요 기능 2]
1. (단계별 설명)

## 🗃️ 데이터 모델
- (주요 데이터 구조 및 관계)

## 🔌 API/인터페이스
- (외부 연동 및 API 설명)

## 🚀 배포 및 운영
- (배포 방식, 환경 설정)

## 📝 개발 가이드
- (새로운 개발자를 위한 안내)

## 🔍 주의사항
- (알아야 할 중요한 제약사항이나 고려사항)
`;

  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'system',
        content: '당신은 기술 문서 작성 전문가입니다. 명확하고 구조화된 문서를 작성합니다.',
      },
      { role: 'user', content: docPrompt },
    ],
    temperature: 0.3,
  });

  const documentation = completion.choices[0]?.message?.content || '문서를 생성할 수 없습니다.';

  // ARCHITECTURE.md 파일 생성/업데이트
  const docPath = path.join(process.cwd(), 'ARCHITECTURE.md');
  await fs.writeFile(docPath, documentation, 'utf-8');

  // 변경사항 커밋 및 푸시
  try {
    const { execSync } = require('child_process');
    execSync('git config user.name "github-actions[bot]"');
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
    execSync('git add ARCHITECTURE.md');
    execSync('git commit -m "docs: Update architecture documentation [skip ci]"');
    execSync('git push');
    core.info('Documentation updated and committed successfully');
  } catch (error) {
    core.warning(`Failed to commit documentation: ${error}`);
  }
}

async function collectCodebaseFiles(): Promise<any[]> {
  const files: any[] = [];
  const excludeDirs = ['node_modules', 'dist', '.git', 'coverage'];
  const includeExts = ['.ts', '.js', '.tsx', '.jsx', '.json', '.yml', '.yaml'];

  async function scanDir(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);

      if (entry.isDirectory() && !excludeDirs.includes(entry.name)) {
        await scanDir(fullPath);
      } else if (entry.isFile() && includeExts.some(ext => entry.name.endsWith(ext))) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          files.push({
            path: relativePath,
            content: content.slice(0, 3000), // 각 파일당 최대 3000자
          });
        } catch (error) {
          // 파일 읽기 실패 시 무시
        }
      }
    }
  }

  await scanDir(process.cwd());
  return files;
}
