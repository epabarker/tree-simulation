"""R1's acclimated leaf cost against the flat one: m_f_eff = m_f·(c + (1 − c)·Q), c = r1.leafCostShade
0.3 and 0.5 (an ablation; default flat). Does the dome appear, does the stand's crown deepen and live
to 100, does the plateau hold?

(a) the fitted hornbeam (the round-5 pilot) lone: fitted-cap.py with --assign for each c (run
    separately; this script prints the compensation lights);
(b) its closed stand at 100 (cli/trials.ts standParams), seeds 1–3: the middle row's limb crown
    ratio and alive100, and cap.py's band table at seed 1;
(c) `forest` at τ 0 to 300, seeds 1–3, flat and acclimated: response.py's height curve, metamers,
    plateau.

The compensation light, where a twig's P = M with sapwood neglected (under 1% of M_b, the shed
decomposition): α·Q·d = m_f·(c + (1 − c)·Q), so Q_c = m_f·c / (α·d − m_f·(1 − c)), d = 1/(1 + L/L_h).

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/leafcost.py [--workers 12]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import polars as pl

HERE = Path(__file__).resolve().parent
spec_ = importlib.util.spec_from_file_location("kshed", HERE / "kshed.py")
kshed = importlib.util.module_from_spec(spec_)
spec_.loader.exec_module(kshed)
response, cap, REPO, FIT = kshed.response, kshed.cap, kshed.REPO, kshed.FIT
OUT = REPO / "runs" / "leafcost"
CASES = {"flat": {}, "c0.3": {"leafCost": "acclimated", "leafCostShade": 0.3},
         "c0.5": {"leafCost": "acclimated", "leafCostShade": 0.5}}
SEEDS = (1, 2, 3)


def q_c(mf: float, alpha: float, lh: float, c: float, path: float) -> float:
    d = 1 / (1 + path / lh)
    return mf * c / (alpha * d - mf * (1 - c))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()
    subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                    "--target-dir", str(REPO / "rust" / "target" / "native")], cwd=REPO / "rust", check=True)
    sp = "hornbeam"
    fitted = json.loads(FIT.read_text())["fit"]["patch"]
    patches = {k: {**fitted, "r1": {**fitted["r1"], **r1}} for k, r1 in CASES.items()}
    alpha, mf, lh = fitted["c3"]["alpha"], fitted["r1"]["mf"], fitted["r1"]["Lh"]
    print(f"## compensation light, the fitted hornbeam (α {alpha:.3g}, m_f {mf:.3g}, L_h {lh:.3g}, hyperbolic)\n")
    print("| leaf cost | at the base (L 0) | at path 100 |\n|---|---|---|")
    for k, r1 in CASES.items():
        c = r1.get("leafCostShade", 1.0)
        print(f"| {k} | {q_c(mf, alpha, lh, c, 0):.4f} | {q_c(mf, alpha, lh, c, 100):.4f} |")
    cap.OUT = OUT
    response.OUT = OUT
    stand = {"width": cap.STAND_WIDTH, "sides": "periodic", "faces": [0, 0]}
    jobs = [lambda k=k, s=s: cap.grow(f"stand-{k}-s{s}", sp, patches[k], stand, cap.STAND_TREES, seed=s)
            for k in CASES for s in SEEDS]
    jobs += [lambda k=k, s=s: response.forest(k, CASES[k], s) for k in CASES for s in response.FOREST_SEEDS]
    with ThreadPoolExecutor(args.workers) as pool:
        list(pool.map(lambda f: f(), jobs))
    params = json.loads((OUT / "stand-flat-s1" / "run.json").read_text())["params"]
    l_dorm = {**params["r4"], **params["species"][sp].get("r4", {})}["lDorm"]
    print("\n## (b) the fitted hornbeam's closed stand at 100 (trees 4–7)\n")
    print("| leaf cost | alive100, seeds 1 / 2 / 3 | limb crown ratio of the living, seeds 1 / 2 / 3 |\n|---|---|---|")
    for k in CASES:
        alive, crs = [], []
        for s in SEEDS:
            row = pl.read_csv(OUT / f"stand-{k}-s{s}" / "metrics.csv", infer_schema_length=None).filter(
                pl.col("tree").is_in(cap.MEASURED) & (pl.col("season") == 100) & (pl.col("alive") == 1))
            alive.append(f"{row.height}/4")
            crs.append("–" if row.height == 0 else f"{row['limbCrownRatio'].mean():.2f}")
        print(f"| {k} | {' / '.join(alive)} | {' / '.join(crs)} |")
    for k in CASES:
        b, m, mt = cap.load(OUT / f"stand-{k}-s1", cap.MEASURED)
        t = cap.band_table(b, m, mt, 100, l_dorm)
        print(f"\n### {k}, seed 1: top fifth's leaf share {t.filter(pl.col('band') >= 8)['leafShare'].sum():.2f}\n")
        print(cap.md(t))
    print("\n## (c) forest, τ 0, to 300\n")
    print("| leaf cost | seed | median height 50 / 100 / 150 / 200 / 250 / 300 | metamers 100 / 200 / 300 | "
          "same trees' gain 250–300 | tallest | plateau | alive / planted |")
    print("|---|---|---|---|---|---|---|---|")
    for k in CASES:
        for s in response.FOREST_SEEDS:
            r = response.forest_read(OUT / "forest" / f"{k}-s{s}")
            c = r["curve"]
            ok = r["gain"] < 2 and r["tallest"] < 180
            print(f"| {k} | {s} | {' / '.join(f'{c[x]:.0f}' for x in (50, 100, 150, 200, 250, 300))} | "
                  f"{' / '.join(f'{r['metamers'][x] / 1000:.0f}k' for x in (100, 200, 300))} | {r['gain']:+.1f} | "
                  f"{r['tallest']:.0f} | {'yes' if ok else 'no'} | {r['alive']} / {r['planted']} |")


if __name__ == "__main__":
    main()
