"""Gate c v3.2 (2026-11-05; docs/experiments/2026-11-05-crown-base-and-bole.md): v3.1's rules, unchanged, applied to
four new descriptors (crownBase80, its 70 and 90 companions, trunkTortuosity05) as a supplement to the v3.1
registration (`phase1-tolerances.json`, untouched). d_min and tier B's bracket are frozen at v3.1's (BioDiv p2,
8.6 mm; upper end p5, 11.0 mm): rerunning the control's d_min rule over a larger descriptor set could move d_min and
with it every registered row, so it is reported (`dmin_rule_with_new`), never re-chosen. Beech only (BioDiv).

  register   real QSMs only: tolerances (tolerance.tolerances, all descriptors), the self-check that every v3.1 row
             reproduces exactly, the control at the frozen points → analysis/fit/sources/phase1-tolerances-v3.2.json
  gate       simulated trees (v3.1's dumps, runs/gate-c/trees: beech's Level 0 fit, season 70, seeds 1-20), tiers by
             phase1_degradation.judge → runs/crown-base/gate-c-v32.{json,md}, sim-describe.csv

  uv run --project analysis python -I analysis/experiments/gate_c_v32.py register|gate
"""

import csv
import json
import math
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT / "analysis"))

import phase1_degradation as pd  # noqa: E402

from treesim import control as ct  # noqa: E402
from treesim import tiers  # noqa: E402
from treesim import tolerance as tol  # noqa: E402
from treesim.describe import DIAGNOSTIC  # noqa: E402

NEW4 = ("crownBase80", "crownBase70", "crownBase90", "trunkTortuosity05")
V31 = ROOT / "analysis/fit/sources/phase1-tolerances.json"
V32 = ROOT / "analysis/fit/sources/phase1-tolerances-v3.2.json"
OUT = ROOT / "runs/crown-base"
KEYS = ("n", "median", "slope_lnDBH", "between_sd", "tolerance", "noise_rms", "noise_ratio", "noise_verdict")


def _eq(a, b) -> bool:
    if a is None or b is None:
        return a is None and b is None or (isinstance(a, float) and math.isnan(a)) or (
            isinstance(b, float) and math.isnan(b))
    return a == b


def register() -> None:
    v31 = json.loads(V31.read_text())
    rows = tol.real_sets()
    table, _ = tol.tolerances(rows)
    table = tol._clean(table)
    # The self-check: every registered row, every key, bit for bit.
    new = {(r["species"], r["descriptor"]): r for r in table}
    diff = [(r["species"], r["descriptor"], k, r.get(k), new[(r["species"], r["descriptor"])].get(k))
            for r in v31["table"] for k in KEYS if not _eq(r.get(k), new[(r["species"], r["descriptor"])].get(k))]
    print(f"self-check: {len(v31['table'])} registered rows × {len(KEYS)} keys, differing {len(diff)}")
    if diff:
        print(diff[:10])
        sys.exit("refusing: a registered row moved")
    res = v31["resolution"]["biodiv"]
    points = {"dmin": res["d_min"], "upper": res["upper_end"]["d"]}
    sel = [r for r in rows if r["dataset"] == "biodiv" and r["species"] == "Fagus_sylvatica"]
    jobs = [(str(r["path"]), tol._optimum_set(r["path"]), points) for r in sel]
    with ProcessPoolExecutor(12) as ex:
        trees = list(ex.map(tol._control_tree, jobs, chunksize=1))
    rowtol = {d: new[("beech", d)] for s, d in new if s == "beech"}
    shares = {}
    for v in points:
        for k in tol.DESCRIPTORS:
            orig = [tol._val(d["original"], k) for d in trees]
            shares.setdefault(v, {})[k] = ct.share_within(orig, [tol._val(d[v], k) for d in trees],
                                                          tol._num(rowtol[k]["tolerance"]))
    # The registered control's shares at d_min (runs/phase1/control-grid.csv) against this path's, for the
    # existing descriptors: the path's own check.
    grid = {(r["descriptor"]): float(r["share"]) for r in csv.DictReader((ROOT / "runs/phase1/control-grid.csv").open())
            if r["dataset"] == "biodiv" and r["version"] == f"p{res['d_min_percentile']}" and r["species"] == "beech"
            and r["share"] not in ("", "nan")}
    path_check = {k: (grid[k], shares["dmin"][k]) for k in grid if k in shares["dmin"]}
    moved = {k: v for k, v in path_check.items() if not (math.isnan(v[0]) and math.isnan(v[1])) and v[0] != v[1]}
    print(f"control path check at d_min: {len(path_check)} descriptors, differing {len(moved)}", moved or "")
    gated_old = {k: s for k, s in shares["dmin"].items() if new[("beech", k)]["noise_verdict"] == "clear"
                 and k not in NEW4}
    gated_new = {k: s for k, s in shares["dmin"].items() if new[("beech", k)]["noise_verdict"] == "clear"}
    real = {}
    for r in sel:
        ds = tol.biodiv_models(r)
        med = tol.median_of(ds)
        real[r["tree"]] = {"dbh": r["dbh_measured"], **{k: med[k] for k in tol.DESCRIPTORS},
                           **{k: float(np.nanmedian([tol._val(d, k) for d in ds])) for k in DIAGNOSTIC}}
    out = tol._clean({
        "version": 3.2, "supplement_of": {"file": str(V31.relative_to(ROOT)), "version": v31["version"]},
        "written": "2026-11-05: v3.1's rules unchanged on four new descriptors; d_min and the upper end frozen at "
                   "v3.1's; written from real QSMs only, before any simulated tree is read",
        "descriptors": list(NEW4), "frozen": {"d_min": res["d_min"], "upper_end": res["upper_end"],
                                              "evaluation_points": "tiers.evaluation_points(grid, d_min, upper)"},
        "rules": v31["rules"], "self_check": {"rows": len(v31["table"]), "keys": list(KEYS), "differing": 0},
        "control_path_check": {"descriptors": len(path_check), "differing": len(moved)},
        "table": [new[("beech", k)] for k in NEW4],
        "control": {v: {k: shares[v][k] for k in NEW4} for v in points},
        "dmin_rule_with_new": {"without": ct.rule_holds({"beech": gated_old}),
                               "with": ct.rule_holds({"beech": gated_new})},
        "hashes": tol.file_hashes(),
    })
    V32.write_text(json.dumps(out, indent=1) + "\n")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "real.json").write_text(json.dumps(tol._clean(real), indent=0))
    for r in out["table"]:
        print(r["descriptor"], {k: r[k] for k in ("n", "median", "between_sd", "tolerance", "noise_ratio",
                                                   "noise_verdict")}, "control at d_min", out["control"]["dmin"][r["descriptor"]])
    print("d_min rule with the new descriptors:", out["dmin_rule_with_new"])


def gate() -> None:
    t = json.loads(V32.read_text())
    now = tol.file_hashes()
    bad = [f for f, h in t["hashes"].items() if now.get(f) != h]
    if bad:
        sys.exit(f"refusing: changed since v3.2 was written: {', '.join(bad)}")
    v31 = json.loads(V31.read_text())
    res = v31["resolution"]["biodiv"]
    grid = {int(k): v for k, v in res["grid"].items()}
    points = tiers.evaluation_points(grid, res["d_min"], res["upper_end"]["d"])
    names = [n for n, _ in points]
    jobs, keys = [], []
    for seed in t["rules"]["seeds"]:
        for k, tree in enumerate(pd._load("beech", seed)):
            if tree.meta["trial"] == "stand" and not tree.meta["alive"]:
                continue
            jobs.append((tree, points, res["d_min"]))
            keys.append((seed, tree.meta["trial"], k, tree.meta["season"]))
    with ProcessPoolExecutor(12) as ex:
        described = list(ex.map(pd._describe_tree, jobs, chunksize=1))
    cols = list(NEW4) + list(DIAGNOSTIC) + ["forkHeight", "centroidHeight", "p0", "crownBase", "dbh", "height"]
    rows, by_seed = [], {}
    for (seed, trial, k, season), d in zip(keys, described):
        for v, vals in d.items():
            rows.append({"seed": seed, "trial": trial, "tree": k, "season": season, "version": v,
                         **{c: vals.get(c) for c in cols}})
        if trial == "stand":
            by_seed.setdefault(seed, []).append(d)
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "sim-describe.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    out = []
    for r in t["table"]:
        key = r["descriptor"]
        values = {seed: {v: [pd._num(tree[v].get(key)) for tree in trees] for v in (tiers.FINE, *names, tiers.INFLATED)}
                  for seed, trees in by_seed.items()}
        base = {"descriptor": key, "tolerance": r["tolerance"], "noise_ratio": r["noise_ratio"],
                "floor": r["noise_verdict"]}
        if r["noise_verdict"] != "clear":
            out.append({**base, "tier": "–", "verdict": r["noise_verdict"], "reason": r["noise_verdict"]})
            continue
        out.append({**base, **pd.judge({"tolerance": r["tolerance"]}, values, names,
                                       pd._num(t["control"]["dmin"].get(key)))})
    (OUT / "gate-c-v32.json").write_text(json.dumps(tol._clean(out), indent=1))
    lines = ["| descriptor | tier | shift | tolerance | floor ratio | verdict | reason |", "|---|---|---|---|---|---|---|"]
    for r in out:
        lines.append(f"| {r['descriptor']} | {r['tier']} | {r.get('shift', '–')} | {r['tolerance']:.4g} | "
                     f"{r['noise_ratio']:.3g} | {r['verdict']} | {r['reason']} |")
    (OUT / "gate-c-v32.md").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))


if __name__ == "__main__":
    {"register": register, "gate": gate}[sys.argv[1]]()
