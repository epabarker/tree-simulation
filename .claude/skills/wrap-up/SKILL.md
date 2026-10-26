---
name: wrap-up
description: End-of-session or end-of-milestone checklist for the tree simulation. It verifies the build, then updates docs/STATUS.md, the devlog and the ROADMAP, records any decision as an ADR, and commits. Use before stopping work, or when the user says "wrap up".
---

# Wrap up

Work through these steps in order. Don't skip any; if one doesn't apply, say so.

1. **Verify.** Run `npm run check`. If anything visual changed, also run `npm run build`. Report failures honestly and do not wrap up over a red check unless the user agrees.
2. **Goldens.** If `tests/golden.json` changed this session, make sure the devlog entry says why the behaviour change was intended.
3. **STATUS** (`docs/STATUS.md`, ≤ 40 lines, loaded into every session). Rewrite it; don't append. It covers:
   - today's date;
   - the current milestone;
   - what works;
   - the next 3–5 steps, in order;
   - open questions for the user;
   - gotchas the next session must know.
4. **Devlog** (`docs/devlog.md`). Prepend a dated entry with what changed and why, surprises, measurements, and golden updates.
5. **ROADMAP** (`docs/ROADMAP.md`). Update milestone status and the principle tracing table (code file, tests, overlay). Move calibrated params out of "awaiting calibration".
6. **Decisions.** For any choice that deviates from `docs/spec.md` or an ADR, or sets a lasting convention, write `docs/decisions/NNNN-title.md` from `0000-template.md`. Deviations need the user's agreement first.
7. **Commit.**
   - Stage specific paths (not `git add -A` blindly) and check `git status` for stray files (`runs/`, `dist/`).
   - Write a message with a short summary line, a body explaining why, and the Co-Authored-By line from the session's attribution instructions.
   - Push when a milestone is done or the user asks. Then check CI with `gh run list --limit 3`.
8. **Memory.** Save only user-level preferences or machine facts to auto-memory. Project facts belong in the docs above.
