# Stems and bark: the beech stand without losing the lone beech (plan, 2026-11-03)

_Copied to `docs/plans/2026-11-03-stems-bark.md` on approval (plan mode writes only here). The prose
is ≤ 60 lines; the code is in the appendix._

## 1. The question and the targets
**Question:** can a general renderer rule, grounded in light or stem form, make the beech stand read
beech while the lone beech keeps its pale-bark read, at no cost to birch, hornbeam or oak?

**What v3 leaves us:**
- The default is the measured bark (user, 2026-11-02). Under it on seeds 4–6 the stand passes (9/15)
  and the lone tree fails (5 and 7/15). `&bark=measured` no longer exists.
- The lone tree's "≥ 8 of 9" was the **pale** bark on seeds 1–3, never named on 4–6.
- HEAD differs from v3's build (ADR 0044's `r6.lifespan`, the 2026-11-02 overrides). Every baseline is
  re-rendered and re-named here, by the same namer model, in the same set as the candidate.

**Targets** (v3's rule on first guesses; on 4–6 a seed counts at ≥ 3 of 5 namers, a source passes at
≥ 2 of 3 seeds in each of lone 60, lone 100 and stand 100):
- The candidate beech passes all three trials. Its lone trials hold the pale bark's in-set level.
- Birch and hornbeam (lone, stand) are not below their in-set baselines; oak is not lower in any trial.

## 2. What the sources rule out, and the hypotheses
**Set 5 already tried bark by light, the user's (a)** (`barklight.mjs`, 83b39db, `&barkLight`).
- The field (1 − mean Q/C over depth) gives stand boles 0.53 and lone limbs 0.52. `s.light` points
  the wrong way. So it cannot separate them, and the garden asks for no field anyway.
- An open-grown dome really is dark inside, so no light signal on the *stem* will make its limbs pale.

**Bark by girth was ruled out by the only measurement.** Pilarski et al. 2008 (abstract, PJOES)
report 400–700 nm reflectance of 18% on 1-year stems, 10% on 10-year stems and 15% on trunks. Limbs
are not paler than the trunk, so a pale-limb, dark-trunk ramp has no support.

**a. The backdrop beyond a closed stand** (`&interior`; replaces (a)). Today every plate shows open
sky between the boles. A closed wood seen from inside shows its own dim interior there; the model's
closed-stand floor gets 2–10% of open light (§10).
- **Rule:** at each height y the sky is mixed toward an `--interior` token by d(y), the canopy's
  shade on the brightest tenth of the wood at that height. That is the 10th percentile of the field's
  shade across the row, relative to the open sky's row above every crown. "Beyond the slab lies more
  of this wood" holds only where no part of the wood is open at that height.
- **Predictions:**
  - A lone tree in a field: d ≈ 0, so the plate is unchanged by construction.
  - A closed stand: d near 1 below the canopy, so the pale boles stand against a dark interior, the
    look of a beech high forest.
  - So the candidate is the pale bark (TSO's "pale grey", `&bark=pale`) plus `&interior`.
- **Gate (no namers):** on dev seeds 1–3, max d over the lone plates' rows ≤ 0.1 and the lone
  background moves ≤ 3 ΔL*; d ≥ 0.6 at the stand's bole heights. Otherwise stop and report.

**b. Girth, k ∈ {1, 1.2, 1.45}** (existing `&girth`, no code). H/D per species from `diagnose.mjs`;
the stands named. It stays global unless hornbeam's drop follows k.

**c. Root flare** (`&flare`, the beauty lever). A trunk widens toward the ground (Mattheck's uniform
stress), anchoring stems in the picture.
- The first lookup found no numbers. A second `doc-lookup` looks for a Fagus or broadleaf butt-swell
  or taper equation (stump diameter over DBH, the height of the swell).
- With no sourced numbers, (c) is dropped and not replaced.

## 3. Measurement
- **Step 0 (no namers):** the gate; H/D at each k; flare in pixels; the flare source.
- **Dev set D, seeds 1–3, 3 namers.** One set, so the namer noise is shared:
  - beech measured (default), beech pale, and the candidate (pale + interior);
  - beech measured + interior (stand plates only);
  - hornbeam, oak and birch, with their stands also drawn under interior (lone plates are identical);
  - 66 plates, or 84 with flare, whose decoys are drawn in both conditions.
  - Track E's rule: no judging set unless the candidate passes pooled on 1–3.
- **Girth set G, seeds 1–3, stand 100 only, 3 namers:** the candidate beech, hornbeam, oak and birch
  at k 1, 1.2 and 1.45: 36 plates.
- **Judging set J, seeds 4–6, 5 fresh namers:** D's composition. Claims come from J only.
- **Namers:** general-purpose sub-agents with an explicit `model: "sonnet"` (never inherited), v3's
  prompt verbatim, and v3's `shuffle.py` and `tally.py`. No new `.claude/agents` files.
- **Cost:** a lone plate is ≈ 580 image tokens and a stand plate ≈ 205.
  - Per namer: 66–84 plates ≈ 30k image tokens, ≈ 40–50k context; 36 plates ≈ 20k.
  - In all: D 3 × 45k + G 3 × 20k + J 5 × 45k ≈ 0.42 M tokens, 11 namers. J runs only if D passes.

## 4. The judging sheet (one page, 10–20 minutes)
- **Mixed wood:** the garden at phone scale (390 × 844, DPR 3, seed 10, 100 seasons), A beside B,
  via `2026-11-02-judging/shots.mjs`.
- **Line-up:** the eight species, lone 100 and stand 100, A beside B, from the lab.
- Labelled by source; which column is the candidate is in the note's key. Nothing moves, so no clip.
- **The one question:** "In B, does each species' wood read truer and more beautiful than in A?"

## 5. Steps
1. Branch `claude/stems-bark` from `3d-port`; this plan to `docs/plans/`.
2. Step 0; the code below with its unit tests; `npm run check:stamp` in the foreground.
3. D and G, then J if D passes. The sheet, the note in v3's style, and the figures in `docs/experiments/figures/`.
4. `spec-reviewer` on `git diff 3d-port`, its output pasted. The goldens run explicitly and expected
   bit-identical: `npx vitest run tests/golden*`, then `cargo test` in `rust/`.
5. ADR 0048, **proposed**: the flags I'd make default, the evidence, and what needs the user's eye.
6. `/wrap-up` (STATUS ≤ 40 lines); push; a **draft** PR into `3d-port`. No merge. Advisor before step 5.

---
## Appendix: the code (one line per change names the principle it serves)
Renderer and page only: nothing in `rust/`, `src/core`, presets or species. The flags are off by
default, so the goldens and the default picture stay as they are.

**`src/web/render/scene.ts`.** *(a): the backdrop follows the model's own light field.*
```ts
// ViewOptions, after `girth`:
  /**
   * The backdrop beyond a closed stand (off by default): at each height the sky is drawn toward
   * `--interior` by `Scene.interiorDepth`, so a closed wood shows its dim interior between the boles
   * (a closed stand's floor gets 2–10% of open light, §10) and a lone tree in a field keeps its sky.
   * Needs the snapshot's field (the lab's has it; the garden asks for it when this is on).
   */
  interior?: boolean;
  /** Root flare (off by default): a trunk widens toward the ground by `flareAt` (c). */
  flare?: boolean;

/** The share of a row taken as the wood's brightest part, for `interiorDepth` (a tenth). */
const INTERIOR_QUANTILE = 0.1;
/**
 * How deep in a closed wood each row of the world is, 0 → 1, row 0 at the ground: the canopy's
 * shade on the brightest INTERIOR_QUANTILE of the row (the field's shade at that quantile), over
 * the open sky's (the top row's, above every crown). Where any part of the wood is open at that
 * height, the view beyond the slab is open too, and the row stays sky.
 */
export function interiorDepth(field: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(height);
  const row = new Float32Array(width);
  const at = Math.min(width - 1, Math.floor(INTERIOR_QUANTILE * width));
  const q = (y: number) => {
    row.set(field.subarray(y * width, (y + 1) * width));
    row.sort();
    return Math.min(1, Math.max(0, row[at] as number));
  };
  const sky = q(height - 1);
  for (let y = 0; y < height; y++)
    out[y] = sky < 1 ? Math.min(1, Math.max(0, (q(y) - sky) / (1 - sky))) : 0;
  return out;
}
// Scene: `interior = false; flare = false;` copied from the view like `girth`, and
// `interiorOf(s)`: interiorDepth(s.shadow, s.width, s.height) once per snapshot, null without a field.
```
**(c), in `computeGeometry`.** *c: root flare, a trunk's stress-uniform base; positions unchanged.*
```ts
/** Root flare: extra width at the ground, and the height it fades over in base diameters ([SOURCE]). */
export const FLARE = FLARE_VALUE;
export const FLARE_REACH = REACH_VALUE;
export function flareAt(y: number, r0: number): number {
  const u = 1 - y / (FLARE_REACH * 2 * r0);
  return u > 0 ? 1 + FLARE * u * u : 1;
}
    let rootR = 0; // the trunk's base radius, this row's tree (rows come tree by tree, root first)
    …  if (p < 0) rootR = s.radius[j] as number;
    …  const f = this.flare && s.order[j] === 0 ? flareAt(s.y0[j] as number, rootR) : 1;
       g.radius[j] = r * this.girth * f;
```
**`webgl2.ts`.** *(a) drawn with the existing image program.* After the sky backdrop and before the
walls, when `scene.interior` and a field are present: a 1 × H RGBA texture (rgb = `theme.interior`,
a = d(y)) uploaded once per snapshot, drawn with `this.image` over `u_rect: [cx − w/scale, 0,
2w/scale, s.height]` at `u_alpha: 1`. The rebuild key gains `view.interior` and `view.flare`.

**`canvas2d.ts`.** The same 1 × H image via `drawImage`, stretched over the visible width; the flags
are copied to the scene beside `girth`.

**`theme.ts` and `scene.css`.** *Colours are tokens.* `interior: v("--interior", "#3a4234")`.
`--interior` is declared in the light block and both dark blocks (dark: `#121812`). It is
the dim olive grey of a closed broadleaf stand's interior: luminance about 5% of the sky, inside the
stand floor's 2–10%.

**`main.ts` (lab) and `garden.html`.** *The flags as query params, like `&girth`.*
- `&interior` → `{ interior: true }`; `&flare` → `{ flare: true }`.
- In the garden, `?interior` also passes `snapshot: { junctions: false, field: true }` to
  `mountGarden` (its existing option).

**Tests:**
- `scene.test.ts`: `interiorDepth` is 0 on an open field with one lit gap per row, near 1 under a
  closed canopy, and 0 above the crowns. `flare` changes only order-0 radii, by `flareAt` (≤ 1 +
  FLARE at the ground, 1 above the reach), and no tip moves.
- `bark-styles.test.ts` style check: `--interior` is declared in the three theme blocks.

**Scripts** (`docs/experiments/code/2026-11-03-stems-bark/`): v3's `shots.mjs`, `shuffle.py`,
`tally.py` and `sheet.py` with new sources and VIEW strings; `gate.mjs` (from `barklight.mjs`) for d(y)
and the lone background's ΔL*; and the judging sheet's shots from `2026-11-02-judging/`.
