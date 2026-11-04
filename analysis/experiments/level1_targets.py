"""Level 1's registration (reference-fidelity phase 3, the beech pilot; analysis/treesim/level1.py): written from real
QSMs only, before any simulated tree is scored, and committed alone. Writes analysis/fit/sources/level1-<species>.json
and the `[level1] pilot_*` keys of the species' targets file; nothing here reads a simulated tree.

    uv run --project analysis python -I analysis/experiments/level1_targets.py --species beech
    uv run --project analysis python -I analysis/experiments/level1_targets.py --species beech --version 2 \
        --freeze r3.c --reason "..."
    uv run --project analysis python -I analysis/experiments/level1_targets.py --species beech --version 3 \
        --freeze r3.c --redraw --reason "..."

The species' descriptors are gate c v3.1's tiers (the targets file's `[level1] gate_c_v3_1_tier_a`, `_tier_b`); its
dataset, d_min and matched DBH are phase1-tolerances.json's. Refuses if that file's own hashes have moved.

A registration is never rewritten in place: a new one is the next version, with a reason, and keeps the previous one's
knobs, fixed assignments, hold-outs, weights, loss and hashes in `prior`. `--freeze` takes knobs out of the search
and fixes them at the species' own values (cli/fit-eval.ts describe, the values Level 0 and the hand grow by). Every
target (descriptors, real distributions, Demol, size match, start) must come out identical to the previous version's,
or it refuses; `--redraw` lets the hold-outs and the weights change (v3), nothing else.

The seeds per candidate are left unset (null): analysis/experiments/level1_noise.py measures the hand's noise floor on
this registration's loss and sets them once, before any fit; level1.fit_seeds refuses until it has.

- v2 (the user, 2026-11-04, after the dry run): r3.c frozen at the species' value. Alone it moved the size-matched
  season from 50 to 80 (stress wood thickens the stem: a girth knob in this model), and nothing at Level 0 scores DBH
  at age. The knobs are ADR 0029's ten.
- v3, pilot v2 (the user, 2026-11-04, after the pilot failed its gate): location-only loss with weights from the
  measured correlation; whole clusters held out to a third; spread gated on every descriptor and out of the loss;
  fixed search seeds; seeds per candidate from the v3 noise floor. Each change and the pilot result behind it is in
  the registration's `changes`.
"""

import argparse
import json
import math
import re
import subprocess
import sys
import tomllib

import numpy as np

from treesim import level1 as l1
from treesim import tolerance as tol
from treesim.sweep import REPO

parser = argparse.ArgumentParser()
parser.add_argument("--species", required=True)
parser.add_argument("--version", type=int, default=1, help="the next version when one is registered already")
parser.add_argument("--freeze", nargs="*", default=[], help="knobs fixed at the species' own values")
parser.add_argument("--reason", help="why a new version (required past version 1)")
parser.add_argument("--redraw", action="store_true",
                    help="the version redraws the hold-outs and the weights (v3); every other target must not change")
args = parser.parse_args()
species = args.species

out = l1.registration_path(species)
prior = json.loads(out.read_text()) if out.exists() else None
expected = 1 if prior is None else prior["version"] + 1
if args.version != expected or (prior is not None and not args.reason):
    sys.exit(f"refusing: the next registration is version {expected}"
             + ("" if prior is None else ", with --reason; a registration is never rewritten in place"))
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

# The correlation of the detrended real values (v3), the clusters, the hold-out draw and the weights: real trees only.
r, r_n = l1.correlation(l1.detrended_columns(l1.as_sim(trees), names, real, at))
r_crit = l1.r_critical(len(trees))
weights = l1.location_weights(r, names, r_crit)
cluster_list = l1.clusters(r, names)
held_out, draw_order, taken = l1.cluster_held_out(cluster_list)
fitted = [k for k in names if k not in held_out]
ix = {k: i for i, k in enumerate(names)}
straddling = [{"held_out": h, "fitted": f, "r": float(r[ix[h], ix[f]])} for h in held_out for f in fitted
              if abs(r[ix[h], ix[f]]) >= l1.CLUSTER_CUT]
near_cut = [{"pair": [a, b], "r": float(r[ix[a], ix[b]])} for i, a in enumerate(names) for b in names[i + 1:]
            if abs(abs(r[ix[a], ix[b]]) - l1.CLUSTER_CUT) < 0.02]
near_crit = [{"pair": [a, b], "r": float(r[ix[a], ix[b]]), "n": int(r_n[ix[a], ix[b]])}
             for i, a in enumerate(names) for b in names[i + 1:] if abs(abs(r[ix[a], ix[b]]) - r_crit) < 0.01]

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
unknown = [k for k in args.freeze if k not in {p["path"] for p in knobs}]
if unknown:
    sys.exit(f"refusing: not a knob: {', '.join(unknown)}")
frozen_form: dict = {}
if args.freeze:
    from treesim.fit import Pool

    pool = Pool(1)
    try:
        frozen_form = pool.ask({"describe": species, "paths": list(args.freeze)})["values"]
    finally:
        pool.close()
    knobs = [p for p in knobs if p["path"] not in frozen_form]
start = dict(targets["form"])
if "r2.levels.1.postureSetPoint" not in start:
    # r3.rs: an unset posture set point is the level's setPoint (`unwrap_or(set_point)`): the same tree.
    start["r2.levels.1.postureSetPoint"] = start["r2.levels.1.setPoint"]

#: Each version's changes and the pilot result behind each (the user's rule: the registration states them).
CHANGES = {3: [
    {"change": "location weights: each fitted descriptor's location term weighs 1 / Σ_j |r_ij| over the 16 "
               "descriptors, self included, every |r| below the two-sided p < 0.05 critical value at n = 53 (0.271) "
               "zeroed first; r from the real trees only (`correlation`). Replaces v1–v2's outline group (one unit "
               "shared by its fitted members) and a unit for each other descriptor",
     "motivation": "the pilot's grouping was by name, and correlated descriptors sat on both sides of it: p1 and "
                   "widestAt were held out against the fitted outline (the pilot note's 'The out-of-sample test is "
                   "narrower than five'). The measured matrix grades how far two descriptors are one measurement; "
                   "zeroing |r| under its critical value keeps sampling noise from compressing independent ones"},
    {"change": "hold-outs: whole clusters (average linkage on 1 − |r|, cut at |r| 0.5; each pair or singleton one "
               "unit), drawn without replacement with the same seed (20261104) and taken whole until at least 5 "
               "descriptors (a third, ADR 0049 §3) are held out. Replaces v1's draw of five single descriptors",
     "motivation": "independence: v1's draw put p1 and widestAt, correlated with the fitted outline, on the held-out "
                   "side, so its out-of-sample test rested on three descriptors. Not motivated by which descriptor "
                   "failed: pendulousFraction05 (0 of 20 on the fit) and limbUpturn (the noise floor's largest term) "
                   "fall where the rule puts them, and pendulousFraction05 is reported whether or not it is drawn"},
    {"change": "spread out of the loss: the loss is Level 0's contributions plus Σ_fitted w_k z_k²; each "
               "descriptor's spread s is computed and reported, never scored",
     "motivation": "the pilot's noise floor: the hand's loss on six 5-seed draws had SD 6.38, mostly the limbUpturn "
                   "(4.0) and leaderDominance (2.8) spread terms of a near-degenerate simulated distribution; the "
                   "in-run bests (9.15–11.13) were selection on noise and re-measured at 19.9–22.6. The limbs' and "
                   "the leader's spread is a rules-level shortfall (0.22–0.65× real, hand and fit alike) that no form "
                   "knob changed: the pilot's object is the location terms"},
    {"change": "spread gated on every descriptor, fitted and held out (16), each within ×2",
     "motivation": "the user: spread is not fitted, so gating it on held-out descriptors leaks nothing, and whether "
                   "simulated trees vary as real ones do is a question about the model, not the fit. The gate cannot "
                   "pass until limbs and the leader vary between trees as real ones do (the pilot: limbUpturn 0.26 "
                   "hand, 0.35 fit; leaderDominance 0.38, 0.22)"},
    {"change": "fixed search seeds: every candidate of every generation on the same seeds, the first "
               "seeds_per_candidate of a list drawn once (numpy seed 20261107) from 1000–9999 less 1001–1006 and the "
               "noise check's 60; disjoint from the gate's 1–20 and the finalists' 101–110",
     "motivation": "the pilot drew fresh seeds each generation, so in-run losses compared candidates on different "
                   "seeds and the run's lowest were its luckiest readings (the pilot note's noise floor)"},
    {"change": "seeds per candidate by a rule, set once by level1_noise.py on this registration before any fit: 10 "
               "if SD(the v3 loss of the hand over six 5-seed draws) > 0.25 × mean(the hand's Level 1 location "
               "loss over the same draws), else 5",
     "motivation": "the pilot's third design fault: the loss's noise floor was wider than the differences the "
                   "search ranked by"},
]}
UNCHANGED = ["Level 0's seven knobs frozen at the v2 beech fit", "r3.c frozen at the species' 0.04879",
             "Level 0's terms at their Level 0 weights", "ADR 0029's ten form knobs, their bounds and the start",
             "the coarsened-simulation rule", "the size match", "the budget in generations (the wrapper's argument)",
             "the finalists (101–110) and the hand re-measured beside them", "the gate's seeds, |z| 2 and 15 of 20",
             "shapeFlag", "the real distributions, Demol and the gap strata"]

reg = {
    "version": args.version,
    "species": species,
    "provisional": "phase 3 pilot (the user, 2026-11-04): pending Level 0's pass and ADR 0052; nothing from it is "
                   "accepted into species params (the plan's §g)",
    "written": "2026-11-04, from real QSMs only, before any simulated tree was scored; seeds_per_candidate is set after "
               "it, by level1_noise.py from the hand's noise floor on this loss, before any fit",
    "dataset": dataset, "code": code, "d_min_m": d_min,
    "size_match": {"dbh": at, "seasons": list(l1.MATCH_SEASONS), "dump_seasons": list(l1.DUMP_SEASONS),
                   "rule": "per candidate on its own seeds: the first season at which the median over seeds of the "
                           "per-seed median DBH of the live measured trees (cli/allometry.ts) reaches dbh; a match at "
                           "the first season counts and is flagged; none by the last, or outside dump_seasons: "
                           "unmatched, every Level 1 term costs MISSING_PENALTY and the candidate is flagged"},
    "descriptors": {k: tier[k] for k in names},
    "correlation": {"names": names, "r": r.tolist(), "n": r_n.tolist(),
                    "rule": "Pearson r between every two descriptors over the real trees, pairwise complete, on the "
                            "values detrended to size_match.dbh by each descriptor's registered slope (as the targets "
                            "are); level1.correlation"},
    "clusters": {"method": l1.CLUSTER_METHOD, "distance": "1 − |r|", "cut_r": l1.CLUSTER_CUT,
                 "list": cluster_list, "draw_order": [cluster_list[i] for i in draw_order], "taken": taken,
                 "rule": "scipy linkage(method) on the condensed 1 − |r|, fcluster at distance 1 − cut_r; canonical "
                         "order: members sorted, clusters by their first member. np.random.default_rng("
                         "held_out_seed).choice(len(list), len(list), replace=False) is the draw order; clusters are "
                         "taken whole in that order until the held-out descriptors number >= round(n/3)",
                 "straddling": straddling,
                 "straddling_note": "pairs at |r| >= cut_r across clusters (average linkage does not separate them) "
                                    "that the draw left on both sides of the fitted/held-out line; within a cluster "
                                    "none can straddle",
                 "near_cut": near_cut},
    "held_out_seed": l1.HELD_OUT_SEED,
    "held_out_rule": "whole clusters to a third (`clusters`); redrawn once in v3, for independence (the user, "
                     "2026-11-04), never again",
    "held_out": held_out,
    "held_out_note": "never written by the fit (the user, 2026-11-04); only level1_gate.py computes and writes them",
    "fitted": fitted,
    "location_weights": weights,
    "weights": {"rule": "w_k = 1 / Σ_j |r_kj| over all the descriptors, self included (|r_kk| = 1), every |r| below "
                        "r_crit set to 0 first; the fitted descriptors' w_k weigh their location terms",
                "r_crit": r_crit, "alpha": l1.R_ALPHA, "n": len(trees),
                "r_crit_rule": "two-sided critical value of Pearson's r at n = the real trees: t / sqrt(t² + n − 2), "
                               "t the (1 − alpha/2) quantile of Student's t on n − 2",
                "near_r_crit": near_crit,
                "fitted_total": float(sum(weights[k] for k in fitted)),
                "level0_total": None},
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
             "terms": "location only: Level 0's contributions + Σ over fitted k of location_weights[k] · z_k²",
             "spread_in_loss": False,
             "z": "(median of the detrended simulated trees − real median) / real SD",
             "s": "ln(simulated SD (ddof 1) / real SD) / ln 2; computed and reported per descriptor, never scored",
             "min_trees": l1.MIN_TREES, "missing_penalty": l1.MISSING_PENALTY,
             "missing": "w_k · missing_penalty in place of w_k · z_k²: a descriptor with fewer than min_trees finite "
                        "trees, or every descriptor of an unmatched candidate",
             "trials": ["lone", "stand150", "shade"],
             "seeds_per_candidate": None,
             "seeds_rule": "set once by analysis/experiments/level1_noise.py on this registration, before any fit: the "
                           "hand on six 5-seed and three 10-seed draws (level1.noise_draws, numpy seed 20261106: the "
                           "pilot's own draws, so paired with its noise floor); 10 if the SD of the v3 loss over the "
                           "six 5-seed draws exceeds 0.25 × the mean of the hand's Level 1 location loss over those "
                           "draws, else 5"},
    "gate": {"seeds": list(l1.GATE_SEEDS), "z": l1.Z_GATE, "pass_seeds": l1.PASS_SEEDS,
             "held_out": "a seed passes when every held-out descriptor's |z| <= z, on the median of that seed's live "
                         "measured trees, detrended; the species on >= pass_seeds",
             "spread": "every descriptor's simulated SD, fitted and held out (level1.spread_names), over all the "
                       "gate's trees within ×2 of the real SD",
             "shape_flag": "gallery.shape_flag clear, the hand = the Level 0 fit with the targets file's [form]",
             "size_match": "over the gate's seeds, by the size_match rule"},
    "control": {"seed": l1.CONTROL_SEED, "sets": l1.CONTROL_SETS,
                "rule": "20 pseudo-seeds of 4 real trees (without replacement within a seed), judged by the gate's "
                        "held-out and spread rules (spread on every descriptor); then the pass count over `sets` "
                        "such draws. In sample. Demol's trees as pseudo-seeds on the tier A held-out descriptors: "
                        "the out-of-sample check"},
    "seeds": {"search": {"numpy_seed": l1.SEARCH_SEED, "list": l1.search_seeds(),
                         "pool": "1000–9999 less 1001–1006 (the gallery's) and the noise check's 60 "
                                 "(level1.noise_draws)",
                         "rule": "the first loss.seeds_per_candidate of the list, the same for every candidate in "
                                 "every generation (level1.fit_seeds)"},
              "noise": {"numpy_seed": l1.NOISE_SEED, "draws5": l1.noise_draws()[0], "draws10": l1.noise_draws()[1]},
              "finalists": list(l1.FINAL_SEEDS), "gate": list(l1.GATE_SEEDS)},
    "fixed": {**targets.get("fixed", {}), **frozen, **frozen_form},
    "frozen_level0": frozen,
    "frozen_level0_source": f"docs/experiments/fits/level0/{species}.json fit.assign (v2, night 1; not accepted)",
    "knobs": knobs,
    "knobs_rule": "ADR 0029's ten form knobs (bounds: [[formRange]]) and r3.c ([[param]]), less `frozen_form`; no knob "
                  "added",
    "frozen_form": frozen_form,
    "frozen_form_source": "the species' own values (cli/fit-eval.ts describe): what Level 0 and the hand grow by",
    "start": start,
    "start_note": "the targets file's [form]; a knob it leaves unset (r3.c in v1) at the species' own value "
                  "(cli/fit-eval.ts describe)",
}
# Level 0's total weight beside Level 1's (the user): its scored traits' weights (the death penalties apart).
from treesim.fit import load_spec  # noqa: E402

reg["weights"]["level0_total"] = float(sum(t["weight"] for t in load_spec(species, level=0).traits))
if args.version in CHANGES:
    reg["changes"] = CHANGES[args.version]
    reg["unchanged"] = UNCHANGED
#: The targets themselves: never changed by a new version. --redraw (v3) lets the hold-outs and the weights move.
SAME = ("species", "dataset", "code", "d_min_m", "size_match", "descriptors", "held_out_seed", "real",
        "real_dbh_range_m", "real_trees", "real_trees_by_gap", "demol", "frozen_level0", "start")
if not args.redraw:
    SAME += ("held_out", "fitted", "correlation", "clusters", "location_weights")


def _clean(x):
    if isinstance(x, float) and not math.isfinite(x):
        return None
    if isinstance(x, dict):
        return {k: _clean(v) for k, v in x.items()}
    if isinstance(x, list):
        return [_clean(v) for v in x]
    return x


if prior is not None:
    changed = [k for k in SAME if json.dumps(_clean(reg[k])) != json.dumps(prior.get(k))]
    if changed:
        sys.exit(f"refusing: version {args.version} would change the targets themselves: {', '.join(changed)}")
    commit = subprocess.run(["git", "log", "-1", "--format=%h", "--", str(out.relative_to(REPO))], cwd=REPO,
                            capture_output=True, text=True, check=True).stdout.strip()
    reg["reason"] = args.reason
    kept = ("held_out", "fitted", "groups", "weights", "location_weights", "clusters", "loss", "seeds", "gate")
    reg["prior"] = {"version": prior["version"], "commit": commit, "knobs": [p["path"] for p in prior["knobs"]],
                    "fixed": prior["fixed"], **{k: prior[k] for k in kept if k in prior}, "hashes": prior["hashes"],
                    **({"prior": prior["prior"]} if "prior" in prior else {})}

# The targets file's pointer, before the hashes (the file is hashed with it).
text = targets_path.read_text()
block = "\n".join([
    "# Level 1 pilot (phase 3, 2026-11-04; provisional, pending Level 0 and ADR 0052): registered in",
    f"# analysis/fit/sources/level1-{species}.json (analysis/experiments/level1_targets.py) from real QSMs only, before",
    "# any simulated tree was scored. Held-out values are never written by the fit."
    + (" v3 (pilot v2, the user) redrew the" if args.redraw else ""),
    *(["# hold-outs once, as whole clusters of correlated descriptors, for independence; never again."]
      if args.redraw else []),
    f'pilot_registration = "analysis/fit/sources/level1-{species}.json"',
    f"pilot_held_out_seed = {l1.HELD_OUT_SEED}",
    f"pilot_held_out = {held_out!r}",
    f"pilot_fitted = {fitted!r}",
    f"pilot_knobs = {[p['path'] for p in knobs]!r}",
    f"pilot_version = {args.version}",
    *([f"pilot_frozen = {{ {', '.join(f'{json.dumps(k)} = {v!r}' for k, v in frozen_form.items())} }}"]
      if frozen_form else []),
    *([f"# v{args.version}: {args.reason}"] if prior is not None else []),
])
if prior is None:
    anchor = re.search(r"^gate_c_v3_1 = .*$", text, flags=re.M)
    if anchor is None or "pilot_registration" in text:
        sys.exit("refusing: no gate_c_v3_1 line to follow, or a pilot block already there")
    text = text[:anchor.end()] + "\n" + block + text[anchor.end():]
else:
    # The previous version's block: from its first comment line through its last pilot_* line or v-comment.
    old = re.search(r"^# Level 1 pilot \(phase 3.*?(?=\n\n)", text, flags=re.M | re.S)
    if old is None or not old.group(0).rstrip().splitlines()[-1].startswith(("pilot_", "# v")):
        sys.exit("refusing: the previous pilot block is not where it was written")
    text = text[:old.start()] + block + text[old.end():]
targets_path.write_text(text)
written = tomllib.loads(targets_path.read_text())["level1"]
assert written["pilot_held_out"] == held_out and written["pilot_knobs"] == [p["path"] for p in knobs]
assert written["pilot_version"] == args.version

reg["hashes"] = l1.file_hashes(l1.HASHED + l1.species_files(species))
out.write_text(json.dumps(_clean(reg), indent=1) + "\n")
print(f"{out.relative_to(REPO)} v{args.version}: held out {held_out}; fitted {fitted}; knobs "
      f"{[p['path'] for p in knobs]}; frozen {frozen_form}")
print(f"clusters ({l1.CLUSTER_METHOD}, |r| cut {l1.CLUSTER_CUT}): {cluster_list}")
print(f"draw order: {[cluster_list[i] for i in draw_order]}; taken {taken}")
print(f"straddling |r| >= {l1.CLUSTER_CUT}: {[(s['held_out'], s['fitted'], round(s['r'], 2)) for s in straddling]}")
print(f"weights (r_crit {r_crit:.4f} at n {len(trees)}): fitted total {reg['weights']['fitted_total']:.3f}, Level 0 "
      f"total {reg['weights']['level0_total']:.1f}")
for k in names:
    rk = real[k]
    print(f"  {k:20s} {tier[k]} n {rk['n']:2d} median@{at:.3f} {rk['median']:.4g} sd {rk['sd']:.4g} "
          f"[{rk['sd_lo95']:.3g}, {rk['sd_hi95']:.3g}] slope {rk['slope']:.4g} noise {rk['noise_rms']:.3g} "
          f"w {weights[k]:.3f}" + ("  HELD OUT" if k in held_out else ""))
print(f"demol: {demol_block['trees']} trees, DBH {demol_block['dbh_range_m']}")
