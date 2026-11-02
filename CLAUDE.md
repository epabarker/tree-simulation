@AGENTS.md
@docs/STATUS.md

## Claude Code specifics

- Skills in `.claude/skills/`:
  - `/wrap-up` at the end of every session or milestone;
  - `/implement-principle` when adding C*/R*/O* behaviour;
  - `/run-experiment` for sweeps and ablations.
- Verify with `npm run check:stamp` before claiming anything works (the same suite as `npm run check`, run under the Stop hook's lock; a green run is the hook's stamp). For anything visual, check the page as well: run `npm run dev` and look, or ask the user to look on their phone.
- Keep `docs/STATUS.md` under about 40 lines. It is loaded into every session.
- Facts about this machine or the user belong in auto-memory. Facts about the project belong in this repo's docs.

## Harness (ADR 0047)

- **Models:** principle implementation, spec-heavy work, hard debugging: `/model opus`. Routine work (docs, render tweaks, running experiments, small refactors): `/model sonnet`. Advisor: opus in both; `/advisor off` for doc-only or single-file tasks. Consult it before committing to an implementation approach for a principle, when the same golden or test fails twice, and before `/wrap-up`.
- **Finding is not judging.** `docs/spec.md` is ≈25k tokens: never read it whole; ask the `Explore` sub-agent (Haiku) for the § you need. Explore finds; it never interprets tests or reviews code.
- **Lookups:** repo lookups → `Explore`; docs/web lookups → `doc-lookup`. Never use an unpinned general-purpose sub-agent for lookups.
- **Review.** After any principle change, run the `spec-reviewer` sub-agent (Fable, read-only). Act on demonstrated items; treat unverified ones as questions for the user. Never change passing code on an undemonstrated claim.
- **The gate.** A Stop hook (`.claude/hooks/check-on-stop.sh`) runs `npm run check` when code changed since the last green run and blocks the stop on failure. Fix the failure; never work around the hook.
- **Never run the check in the background.** Use `npm run check:stamp` in the foreground: it waits for any other run and reuses its result, so a second suite never starts beside the first. Plain `npm run check` is for CI.
- **Red at the end.** If a turn ends while the check is still red (the hook let it through, shown as a warning), the final report must say so and name the log.
- **Experiments** with ≥ 3 conditions fan out one `experiment-worker` per condition (`/run-experiment`, step 4). Only the main session writes `docs/`.
- Harness principles and run log: docs/background/harness-principles.md — read the relevant P-section before changing hooks, agents or model tiers
