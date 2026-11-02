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
