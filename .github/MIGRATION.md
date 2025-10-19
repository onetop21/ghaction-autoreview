# Migration Guide

## 구조 변경 사항 (2025년)

이 저장소의 구조가 단순화되었습니다.

### 변경 전 (구 구조)

```
.github/
├── actions/
│   ├── setup-codex-cli/      # 내부 composite action
│   ├── light-review/          # 내부 composite action
│   ├── deep-review/           # 내부 composite action
│   ├── documentation/         # 내부 composite action
│   └── issue-up/              # 내부 composite action
└── workflows/                 # 복잡한 워크플로우 (50+ 줄)

scripts/
└── run_codex_cli.sh          # Codex CLI 래퍼 스크립트
```

### 변경 후 (신 구조)

```
action.yml                     # 모든 로직 통합 (설치 + 실행 + 게시)
prompts/                       # AI 프롬프트 정의
.github/workflows/             # 간단한 워크플로우 예시 (20줄 내외)
```

### 주요 개선 사항

1. **단일 진입점**: `action.yml` 하나로 모든 기능 제공
2. **자동 게시**: 결과를 자동으로 커밋/PR/Issue에 게시
3. **Self-hosted 지원**: 별도 설정 없이 동일하게 동작
4. **간단한 사용법**: 6줄의 워크플로우로 사용 가능

### 마이그레이션 방법

#### 기존 워크플로우
```yaml
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/light-review
        with:
          codex-version: "0.5.0"
          model: gpt-5-codex
          prompt-file: prompts/light-review.md
          output-path: artifacts/report.md
      - uses: actions/upload-artifact@v4
        with:
          name: review-report
          path: artifacts/report.md
      - name: Publish comment
        run: |
          gh api repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/comments \
            -f body="$(cat artifacts/report.md)"
```

#### 새 워크플로우
```yaml
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./
        with:
          mode: light
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

### 삭제된 파일

- `.github/actions/*`: 모든 내부 composite actions (통합됨)
- `scripts/run_codex_cli.sh`: Codex CLI 래퍼 스크립트 (통합됨)

### 새로운 입력 파라미터

- `publish` (기본값: `true`): 결과 자동 게시 여부 제어
  - `false`로 설정하면 리포트만 생성하고 게시하지 않음
  - 수동으로 게시 로직을 제어하고 싶을 때 사용
