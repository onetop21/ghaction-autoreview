# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

이 프로젝트는 GitHub Action을 통해 PR 및 커밋을 자동으로 리뷰하고, main 브랜치 머지 시 아키텍처 문서를 자동 생성/업데이트하는 AI 기반 코드 리뷰 에이전트입니다.

**핵심 기능:**
- PR 생성/업데이트 시 OpenAI GPT-5 Codex를 활용한 자동 코드 리뷰
- Lint, 컨벤션, 보안, 성능, 사이드 이펙트, 코드 품질 등 다각도 분석
- main/master 브랜치 머지 시 ARCHITECTURE.md 자동 생성/업데이트

## Commands

### 빌드
```bash
npm install
npm run build
```

### 테스트
```bash
npm test
```

### 린트
```bash
npm run lint
```

### 포맷팅
```bash
npm run format
```

### 로컬 개발
```bash
# TypeScript 컴파일
npm run build

# 단일 테스트 실행
npm test -- <test-file-name>
```

## Architecture

### 프로젝트 구조

```
ghaction-autoreview/
├── src/
│   ├── index.ts           # 메인 엔트리포인트 (이벤트 분기)
│   ├── review.ts          # PR 코드 리뷰 로직
│   └── documentation.ts   # 문서 자동 생성 로직
├── .github/
│   └── workflows/
│       └── code-review.yml # GitHub Action 워크플로우
├── action.yml             # GitHub Action 메타데이터
├── package.json
└── tsconfig.json
```

### 핵심 컴포넌트

1. **index.ts**: GitHub Action 메인 진입점
   - `pull_request` 이벤트: `reviewCode()` 호출
   - `push` (main/master): `generateDocumentation()` 호출

2. **review.ts**: PR 코드 리뷰 수행
   - GitHub API로 변경된 파일 목록 수집
   - OpenAI GPT-5 Codex에 코드 분석 요청
   - 리뷰 결과를 PR 코멘트로 작성

3. **documentation.ts**: 아키텍처 문서 생성
   - 코드베이스 전체 스캔 (`.ts`, `.js`, `.json` 등)
   - GPT-5 Codex로 아키텍처 문서 생성
   - ARCHITECTURE.md 파일 생성/업데이트 및 자동 커밋

### 데이터 플로우

**PR 리뷰 플로우:**
1. PR 생성/업데이트 → GitHub Action 트리거
2. `@actions/github`로 변경 파일 수집
3. OpenAI API 호출 (리뷰 프롬프트 전달)
4. 응답 받아 PR에 코멘트 작성

**문서 생성 플로우:**
1. main 브랜치 푸시 → GitHub Action 트리거
2. 코드베이스 파일 수집 (`collectCodebaseFiles`)
3. OpenAI API 호출 (문서 생성 프롬프트 전달)
4. ARCHITECTURE.md 생성/업데이트
5. Git commit & push (자동 커밋)

## Configuration

### 필수 Secret 설정

GitHub 저장소 Settings > Secrets and variables > Actions에서 설정:

- `OPENAI_API_KEY`: OpenAI API 키 (필수)
- `GITHUB_TOKEN`: GitHub 제공 (자동 설정)

### action.yml 커스터마이징

- `model`: 사용할 OpenAI 모델 (기본값: `gpt-5-codex`)

## Development Notes

### OpenAI API 사용

- 현재 `gpt-5-codex` 모델 사용 (실제로는 GPT-4 Turbo 또는 최신 모델로 대체 가능)
- 코드 리뷰: `temperature: 0.3` (일관성 있는 리뷰)
- 문서 생성: `temperature: 0.3` (구조화된 문서)

### 코드 리뷰 프롬프트 수정

`src/review.ts`의 `reviewPrompt` 변수를 수정하여 리뷰 기준 커스터마이징 가능:
- 검토 항목 추가/제거
- 출력 형식 변경
- 우선순위 기준 조정

### 문서 생성 프롬프트 수정

`src/documentation.ts`의 `docPrompt` 변수를 수정하여 문서 형식 커스터마이징 가능:
- 섹션 추가/제거
- 문서 구조 변경

### 파일 수집 로직 조정

`collectCodebaseFiles()` 함수에서:
- `excludeDirs`: 제외할 디렉토리 설정
- `includeExts`: 분석 대상 파일 확장자 설정
- 각 파일당 최대 3000자로 제한 (토큰 제한 고려)

## GitHub Action Workflow

`.github/workflows/code-review.yml`:
- `pull_request`: PR 생성/동기화/재오픈 시 트리거
- `push` (main/master): 메인 브랜치 푸시 시 트리거

로컬 Action 사용 (`uses: ./`):
- 별도 배포 없이 저장소 내에서 직접 실행
- 다른 저장소에서 사용하려면 GitHub Marketplace에 배포 필요

## 주의사항

1. **토큰 비용**: OpenAI API 호출 시 비용 발생 (큰 PR은 비용 증가)
2. **Rate Limit**: GitHub API 및 OpenAI API rate limit 고려
3. **자동 커밋**: 문서 업데이트 시 `[skip ci]` 태그로 무한 루프 방지
4. **권한**: GitHub Action이 코드를 푸시하려면 적절한 권한 필요 (기본 `GITHUB_TOKEN`으로 가능)
