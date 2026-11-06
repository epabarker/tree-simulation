"""Pilot v2's noise floor and seed decision, and the simulated hand's correlation matrix (Level 1, registration v3;
analysis/treesim/level1.py). Provisional: nothing here writes species params.

    uv run --project analysis python -I analysis/experiments/level1_noise.py --species beech

Run once on the v3 registration, after level1_targets.py has written it and before any fit:
1. The hand (the Level 0 fit with [form]) on the noise check's draws: level1.noise_draws, numpy seed 20261106, the
   pilot's own six 5-seed and three 10-seed draws, so its floor and this one are paired (the same simulated trees).
   Each draw is scored by the v3 loss: location terms only at the registered weights, Level 0's terms included.
2. Determinism against the pilot's postfit.json: on the same trees, Level 0's terms to 1e-9, and the z² of every
   descriptor the pilot fitted as a group of one and v3 fits.
3. The pilot's floor beside it, from postfit.json's own terms: in full, and without its spread terms (`l1.*.sd`). The
   first difference is what the spread terms added; the second, pilot without spread against v3, is the reweighting
   and the redraw.
4. The rule (the user, 2026-11-04): 10 seeds per candidate if SD(the v3 loss over the six 5-seed draws) > 0.25 × the
   mean over those draws of the hand's Level 1 location loss (every target is 0, so that is the hand-to-target gap),
   else 5. Written once into the registration's `loss` (seeds_per_candidate and noise); refuses if already set.
5. The simulated hand's correlation matrix: the hand on the gate's seeds 1–20, the stand only, every descriptor (as
   level1_gate.py --hand grows it), detrended as the targets are, with its clusters by the registered rule. Reported
   beside the real matrix; nothing reads it. It writes correlations only: no simulated medians or z.

Writes docs/experiments/fits/<out>/noise.json and correlation.json.
"""

import argparse
import hashlib
import json
import math
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np

from treesim import level1 as l1
from treesim.fit_level1 import Measure, Pool, clear_scratch, level1_spec, total
from treesim.host import scratch_root, workers_default
from treesim.sweep import REPO

POSTFIT = REPO / "docs" / "experiments" / "fits" / "level1-pilot" / "postfit.json"
#: The rule's share of the hand-to-target gap (the user).
GAP_SHARE = 0.25


def floor(per: list[dict], key: str = "loss") -> dict:
    v = [p[key] for p in per]
    return {"values": v, "mean": float(np.mean(v)), "sd": float(np.std(v, ddof=1))}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--species", required=True)
    parser.add_argument("--workers", type=int, default=workers_default())
    parser.add_argument("--out", default="level1-pilot-v2", help="docs/experiments/fits/<out>/")
    args = parser.parse_args()

    reg = l1.load(args.species)
    if reg["version"] < 3:
        sys.exit("refusing: the noise rule is registration v3's")
    if reg["loss"].get("seeds_per_candidate") is not None:
        sys.exit(f"refusing: seeds_per_candidate is set already ({reg['loss']['seeds_per_candidate']}); it is set once")
    spec = level1_spec(args.species, reg)
    hand = {**spec.fixed, **spec.form}
    d5, d10 = l1.noise_draws()
    pf = json.loads(POSTFIT.read_text())
    assert d5 == reg["seeds"]["noise"]["draws5"] == pf["draws5"] and d10 == reg["seeds"]["noise"]["draws10"] == \
        pf["draws10"], "the noise draws are not the pilot's"
    assert not set(reg["seeds"]["search"]["list"]) & {s for d in d5 + d10 for s in d}

    out_dir = REPO / "docs" / "experiments" / "fits" / args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    scratch = f"{scratch_root()}/level1-noise"
    clear_scratch(scratch)
    pool = Pool(args.workers)
    executor = ProcessPoolExecutor(args.workers)
    names = sorted(reg["descriptors"])
    try:
        m = Measure(pool, spec, reg, scratch, executor)
        runs: dict[str, list[dict]] = {}
        for label, draws in (("5", d5), ("10", d10)):
            runs[label] = []
            for i, seeds in enumerate(draws):
                t = m(f"noise{label}-{i}", [hand], seeds)[0][0]
                lo, c = total(spec, reg, t)
                loc = float(sum(v for k, v in c.items() if k.startswith("l1.")))
                runs[label].append({"seeds": seeds, "loss": lo, "level1_location": loc, "level0": lo - loc,
                                    "contributions": c, "season": t.get("l1.season"), "trees": t.get("l1.trees"),
                                    "spread_s": {k: t.get(f"l1.{k}.s") for k in reg["fitted"]}})
                print(f"draw {label}-{i}: loss {lo:.3f} (Level 1 location {loc:.3f}, Level 0 {lo - loc:.3f}), season "
                      f"{t.get('l1.season')}", flush=True)
        # The simulated hand's matrix: the gate's seeds, the stand only, every descriptor (hide=False, as the gate).
        mg = Measure(pool, spec, reg, scratch, executor, hide=False)
        gt, _, gtrees = mg("corr", [hand], list(l1.GATE_SEEDS), names=names, trials=["stand150"])
    finally:
        executor.shutdown()
        pool.close()
        clear_scratch(scratch)

    # 2. Determinism: the pilot's postfit.json read the same trees.
    singles = [k for k, g in reg["prior"]["groups"].items() if g == [k] and k in reg["fitted"]]
    worst_l0, worst_z2 = 0.0, 0.0
    for label in ("5", "10"):
        for mine, theirs in zip(runs[label], pf["noise"][label]["draws"]):
            assert mine["season"] == theirs["season"], (label, mine["season"], theirs["season"])
            for k, v in theirs["contributions"].items():
                if not k.startswith("l1."):
                    worst_l0 = max(worst_l0, abs(mine["contributions"][k] - v))
            for k in singles:
                z2 = mine["contributions"][f"l1.{k}.loc"] / reg["location_weights"][k]
                worst_z2 = max(worst_z2, abs(z2 - theirs["contributions"][f"l1.{k}.loc"]) / max(1.0, abs(z2)))
    assert worst_l0 <= 1e-9 and worst_z2 <= 1e-9, (worst_l0, worst_z2)

    # 3. The pilot's floor, in full and without its spread terms, on the same draws.
    pilot, pilot_loc = {}, {}
    for label in ("5", "10"):
        per = pf["noise"][label]["draws"]
        pilot[label] = floor([{"loss": p["loss"]} for p in per])
        pilot_loc[label] = floor([{"loss": p["loss"] - sum(v for k, v in p["contributions"].items()
                                                           if k.startswith("l1.") and k.endswith(".sd"))} for p in per])
    v3 = {label: {"loss": floor(runs[label]), "level1_location": floor(runs[label], "level1_location"),
                  "level0": floor(runs[label], "level0"),
                  "term_sd": {k: float(np.std([p["contributions"][k] for p in runs[label]], ddof=1))
                              for k in sorted(runs[label][0]["contributions"])},
                  "term_mean": {k: float(np.mean([p["contributions"][k] for p in runs[label]]))
                                for k in sorted(runs[label][0]["contributions"])}}
          for label in ("5", "10")}

    # 4. The rule.
    sd5 = v3["5"]["loss"]["sd"]
    gap = v3["5"]["level1_location"]["mean"]
    threshold = GAP_SHARE * gap
    seeds = 10 if sd5 > threshold else 5
    decision = {"sd5": sd5, "gap": gap, "share": GAP_SHARE, "threshold": threshold, "seeds_per_candidate": seeds,
                "rule": "10 if SD(v3 loss, six 5-seed draws) > share × mean(the hand's Level 1 location loss over "
                        "those draws), else 5",
                "measured": "2026-11-04, on the v3 registration before any fit"}

    noise = {"species": args.species, "registration_version": reg["version"], "noise_seed": l1.NOISE_SEED,
             "draws5": d5, "draws10": d10, "hand": hand, "pilot_v2": v3, "runs": runs,
             "pilot": {"loss": pilot, "location_only": pilot_loc,
                       "source": "docs/experiments/fits/level1-pilot/postfit.json (registration v2's loss, the same "
                                 "simulated trees)"},
             "determinism": {"level0_max_abs": worst_l0, "z2_max_rel": worst_z2, "z2_descriptors": singles},
             "decision": decision}
    noise_path = out_dir / "noise.json"
    noise_path.write_text(json.dumps(noise, indent=1, default=float) + "\n")

    # 5. The simulated hand's correlation matrix beside the real one.
    trees = gtrees[0] or []
    at = reg["size_match"]["dbh"]
    r_sim, n_sim = l1.correlation(l1.detrended_columns(trees, names, reg["real"], at))
    r_real = np.array(reg["correlation"]["r"])
    off = ~np.eye(len(names), dtype=bool)
    diff = np.abs(r_sim - r_real)[off]
    corr = {"species": args.species, "names": names,
            "real": {"r": reg["correlation"]["r"], "n": reg["correlation"]["n"], "trees": reg["real_trees"],
                     "clusters": reg["clusters"]["list"]},
            "sim_hand": {"r": r_sim.tolist(), "n": n_sim.tolist(), "trees": len(trees), "season": gt[0]["l1.season"],
                         "seeds": list(l1.GATE_SEEDS), "trials": ["stand150"],
                         "clusters": l1.clusters(np.nan_to_num(r_sim), names)},
             "abs_diff": {"mean": float(np.nanmean(diff)), "max": float(np.nanmax(diff)),
                          "over_0_3": int(np.sum(diff > 0.3)) // 2},
             "rule": "both detrended by the registered slopes and correlated by level1.correlation; the simulated "
                     "matrix is reported only (the weights and the draw read the real one)"}
    (out_dir / "correlation.json").write_text(json.dumps(corr, indent=1, default=float) + "\n")

    # The decision, once, into the registration (not one of its hashed files).
    path = l1.registration_path(args.species)
    raw = json.loads(path.read_text())
    assert raw["loss"]["seeds_per_candidate"] is None
    raw["loss"]["seeds_per_candidate"] = seeds
    raw["loss"]["noise"] = {"file": str(noise_path.relative_to(REPO)),
                            "sha256": hashlib.sha256(noise_path.read_bytes()).hexdigest(),
                            **{k: decision[k] for k in ("sd5", "gap", "threshold", "measured")},
                            "sd10": v3["10"]["loss"]["sd"], "pilot_sd5": pilot["5"]["sd"],
                            "pilot_location_only_sd5": pilot_loc["5"]["sd"]}
    path.write_text(json.dumps(raw, indent=1) + "\n")

    print(json.dumps({"pilot": {k: (round(v["mean"], 2), round(v["sd"], 2)) for k, v in pilot.items()},
                      "pilot_location_only": {k: (round(v["mean"], 2), round(v["sd"], 2)) for k, v in pilot_loc.items()},
                      "pilot_v2": {k: (round(v["loss"]["mean"], 3), round(v["loss"]["sd"], 3)) for k, v in v3.items()},
                      "pilot_v2_level1_location": {k: round(v["level1_location"]["mean"], 3) for k, v in v3.items()},
                      "decision": decision, "determinism": noise["determinism"],
                      "sim_corr": {"trees": len(trees), "season": gt[0]["l1.season"], **corr["abs_diff"]}},
                     indent=1, default=float))
    if not math.isfinite(sd5):
        sys.exit("the 5-seed SD is not finite")


if __name__ == "__main__":
    main()
