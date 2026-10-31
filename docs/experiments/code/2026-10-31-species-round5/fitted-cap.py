"""The cap on a fitted patch: the lone tree's band tables, shape and shed branches at 60 and 100.

For a species' whole patch (a fit's results file, `fit.patch`), the lone trial's tree at seed 1:
cap.py's band table (leaf, live buds, mean light, the decade's aborts) at 60 and 100, the top
fifth's share of the leaf, the profile, W/H, fork and dominance, and the shed branches decomposed
by rust/core/examples/shed_log.rs (P_b, M_b's sapwood and foliage parts, light, path length) with
their medians by cause. `--assign` patches the species on top (e.g. r1.kShed 3).

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/fitted-cap.py \\
        docs/experiments/fits/round5-pilot/hornbeam.json --name fitted [--assign '{"r1.kShed": 3}']

writes runs/fitted-cap/<name>/ and docs/experiments/figures/2026-10-31-fitted-cap-<name>-{60,100}.png.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
from pathlib import Path

import numpy as np
import polars as pl

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("cap", HERE / "cap.py")
cap = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cap)
sweep, grid, REPO, FIGURES = cap.sweep, cap.grid, cap.REPO, cap.FIGURES
SHED_LOG = REPO / "rust" / "target" / "native" / "release" / "examples" / "shed_log"


def set_path(target: dict, path: str, value) -> None:
    """A dotted path in plain JSON, through level indices ("r2.levels.1.lambda"), as setPath does."""
    keys = path.split(".")
    for k in keys[:-1]:
        target = target[int(k)] if isinstance(target, list) else target.setdefault(k, {})
    last = keys[-1]
    if isinstance(target, list):
        target[int(last)] = value
    else:
        target[last] = value


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("results", help="a fit's results file (fit.patch) or a bare patch")
    ap.add_argument("--name", required=True)
    ap.add_argument("--species", default="hornbeam")
    ap.add_argument("--assign", default="{}", help="JSON of dotted paths set on the patch")
    args = ap.parse_args()
    data = json.loads(Path(args.results).read_text())
    patch = data.get("fit", {}).get("patch", data)
    for p, v in json.loads(args.assign).items():
        set_path(patch, p, v)
    subprocess.run(["cargo", "build", "--release", "--quiet", "--locked", "-p", "treesim", "-p", "tree-core",
                    "--examples", "--bins", "--target-dir", str(REPO / "rust" / "target" / "native")],
                   cwd=REPO / "rust", check=True)
    sp = args.species
    out = REPO / "runs" / "fitted-cap" / args.name
    cap.OUT = out
    raw = cap.grow("lone", sp, patch, {"width": sweep.WIDTH}, [{"x": sweep.WIDTH / 2}])
    params = json.loads((raw / "run.json").read_text())["params"]
    l_dorm = {**params["r4"], **params["species"][sp].get("r4", {})}["lDorm"]
    cells = out / "cells"
    cells.mkdir(parents=True, exist_ok=True)
    sweep.run_cell(sp, patch, cells / f"{args.name}.npz")
    d = np.load(cells / f"{args.name}.npz")
    b, m, mt = cap.load(raw, [0])
    print(f"# {sp}, {args.name} ({args.results}; assign {args.assign}): lone, seed 1\n")
    print("| season | W/H | fork | dominance | H | metamers | top fifth's leaf share | profile (base → top) |")
    print("|---|---|---|---|---|---|---|---|")
    tables = {}
    for s in cap.READ:
        t = cap.band_table(b, m, mt, s, l_dorm)
        tables[s] = t
        _, wh, fork, dom, h = d[f"shape{s}"]
        n = int(mt.filter(pl.col("season") == s)["metamers"][0])
        print(f"| {s} | {wh:.2f} | {fork:.2f} | {dom:.1f} | {h:.0f} | {n} | {t.filter(pl.col('band') >= 8)['leafShare'].sum():.2f} | "
              f"{' '.join(f'{x:.2f}' for x in d[f'profile{s}'])} |")
    for s, t in tables.items():
        print(f"\n## at {s}: {cap.check(mt, int(t['aborted10'].sum()), range(s - 9, s + 1))}\n")
        print(cap.md(t))
    shed = out / "shed.csv"
    with shed.open("w") as f:
        subprocess.run([str(SHED_LOG), str(raw / "run.json"), "100"], stdout=f, check=True)
    sh = pl.read_csv(shed).with_columns((pl.col("pB") / (pl.col("mSap") + pl.col("mLeaf"))).alias("PoverM"),
                                        (pl.col("mSap") / (pl.col("mSap") + pl.col("mLeaf"))).alias("sapShare"))
    print(f"\n## shed branches, seasons 1–100: {sh.height} branches, {sh['metamers'].sum()} metamers "
          f"(metrics' shed {int(mt['shed'].sum())})\n")
    print("| shed because | branches | metamers | size | P_b | M_b sapwood | M_b foliage | P_b/M_b | sapwood share | "
          "leaf area | light at buds | Q_b/n_b | T_rel·Q_top | path length |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for label, g in [*sorted(sh.group_by("why"), key=lambda kv: kv[0][0]), (("all",), sh)]:
        med = lambda c: g[c].median()
        print(f"| {label[0]} | {g.height} | {g['metamers'].sum()} | {med('metamers'):.0f} | {med('pB'):.3f} | {med('mSap'):.3f} | "
              f"{med('mLeaf'):.3f} | {med('PoverM'):.2f} | {med('sapShare'):.1%} | {med('leafArea'):.2f} | {med('budQ'):.3f} | "
              f"{med('lightPerMetamer'):.3f} | {med('qTopThreshold'):.3f} | {med('pathLen'):.0f} |")
    (cells / "hand.npz").unlink(missing_ok=True)
    (cells / "hand.npz").symlink_to(cells / f"{args.name}.npz")
    for s in sweep.SEASONS:
        print(grid.draw_cells(s, [[(args.name, args.name, None)]], (f"{sp}, {args.name}, season {s} (lone tree, seed 1)",
                              f"assign {args.assign}"), args.name, {}, cells,
                              f"fitted-cap.py {args.results} --name {args.name}",
                              FIGURES / f"2026-10-31-fitted-cap-{args.name}-{s}.png", ref_title=args.name))


if __name__ == "__main__":
    main()
