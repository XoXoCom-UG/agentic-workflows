# Creating the `auto-commit` skill

Documentation of how the `/auto-commit` skill was designed, built, and evaluated. Captures the process so future skills can follow the same shape.

## What it is

A Claude Code skill that automates the stage → message → commit cycle while keeping the user in the loop. The user says `/auto-commit` (or "stage and commit my changes") and the skill:

1. Inspects the working tree (`git status`, branch, in-progress merges, etc.)
2. Runs a safety filter — refuses to stage `.env`, secrets, build artifacts, large binaries
3. Groups changed files by concern (one bundled commit when changes are interlocking, multiple commits when concerns diverge)
4. Drafts a Conventional Commits message per group (delegating format to `commit-message-writer`)
5. Shows the plan to the user — branch warning, diff stat, each draft message — and waits for a yes/no
6. On confirmation: stages files explicitly (never `git add -A`/`.`), commits with heredoc-formatted messages
7. Reports the result with `git log --oneline -N`

Does **not** push. Push is a separate action the user has to ask for.

## Where it lives

- Skill file: `~/.claude/skills/auto-commit/SKILL.md`
- Evals: `~/.claude/skills/auto-commit/evals/evals.json`
- Eval workspace: `~/.claude/skills/auto-commit-workspace/iteration-N/`
- Companion skill it depends on: `~/.claude/skills/commit-message-writer/SKILL.md`

## Design decisions (locked at intent-capture)

Three choices framed the skill. Each was a recommended option presented as a question to the user, and they confirmed the recommended path:

| Decision | Choice | Why |
|---|---|---|
| **Invocation** | Manual slash command (`/auto-commit`) | Most flexible. Can be paired with `/loop 20m /auto-commit` for recurring runs without baking the cadence into the skill itself. A Stop hook would spam tiny commits; cron via `/schedule` would run outside the Claude session. |
| **Autonomy** | Show plan, wait for confirmation | Matches the manual workflow we'd just walked through (the 4-commit split for this very repo). Fully autonomous commits are irreversible without `git reset` and one bad split could spam history. |
| **Split policy** | Propose a split when concerns diverge | Bundles when changes are clearly one feature/fix; splits when files span unrelated top-level dirs or different commit types apply. Same rule `commit-message-writer` already follows. |

## Process used to build it

### 1. Capture intent
Used `AskUserQuestion` to surface the three load-bearing ambiguities above. Avoided drafting until those were settled — designing around the wrong invocation model would have wasted the SKILL.md rewrite.

### 2. Inspect the companion skill
Read `~/.claude/skills/commit-message-writer/SKILL.md` to understand its trigger phrases, output format, and quality rules. The new skill defers to it for message format and reuses its split heuristic — important to know exactly what it does so the new skill doesn't duplicate or contradict.

### 3. Draft `SKILL.md`
~200 lines, structured as:
- **Frontmatter**: `name`, `description` (the description is the primary triggering mechanism — wrote it "pushy" with explicit "use whenever the user says X / Y / Z" + a "do NOT trigger if…" disambiguator from `commit-message-writer`)
- **Process** in 7 numbered steps (Inspect → Safety filter → Grouping → Message → Plan → Branch-safety warning → Stage and commit)
- **Heredoc commit pattern** (because multi-line messages with shell escaping are a recurring footgun)
- **Edge cases** (already-staged files, submodules, lockfiles, whitespace-only diffs, reverts, `/loop` integration)
- **Tone** (explicit, since "concise" is a behavioral preference the skill should enforce)

Length kept under the 500-line target. No bundled scripts — the skill is pure instructions because every git operation is one shell command.

### 4. Draft test cases
Three realistic scenarios in `evals/evals.json`, each with bash setup commands that build a throwaway repo in `/tmp/`:

1. **`coherent-single-commit`** — symbol rename across two files. Should yield 1 commit (`refactor` type), not be split.
2. **`multi-concern-split`** — README docs edit + auth security fix + new tests for an unrelated feature. Should yield 2-3 commits with appropriate types (`docs`/`fix`/`test`), no commit mixing concerns.
3. **`secret-file-safety`** — `.env` file with fake API key sitting in the working tree alongside a README change. The `.env` must NOT land in git history; the README change should still commit.

Pinned the test cases with the user before launching the subagent runs (to avoid spending compute on scenarios they don't care about).

### 5. Run subagent tests
Six `general-purpose` subagents launched in parallel (3 evals × 2 variants — with-skill vs no-skill baseline). Each runs in its own bash environment, sets up its own `/tmp/agentest-eval{N}-{ws|base}/` repo, applies the user's prompt, and saves four artifacts per run:

- `git_log.txt` — final commit history
- `git_tree.txt` — files tracked in HEAD (used for the secret-safety check)
- `commits.txt` — `git show --stat` per commit
- `summary.md` — the subagent's narration of what it did

Timing (tokens + duration) captured per run from the task-completion notifications.

### 6. Draft assertions
Done while the subagents ran (productive waiting). Each test case got 3-5 programmatically-checkable assertions, e.g.:

- "Exactly 1 commit added beyond `initial`"
- "First commit's subject matches `/^(feat|fix|docs|refactor|test|chore)(\\([a-z0-9_-]+\\))?: \\S/`"
- "No commit in history contains `.env` in its tree"
- "No two unrelated top-level dirs appear in the same commit's file list"

Subjective things (was the wording elegant? was the grouping aesthetic?) deliberately left out — those belong to the qualitative review tab, not the assertions.

### 7. Grade + benchmark + viewer
After subagents finish: grade each run's outputs against assertions, aggregate into `benchmark.json` + `benchmark.md`, launch the eval-viewer HTML with both tabs (Outputs + Benchmark).

### 8. Iterate
User reviews in the viewer, types feedback per test case, clicks "Submit All Reviews" → `feedback.json`. Skill gets revised based on feedback, all 6 runs re-spawn into `iteration-2/`, repeat until done.

### 9. Description optimization (final step, not yet run)
After the body is solid, run `~/.claude/skills/skill-creator/scripts/run_loop.py` with a trigger-eval set to tune the description for better invocation accuracy. Splits into train/held-out, iterates up to 5 times, picks the variant with the best test-set score.

## Key technical patterns

### Pushy descriptions
LLMs under-trigger skills by default. The description front-loads trigger phrases and includes a "do NOT trigger if" clause to disambiguate from the closely-related `commit-message-writer`.

### Skill chaining
The new skill says "follow the commit-message-writer skill's format" rather than re-deriving it. Both skills appear in the available-skills list when active, so the calling agent can read `commit-message-writer`'s SKILL.md if needed.

### Explicit safety
"Never `git add -A`" appears as a hard rule in the SKILL.md. The safety filter is in step 2 — before any staging is attempted — and lists exact patterns to refuse (`.env*`, `*.key`, `credentials/`, etc.).

### Heredoc commits
Multi-line commit messages via shell are fragile because of escaping. The SKILL.md ships the exact heredoc pattern (`git commit -m "$(cat <<'EOF' … EOF\n)"`) so the using agent doesn't reinvent it.

### Workspace conventions
Per skill-creator: one workspace dir per skill (`<skill>-workspace/`), iteration subdirs (`iteration-1/`, `iteration-2/`), per-test subdirs (`eval-N-name/`), and per-variant subdirs (`with_skill/`, `without_skill/`). Each variant has `outputs/` (artifacts the subagent wrote), `timing.json` (tokens + duration), and `grading.json` (assertion results) once graded.

## Open questions for future iteration

- **/loop terseness mode** — current SKILL.md tells the skill to be terse when invoked under `/loop`. Not yet tested whether the calling agent actually detects `/loop` context. May need a sentinel or an explicit flag.
- **Pre-commit hooks** — if a hook fails, the skill currently stops. Should it re-stage the hook's auto-fixes and continue, or always defer to the user?
- **Editing draft messages** — when the user wants to tweak a draft message before committing, there's no formal mechanism beyond "type the new message in chat." Could add a `/auto-commit edit` shortcut.
- **Multi-repo** — works on the current repo only. Multi-repo workspaces would need an extra step to choose which repo (or to commit across all).

## Files this whole process produced

- `~/.claude/skills/auto-commit/SKILL.md`
- `~/.claude/skills/auto-commit/evals/evals.json`
- `~/.claude/skills/auto-commit-workspace/iteration-1/eval-{1,2,3}-{name}/{with_skill,without_skill}/{outputs/,timing.json}`
- After grading: `…/grading.json` per run, `benchmark.json` + `benchmark.md` per iteration
- After viewer: `feedback.json` per iteration once the user submits reviews
