"""Level 1's gate (reference-fidelity phase 3; ADR 0049 §4; analysis/treesim/level1.py) and its controls. The only
script that writes held-out descriptors.

    uv run --project analysis python -I analysis/experiments/level1_gate.py --species beech --control
    uv run --project analysis python -I analysis/experiments/level1_gate.py --species beech --hand
    uv run --project analysis python -I analysis/experiments/level1_gate.py --species beech \\
        --fit docs/experiments/fits/level1-pilot/beech.json

The gate, on seeds 1–20 size-matched over those seeds: (1) a seed passes when every held-out descriptor's |z| ≤ 2 on
the median of its live measured trees, detrended; the species on ≥ 15 of 20; (2) every descriptor's simulated SD,
fitted and held out (registration v3, the user), over all the gate's trees within ×2 of the real SD; (3) shapeFlag
clear (gallery.py). Reported beside it: every descriptor's z and spread, Demol's z (tier A, the held-out site), the
BioDiv gap strata, Level 0's gate statistic on the same stand runs (never gated here), and each held-out descriptor's
largest real |r| with a fitted one (the registration's matrix: v3 holds out whole clusters, but average linkage
leaves some cross-cluster pairs at |r| ≥ 0.5 on both sides). pendulousFraction05 is reported whether or not it is
drawn (the user).

--control judges real trees by the same rule (no simulation): 20 BioDiv pseudo-seeds of 4 trees (in sample: it can
barely fail), the pass count over 2,000 such draws, and Demol's trees as pseudo-seeds (out of sample).
"""

import argparse
import json
import math
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

from treesim import fit, gallery, tallo
from treesim import level1 as l1
from treesim.fit import LEVEL0_SEASONS
from treesim.fit_level1 import Measure, Pool, clear_scratch, level1_spec
from treesim.host import scratch_root, workers_default
from treesim.sweep import REPO

#: Reported whatever the draw (the user, 2026-11-04): the pilot's held-out failure.
WATCH = "pendulousFraction05"


def fmt(v, d=2) -> str:
    return "—" if v is None or not math.isfinite(v) else f"{v:+.{d}f}"


def nearest_fitted(reg: dict) -> dict[str, dict]:
    """Each held-out descriptor's largest |r| with a fitted one, on the registration's real matrix."""
    c = reg["correlation"]
    ix = {k: i for i, k in enumerate(c["names"])}
    out = {}
    for h in reg["held_out"]:
        f = max(reg["fitted"], key=lambda k: abs(c["r"][ix[h]][ix[k]]))
        out[h] = {"fitted": f, "r": c["r"][ix[h]][ix[f]]}
    return out


def out_of_sample(reg: dict) -> list[str]:
    """The held-out descriptors with no fitted one at |r| ≥ the cluster cut."""
    return [h for h, v in nearest_fitted(reg).items() if abs(v["r"]) < l1.CLUSTER_CUT]


def control(reg: dict) -> dict:
    trees = l1.as_sim(l1.real_trees(reg["dataset"], reg["code"]))
    rng = np.random.default_rng(l1.CONTROL_SEED)
    seeds = l1.pseudo_seeds(trees, len(l1.GATE_SEEDS), 4, rng)
    zs = [l1.seed_z(reg, s, reg["held_out"]) for s in seeds]
    passed = sum(l1.seed_passes(z) for z in zs)
    ratios = l1.spread_ratios(reg, [t for s in seeds for t in s], l1.spread_names(reg))
    counts = [sum(l1.seed_passes(l1.seed_z(reg, s, reg["held_out"]))
                  for s in l1.pseudo_seeds(trees, len(l1.GATE_SEEDS), 4, rng)) for _ in range(l1.CONTROL_SETS)]
    demol = l1.as_sim(l1.real_trees("demol", "FSYL"))
    tier_a = [k for k in reg["held_out"] if reg["descriptors"][k] == "A"]
    d_seeds = l1.pseudo_seeds(demol, len(l1.GATE_SEEDS), 4, rng)
    d_zs = [l1.seed_z(reg, s, tier_a) for s in d_seeds]
    d_passed = sum(l1.seed_passes(z) for z in d_zs)
    d_counts = [sum(l1.seed_passes(l1.seed_z(reg, s, tier_a)) for s in l1.pseudo_seeds(demol, 20, 4, rng))
                for _ in range(l1.CONTROL_SETS)]
    oos = out_of_sample(reg)
    d_oos = sum(l1.seed_passes({k: z[k] for k in oos if k in z}) for z in d_zs)
    return {
        "biodiv": {"passed": passed, "of": len(seeds), "spread": ratios, "spread_pass": l1.spread_passes(ratios),
                   "per_seed": zs, "sets": {"n": l1.CONTROL_SETS, "share_ge_15": float(np.mean(np.array(counts) >= 15)),
                                            "quantiles": np.quantile(counts, [0.05, 0.5, 0.95]).tolist()}},
        "demol": {"descriptors": tier_a, "passed": d_passed, "of": len(d_seeds), "out_of_sample_passed": d_oos,
                  "per_seed": d_zs,
                  "sets": {"n": l1.CONTROL_SETS, "share_ge_15": float(np.mean(np.array(d_counts) >= 15)),
                           "quantiles": np.quantile(d_counts, [0.05, 0.5, 0.95]).tolist()}},
        "gap_strata": l1.gap_strata(reg),
    }


def print_control(c: dict, reg: dict) -> None:
    b, d = c["biodiv"], c["demol"]
    print(f"Control (seed {l1.CONTROL_SEED}; real trees as pseudo-seeds of 4, judged by the gate's rule)\n")
    print(f"BioDiv (in sample: the targets' own trees, so it can barely fail): {b['passed']} of {b['of']} seeds pass "
          f"the held-out rule; over {b['sets']['n']} draws P(≥ 15) = {b['sets']['share_ge_15']:.3f}, pass counts "
          f"5/50/95% {b['sets']['quantiles']}")
    print("  spread on its 80 trees (every descriptor): " + ", ".join(f"{k} {v:.2f}" for k, v in b["spread"].items())
          + f" → {'within ×2' if b['spread_pass'] else 'OUTSIDE ×2'}")
    print(f"Demol (out of sample, held-out tier A {d['descriptors']}): {d['passed']} of {d['of']} seeds; on "
          f"{out_of_sample(reg)} alone {d['out_of_sample_passed']}; over {d['sets']['n']} draws P(≥ 15) = "
          f"{d['sets']['share_ge_15']:.3f}, 5/50/95% {d['sets']['quantiles']}")
    print("\nBioDiv gap strata (detrended median minus the pooled one, in real SD):")
    for k, v in c["gap_strata"].items():
        print(f"  {k:20s} " + ", ".join(f"{g} {fmt(x)}" for g, x in v.items()))


def gate(reg: dict, species: str, assign: dict, workers: int, label: str) -> dict:
    spec = level1_spec(species, reg)
    names = reg["fitted"] + reg["held_out"]
    scratch = f"{scratch_root()}/level1-gate"
    clear_scratch(scratch)
    pool = Pool(workers)
    executor = ProcessPoolExecutor(workers)
    try:
        measure = Measure(pool, spec, reg, scratch, executor, hide=False)
        traits, cpu, trees = measure("gate", [assign], list(l1.GATE_SEEDS), names=names, trials=["stand150"])
        per_seed = measure.per_seed[0]
    finally:
        executor.shutdown()
        pool.close()
        clear_scratch(scratch)
    t, ts = traits[0], trees[0]
    out = {"species": species, "label": label, "assign": assign, "season": t["l1.season"], "flags": t["l1.flags"],
           "cpu_seconds": cpu, "provisional": reg["provisional"]}
    if ts is None:
        out["verdict"] = "FAIL: unmatched (no size-matched season in the dump window)"
        return out
    rows, passed = [], 0
    for s in l1.GATE_SEEDS:
        z = l1.seed_z(reg, [x for x in ts if x["seed"] == s], reg["held_out"])
        ok = l1.seed_passes(z)
        passed += ok
        rows.append({"seed": s, "trees": sum(x["seed"] == s for x in ts), "pass": ok, **z})
    ratios = l1.spread_ratios(reg, ts, l1.spread_names(reg))
    at = reg["size_match"]["dbh"]
    all_z = {}
    for k in names:
        real = reg["real"][k]
        all_z[k] = l1.score(l1.detrended(ts, k, real["slope"], at), real)
    demol = {}
    for k, d in reg["demol"]["descriptors"].items():
        v = l1.detrended(ts, k, reg["real"][k]["slope"], at)
        demol[k] = (float(np.median(v)) - d["median"]) / d["sd"] if v and d["sd"] else math.nan
    lo, hi = reg["real_dbh_range_m"]
    # Level 0's gate statistic on the same stand runs (level0_gate.py's rule), reported only.
    entry = tallo.load_targets()["species"][species]
    l0 = []
    for tt in per_seed:
        zs = [tt.get(f"stand.tallo{k}.{i}") for k in tallo.TRAITS for i in range(len(LEVEL0_SEASONS))]
        zs = [z for z in zs if z is not None]
        l0.append(max(abs(z) for z in zs) <= entry["control"]["T"] if zs else False)
    sf_pool = fit.Pool(workers)
    try:
        flag = gallery.shape_flag(sf_pool, spec, {"candidate": assign})
    finally:
        sf_pool.close()
    out.update({
        "trees": len(ts), "dbh_median": float(np.median([x["dbh"] for x in ts])),
        "outside_real_dbh": sum(not lo <= x["dbh"] <= hi for x in ts),
        "held_out": {"passed": passed, "of": len(l1.GATE_SEEDS), "pass": passed >= l1.PASS_SEEDS, "rows": rows,
                     "out_of_sample": out_of_sample(reg), "nearest_fitted": nearest_fitted(reg)},
        "spread": {"ratios": ratios, "pass": l1.spread_passes(ratios)},
        "shape_flag": flag,
        "z": all_z, "demol_z": demol,
        "level0": {"T": entry["control"]["T"], "passed": int(sum(l0)), "of": len(l0), "reported_only": True},
    })
    out["pass"] = bool(out["held_out"]["pass"] and out["spread"]["pass"] and not flag.get("flag", False))
    out["verdict"] = (f"{'PASS' if out['pass'] else 'FAIL'}: held out {passed}/20 (need {l1.PASS_SEEDS}); spread "
                      f"{'within' if out['spread']['pass'] else 'OUTSIDE'} ×2 (all {len(ratios)}); shapeFlag "
                      f"{'FLAGGED' if flag.get('flag') else 'clear'}")
    return out


def print_gate(g: dict, reg: dict) -> None:
    print(f"Level 1 gate, {g['species']} ({g['label']}; provisional): season {g['season']}, {g.get('trees')} trees, "
          f"median DBH {g.get('dbh_median', math.nan):.3f} m; {g.get('outside_real_dbh')} outside the real DBH range; "
          f"flags: {g['flags'] or 'none'}\n")
    if "held_out" not in g:
        print(g["verdict"])
        return
    near = ", ".join(f"{h} {v['fitted']} {v['r']:+.2f}" for h, v in g["held_out"]["nearest_fitted"].items())
    print(f"Held out: {reg['held_out']}. Largest real |r| with a fitted descriptor: {near}; none at |r| ≥ "
          f"{l1.CLUSTER_CUT}: {g['held_out']['out_of_sample']}.\n")
    print("| seed | trees | " + " | ".join(reg["held_out"]) + " | pass |")
    print("|---|---|" + "---|" * len(reg["held_out"]) + "---|")
    for r in g["held_out"]["rows"]:
        print(f"| {r['seed']} | {r['trees']} | " + " | ".join(fmt(r[k]) for k in reg["held_out"])
              + f" | {'yes' if r['pass'] else 'no'} |")
    print("\n| descriptor | role | n | sim median | real median | z | sim SD / real SD (gated ×2) | Demol z |")
    print("|---|---|---|---|---|---|---|---|")
    for k, s in g["z"].items():
        role = "held out" if k in reg["held_out"] else "fitted"
        ratio = s["sd"] / reg["real"][k]["sd"] if math.isfinite(s["sd"]) else math.nan
        print(f"| {k} | {role} | {s['n']} | {s['median']:.4g} | {reg['real'][k]['median']:.4g} | {fmt(s['z'])} | "
              f"{ratio:.2f} | {fmt(g['demol_z'].get(k, math.nan))} |")
    w = g["z"].get(WATCH)
    if w is not None:
        print(f"\n{WATCH} ({'held out' if WATCH in reg['held_out'] else 'fitted'}; reported whatever the draw): z "
              f"{fmt(w['z'])}, spread {g['spread']['ratios'].get(WATCH, math.nan):.2f}")
    sf = g["shape_flag"]
    print(f"\nshapeFlag: {json.dumps({k: v for k, v in sf.items() if k != 'seeds'}, default=float)}")
    print(f"Level 0's statistic on the same runs (reported, not gated): {g['level0']['passed']} of "
          f"{g['level0']['of']} seeds within T {g['level0']['T']:.2f}")
    print(f"\n{g['species']}: {g['verdict']}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", required=True)
    who = parser.add_mutually_exclusive_group(required=True)
    who.add_argument("--control", action="store_true", help="real trees through the gate's rule (no simulation)")
    who.add_argument("--hand", action="store_true", help="the hand: the Level 0 fit with the targets file's [form]")
    who.add_argument("--fit", help="a Level 1 results file (fit.assign) or a -best.json (assign)")
    parser.add_argument("--workers", type=int, default=workers_default())
    parser.add_argument("--json", help="also write the result here")
    args = parser.parse_args()
    reg = l1.load(args.species)
    if args.control:
        c = control(reg)
        print_control(c, reg)
        result = c
    else:
        spec = level1_spec(args.species, reg)
        if args.hand:
            assign, label = {**spec.fixed, **spec.form}, "hand: Level 0 v2 fit + [form]"
        else:
            r = json.loads(Path(args.fit).read_text())
            assign, label = (r.get("fit") or r)["assign"], f"fit {args.fit}"
        result = gate(reg, args.species, assign, args.workers, label)
        print_gate(result, reg)
    if args.json:
        Path(args.json).parent.mkdir(parents=True, exist_ok=True)
        Path(args.json).write_text(json.dumps(result, indent=1, default=float) + "\n")


if __name__ == "__main__":
    main()
