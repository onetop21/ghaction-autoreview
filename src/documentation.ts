import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { Context } from '@actions/github/lib/context';
import OpenAI from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import { promptLoader } from './utils/prompt-loader';
import { diagramGenerator } from './utils/diagram-generator';

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

  // 프롬프트 로드
  const prompt = await promptLoader.buildPrompt({
    systemPrompt: 'architect',
    taskCategory: 'documentation',
    taskName: 'architecture-doc',
    variables: {
      codebaseFiles: JSON.stringify(codebaseFiles.slice(0, 20), null, 2), // 처음 20개만
    },
  });

  const docPrompt = prompt.user || `
# 프로젝트 아키텍처 문서

코드베이스:
${JSON.stringify(codebaseFiles.slice(0, 20), null, 2)}

다음을 포함하여 문서를 작성해주세요:
- 시스템 아키텍처 (Mermaid graph 포함)
- 데이터 플로우 (Mermaid flowchart 포함)
- 주요 기능 시퀀스 (Mermaid sequenceDiagram 포함)
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
        content: prompt.system || '당신은 기술 문서 작성 전문가입니다. Mermaid 다이어그램을 포함한 구조화된 문서를 작성합니다.',
      },
      { role: 'user', content: docPrompt },
    ],
    temperature: 0.3,
  });

  let documentation = completion.choices[0]?.message?.content || '문서를 생성할 수 없습니다.';

  // Mermaid 다이어그램을 PNG로 변환 (선택적)
  try {
    const diagramDir = path.join(process.cwd(), 'docs', 'diagrams');
    await fs.mkdir(diagramDir, { recursive: true });

    const pngPaths = await diagramGenerator.convertMermaidToPng(documentation, diagramDir);
    if (pngPaths.length > 0) {
      documentation = diagramGenerator.embedPngInMarkdown(documentation, pngPaths);
      core.info(`Generated ${pngPaths.length} diagram images`);
    }
  } catch (error) {
    core.warning(`Failed to generate diagram images: ${error}`);
    // Mermaid 코드를 그대로 유지
  }

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
