@AGENTS.md
@docs/STATUS.md

## Claude Code specifics

- Skills in `.claude/skills/`:
  - `/wrap-up` at the end of every session or milestone;
  - `/implement-principle` when adding C*/R*/O* behaviour;
  - `/run-experiment` for sweeps and ablations.
- Verify with `npm run check` before claiming anything works. For anything visual, check the page as well: run `npm run dev` and look, or ask the user to look on their phone.
- Keep `docs/STATUS.md` under about 40 lines. It is loaded into every session.
- Facts about this machine or the user belong in auto-memory. Facts about the project belong in this repo's docs.
