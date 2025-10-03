# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI 기반 Multi-Agent 코드 리뷰 시스템. OpenAI GPT를 활용하여 PR/커밋을 자동으로 리뷰하고, main 브랜치 머지 시 아키텍처 문서를 자동 생성/업데이트합니다.

**핵심 기능:**
- **Multi-Agent 코드 리뷰**: Coordinator → 5개 전문 Agent (병렬) → Aggregator
- **DRY 분석**: 중복 분석 방지, 컨텍스트 공유로 토큰 효율 최적화
- **프롬프트 파일 관리**: 별도 디렉토리에서 프롬프트 관리 및 버전 제어
- **다이어그램 자동 생성**: Mermaid → PNG 변환 포함 문서 생성

## Commands

### 빌드
```bash
npm install
npm run build
```

### 개발
```bash
# TypeScript 컴파일만
npx tsc

# 특정 파일 컴파일
npx tsc src/agents/coordinator.ts --noEmit
```

### 테스트
```bash
npm test
```

### 린트 & 포맷팅
```bash
npm run lint
npm run format
```

## Architecture

### 전체 시스템 구조

```
GitHub Event (PR)
    ↓
src/index.ts
    ↓
src/review-multi-agent.ts
    ↓
┌─────────────────────────────────────┐
│ 1. Coordinator Agent                │
│    - DRY 분석 (컨텍스트 추출)       │
│    - prompts/system/coordinator.md  │
└──────────────┬──────────────────────┘
               ↓ DryAnalysis
    ┌──────────┴──────────┐
    ↓ (병렬 실행)           ↓
┌─────────────────────────────────────┐
│ 2. Specialized Agents (5개)        │
│    - SecurityAgent                  │
│    - PerformanceAgent               │
│    - QualityAgent                   │
│    - StyleAgent                     │
│    - ArchitectureAgent              │
│    각 Agent: DRY분석 + 코드 수신    │
└──────────────┬──────────────────────┘
               ↓ AgentResult[]
┌─────────────────────────────────────┐
│ 3. Aggregator Agent                 │
│    - 결과 취합 & 우선순위화          │
│    - 통합 마크다운 리포트 생성       │
└──────────────┬──────────────────────┘
               ↓ Markdown
        GitHub PR Comment
```

### 디렉토리 구조

```
ghaction-autoreview/
├── prompts/                    # 프롬프트 관리 (파일 기반)
│   ├── system/                 # 시스템 프롬프트 (Agent 페르소나)
│   │   ├── coordinator.md
│   │   ├── security-expert.md
│   │   ├── performance-expert.md
│   │   ├── quality-expert.md
│   │   ├── style-expert.md
│   │   ├── architecture-expert.md
│   │   └── aggregator.md
│   ├── tasks/                  # 태스크 프롬프트
│   │   ├── code-review/
│   │   │   ├── coordinator.md
│   │   │   └── review-agent.md
│   │   └── documentation/
│   │       └── architecture-doc.md
│   └── examples/               # Few-shot 예시
│       └── good-review.md
│
├── src/
│   ├── agents/                 # Multi-Agent 시스템
│   │   ├── types.ts            # 공통 타입 정의
│   │   ├── coordinator.ts      # DRY 분석
│   │   ├── base-agent.ts       # 베이스 클래스
│   │   ├── security-agent.ts   # 보안 전문가
│   │   ├── performance-agent.ts # 성능 전문가
│   │   ├── quality-agent.ts    # 품질 전문가
│   │   ├── style-agent.ts      # 스타일 전문가
│   │   ├── architecture-agent.ts # 아키텍처 전문가
│   │   └── aggregator.ts       # 결과 취합
│   │
│   ├── utils/
│   │   ├── prompt-loader.ts    # 프롬프트 로더 (Mustache 변수 치환)
│   │   └── diagram-generator.ts # Mermaid → PNG 변환
│   │
│   ├── index.ts                # GitHub Action 진입점
│   ├── review-multi-agent.ts   # Multi-Agent 리뷰 오케스트레이터
│   └── documentation.ts        # 문서 생성 (다이어그램 포함)
│
├── .github/workflows/
│   └── code-review.yml
├── action.yml
└── package.json
```

### 핵심 컴포넌트

#### 1. Coordinator Agent (`src/agents/coordinator.ts`)
- **역할**: PR 변경사항 전체 분석, DRY 컨텍스트 추출
- **출력**: `DryAnalysis` (변경 목적, 영향 모듈, 아키텍처 패턴 등)
- **프롬프트**: `prompts/system/coordinator.md`

#### 2. Specialized Agents (5개)
- **입력**: `DryAnalysis` + `CodeChange[]`
- **특징**:
  - 베이스 클래스 (`BaseAgent`) 상속
  - 각자의 전문 영역에만 집중
  - 병렬 실행으로 성능 최적화
- **출력**: `AgentResult` (issues, summary)

#### 3. Aggregator Agent (`src/agents/aggregator.ts`)
- **역할**:
  - 이슈 우선순위화 (Critical > High > Medium > Low)
  - 중복 제거
  - 품질 점수 계산 (5점 만점)
  - 통합 마크다운 리포트 생성
- **출력**: `AggregatedReview` + Markdown

#### 4. Prompt Loader (`src/utils/prompt-loader.ts`)
- **역할**:
  - 파일 기반 프롬프트 로드
  - Mustache 스타일 변수 치환 (`{{variable}}`)
  - 캐싱 지원
- **사용 예시**:
  ```typescript
  const prompt = await promptLoader.buildPrompt({
    systemPrompt: 'security-expert',
    taskCategory: 'code-review',
    taskName: 'review-agent',
    variables: { code: '...', dryAnalysis: {...} },
    includeExamples: ['good-review']
  });
  ```

#### 5. Diagram Generator (`src/utils/diagram-generator.ts`)
- **역할**:
  - 마크다운에서 Mermaid 코드 블록 추출
  - `@mermaid-js/mermaid-cli` 사용하여 PNG 변환
  - 마크다운에 이미지 임베드

### 데이터 플로우

**PR 리뷰 플로우:**
```
1. GitHub PR 생성
   ↓
2. review-multi-agent.ts
   - PR 파일 목록 수집
   ↓
3. Coordinator.analyzePR()
   - DRY 분석 수행
   ↓
4. Promise.all([5개 Agent])
   - 병렬로 전문 분석 실행
   - 각 Agent는 DRY + 코드 수신
   ↓
5. Aggregator.aggregate()
   - 이슈 취합 & 우선순위화
   - 마크다운 생성
   ↓
6. GitHub API
   - PR에 코멘트 작성
```

**문서 생성 플로우:**
```
1. main 브랜치 푸시
   ↓
2. documentation.ts
   - 코드베이스 스캔
   ↓
3. OpenAI API
   - 아키텍처 문서 생성 (Mermaid 포함)
   ↓
4. DiagramGenerator
   - Mermaid → PNG 변환
   - 마크다운에 이미지 임베드
   ↓
5. ARCHITECTURE.md 생성
   ↓
6. Git 자동 커밋 & 푸시
```

## Configuration

### 필수 Secret

- `OPENAI_API_KEY`: OpenAI API 키
- `GITHUB_TOKEN`: GitHub 제공 (자동)

### action.yml 파라미터

- `model`: OpenAI 모델 (기본: `gpt-5-codex`)

## Development Notes

### 프롬프트 관리

**프롬프트 수정 시:**
1. `prompts/` 디렉토리의 해당 파일 수정
2. 코드 변경 없이 즉시 반영 (빌드 불필요)
3. 버전 관리로 A/B 테스트 가능

**변수 치환:**
```markdown
# prompts/tasks/code-review/coordinator.md
변경된 파일: {{changedFiles}}
Diff: {{diff}}
```

### Agent 추가 방법

1. `prompts/system/new-agent.md` 생성
2. `src/agents/new-agent.ts` 작성 (BaseAgent 상속)
3. `src/review-multi-agent.ts`에 Agent 추가
4. 빌드 & 테스트

### 토큰 최적화

- **Coordinator**: 전체 컨텍스트 한 번만 분석 (DRY)
- **Specialized Agents**: 필요한 정보만 수신
- **Truncation**: Diff 내용 자동 truncate (6000자)
- **Caching**: 프롬프트 캐싱으로 파일 I/O 최소화

### Mermaid 다이어그램

**생성 조건:**
1. `@mermaid-js/mermaid-cli` 설치됨
2. 마크다운에 \`\`\`mermaid 블록 존재

**실패 시:**
- Mermaid 코드 그대로 유지 (GitHub가 자동 렌더링)
- Warning 로그 출력

## 주의사항

1. **OpenAI API 비용**: 5개 Agent 병렬 실행으로 토큰 사용량 증가
2. **Rate Limit**: 대량 PR 시 OpenAI/GitHub API Rate Limit 고려
3. **프롬프트 엔지니어링**: Agent별 프롬프트 튜닝 필요
4. **False Positive**: Agent 판단이 틀릴 수 있음 (Aggregator가 필터링)

## Troubleshooting

**빌드 실패 시:**
```bash
rm -rf node_modules dist
npm install
npm run build
```

**프롬프트 로드 실패:**
- `prompts/` 디렉토리가 dist에 포함되지 않음
- 런타임에 파일 시스템 접근 필요

**Agent 분석 실패:**
- Fallback 결과 반환 (빈 이슈 리스트)
- 로그 확인: `[AgentType] Analysis failed`

## Performance Tips

1. **병렬 실행**: 5개 Agent가 Promise.all로 동시 실행
2. **Diff Truncation**: 큰 PR은 자동으로 truncate
3. **프롬프트 캐싱**: 동일 프롬프트 재사용
4. **선택적 Agent**: 필요한 Agent만 활성화 가능

## 추가 개선 방향

1. Agent 선택적 활성화 (config 파일)
2. 팀별 커스텀 프롬프트 지원
3. 언어별 특화 Agent
4. 리뷰 품질 피드백 루프
