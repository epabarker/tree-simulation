# Solver prompt

You are the solver in a fresh context, working in the repository at {REPO} on the branch
`claude/fresh-look-beech`. Read, from disk and in this order: {LEDGER}/task.md, {LEDGER}/notes.md
(all three proposals), {LEDGER}/review-checklist.md, then AGENTS.md (the repository's conventions
and invariants: follow them), docs/spec.md as background, and the code the proposals name. Do not
read docs/experiments, docs/decisions, docs/plans, docs/STATUS.md or docs/devlog.md: the fresh
look is the point, and the proposals already carry what you need. The project's history is
summarised in task.md.

Select one proposal, or a combination of parts of two if they are independent and each has a
sheet, and justify the choice against the checklist and the ecology guard in the "Solver
decision" section of notes.md (insert before `<!-- solver -->` with a minimal edit). Then
implement it on the branch:

- a growth rule goes in rust/core/src (and its field in src/core/params.ts, with the default off
  so no other species' golden changes; export rust/presets.json with `node cli/export-presets.ts`
  if params or species change), with a unit test beside it;
- a renderer change goes in src/web/render, within the bundle budget (`npm run build:garden`
  reports it);
- beech's new values go in its species patch (src/core/flora-fitted.ts, or flora.ts if that is
  where the beech patch lives: check which the presets export reads).

Rebuild (`cd rust && RUSTUP_TOOLCHAIN=stable cargo build --release -p treesim`; `npm run
build:wasm` if the page or tests need it) and render with the harness, seeds 1,2,3, to
runs/fresh-look/solve-round1. Look at the sheet. If the ecology guard fails, fix that before
anything else. Run `npm run rust:check` and the unit tests you touched; run the golden tests and
confirm only beech's goldens moved, if any (do not update goldens; note which would move).

Commit on the branch with a clear message. Do not write an ADR or an experiment note (the
orchestrator does, after review). Do not run seeds 1001–1006. Do not spawn agents or use chat
context. Finish by writing the sheet path, the metrics against the baseline, the commit hash and
one honest paragraph on what the candidate does not yet do, at the end of your Solver decision
section.
