# 코드 없는 코드 리뷰 에이전트

## 개요

이 저장소는 사람이 직접 작성한 리뷰 코드 없이도 자동 리뷰 파이프라인을 구축할 수 있도록 준비된 예시입니다. GitHub Actions가 Codex CLI 에이전트를 호출하여 코드를 점검하고, 리포트를 발행하며, 중요 이슈를 상위로 전달합니다. `ubuntu-latest`와 셀프 호스티드 러너 환경을 모두 지원합니다.

## 모듈 소개

- **Light Review**  
  모든 `push`에 실행되며 정적 분석 시그널, 린트류 검토, 기존 코드와의 컨벤션 차이, 메모리 누수 가능성을 확인합니다. 결과는 커밋 코멘트로 남깁니다.

- **Deep Review**  
  Pull Request가 열리거나 갱신될 때 실행됩니다. Light Review 범위에 더해 아키텍처 방향성, 보안성, 사이드 이펙트를 종합 검토하고 PR 코멘트로 결과를 게시합니다.

- **Documentation**  
  기본 브랜치에 머지된 뒤 실행되어 머지된 코드를 설명하는 문서를 생성하고 `docs/` 디렉터리에 저장합니다.

- **Issue Up**  
  머지 이후 필수 수정 사항을 탐지하여 고위험 이슈가 있으면 GitHub Issue를 자동으로 등록합니다. 발견된 문제가 없으면 건너뜁니다.

## 핵심 개념

- **프롬프트 분리**  
  `prompts/*.md`에 프롬프트를 분리해 워크플로를 건드리지 않고도 리뷰 성향을 조정할 수 있습니다.

- **Codex CLI 재사용**  
  `.github/actions/setup-codex-cli` 컴포지트 액션이 고정된 버전을 설치하고 `actions/cache`를 활용해 재실행 비용을 줄입니다.

- **러너 동등성**  
  GitHub 호스티드/셀프 호스티드 러너 모두 동일한 컴포지트 액션을 호출해 실행 환경에 따른 행동 차이를 최소화합니다.

- **리포트 전달**  
  Codex CLI가 생성한 리포트를 `gh` CLI가 받아 커밋/PR/Issue에 게시합니다.

## 저장소 구성

```
.
├── .github/
│   ├── actions/             # CLI 설치 및 모듈 실행을 위한 컴포지트 액션
│   └── workflows/           # Light/Deep/Post-merge 워크플로 정의
├── docs/                    # 생성 문서 및 아키텍처 가이드
├── prompts/                 # 모듈별 프롬프트 정의
└── scripts/                 # 컴포지트 액션에서 호출하는 스크립트
```

## 필요한 시크릿

| 시크릿 이름      | 용도                                           |
| ---------------- | ---------------------------------------------- |
| `CODEX_API_KEY`  | Codex CLI 인증 토큰                            |
| `GITHUB_TOKEN`   | GitHub가 자동 제공하며 `gh` CLI 호출에 사용됨  |

## 로컬에서 점검하기

1. `prompts/` 아래 프롬프트를 수정해 원하는 리뷰 톤을 맞춥니다.
2. Codex CLI 인터페이스가 바뀌면 컴포지트 액션을 조정합니다.
3. `CODEX_API_KEY`를 환경 변수로 설정한 뒤 `scripts/` 스크립트를 로컬에서 실행해 통합이 정상인지 확인합니다.

## 외부 저장소에서 사용하기

다른 프로젝트의 워크플로에서 다음과 같이 호출할 수 있습니다.

```yaml
jobs:
  light-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run light review
        uses: onetop21/ghaction-autoreview@main
        with:
          mode: light
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

`mode`에는 `light`, `deep`, `docs`, `issue`를 지정할 수 있으며, 필요 시 `model`, `prompt-file`, `output-path`, `extra-args` 입력으로 기본값을 덮어쓸 수 있습니다. 실행 후 `steps.<id>.outputs['report-path']`와 `steps.<id>.outputs['issue-required']`(Issue Up 모드) 값을 참고해 후속 처리를 구현하세요.

## 다음 단계 제안

- `scripts/run_codex_cli.sh`에 실제 Codex CLI 인자 구성을 반영해 주세요.
- 프롬프트에 프로젝트 특화 규칙(프레임워크 컨벤션, 보안 정책 등)을 추가해 주세요.
- 머지 이후 워크플로에서 Issue를 발행할 조건을 세분화하여 false positive를 줄이는 방안을 검토하세요.
