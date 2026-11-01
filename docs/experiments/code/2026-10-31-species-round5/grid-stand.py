"""Round 5 under ADR 0032: every grid cell's closed stand at 100, and a pick per species by the user's
overnight rule (2026-11-01): the stand first, then the lone outline.

For each cell of `form-grid.py --tag <tag>`'s grid (the same assignments: the targets file's [fixed],
the cell's three knobs, the other form knobs at round 2's), the closed stand (cli/trials.ts
standParams: four a row at 21, three rows staggered, periodic, τ 0) at seed 1 to 100, natively: the
middle row's (trees 4–7) share alive and the mean limb crown ratio of the living. The pick:
1. cells whose middle row is alive ≥ 0.8 at 100 (with four trees, all four);
2. among them, the deepest living crown (largest limb crown ratio), and every cell within 0.05 of it;
3. among those, the lone outline nearest the brief: the mean over 60 and 100 of the profile's RMS
   distance to the brief's `lone.profile` over its band, plus |W/H − lone.spread| over its band.
If no cell keeps its row ≥ 0.8, the cells with the most alive go to step 2 and the pick is flagged.

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/grid-stand.py hornbeam [--tag -adr32] [--workers 12]

writes runs/form-grid<tag>/<species>/stand.csv and pick.json, and prints the ranked table.
"""

from __future__ import annotations

import argparse
import importlib.util
import itertools
import json
import subprocess
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import polars as pl

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("cap", HERE / "cap.py")
cap = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cap)
grid, sweep, REPO = cap.grid, cap.sweep, cap.REPO
STAND = {"width": cap.STAND_WIDTH, "height": sweep.TOP, "walls": [], "sides": "periodic", "faces": [0, 0]}


def stand_run(species: str, patch: dict, out: Path) -> tuple[float, float | None]:
    """The middle row's share alive at 100 and its living trees' mean limb crown ratio."""
    if not (out / "metrics.csv").exists():
        out.mkdir(parents=True, exist_ok=True)
        params = {"world": STAND, "trees": [{**t, "species": species} for t in cap.STAND_TREES],
                  "species": {species: patch}}
        subprocess.run([str(sweep.TREESIM), "--preset", "oakOpen", "--params", "-", "--seed", "1", "--seasons", "100",
                        "--quiet", "--out", str(out)], input=json.dumps(params), text=True, check=True)
        for f in ("metamers.csv", "form.csv"):
            (out / f).unlink(missing_ok=True)
    m = pl.read_csv(out / "metrics.csv", infer_schema_length=None).filter(
        (pl.col("season") == 100) & pl.col("tree").is_in(cap.MEASURED))
    living = m.filter(pl.col("alive") == 1)
    return living.height / len(cap.MEASURED), (float(living["limbCrownRatio"].mean()) if living.height else None)


def outline(d, brief: dict) -> float:
    prof, spread = brief.get("lone.profile"), brief.get("lone.spread")
    terms = []
    for s in (60, 100):
        if prof:
            terms.append(float(np.sqrt(np.mean((d[f"profile{s}"] - np.array(prof["profile"])) ** 2))) / prof["band"])
        if spread:
            terms.append(abs(float(d[f"shape{s}"][1]) - spread["target"]) / spread["band"])
    return float(np.mean(terms)) if terms else float("nan")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("species")
    ap.add_argument("--tag", default="-adr32")
    ap.add_argument("--workers", type=int, default=12)
    args = ap.parse_args()
    sp = args.species
    cells = REPO / "runs" / f"form-grid{args.tag}" / sp
    knobs = [(p, vs) for p, vs in json.loads((cells / "grid.json").read_text())["knobs"]]
    spec = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    fixed = spec.get("fixed", {})
    brief = {t["name"]: t for t in spec.get("report", [])}
    ixs = list(itertools.product(*[range(len(vs)) for _, vs in knobs]))
    ev = grid.Evaluator()
    try:
        patches = {ix: ev.ask({"amend": sp, "assign": {**fixed, **{p: vs[i] for (p, vs), i in zip(knobs, ix)}}})["patch"]
                   for ix in ixs}
    finally:
        ev.close()
    with ThreadPoolExecutor(args.workers) as pool:
        stands = dict(zip(ixs, pool.map(lambda ix: stand_run(sp, patches[ix], cells / f"stand-{grid.key(ix)}"), ixs)))
    rows = []
    for ix in ixs:
        d = np.load(cells / f"{grid.key(ix)}.npz")
        alive, cr = stands[ix]
        rows.append({"cell": grid.key(ix), **{grid.SHORT.get(p, p): vs[i] for (p, vs), i in zip(knobs, ix)},
                     "alive100": alive, "crownRatio100": cr, "outline": outline(d, brief),
                     "wh60": float(d["shape60"][1]), "wh100": float(d["shape100"][1]),
                     "fork60": float(d["shape60"][2]), "H100": float(d["shape100"][4])})
    t = pl.DataFrame(rows)
    t.write_csv(cells / "stand.csv")
    ok = t.filter(pl.col("alive100") >= 0.8)
    flagged = ok.height == 0
    if flagged:
        ok = t.filter(pl.col("alive100") == t["alive100"].max())
    ok = ok.filter(pl.col("crownRatio100").is_not_null())
    best = ok["crownRatio100"].max()
    near = ok.filter(pl.col("crownRatio100") >= best - 0.05).sort("outline")
    pick = near.row(0, named=True)
    ix = tuple(int(c) for c in pick["cell"].split("-"))
    assign = {p: vs[i] for (p, vs), i in zip(knobs, ix)}
    (cells / "pick.json").write_text(json.dumps({"species": sp, "cell": pick["cell"], "assign": assign,
                                                 "flagged": flagged, "row": pick}, indent=1))
    pl.Config.set_tbl_rows(60)
    pl.Config.set_tbl_width_chars(200)
    print(f"# {sp}: {t.height} cells; alive ≥ 0.8 at 100: {t.filter(pl.col('alive100') >= 0.8).height}; "
          f"deepest living crown among them {best}; pick {pick['cell']} {assign}{' (FLAGGED: no cell ≥ 0.8)' if flagged else ''}")
    print(t.sort(["alive100", "crownRatio100"], descending=True, nulls_last=True).head(12))


if __name__ == "__main__":
    main()
