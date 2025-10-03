# 🤖 GitHub Action Auto Review

OpenAI GPT-5 Codex를 활용한 자동 코드 리뷰 및 문서 생성 GitHub Action

## 주요 기능

- ✅ **자동 PR 리뷰**: PR 생성 시 자동으로 코드 리뷰 수행
- 🔍 **다각도 분석**: Lint, 컨벤션, 보안, 성능, 사이드 이펙트 등 종합 검토
- 📝 **자동 문서화**: main 브랜치 머지 시 아키텍처 문서 자동 생성/업데이트
- 🚀 **간단한 설정**: GitHub Action으로 쉽게 통합

## 설치 방법

### 1. 저장소에 Secret 추가

Settings > Secrets and variables > Actions에서 다음 Secret 추가:

```
OPENAI_API_KEY: your-openai-api-key
```

### 2. Workflow 파일 생성

`.github/workflows/code-review.yml` 파일 생성:

```yaml
name: Auto Code Review

on:
  pull_request:
    types: [opened, synchronize, reopened]
  push:
    branches:
      - main

jobs:
  code-review:
    runs-on: ubuntu-latest
    name: AI Code Review
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Auto Review
        uses: ./
        with:
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 사용 방법

### PR 리뷰

1. PR 생성 또는 업데이트
2. GitHub Action이 자동으로 실행
3. PR에 리뷰 코멘트 자동 작성

### 문서 자동 생성

1. main/master 브랜치에 머지
2. GitHub Action이 자동으로 실행
3. `ARCHITECTURE.md` 파일 자동 생성/업데이트

## 리뷰 항목

- 📏 Lint & 코딩 컨벤션
- 🔒 보안 취약점 검사
- ⚡ 성능 최적화 제안
- 🔍 정적 분석
- 💥 사이드 이펙트 검토
- 🎨 코드 품질 및 가독성
- 🏗️ 기존 코드와의 일관성

## 개발

```bash
# 의존성 설치
npm install

# 빌드
npm run build

# 테스트
npm test

# 린트
npm run lint
```

## 라이선스

MIT
