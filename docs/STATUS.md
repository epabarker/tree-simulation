# Status

_Last updated: 2026-11-02 (the harness, ADR 0047, on `3d-port`: Stop hook, three read-only sub-agents, advisor nudges; I3 merged earlier today)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0029, 0031, 0032, 0039–0042, 0044, 0046 and 0047 accepted, 0030, 0043 and 0045 rejected. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0, re-run at shipping, 2026-11-02):** floor at 100 20 of 20; H/D at 300 20 of 20; crown base 20 of 20; plateau 19 of 20 (`2026-11-02-forest-evidence.md`).
- **Renderer and memory (I3, merged):** 64 depth slices from `zOrder`; snapshot 8–11 ms at 160 cells; reduced motion draws the plate at once (ADR 0046); 176 MB with the specimen beside the 160-cell plate at 200 seasons, 62 MB on the phone's 66; `?bench` reports `memoryMB`. Phone: "works great" (the user); its captions at the soak.
- **Species harness (rounds 4–5, ADR 0029, 0032):** closed stand, shade house, `lone100`, `limbElevation`, `m27_rescore.py`, line-up panels; targets files hold `[form]`, `[[formRange]]`, `[[report]]`; `fit_lm.py` logs the shape at every accepted step and flags fits nearer a gallery reject (`shapeFlag`).
- **Beech, fresh look (ADR 0039–0042, 0044):** relay gate, vigour fork and arm hold, vigour drop, light orthotropy, spurs end on wood over 20. 20 seeds: guard 11 of 20, lone at 100 H 120, W/H 1.50. Blind test v3: the lone beech is beech 17 of 18; the stand reads as birch (crown ratio 0.30 against 0.47).
- **Species forms after the judging pass (`hand-overrides.toml`, 2026-11-02):** birch's pendulous twigs; oak's posture by age and held apical control; maple's relay; holly's late fork; rowan's held limbs; willow's pick withdrawn; hornbeam as fitted; beech the fresh look. The user's two passes: `reviews/2026-11-02-judging-pass.md`.
- **Gallery** (`analysis/fit/gallery/`): rounds 2–4's rejects; `m27_gallery.py`. Oak and hornbeam pass the check; beech's cone sits within the noise of its round-2 form.

## Harness (ADR 0047, 2026-11-02)
- **Added:** a Stop hook (`.claude/hooks/check-on-stop.sh`) runs `npm run check` when the code paths changed since the last green run (244 s here; no-op in 18 ms otherwise) and blocks the stop with the log's tail; `.claude/agents/`: `Explore` on Haiku (finding), `spec-reviewer` on Fable (demonstrated divergences only), `experiment-worker` (per-condition analysis under `runs/`); CLAUDE.md nudges for the advisor.
- **This repo can answer (harness doc §5):** 3b's hit rate (log every reviewer verdict after a principle change: demonstrated hits against unverified or false alarms, for a month); 3c's token delta (one rough point: similar C2 lookups, prompts differed, 36k tokens on the built-in Opus Explore against 10k on Haiku); Opus+Fable against Sonnet+Opus (below).
- **A/B plan (3g):** the same principle change twice from the same commit, with and without 3b/3c and as Opus+Fable against Sonnet+Opus; goldens bit-identical are the oracle; compare tokens, wall-clock, advisor calls, and whether `check` went green first time.
- **Known:** in the hook's first real block the obstacles test also timed out (30 s) on a warm laptop: the gate can block falsely; the second stop on the same failing state is let through.

## Next
1. **Ship (the user, 2026-11-02): no round-5 fit.** The species' looks are the form picks (ADR 0033–0038) and the beech; a species that reads wrong on the phone gets an override, never a round. Next the release, the site's PR and the phone soak (`garden.html?bench&seed=10`; over ≈ 3 s, ADR 0046's picture follows).
2. **After shipping, the form list:** the lone beech's rise-then-arch and the stand's crown ratio; the lone oak's arms; maple's flat top (ADR 0031, R2's reiteration); willow's dense bush; hornbeam's clear trunk; C2's floor against LAI; C3–C6 as hold-outs.

## Open questions (user)
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf: a C3/R3 question after shipping. **Birch's pick stops growing after 60** (H 113 → 112): the form or the fit?

## Known issues
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone. **The preview deploy** (`preview-3d`) has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** put `~/.cargo/bin` on PATH (the hook does). **`npm run golden:update`** needs `npm run build:wasm` first. **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q` (not in `npm run check`).
- **Panels:** headless Firefox through puppeteer-core in a scratch folder against `npm run dev`. Species trees ignore world patches: use `--species-patch`. **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
- **Where linear memory goes:** `code/2026-11-02-i3-remaining/memstats.sh` builds the core under a counting allocator; `memory-split.ts` splits a case by holder. Size growing buffers once.
