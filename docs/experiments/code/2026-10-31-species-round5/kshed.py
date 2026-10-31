"""R1's k_shed (consecutive deficit seasons before a branch is shed), 1 against 3: does the cap go,
does the stand's crown deepen, does the plateau hold? A proposal, not adopted.

(a) the fitted hornbeam (the round-5 pilot, docs/experiments/fits/round5-pilot/hornbeam.json) lone:
    run fitted-cap.py with --assign '{"r1.kShed": 3}' for the band tables and the shed branches;
(b) its closed stand at 100 (cli/trials.ts standParams, seed 1): cap.py's band table, the middle
    row's limb crown ratio and how many of it are alive;
(c) `forest` at τ 0 to 300, seeds 1–3, with r1.kShed 1 (this core: R4's dormant age) and 3:
    response.py's height curve, metamers and plateau test.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/kshed.py [--workers 12]
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


def load(name: str, file: str):
    spec = importlib.util.spec_from_file_location(name, HERE / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


response = load("response", "response.py")
cap = response.cap
REPO = cap.REPO
OUT = REPO / "runs" / "kshed"
FIT = REPO / "docs" / "experiments" / "fits" / "round5-pilot" / "hornbeam.json"
CASES = {"k1": {}, "k3": {"kShed": 3}}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()
    subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                    "--target-dir", str(REPO / "rust" / "target" / "native")], cwd=REPO / "rust", check=True)
    sp = "hornbeam"
    fitted = json.loads(FIT.read_text())["fit"]["patch"]
    patches = {k: {**fitted, "r1": {**fitted["r1"], **r1}} for k, r1 in CASES.items()}
    cap.OUT = OUT
    response.OUT = OUT
    stand = {"width": cap.STAND_WIDTH, "sides": "periodic", "faces": [0, 0]}
    jobs = [lambda k=k: cap.grow(f"stand-{k}", sp, patches[k], stand, cap.STAND_TREES) for k in CASES]
    jobs += [lambda k=k, s=s: response.forest(k, CASES[k], s) for k in CASES for s in response.FOREST_SEEDS]
    with ThreadPoolExecutor(args.workers) as pool:
        list(pool.map(lambda f: f(), jobs))
    params = json.loads((OUT / "stand-k1" / "run.json").read_text())["params"]
    l_dorm = {**params["r4"], **params["species"][sp].get("r4", {})}["lDorm"]
    print("## (b) the fitted hornbeam's closed stand at 100 (trees 4–7)\n")
    for k in CASES:
        b, m, mt = cap.load(OUT / f"stand-{k}", cap.MEASURED)
        t = cap.band_table(b, m, mt, 100, l_dorm)
        row = mt.filter(pl.col("season") == 100)
        alive = int(row.filter(pl.col("alive") == 1).height)
        cr = row.filter(pl.col("alive") == 1)["limbCrownRatio"].mean()
        print(f"\n### {k}: middle row alive {alive} of 4; limb crown ratio {cr if cr is None else f'{cr:.2f}'}; "
              f"top fifth's leaf share {t.filter(pl.col('band') >= 8)['leafShare'].sum():.2f}\n")
        print(cap.md(t))
    print("\n## (c) forest, τ 0, to 300\n")
    print("| k_shed | seed | median height 50 / 100 / 150 / 200 / 250 / 300 | metamers 100 / 200 / 300 | "
          "same trees' gain 250–300 | tallest | plateau | alive / planted |")
    print("|---|---|---|---|---|---|---|---|")
    for k in CASES:
        for s in response.FOREST_SEEDS:
            r = response.forest_read(OUT / "forest" / f"{k}-s{s}")
            c = r["curve"]
            ok = r["gain"] < 2 and r["tallest"] < 180
            print(f"| {k[1:]} | {s} | {' / '.join(f'{c[x]:.0f}' for x in (50, 100, 150, 200, 250, 300))} | "
                  f"{' / '.join(f'{r['metamers'][x] / 1000:.0f}k' for x in (100, 200, 300))} | {r['gain']:+.1f} | "
                  f"{r['tallest']:.0f} | {'yes' if ok else 'no'} | {r['alive']} / {r['planted']} |")


if __name__ == "__main__":
    main()
