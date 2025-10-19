# Codex Auto Review

> GitHub Actions 기반 자동 코드 리뷰 시스템

## 개요

Codex CLI를 활용한 자동 코드 리뷰 GitHub Action입니다. 단일 `action.yml` 파일로 구현되어 있으며, 외부 저장소에서 간단하게 통합할 수 있습니다.

**주요 특징:**
- ✅ **단순함**: CLI 도구만 사용 (gh, codex, git)
- ✅ **플러그 앤 플레이**: 모드와 이벤트만 지정하면 자동 동작
- ✅ **Self-hosted 지원**: 별도 설정 없이 동일하게 작동
- ✅ **자동 게시**: 결과를 자동으로 커밋/PR/Issue에 게시

## 빠른 시작

### 1. 워크플로우 파일 추가

외부 저장소의 `.github/workflows/code-review.yml`에 추가:

```yaml
name: Code Review

on:
  push:
    branches-ignore:
      - main
      - master

permissions:
  contents: write
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: onetop21/ghaction-autoreview@main
        with:
          mode: light
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

### 2. 시크릿 설정

저장소 Settings → Secrets에 `CODEX_API_KEY` 추가

### 3. 완료!

이제 브랜치에 푸시하면 자동으로 리뷰가 실행되고 커밋에 코멘트가 달립니다.

## 4가지 리뷰 모드

### Light Review (`mode: light`)
**언제**: 기능 브랜치에 푸시할 때
**무엇을**: 정적 분석, 린트, 컨벤션, 메모리 누수 체크
**결과**: 커밋 코멘트

```yaml
on:
  push:
    branches-ignore: [main, master]
jobs:
  light-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: onetop21/ghaction-autoreview@main
        with:
          mode: light
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

### Deep Review (`mode: deep`)
**언제**: Pull Request 생성/업데이트 시
**무엇을**: 아키텍처, 보안, 유지보수성, 사이드 이펙트 종합 검토
**결과**: PR 코멘트

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
jobs:
  deep-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: onetop21/ghaction-autoreview@main
        with:
          mode: deep
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

### Documentation (`mode: docs`)
**언제**: 메인 브랜치 머지 후
**무엇을**: 머지된 코드에 대한 문서 생성
**결과**: `docs/` 디렉토리에 자동 커밋

```yaml
on:
  push:
    branches: [main, master]
jobs:
  documentation:
    if: ${{ !startsWith(github.event.head_commit.message, '[docs]') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: onetop21/ghaction-autoreview@main
        with:
          mode: docs
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

### Issue Detection (`mode: issue`)
**언제**: 메인 브랜치 머지 후
**무엇을**: 치명적인 결함 탐지
**결과**: 고위험 이슈 발견 시 GitHub Issue 자동 생성

```yaml
on:
  push:
    branches: [main, master]
jobs:
  issue-detection:
    if: ${{ !startsWith(github.event.head_commit.message, '[docs]') }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: onetop21/ghaction-autoreview@main
        with:
          mode: issue
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

## 고급 설정

### 기본값 덮어쓰기

```yaml
- uses: onetop21/ghaction-autoreview@main
  with:
    mode: light
    codex-version: "0.6.0"          # Codex CLI 버전
    model: "gpt-4-turbo"             # AI 모델 변경
    prompt-file: custom/prompt.md    # 커스텀 프롬프트
    output-path: reports/review.md   # 출력 경로
    extra-args: "--verbose"          # 추가 CLI 옵션
    publish: "false"                 # 자동 게시 비활성화
  env:
    CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

### Self-hosted Runner에서 사용

```yaml
jobs:
  review:
    runs-on: self-hosted  # GitHub-hosted 대신
    steps:
      - uses: actions/checkout@v4
      - uses: onetop21/ghaction-autoreview@main
        with:
          mode: light
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

**요구사항:**
- Python 3 설치
- `gh` CLI 설치 및 인증
- 표준 Linux 셸 유틸리티

### 필요한 권한

```yaml
permissions:
  contents: write        # docs 모드에서 커밋하기 위해
  pull-requests: write   # deep 모드에서 PR 코멘트 작성
  issues: write          # issue 모드에서 이슈 생성
```

## 프롬프트 커스터마이징

AI 동작을 변경하려면 `prompts/` 디렉토리의 프롬프트 파일을 수정하세요:

```bash
prompts/
├── light-review.md      # 빠른 리뷰 프롬프트
├── deep-review.md       # 종합 리뷰 프롬프트
├── documentation.md     # 문서 생성 프롬프트
└── issue-up.md          # 이슈 탐지 프롬프트
```

각 프롬프트 파일 구조:
- **목적**: 모듈이 달성해야 할 목표
- **컨텍스트 가이드라인**: 리뷰 집중 영역
- **응답 형식**: 예상 출력 구조

**중요**: Issue 모드의 경우 `issue-required` 마커를 유지해야 자동 이슈 생성이 작동합니다.

## 로컬 테스트

```bash
# Codex CLI 설치
python3 -m venv ~/.codex-cli/test
~/.codex-cli/test/bin/pip install codex-cli==0.5.0

# 프롬프트 테스트
~/.codex-cli/test/bin/codex exec \
  --model gpt-5-codex \
  --prompt-file prompts/light-review.md \
  --mode light \
  --output /tmp/report.md
```

## 아키텍처

```
action.yml                      # 단일 composite action (모든 로직)
├── 1. 입력 검증 및 모드별 기본값 설정
├── 2. Codex CLI 설치 (캐시 활용)
├── 3. 프롬프트 실행
└── 4. 결과 자동 게시
    ├── light → 커밋 코멘트
    ├── deep  → PR 코멘트
    ├── docs  → 저장소 커밋
    └── issue → GitHub Issue 생성
```

**핵심 원리:**
- `${GITHUB_ACTION_PATH}`를 사용해 액션 저장소의 프롬프트 참조
- 외부 저장소는 프롬프트 파일 복사 불필요
- 게시 로직이 이벤트 타입(`push` vs `pull_request`)에 따라 자동 조정

## 마이그레이션

이전 버전(복잡한 내부 composite actions 구조)에서 업그레이드하는 경우 [MIGRATION.md](.github/MIGRATION.md)를 참고하세요.

## 파일 구조

```
.
├── action.yml                      # 메인 액션 (모든 로직)
├── prompts/                        # AI 프롬프트
│   ├── light-review.md
│   ├── deep-review.md
│   ├── documentation.md
│   └── issue-up.md
├── .github/
│   ├── workflows/                  # 이 저장소의 예시 워크플로우
│   └── MIGRATION.md                # 마이그레이션 가이드
├── docs/
│   └── ARCHITECTURE.md             # 상세 아키텍처 문서
├── CLAUDE.md                       # Claude Code용 가이드
└── README.md                       # 이 파일
```

## 목표 달성

| 목표 | 달성 |
|------|------|
| GitHub Action 모듈이 단순할 것 (CLI만 사용) | ✅ |
| 외부 프로젝트에서 모듈만 붙이면 자동 동작 | ✅ |
| Self-hosted runner에서도 잘 동작 | ✅ |
| 단일 파일로 모든 처리 | ✅ |
| 자동 결과 게시 | ✅ |

## 확장

### 새로운 모드 추가

1. `prompts/<new-mode>.md` 생성
2. `action.yml`의 모드 검증 단계에 case 추가
3. 필요시 게시 로직 추가
4. 문서 업데이트

### 게시 동작 변경

`action.yml`의 "결과 게시" 단계들을 수정하세요. 각 모드는 독립적인 게시 단계를 가지며 `inputs.publish`와 `github.event_name`으로 제어됩니다.

## 라이선스

MIT

## 기여

이슈와 PR을 환영합니다!
