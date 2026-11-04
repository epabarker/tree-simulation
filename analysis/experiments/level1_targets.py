"""Level 1's registration (reference-fidelity phase 3, the beech pilot; analysis/treesim/level1.py): written from real
QSMs only, before any simulated tree is scored, and committed alone. Writes analysis/fit/sources/level1-<species>.json
and the `[level1] pilot_*` keys of the species' targets file; nothing here reads a simulated tree.

    uv run --project analysis python -I analysis/experiments/level1_targets.py --species beech

The species' descriptors are gate c v3.1's tiers (the targets file's `[level1] gate_c_v3_1_tier_a`, `_tier_b`); its
dataset, d_min and matched DBH are phase1-tolerances.json's. Refuses if that file's own hashes have moved, or if the
registration already exists (a registration is never rewritten in place: a new one is a new version, with a reason).
"""

import argparse
import json
import math
import re
import sys
import tomllib

import numpy as np

from treesim import level1 as l1
from treesim import tolerance as tol
from treesim.sweep import REPO

parser = argparse.ArgumentParser()
parser.add_argument("--species", required=True)
args = parser.parse_args()
species = args.species

out = l1.registration_path(species)
if out.exists():
    sys.exit(f"refusing: {out.relative_to(REPO)} exists; a registration is never rewritten in place")
tolerances = json.loads(tol.TOLERANCES.read_text())
moved = [f for f, h in tolerances["hashes"].items() if tol.file_hashes().get(f) != h]
if moved:
    sys.exit(f"refusing: changed since phase1-tolerances.json was committed: {', '.join(moved)}")

targets_path = REPO / "analysis" / "fit" / "targets" / f"{species}.toml"
targets = tomllib.loads(targets_path.read_text())
lv1 = targets["level1"]
dataset, code = tol.SPECIES_SET[species]
d_min = tolerances["resolution"][dataset]["d_min"]
at = tolerances["reference_dbh"][species]["median_dbh"]
tier = {**{k: "A" for k in lv1["gate_c_v3_1_tier_a"]}, **{k: "B" for k in lv1["gate_c_v3_1_tier_b"]}}
names = sorted(tier)
held_out = l1.draw_held_out(names)
fitted = [k for k in names if k not in held_out]
weight_groups = l1.groups(fitted)

# Real distributions: every candidate descriptor, held-out ones included (the gate reads them).
trees = l1.real_trees(dataset, code)
noise = {r["descriptor"]: r for r in tolerances["table"] if r["species"] == species}
real = {}
for k in names:
    d = l1.distribution([t["d"][k] for t in trees], [t["dbh"] for t in trees], at)
    rms = noise[k]["noise_rms"]
    d["noise_rms"] = rms
    d["sd_noise_corrected"] = math.sqrt(d["sd"] ** 2 - rms**2) if rms is not None and rms < d["sd"] else math.nan
    real[k] = d

by_gap: dict[str, dict] = {}
for g in sorted({t["gap"] for t in trees if t["gap"]}):
    sel = [t for t in trees if t["gap"] == g]
    by_gap[g] = {"trees": len(sel)}
    for k in names:
        v = l1.detrended([{"dbh": t["dbh"], k: t["d"][k]} for t in sel], k, real[k]["slope"], at)
        by_gap[g][k] = float(np.median(v)) if v else None

# The held-out site: Demol's beech, tier A only, detrended with the dataset's slope. Reported, never fitted.
demol = l1.real_trees("demol", "FSYL")
demol_block = {"trees": len(demol), "dbh_range_m": [float(min(t["dbh"] for t in demol)),
                                                     float(max(t["dbh"] for t in demol))],
               "dbh_median_m": float(np.median([t["dbh"] for t in demol])), "descriptors": {}}
for k in names:
    if tier[k] != "A":
        continue
    v = l1.detrended([{"dbh": t["dbh"], k: t["d"][k]} for t in demol], k, real[k]["slope"], at)
    demol_block["descriptors"][k] = {"n": len(v), "median": float(np.median(v)) if v else None,
                                     "sd": float(np.std(v, ddof=1)) if len(v) > 1 else None}

level0 = json.loads((REPO / "docs" / "experiments" / "fits" / "level0" / f"{species}.json").read_text())
frozen = {k: level0["fit"]["assign"][k] for k in targets["level0"]["knobs"]}
form_range = {p["path"]: p for p in targets["formRange"]}
knobs = [form_range[p] for p in form_range] + [p for p in targets["param"] if p["path"] == "r3.c"]
start = dict(targets["form"])
if "r2.levels.1.postureSetPoint" not in start:
    # r3.rs: an unset posture set point is the level's setPoint (`unwrap_or(set_point)`): the same tree.
    start["r2.levels.1.postureSetPoint"] = start["r2.levels.1.setPoint"]

reg = {
    "version": 1,
    "species": species,
    "provisional": "phase 3 pilot (the user, 2026-11-04): pending Level 0's pass and ADR 0052; nothing from it is "
                   "accepted into species params (the plan's §g)",
    "written": "2026-11-04, from real QSMs only, before any simulated tree was scored",
    "dataset": dataset, "code": code, "d_min_m": d_min,
    "size_match": {"dbh": at, "seasons": list(l1.MATCH_SEASONS), "dump_seasons": list(l1.DUMP_SEASONS),
                   "rule": "per candidate on its own seeds: the first season at which the median over seeds of the "
                           "per-seed median DBH of the live measured trees (cli/allometry.ts) reaches dbh; a match at "
                           "the first season counts and is flagged; none by the last, or outside dump_seasons: "
                           "unmatched, every Level 1 term costs MISSING_PENALTY and the candidate is flagged"},
    "descriptors": {k: tier[k] for k in names},
    "held_out_seed": l1.HELD_OUT_SEED,
    "held_out_rule": "np.random.default_rng(held_out_seed).choice(sorted(descriptors), round(n/3), replace=False); "
                     "drawn once, never redrawn (the user)",
    "held_out": held_out,
    "held_out_note": "never written by the fit (the user, 2026-11-04); only level1_gate.py computes and writes them",
    "fitted": fitted,
    "groups": weight_groups,
    "weights": "correlated summaries of a single measurement share one unit of weight (the user, 2026-11-04, a "
               "general rule): OUTLINE is one group whatever members the draw leaves in the loss; every other "
               "descriptor is its own group. A group's location term is the mean of its members' z², its spread "
               "term the mean of their s², each at weight 1",
    "outline": list(l1.OUTLINE),
    "real": real,
    "real_rule": "each tree the median over its repeats (tolerance.median_of; NaN under 3); OLS on ln measured DBH: "
                 "slope, residual SD (df n − 2, 95% CI), the median of y − slope (ln d − ln dbh). noise_rms is the "
                 "repeat floor (phase1-tolerances.json); the gate reads the raw SD",
    "real_dbh_range_m": [float(min(t["dbh"] for t in trees)), float(max(t["dbh"] for t in trees))],
    "real_trees": len(trees),
    "real_trees_by_gap": by_gap,
    "demol": demol_block,
    "sim_rule": "the stand's live measured trees at the matched season: coarsen.coarsen(inflated=True) at d_min_m, "
                "describe(), detrended with the registered slope on cylinders.dbh of the uncoarsened tree; trees "
                "outside real_dbh_range_m are counted and reported, never excluded; fine values never enter the loss",
    "loss": {"level0": "fit.contributions(load_spec(species, level=0)): Level 0's scored traits and death penalties "
                       "at their Level 0 weights",
             "z": "(median of the detrended simulated trees − real median) / real SD",
             "s": "ln(simulated SD (ddof 1) / real SD) / ln 2",
             "min_trees": l1.MIN_TREES, "missing_penalty": l1.MISSING_PENALTY,
             "trials": ["lone", "stand150", "shade"], "seeds_per_candidate": 5},
    "gate": {"seeds": list(l1.GATE_SEEDS), "z": l1.Z_GATE, "pass_seeds": l1.PASS_SEEDS,
             "held_out": "a seed passes when every held-out descriptor's |z| <= z, on the median of that seed's live "
                         "measured trees, detrended; the species on >= pass_seeds",
             "spread": "every fitted descriptor's simulated SD over all the gate's trees within ×2 of the real SD",
             "shape_flag": "gallery.shape_flag clear, the hand = the Level 0 fit with the targets file's [form]",
             "size_match": "over the gate's seeds, by the size_match rule"},
    "control": {"seed": l1.CONTROL_SEED, "sets": l1.CONTROL_SETS,
                "rule": "20 pseudo-seeds of 4 real trees (without replacement within a seed), judged by the gate's "
                        "held-out and spread rules; then the pass count over `sets` such draws. In sample. Demol's "
                        "trees as pseudo-seeds on the tier A held-out descriptors: the out-of-sample check"},
    "seeds": {"fit": "drawn each generation from 1000–9999 less 1001–1003 (the gallery's)",
              "finalists": list(l1.FINAL_SEEDS), "gate": list(l1.GATE_SEEDS)},
    "fixed": {**targets.get("fixed", {}), **frozen},
    "frozen_level0": frozen,
    "frozen_level0_source": f"docs/experiments/fits/level0/{species}.json fit.assign (v2, night 1; not accepted)",
    "knobs": knobs,
    "knobs_rule": "ADR 0029's ten form knobs (bounds: [[formRange]]) and r3.c ([[param]]); no knob added",
    "start": start,
    "start_note": "the targets file's [form]; r3.c at the species' own value (cli/fit-eval.ts describe)",
}

# The targets file's pointer, before the hashes (the file is hashed with it).
text = targets_path.read_text()
block = "\n".join([
    "# Level 1 pilot (phase 3, 2026-11-04; provisional, pending Level 0 and ADR 0052): registered in",
    f"# analysis/fit/sources/level1-{species}.json (analysis/experiments/level1_targets.py) before any simulated tree was",
    "# scored. The held-out draw is seeded and never redrawn; held-out values are never written by the fit.",
    f'pilot_registration = "analysis/fit/sources/level1-{species}.json"',
    f"pilot_held_out_seed = {l1.HELD_OUT_SEED}",
    f"pilot_held_out = {held_out!r}",
    f"pilot_fitted = {fitted!r}",
    f"pilot_outline_group = {weight_groups.get('outline', [])!r}",
    f"pilot_knobs = {[p['path'] for p in knobs]!r}",
])
anchor = re.search(r"^gate_c_v3_1 = .*$", text, flags=re.M)
if anchor is None or "pilot_registration" in text:
    sys.exit("refusing: no gate_c_v3_1 line to follow, or a pilot block already there")
targets_path.write_text(text[:anchor.end()] + "\n" + block + text[anchor.end():])
assert tomllib.loads(targets_path.read_text())["level1"]["pilot_held_out"] == held_out

reg["hashes"] = l1.file_hashes(l1.HASHED + l1.species_files(species))


def _clean(x):
    if isinstance(x, float) and not math.isfinite(x):
        return None
    if isinstance(x, dict):
        return {k: _clean(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_clean(v) for v in x]
    return x


out.write_text(json.dumps(_clean(reg), indent=1) + "\n")
print(f"{out.relative_to(REPO)}: held out {held_out}; fitted {fitted}; groups {weight_groups}")
for k in names:
    r = real[k]
    print(f"  {k:20s} {tier[k]} n {r['n']:2d} median@{at:.3f} {r['median']:.4g} sd {r['sd']:.4g} "
          f"[{r['sd_lo95']:.3g}, {r['sd_hi95']:.3g}] slope {r['slope']:.4g} noise {r['noise_rms']:.3g}"
          + ("  HELD OUT" if k in held_out else ""))
print(f"demol: {demol_block['trees']} trees, DBH {demol_block['dbh_range_m']}")
