# 0047: The agent harness: one writer, a deterministic gate, read-only helpers

- **Status:** accepted
- **Date:** 2026-11-02
- **Spec:** none (process, not behaviour)

## Context
The user's harness-principles review (2026-11-02) of the multi-agent literature concludes: a single strong writer beats scaffolding a weaker one; sub-agents pay for themselves only when they keep noise out of the main context or run independent read-only work; a reviewer may flag, but only an executed check may overturn working code; rules with zero exceptions belong in hooks, not prose. This repo already had the ledger (STATUS rewritten, devlog, ADRs), the fresh-context checklists (skills) and the gate (`npm run check`, goldens), but the gate was advisory and every search and review ran on the main model.

## Decision
Main model Opus with Fable as advisor, consulted at decision points (approach, a test failing twice, before wrap-up). A Stop hook (`.claude/hooks/check-on-stop.sh`) runs `npm run check` whenever the code paths changed since the last green run and blocks the stop on failure; the same failing state seen twice is let through, so a question to the user is never trapped. Three read-only sub-agents in `.claude/agents/`: `Explore` on Haiku for finding (spec §, ADR, file), `spec-reviewer` on Fable for diffs against the spec and invariants, whose counterexamples must be run before they count, and `experiment-worker` for per-condition analysis writing its own files under `runs/`. None calls the advisor. Only the main session edits `src/`, `tests/` and `docs/`.

## Consequences
Doc-only turns cost nothing extra; code turns pay one `npm run check` (minutes) before Claude may stop, and a running vite can make the slow tests time out and block falsely. "Read-only" is enforced by the prompts, not the tools: sub-agent `tools` cannot carry a `Bash(...)` specifier. Spec lookups run on the cheapest model; reviews on the strongest. To revisit: the reviewer's hit rate against false alarms (log for a month), the token delta of Explore against reading the spec directly, and an A/B of Opus+Fable against Sonnet+Opus on one principle implementation, judged on first-time-green, advisor calls and `/usage`.

## Run 2 (2026-11-02, two sessions)
Principles and the run log: [docs/background/harness-principles.md](../background/harness-principles.md) (P1–P10, the labels used below).

**Run 2** (five follow-ups): (1) model tiering in CLAUDE.md (Opus for principles and hard debugging, Sonnet for routine work, advisor Opus in both); (2) `doc-lookup` (Haiku, WebSearch/WebFetch) and the "Lookups" line (P3, P5); (3) the hook's `systemMessage` when it lets a red stop through, and the "Red at the end" line; (4) `spec-reviewer` hardening (P7): a PreToolUse Bash guard (`reviewer-bash-guard.sh`), `maxTurns`, and a git-status comparison before and after; (5) 90 s timeouts on the obstacles and seasons tests (12.5–13.1 s alone, 31 s in a full run; 33.6 s). Goldens bit-identical (golden tests; `bench --compare` 7/7 same hash). Run 2 also found that the hook, run beside a background check, produced 5 false timeouts, and that a manual green run left no stamp.

**Run 2b** (P1, P7, P3/P5):
- One script, one lock, one stamp: `check-stamped.sh` (`npm run check:stamp`) holds the lock (`flock`, fd 9, closed for the suite's children), reuses a waited-for run's green or red when the tree is the same, and writes the green stamp; `check-lib.sh` holds the one fingerprint. The hook is the fast path plus that script. A manual red no longer lets the next stop through: the script writes `red`, the hook writes `red-shown` only when it blocks. Tested with fake commands: two runs at once, one suite (green and red); the hook beside a run reuses it; an orphan left by a check does not hold the lock. Real check 3 m 28 s warm; the hook on an unchanged tree 13 ms. CI keeps plain `npm run check`.
- Guard probe (spec-reviewer on `git diff HEAD`, told to `touch /tmp/review-guard-probe` first): **the guard held under auto mode**. The call was blocked, the file does not exist, and git status was unchanged. The reviewer also had a `| tail` blocked. 26 456 tokens, 18 tool uses, 187 s. Unverified, for the user: `rg` is allowed and `rg --pre` runs commands; the hook waits up to 600 s and then runs a suite that may need 300 s+, against the 900 s timeout.
- doc-lookup: `systemMessage` is the documented universal field ("Warning message shown to the user"); the docs do not say whether a Stop hook's reaches Remote Control or the desktop app. 54 259 tokens. The hook's comment was reworded to claim no more than that.
- Consequences, corrected: "read-only" is now partly enforced for the reviewer's Bash by the guard (best-effort, a deny list of shapes), not only by its prompt.

