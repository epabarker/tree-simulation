# Status

_Last updated: 2026-11-03 (stems and bark, branch `claude/stems-bark`, draft PR into `3d-port`; ADR 0048 proposed)_

**3D port** on the branch `3d-port` (work branches open PRs into it). ADR 0024–0029, 0031, 0032, 0039–0042, 0044, 0046 and 0047 accepted, 0048 proposed, 0030, 0043 and 0045 rejected. The live site stays on 0.14.0 (2D) until the bar below is met.

**Done means** (user): the mixed wood looks right in the garden in depth, within budget on the phone, with floor, H/D and crown base as 20-seed evidence. C3–C6 follow after shipping.

## Works
- **Core** (`rust/core`): C1–C6, R1–R6, O2, O4 in 3D; slab sweep in fixed lanes; checkpoints v2. O4's `band` keeps recruits near a row (the garden).
- **Girth (ADR 0027):** pipe-radius scars; r0 0.0025, m_w 64; σ_break 7000; windthrow from H/D 80.
- **`forest`, 20-seed evidence (τ 0, 2026-11-02):** floor at 100 20 of 20; H/D at 300 20 of 20; crown base 20 of 20; plateau 19 of 20.
- **Renderer and memory (I3):** 64 depth slices; snapshot 8–11 ms at 160 cells; 176 MB at 160 cells, 62 MB on the phone's 66; reduced motion draws the plate at once (ADR 0046).
- **Species looks:** the form picks (ADR 0033–0038), the beech fresh look (0039–0042, 0044), `hand-overrides.toml` (2026-11-02); beech's bark the measured grey (user, 2026-11-02).
- **Stems and bark (2026-11-03, `2026-11-03-stems-bark.md`):** `&interior` / `garden.html?interior`, off by default. A closed wood's dim interior (`--interior`) shows between the boles where a row's brightest tenth gets ≤ 10–20% of open light (§10); lone plates get none. Bark by light, bark by girth (Pilarski 2008) and root flare (no source) were ruled out before any naming.
- **Harness (ADR 0047):** Stop hook → `check-stamped.sh` (one lock, one stamp); `Explore`/`doc-lookup` (Haiku), `spec-reviewer` (Fable), `experiment-worker`. Principles: docs/background/harness-principles.md.

## Measured, not decided (dev seeds 1–3, three Sonnet namers, in-set)
- **The beech stand is silver birch or aspen, 0 of 9, under every condition:** measured, pale, either with `interior`, girth 1.2 and 1.45. The namers name the form (slender, wavy, small high crowns): crown ratio 0.21 (real 0.47–0.50), H/D 117 (real ≈ 73).
- **The lone beech:** at 60 pale 6 of 9, measured 4; at 100 oak 7 of 9 under every bark (its form, W/H 1.5).
- **Oak reads wild cherry, 0 of 27** (new since v3). v3's "measured stand = beech" did not replicate. Judging seeds 4–6 not run.

## Next
1. **The user's judging sheet** (`figures/2026-11-03-stems-bark-judging.jpg`; phone: `garden.html?interior&bark=pale` against `garden.html`): is `interior` more beautiful? Which bark? Then ADR 0048 is accepted or rejected.
2. **Optional:** three Sonnet namers on v3's judging plates (`~/blind-plates-v3e`, ≈ 360k tokens) to separate the namer model from the build, for the bark decision and for oak.
3. **Ship (the user, 2026-11-02): no round-5 fit.** A species that reads wrong gets an override (oak?). Then the release, the site's PR and the phone soak (`garden.html?bench&seed=10`).
4. **After shipping, the form list:** beech stand's crown ratio and slenderness (the namers' cue); lone beech's rise-then-arch; lone oak's arms; maple's flat top; willow; hornbeam's bole; C2's floor against LAI; C3–C6.

## Open questions (user)
- `interior` as the garden's default on beauty grounds? It needs a winter fade first (it follows the leaf-on field). Pale or measured bark?
- **`levels.2.setPoint` ≥ 80** collapses every broadleaf (C3/R3, after shipping). **Birch stops growing after 60** (H 113 → 112): the form or the fit?

## Known issues
- **Regeneration:** `forest` cannot regenerate under its own floor at τ 0 (C5's). **The lab stutters** from season ≈ 75 on the phone. **`preview-3d`** has the old `i2.ts`: redeploy only when asked.

## Notes for the next session
- **Rust:** `~/.cargo/bin` on PATH. **`golden:update`** needs `build:wasm` first. **Python tests:** `uv run --project analysis --with pytest pytest analysis/tests -q`.
- **Renders vs the check:** stop vite and any Chromium renders before `npm run check:stamp`; under load three 30 s tests time out (seen twice 2026-11-03).
- **Namers cost ≈ 95–125k tokens each** (36–66 plates; the plan guessed 40–50k). Spawn with an explicit `model`.
- **Site deploys:** a push to `main` is production; never merge `preview-3d`; tag pushes are the user's.
