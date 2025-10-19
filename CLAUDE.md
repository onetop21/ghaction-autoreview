# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a **GitHub Actions-based automated code review system** using Codex CLI. It's designed as a **single, reusable composite action** that can be integrated into any GitHub repository with minimal configuration.

The system is written primarily in Korean but the code/configurations are universal. It supports both GitHub-hosted (`ubuntu-latest`) and self-hosted runners without any special configuration.

## Core Architecture

### Single Entry Point Design

The entire system is implemented in a **single `action.yml` file** that:
1. Validates input and sets mode-specific defaults
2. Installs Codex CLI (with caching)
3. Executes the appropriate prompt
4. Automatically publishes results (commit comments, PR comments, issues, or docs)

No internal composite actions, no wrapper scripts - just one clean action definition.

### Four Review Modes

The action supports 4 modes via the `mode` input:

1. **`light`** - Quick review on every push
   - Static analysis, linting, convention checks, memory leak detection
   - Posts results as commit comments
   - Default model: `gpt-5-codex`
   - Prompt: `prompts/light-review.md`

2. **`deep`** - Comprehensive PR review
   - Architecture, security, maintainability, side effects
   - Posts results as PR comments
   - Default model: `gpt-5-codex`
   - Prompt: `prompts/deep-review.md`

3. **`docs`** - Post-merge documentation
   - Generates documentation for merged code
   - Auto-commits to `docs/` directory
   - Default model: `gpt-5`
   - Prompt: `prompts/documentation.md`

4. **`issue`** - Critical issue detection
   - Detects post-merge issues requiring immediate attention
   - Creates GitHub Issues automatically if report contains `issue-required`
   - Default model: `gpt-5`
   - Prompt: `prompts/issue-up.md`

## Usage

### External Repository Integration

Add a workflow file to your repository:

```yaml
# .github/workflows/code-review.yml
name: Code Review

on:
  push:
    branches-ignore:
      - main

permissions:
  contents: write
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest  # or self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: onetop21/ghaction-autoreview@main
        with:
          mode: light
        env:
          CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

That's it! The action will:
- Install Codex CLI
- Run the review
- Post results as a commit comment

### All Four Modes

```yaml
# Light Review - on push to feature branches
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

```yaml
# Deep Review - on pull requests
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

```yaml
# Documentation + Issue Detection - on merge to main
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

## Development Commands

### Local Testing

Test prompts locally (requires `CODEX_API_KEY` environment variable):

```bash
# The action uses Codex CLI directly, you can test manually:
python3 -m venv ~/.codex-cli/test
~/.codex-cli/test/bin/pip install codex-cli==0.5.0
~/.codex-cli/test/bin/codex exec \
  --model gpt-5-codex \
  --prompt-file prompts/light-review.md \
  --mode light \
  --output /tmp/report.md
```

### Modifying Prompts

All AI behavior is controlled by prompt files in `prompts/`:

```bash
vi prompts/light-review.md       # Quick review prompts
vi prompts/deep-review.md        # Comprehensive review prompts
vi prompts/documentation.md      # Documentation generation prompts
vi prompts/issue-up.md           # Issue detection prompts
```

Each prompt file has a consistent structure:
- **목적 (Purpose)**: What the module should achieve
- **컨텍스트 가이드라인 (Context Guidelines)**: Review focus areas
- **응답 형식 (Response Format)**: Expected output structure

**Important**: Maintain expected output format markers (e.g., `issue-required` for Issue Up mode) that the action depends on for conditional logic.

### Advanced Configuration

Override defaults using inputs:

```yaml
- uses: onetop21/ghaction-autoreview@main
  with:
    mode: light
    codex-version: "0.6.0"          # Override CLI version
    model: "gpt-4-turbo"             # Override model
    prompt-file: custom/prompt.md    # Use custom prompt
    output-path: reports/custom.md   # Custom output path
    extra-args: "--verbose"          # Extra CLI flags
    publish: "false"                 # Disable auto-publish
  env:
    CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}
```

## File Structure

```
.
├── action.yml                      # Single composite action (all logic)
├── prompts/                        # AI prompts for each mode
│   ├── light-review.md
│   ├── deep-review.md
│   ├── documentation.md
│   └── issue-up.md
├── .github/
│   ├── workflows/                  # Example workflows for this repo
│   │   ├── light-review.yml
│   │   ├── deep-review.yml
│   │   └── post-merge.yml
│   └── MIGRATION.md                # Migration guide from old structure
├── docs/
│   └── ARCHITECTURE.md             # Detailed architecture docs
└── CLAUDE.md                       # This file
```

## How It Works

### Execution Flow

1. **Input Validation**: Normalizes `mode` input and sets defaults for model, prompt file, and output path

2. **CLI Installation**:
   - Uses `actions/cache@v4` to cache Codex CLI installation
   - Installs via Python venv if not cached
   - Works identically on GitHub-hosted and self-hosted runners

3. **Prompt Execution**:
   - Runs `codex exec` with mode-specific parameters
   - Uses `${GITHUB_ACTION_PATH}` to reference prompt files from the action repository
   - Generates report to specified output path

4. **Auto-Publishing** (if `publish: true`, default):
   - **Light mode**: Posts commit comment via `gh api`
   - **Deep mode**: Posts PR comment via `gh pr comment`
   - **Docs mode**: Commits to repository with `[docs]` prefix
   - **Issue mode**: Creates GitHub issue if report contains `issue-required`

### Prompt File Resolution

The action uses `${GITHUB_ACTION_PATH}/prompts/<mode>.md` by default, which references the prompt files **from the action's repository**, not the user's repository. This means:
- External repos don't need to copy prompt files
- Prompt updates in this repo automatically apply to all users
- Users can override with custom prompts using `prompt-file` input

### Publishing Logic

Publishing is conditional based on:
- `publish` input (default: `true`)
- `mode` (determines publish method)
- `github.event_name` (ensures correct context: push vs pull_request)

For Issue mode, the action:
1. Greps the report for `issue-required` (case-insensitive)
2. Extracts title from `- Title:` or `- 제목:` line (supports both Korean and English)
3. Creates issue with the entire report as body

## Important Notes

- **Codex CLI Interface**: The action assumes `codex exec --model --prompt-file --mode --output` interface. Update the Codex CLI execution step in `action.yml` if the actual CLI differs.

- **Model Defaults**: Light/Deep modes use `gpt-5-codex`, Docs/Issue modes use `gpt-5`. Override via `model` input.

- **Self-hosted Runners**: The action works identically on self-hosted runners. Ensure:
  - Python 3 is available
  - `gh` CLI is pre-installed and authenticated
  - Standard Linux shell utilities are available

- **Permissions Required**:
  - `contents: write` - For docs mode to commit
  - `pull-requests: write` - For deep mode to comment
  - `issues: write` - For issue mode to create issues

- **Documentation Auto-commit**: Docs mode commits with `[docs]` prefix. Workflows should skip re-running on these commits to prevent loops:
  ```yaml
  if: ${{ !startsWith(github.event.head_commit.message, '[docs]') }}
  ```

- **Issue Title Extraction**: The action supports both Korean (`- 제목:`) and English (`- Title:`) in issue reports. Regex: `^-\s*(Title|제목):\s*(.+)$`

## Design Goals Achieved

✅ **Simple Module**: Only uses CLI tools (gh, codex, git, grep, sed)

✅ **Plug-and-Play**: External repos only need to specify mode and event triggers

✅ **Self-hosted Support**: No special configuration needed for self-hosted runners

✅ **Single File**: All logic in one `action.yml` (no internal actions or scripts)

✅ **Auto-Publishing**: Results are automatically posted to appropriate locations

## Extending the System

To add a new review mode:

1. Create a new prompt file in `prompts/<mode-name>.md`
2. Add a case for the new mode in the "모드 검증 및 파라미터 계산" step in `action.yml`
3. Add a publishing step if the new mode requires custom publishing logic
4. Update this documentation

To modify publishing behavior:

- Edit the "결과 게시" steps in `action.yml`
- Each mode has its own conditional publishing step
- Publishing is controlled by `inputs.publish` and `github.event_name`
