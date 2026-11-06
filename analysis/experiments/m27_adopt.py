"""M27b: adopt the fitted species. Writes src/core/flora-fitted.ts from a round's fits
(docs/experiments/fits/<round>/<species>.json) with the hand adjustments in
analysis/fit/hand-overrides.toml.

    uv run --project analysis python analysis/experiments/m27_adopt.py [--round round2]
    npx biome format --write src/core/flora-fitted.ts
    node cli/export-presets.ts

Each species' patch is the fit's assignments, then the overrides, applied by `cli/fit-eval.ts`'s
`amend` over the species' current patch, so the result is whole: its labels, and every group the
fit or an override touched, filled in from the effective params. Then the 3D overlay (ADR 0025):
each species' phyllotaxis and wood's own E, which the 2D fits could not hold. Last, the overrides'
[broadleaf] table: the generic irregularity base, its keys only, on the species it lists (as with
any override, a species taken off the list keeps its keys until they are stripped by hand).
"""

import argparse
import json
import tomllib

from treesim import REPO
from treesim.fit import SPECIES, Pool

parser = argparse.ArgumentParser()
parser.add_argument("--round", default="round2", help="the fits' folder under docs/experiments/fits/")
args = parser.parse_args()

FITS = REPO / "docs" / "experiments" / "fits" / args.round
# ADR 0027: in 3D, r0 ÷ 8 and m_w × 64, which keeps R1's sapwood cost m_w·r0² (exact in binary; the
# fitted r0 rounded to four significant figures). The species' r0 awaits the 3D re-fit.
GIRTH_SCALE = 8
# ADR 0027: R3's σ_break, 4500 → 7000 with the rescale (storms broke whole crowns at 4500).
SIGMA_BREAK = 7000
# ADR 0025: phyllotaxis, a species trait the plane could not draw (2D's only planar sequence was
# distichous): every distichous row takes the species' own, whorls stay. Spiral alternate (2/5) in
# birch, oak, holly, rowan, goat willow and Scots pine's laterals; distichous in beech, hornbeam and
# silver fir's flat sprays; decussate in field maple.
PHYLLOTAXIS = {
    "birch": "spiral",
    "beech": "distichous",
    "oak": "spiral",
    "fir": "distichous",
    "hornbeam": "distichous",
    "maple": "opposite",
    "holly": "spiral",
    "rowan": "spiral",
    "willow": "spiral",
    "pine": "spiral",
}
# ADR 0025: wood's own E (4·10⁶ in the model's units) for every species, where 2D had lowered it
# (1–2.5·10⁶) for limbs that carried less foliage than a real one (ADR 0011). Species' own
# stiffnesses are calibration's (C2).
WOOD_E = 4_000_000
# ADR 0032: C5's T_rel fixed per species from the light of the lowest shade leaves (Hagemeier &
# Leuschner 2019, as a fraction of incident PAR: birch, sessile oak, hornbeam and beech measured;
# the rest estimated from Niinemets & Valladares's shade-tolerance score by ln(%) = 5.00 − 1.108 ×
# score over those four, r = −0.96), and R1's acclimated leaf cost with one global c.
TREL = {"birch": 0.21, "oak": 0.063, "hornbeam": 0.025, "beech": 0.008, "willow": 0.14, "rowan": 0.072,
        "holly": 0.021, "maple": 0.044, "fir": 0.0091, "pine": 0.23}
LEAF_COST_SHADE = 0.3


def in3d(sp: str, patch: dict) -> dict:
    """The 3D overlay, after the fit and the overrides: the species' phyllotaxis on every distichous
    row, and wood's E wherever the patch sets R3."""
    for row in patch.get("r2", {}).get("levels", []):
        if row.get("generator") == "distichous":
            row["generator"] = PHYLLOTAXIS[sp]
    if "r3" in patch:
        patch["r3"]["E"] = WOOD_E
    return patch


def broadleaf(sp: str, patch: dict, own: dict) -> dict:
    """The generic irregularity base (hand-overrides.toml's [broadleaf]) on a listed species: each
    `group.key` set in its group, the species' own value where its overrides set that key (a
    departure from the base). Added after the amend so that only these keys land (the amend would
    fill each touched group whole), so the amend is never given them (`BASE_KEYS`)."""
    base = overrides.get("broadleaf", {})
    if sp not in base.get("species", []):
        return patch
    for path, value in base["assign"].items():
        group, key = path.split(".")
        patch.setdefault(group, {})[key] = own.get(path, value)
    return patch


overrides = tomllib.loads((REPO / "analysis" / "fit" / "hand-overrides.toml").read_text())
BASE_KEYS = set(overrides.get("broadleaf", {}).get("assign", {}))

pool = Pool(1)
patches = {}
try:
    for sp in SPECIES:
        own = {k: v for k, v in overrides.get(sp, {}).items() if k not in BASE_KEYS}
        assign = {**json.loads((FITS / f"{sp}.json").read_text())["fit"]["assign"], **own}
        assign["c6.r0"] = float(f"{assign['c6.r0'] / GIRTH_SCALE:.4g}")
        assign["r1.mw"] = GIRTH_SCALE**2
        assign["r3.sigmaBreak"] = SIGMA_BREAK
        assign["c5.Trel"] = TREL[sp]
        assign["r1.leafCost"] = "acclimated"
        assign["r1.leafCostShade"] = LEAF_COST_SHADE
        patch = in3d(sp, pool.ask({"amend": sp, "assign": assign})["patch"])
        patches[sp] = broadleaf(sp, patch, overrides.get(sp, {}))
finally:
    pool.close()

body = ",\n".join(f"  {sp}: {json.dumps(patches[sp])}" for sp in SPECIES)
(REPO / "src" / "core" / "flora-fitted.ts").write_text(
    "/**\n"
    " * The fitted species (M27, ADR 0020–0023): generated by analysis/experiments/m27_adopt.py from the\n"
    f" * {args.round} fits (docs/experiments/fits/{args.round}/) and the hand adjustments in\n"
    " * analysis/fit/hand-overrides.toml, with the 3D overlay (ADR 0025: phyllotaxis, wood's E) and\n"
    " * ADR 0027's girth. Do not edit by hand: change the overrides and regenerate.\n"
    " */\n\n"
    'import type { SpeciesPatch } from "./params.ts";\n\n'
    f"export const FITTED_FLORA = {{\n{body},\n}} satisfies Record<string, SpeciesPatch>;\n"
)
print(f"wrote src/core/flora-fitted.ts ({len(patches)} species)")
