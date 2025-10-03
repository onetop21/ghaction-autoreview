import * as core from '@actions/core';
import { getOctokit } from '@actions/github';
import { Context } from '@actions/github/lib/context';
import OpenAI from 'openai';

type Octokit = ReturnType<typeof getOctokit>;

export async function reviewCode(
  octokit: Octokit,
  context: Context,
  openaiApiKey: string,
  model: string
): Promise<void> {
  const openai = new OpenAI({ apiKey: openaiApiKey });

  if (!context.payload.pull_request) {
    core.warning('No pull request found in context');
    return;
  }

  const { owner, repo } = context.repo;
  const pullNumber = context.payload.pull_request.number;

  // PR의 변경된 파일 가져오기
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
  });

  // 변경사항 수집
  const changes = files.map(file => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch || '',
  }));

  // GPT-5 Codex를 통한 코드 리뷰
  const reviewPrompt = `
당신은 전문 코드 리뷰어입니다. 다음 PR의 변경사항을 검토하고 상세한 리뷰를 제공해주세요.

검토 항목:
1. **Lint & 코딩 컨벤션**: 코드 스타일, 네이밍, 포맷팅 검토
2. **정적 분석**: 타입 안정성, 잠재적 버그, null/undefined 체크
3. **보안 취약점**: SQL 인젝션, XSS, 인증/인가 이슈, 민감정보 노출
4. **성능 최적화**: 불필요한 반복, 메모리 누수, 비효율적 알고리즘
5. **사이드 이펙트**: 예상치 못한 상태 변경, 전역 변수 오염
6. **코드 품질**: 중복 코드, 복잡도, 가독성, 테스트 가능성
7. **기존 코드와의 일관성**: 아키텍처 패턴, 팀 코딩 스타일 준수

변경된 파일들:
${JSON.stringify(changes, null, 2)}

다음 형식으로 리뷰를 작성해주세요:

## 📋 코드 리뷰 요약

### ✅ 긍정적인 부분
- (잘된 부분 나열)

### ⚠️ 개선이 필요한 부분

#### 1. [카테고리] 파일명:라인번호
- **문제**: (구체적인 문제 설명)
- **제안**: (개선 방안)
- **우선순위**: High/Medium/Low

### 🔒 보안 이슈
- (보안 관련 발견사항)

### 🚀 성능 최적화 제안
- (성능 개선 가능 부분)

### 📝 전체 평가
- **코드 품질**: (상/중/하)
- **머지 권장**: (Yes/No/조건부)
`;

  const completion = await openai.chat.completions.create({
    model: model,
    messages: [
      {
        role: 'system',
        content: '당신은 코드 리뷰 전문가입니다. 상세하고 건설적인 피드백을 제공합니다.',
      },
      { role: 'user', content: reviewPrompt },
    ],
    temperature: 0.3,
  });

  const reviewComment = completion.choices[0]?.message?.content || '리뷰를 생성할 수 없습니다.';

  // PR에 리뷰 코멘트 작성
  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body: `## 🤖 AI 코드 리뷰\n\n${reviewComment}\n\n---\n*Powered by ${model}*`,
  });

  core.info('Review comment posted successfully');
}
