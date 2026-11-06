"""R1's light response, saturating against linear (ADR 0030, an ablation): does the dome appear,
does the stand's crown deepen, does the plateau hold?

    f(Q) = Q (linear)  or  Q·(1 + q_half)/(Q + q_half) (saturating), q_half 0.2 and 0.5

(a) the lone hornbeam of cap.py (r2.ramp 25, round 2's otherwise, seed 1, shedding on): the
    profile, W/H, fork and the top fifth's share of the leaf area at 60 and 100, and the sheet;
(b) the closed hornbeam stand (cli/trials.ts standParams) at 100: cap.py's band table and the
    middle row's limb crown ratio;
(c) `forest` at τ 0 (form step 5's evidence world) to 300, seeds 1–3: the planted trees' median
    height every 25 seasons, the metamers, and the plateau test (the same trees' median gain over
    250–300 < 2 cells and the tallest < 180; docs/experiments/code/2026-10-30-form/evidence.py).

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/response.py [--workers 12]
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from statistics import median

import numpy as np
import polars as pl

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("cap", HERE / "cap.py")
cap = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cap)
sweep, grid, REPO, FIGURES = cap.sweep, cap.grid, cap.REPO, cap.FIGURES

OUT = REPO / "runs" / "response"
RESPONSES = {"linear": {}, "sat0.2": {"response": "saturating", "qHalf": 0.2},
             "sat0.5": {"response": "saturating", "qHalf": 0.5}}
FOREST_SEEDS = (1, 2, 3)


def forest(name: str, r1: dict, seed: int) -> Path:
    out = OUT / "forest" / f"{name}-s{seed}"
    if not (out / "metrics.csv").exists():
        out.mkdir(parents=True, exist_ok=True)
        patch = {"world": {"faces": [0, 0]}, "seed": seed, **({"r1": r1} if r1 else {})}
        subprocess.run([str(sweep.TREESIM), "--preset", "forest", "--seasons", "300", "--params", "-", "--quiet",
                        "--out", str(out)], input=json.dumps(patch), text=True, check=True)
    return out


def forest_read(run: Path) -> dict:
    n = len(json.loads((run / "run.json").read_text())["params"]["trees"])
    m = pl.read_csv(run / "metrics.csv", infer_schema_length=None).filter((pl.col("tree") < n) & (pl.col("alive") == 1))
    h = lambda s: {r["tree"]: r["height"] for r in m.filter(pl.col("season") == s).iter_rows(named=True)}
    a, b = h(250), h(300)
    curve = {s: median(h(s).values()) for s in range(25, 301, 25)}
    mets = {s: int(m.filter(pl.col("season") == s)["metamers"].sum()) for s in (100, 200, 300)}
    return {"curve": curve, "metamers": mets, "gain": median([b[t] - a[t] for t in a if t in b]),
            "tallest": max(b.values()), "alive": len(b), "planted": n}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()
    subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim",
                    "--target-dir", str(REPO / "rust" / "target" / "native")], cwd=REPO / "rust", check=True)
    sp = "hornbeam"
    fixed = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text()).get("fixed", {})
    ev = grid.Evaluator()
    try:
        l_dorm = ev.ask({"describe": sp, "paths": ["r4.lDorm"]})["values"]["r4.lDorm"]
        patches = {k: ev.ask({"amend": sp, "assign": {**fixed, "r2.ramp": 25, **{f"r1.{p}": v for p, v in r1.items()}}})["patch"]
                   for k, r1 in RESPONSES.items()}
    finally:
        ev.close()
    cap.OUT = OUT
    lone = {"width": sweep.WIDTH}
    stand = {"width": cap.STAND_WIDTH, "sides": "periodic", "faces": [0, 0]}
    cells = OUT / "cells"
    cells.mkdir(parents=True, exist_ok=True)
    jobs = [lambda k=k: cap.grow(f"lone-{k}", sp, patches[k], lone, [{"x": sweep.WIDTH / 2}]) for k in RESPONSES]
    jobs += [lambda k=k: cap.grow(f"stand-{k}", sp, patches[k], stand, cap.STAND_TREES) for k in RESPONSES]
    jobs += [lambda k=k: sweep.run_cell(sp, patches[k], cells / f"{k}.npz") for k in RESPONSES]
    jobs += [lambda k=k, s=s: forest(k, RESPONSES[k], s) for k in RESPONSES for s in FOREST_SEEDS]
    with ThreadPoolExecutor(args.workers) as pool:
        list(pool.map(lambda f: f(), jobs))

    print("## (a) the lone hornbeam (ramp 25, shedding on)\n")
    print("| response | season | W/H | fork | dominance | H | top fifth's leaf share | profile (base → top) |")
    print("|---|---|---|---|---|---|---|---|")
    for k in RESPONSES:
        b, m, mt = cap.load(OUT / f"lone-{k}", [0])
        d = np.load(cells / f"{k}.npz")
        for s in cap.READ:
            t = cap.band_table(b, m, mt, s, l_dorm)
            _, wh, fork, dom, h = d[f"shape{s}"]
            prof = " ".join(f"{x:.2f}" for x in d[f"profile{s}"])
            print(f"| {k} | {s} | {wh:.2f} | {fork:.2f} | {dom:.1f} | {h:.0f} | "
                  f"{t.filter(pl.col('band') >= 8)['leafShare'].sum():.2f} | {prof} |")
    print("\n## (b) the closed stand at 100 (trees 4–7)\n")
    for k in RESPONSES:
        b, m, mt = cap.load(OUT / f"stand-{k}", cap.MEASURED)
        t = cap.band_table(b, m, mt, 100, l_dorm)
        cr = mt.filter(pl.col("season") == 100)["limbCrownRatio"].mean()
        print(f"\n### {k}: limb crown ratio {cr:.2f}; top fifth's leaf share "
              f"{t.filter(pl.col('band') >= 8)['leafShare'].sum():.2f}; "
              f"{cap.check(mt, int(t['aborted10'].sum()), range(91, 101))}\n")
        print(cap.md(t))
    print("\n## (c) forest, τ 0, to 300\n")
    print("| response | seed | median height 50 / 100 / 150 / 200 / 250 / 300 | metamers 100 / 200 / 300 | "
          "same trees' gain 250–300 | tallest | plateau | alive / planted |")
    print("|---|---|---|---|---|---|---|---|")
    for k in RESPONSES:
        for s in FOREST_SEEDS:
            r = forest_read(OUT / "forest" / f"{k}-s{s}")
            c = r["curve"]
            ok = r["gain"] < 2 and r["tallest"] < 180
            print(f"| {k} | {s} | {' / '.join(f'{c[x]:.0f}' for x in (50, 100, 150, 200, 250, 300))} | "
                  f"{' / '.join(f'{r['metamers'][x] / 1000:.0f}k' for x in (100, 200, 300))} | {r['gain']:+.1f} | "
                  f"{r['tallest']:.0f} | {'yes' if ok else 'no'} | {r['alive']} / {r['planted']} |")
    keys = list(RESPONSES)
    (cells / "hand.npz").unlink(missing_ok=True)
    (cells / "hand.npz").symlink_to(cells / "linear.npz")
    for s in sweep.SEASONS:
        print(grid.draw_cells(s, [[(k, k, None) for k in keys]],
                              (f"hornbeam at ramp 25, season {s}: R1's light response (lone tree, seed 1)",
                               "linear is the default; saturating f = Q·(1 + qHalf)/(Q + qHalf)"),
                              "base: ramp 25, linear", {}, cells,
                              "uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/response.py",
                              FIGURES / f"2026-10-31-response-hornbeam-{s}.png", ref_title="linear"))


if __name__ == "__main__":
    main()
