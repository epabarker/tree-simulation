"""Both shedding rules relaxed at once: R1's acclimated leaf cost (c 0.3) and C5's T_rel at a
shade-tolerant's value (the user, 2026-10-31: Hagemeier & Leuschner's lowest shade leaves, hornbeam
2.5%, beech 0.8%), against the flat run. Metamers beside everything: retained shade twigs cost
memory and the phone.

(a) the fitted hornbeam (the round-5 pilot) lone: fitted-cap.py, flat and both (T_rel 0.025);
(b) its closed stand at 100, seeds 1–3: the middle row's limb crown ratio and alive100, the LAI
    and floor light over the ring (ground.csv, layer 0: mean lai and q), all twelve trees' metamers;
(c) `forest` at τ 0 to 300, seeds 1–3: flat (leafcost.py's runs) and both, with forest's own
    T_rel 0.12 scaled as hornbeam's (0.025/0.194): 0.0155;
(d) beech at round 2's form and physiology, lone: fitted-cap.py, flat and both (T_rel 0.008).

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/both.py [--workers 12]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import polars as pl

HERE = Path(__file__).resolve().parent
spec_ = importlib.util.spec_from_file_location("leafcost", HERE / "leafcost.py")
leafcost = importlib.util.module_from_spec(spec_)
spec_.loader.exec_module(leafcost)
response, cap, REPO, FIT = leafcost.response, leafcost.cap, leafcost.REPO, leafcost.FIT
OUT = REPO / "runs" / "both"
ACCLIMATED = {"leafCost": "acclimated", "leafCostShade": 0.3}
TREL = {"hornbeam": 0.025, "beech": 0.008}
FOREST_TREL = 0.12 * 0.025 / 0.194
SEEDS = (1, 2, 3)


def forest(name: str, patch: dict, seed: int) -> Path:
    out = OUT / "forest" / f"{name}-s{seed}"
    if not (out / "metrics.csv").exists():
        out.mkdir(parents=True, exist_ok=True)
        subprocess.run([str(cap.sweep.TREESIM), "--preset", "forest", "--seasons", "300", "--params", "-", "--quiet",
                        "--out", str(out)], input=json.dumps({"world": {"faces": [0, 0]}, "seed": seed, **patch}),
                       text=True, check=True)
    return out


def with_both(patch: dict, trel: float) -> dict:
    return {**patch, "r1": {**patch["r1"], **ACCLIMATED}, "c5": {**patch.get("c5", {}), "Trel": trel}}


def fitted_cap(results: Path, name: str, assign: dict, species: str) -> None:
    with (OUT / f"lone-{name}.txt").open("w") as f:
        subprocess.run([sys.executable, str(HERE / "fitted-cap.py"), str(results), "--name", name, "--species", species,
                        "--assign", json.dumps(assign)], stdout=f, stderr=subprocess.STDOUT, check=True, cwd=REPO)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                    "--target-dir", str(REPO / "rust" / "target" / "native")], cwd=REPO / "rust", check=True)
    hb = json.loads(FIT.read_text())["fit"]["patch"]
    stands = {"flat": hb, "both": with_both(hb, TREL["hornbeam"])}
    # Beech at round 2's form and physiology, as a bare patch for fitted-cap.py.
    fixed = tomllib.loads((REPO / "analysis" / "fit" / "targets" / "beech.toml").read_text()).get("fixed", {})
    ev = cap.Evaluator()
    try:
        beech = ev.ask({"amend": "beech", "assign": dict(fixed)})["patch"]
    finally:
        ev.close()
    (OUT / "beech-round2.json").write_text(json.dumps(beech))
    both_assign = lambda sp: {"r1.leafCost": "acclimated", "r1.leafCostShade": 0.3, "c5.Trel": TREL[sp]}
    cap.OUT = OUT
    stand = {"width": cap.STAND_WIDTH, "sides": "periodic", "faces": [0, 0]}
    jobs = [lambda k=k, s=s: cap.grow(f"stand-{k}-s{s}", "hornbeam", stands[k], stand, cap.STAND_TREES, seed=s)
            for k in stands for s in SEEDS]
    jobs += [lambda s=s: forest("both", {"r1": ACCLIMATED, "c5": {"Trel": FOREST_TREL}}, s) for s in SEEDS]
    jobs += [lambda: fitted_cap(FIT, "hornbeam-both", both_assign("hornbeam"), "hornbeam"),
             lambda: fitted_cap(OUT / "beech-round2.json", "beech-flat", {}, "beech"),
             lambda: fitted_cap(OUT / "beech-round2.json", "beech-both", both_assign("beech"), "beech")]
    with ThreadPoolExecutor(args.workers) as pool:
        list(pool.map(lambda f: f(), jobs))

    print(f"## (b) the fitted hornbeam's closed stand at 100 (both: c 0.3, T_rel {TREL['hornbeam']})\n")
    print("| case | seed | middle row alive | limb crown ratio (living) | LAI | floor light | metamers (all 12) |")
    print("|---|---|---|---|---|---|---|")
    for k in stands:
        for s in SEEDS:
            run = OUT / f"stand-{k}-s{s}"
            mt = pl.read_csv(run / "metrics.csv", infer_schema_length=None).filter(pl.col("season") == 100)
            mid = mt.filter(pl.col("tree").is_in(cap.MEASURED) & (pl.col("alive") == 1))
            g = pl.read_csv(run / "ground.csv").filter((pl.col("season") == 100) & (pl.col("layer") == 0))
            cr = "–" if mid.height == 0 else f"{mid['limbCrownRatio'].mean():.2f}"
            print(f"| {k} | {s} | {mid.height}/4 | {cr} | {g['lai'].mean():.1f} | {g['q'].mean():.3f} | "
                  f"{int(mt.filter(pl.col('alive') == 1)['metamers'].sum())} |")
    print(f"\n## (c) forest, τ 0, to 300 (both: c 0.3, T_rel {FOREST_TREL:.4f})\n")
    print("| case | seed | median height 50 / 100 / 150 / 200 / 250 / 300 | metamers 100 / 200 / 300 | "
          "same trees' gain 250–300 | tallest | plateau | alive / planted |")
    print("|---|---|---|---|---|---|---|---|")
    for k, root in (("flat", REPO / "runs" / "leafcost" / "forest" / "flat"), ("both", OUT / "forest" / "both")):
        for s in SEEDS:
            r = response.forest_read(Path(f"{root}-s{s}"))
            c = r["curve"]
            ok = r["gain"] < 2 and r["tallest"] < 180
            print(f"| {k} | {s} | {' / '.join(f'{c[x]:.0f}' for x in (50, 100, 150, 200, 250, 300))} | "
                  f"{' / '.join(f'{r['metamers'][x] / 1000:.0f}k' for x in (100, 200, 300))} | {r['gain']:+.1f} | "
                  f"{r['tallest']:.0f} | {'yes' if ok else 'no'} | {r['alive']} / {r['planted']} |")
    for name in ("hornbeam-both", "beech-flat", "beech-both"):
        print(f"\n## lone: {name}\n")
        text = (OUT / f"lone-{name}.txt").read_text()
        print("\n".join(line for line in text.splitlines() if not line.startswith("/home"))[:6000])


if __name__ == "__main__":
    main()
