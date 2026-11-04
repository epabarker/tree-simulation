"""The Level 1 beech pilot's post-fit checks (docs/experiments/2026-11-04-level1-beech-pilot.md, "The overnight run").

    uv run --project analysis python -I docs/experiments/code/2026-11-04-level1-pilot/postfit.py

1. The hand and the three finalists re-measured on seeds 101–110, every loss term (the hand and the chosen finalist
   must reproduce the results file exactly: the run is deterministic).
2. The noise floor: the hand's loss on six independent 5-seed draws and three 10-seed draws (disjoint, from the fit's
   seed range, numpy seed NOISE_SEED), with the SD of each and each term's SD over the 5-seed draws.
3. The gallery on the finalist against the v2 hand (the Level 0 fit with [form] and r3.c at the species' value), on
   six fresh seeds 1001–1006 as night 1's check, with the hand's own separation from each reject.

Writes runs/level1-pilot/postfit.json. Held-out descriptors are not read here (the gate reads them).
"""

import json
import math
from concurrent.futures import ProcessPoolExecutor

import numpy as np

from treesim import fit, gallery
from treesim import level1 as l1
from treesim.fit_level1 import Measure, Pool, clear_scratch, level1_spec, total
from treesim.sweep import REPO

NOISE_SEED = 20261106
RESULTS = REPO / "docs" / "experiments" / "fits" / "level1-pilot" / "beech.json"
OUT = REPO / "runs" / "level1-pilot" / "postfit.json"


def main() -> None:
    reg = l1.load("beech")
    spec = level1_spec("beech", reg)
    res = json.loads(RESULTS.read_text())
    hand = {**spec.fixed, **spec.form}
    finalists = [f["assign"] for f in res["finalists"]]
    assert res["hand"]["assign"] == hand

    rng = np.random.default_rng(NOISE_SEED)
    pool_seeds = rng.choice(np.array(l1.FIT_SEEDS), 6 * 5 + 3 * 10, replace=False).tolist()
    draws5 = [pool_seeds[5 * i:5 * i + 5] for i in range(6)]
    draws10 = [pool_seeds[30 + 10 * i:40 + 10 * i] for i in range(3)]

    scratch = "/dev/shm/level1-postfit"
    clear_scratch(scratch)
    pool = Pool(12)
    executor = ProcessPoolExecutor(12)
    out: dict = {"noise_seed": NOISE_SEED, "draws5": draws5, "draws10": draws10}
    try:
        m = Measure(pool, spec, reg, scratch, executor)
        traits, _, _ = m("final", [hand] + finalists, list(l1.FINAL_SEEDS))
        rows = []
        for name, t in zip(["hand"] + [f"finalist{k + 1}" for k in range(len(finalists))], traits):
            lo, c = total(spec, reg, t)
            rows.append({"name": name, "loss": lo, "contributions": c, "season": t.get("l1.season"),
                         "dbh": t.get("l1.dbh"), "trees": t.get("l1.trees")})
        out["final"] = rows
        # Determinism: the run's own re-measure of the hand and of its chosen finalist.
        assert math.isclose(rows[0]["loss"], res["hand"]["loss"], rel_tol=0, abs_tol=1e-9), rows[0]["loss"]
        k = [f["assign"] for f in res["finalists"]].index(res["fit"]["assign"])
        assert math.isclose(rows[1 + k]["loss"], res["fit"]["loss"], rel_tol=0, abs_tol=1e-9), rows[1 + k]["loss"]
        out["chosen"] = f"finalist{k + 1}"

        noise = {}
        for label, draws in (("5", draws5), ("10", draws10)):
            per = []
            for i, seeds in enumerate(draws):
                t = m(f"noise{label}-{i}", [hand], seeds)[0][0]
                lo, c = total(spec, reg, t)
                per.append({"seeds": seeds, "loss": lo, "contributions": c, "season": t.get("l1.season")})
            losses = [p["loss"] for p in per]
            terms = sorted(per[0]["contributions"])
            noise[label] = {"draws": per, "losses": losses, "mean": float(np.mean(losses)),
                            "sd": float(np.std(losses, ddof=1)),
                            "term_sd": {k: float(np.std([p["contributions"][k] for p in per], ddof=1)) for k in terms}}
        out["noise"] = noise
    finally:
        executor.shutdown()
        pool.close()
        clear_scratch(scratch)

    # The gallery on six fresh seeds: the v2 hand, the chosen finalist and the rejects.
    gallery.SEEDS[:] = list(range(1001, 1007))
    fp = fit.Pool(12)
    try:
        rejects = {f"gallery:{e['name']}": e["assign"] for e in gallery.entries("beech")}
        ev = gallery.evaluate(fp, "beech", {"hand": hand, "fit": res["fit"]["assign"], **rejects})
    finally:
        fp.close()
    sc = gallery.scales(spec)
    g = {"seeds": gallery.SEEDS[:], "points": {}}
    for name in ["hand", "fit", *rejects]:
        g["points"][name] = {
            "to_hand": gallery.distance(ev[name]["mean"], ev["hand"]["mean"], sc),
            "noise_to_hand": gallery.noise(ev[name]["sd"], ev["hand"]["sd"], len(gallery.SEEDS), sc),
            **{f"to_{r.removeprefix('gallery:')}": gallery.distance(ev[name]["mean"], ev[r]["mean"], sc)
               for r in rejects},
        }
    near, d = gallery.nearest(ev["fit"], {k: v for k, v in ev.items() if k.startswith("gallery:")}, sc)
    g["fit_nearest"] = near.removeprefix("gallery:")
    g["fit_nearest_distance"] = d
    g["flag"] = d < g["points"]["fit"]["to_hand"]
    g["observables"] = {n: {k: ev[n]["mean"][k] for k in ev[n]["mean"] if not k.startswith("profile")}
                        for n in ("hand", "fit")}
    out["gallery"] = g

    OUT.write_text(json.dumps(out, indent=1, default=float) + "\n")
    print(json.dumps({"chosen": out["chosen"],
                      "final": [(r["name"], round(r["loss"], 3), r["season"]) for r in out["final"]],
                      "noise5": [round(x, 2) for x in out["noise"]["5"]["losses"]], "sd5": out["noise"]["5"]["sd"],
                      "noise10": [round(x, 2) for x in out["noise"]["10"]["losses"]], "sd10": out["noise"]["10"]["sd"],
                      "gallery": {k: g[k] for k in ("fit_nearest", "fit_nearest_distance", "flag")},
                      "gallery_to_hand": {k: (round(v["to_hand"], 3), round(v["noise_to_hand"], 3))
                                          for k, v in g["points"].items()}}, indent=1, default=float))


if __name__ == "__main__":
    main()
