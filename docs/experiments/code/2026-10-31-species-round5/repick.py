"""Round 5 under ADR 0032: the re-pick by the user's rule of 2026-11-01 (morning), replacing
grid-stand.py's stand-first rule, which picked columns.

The candidates are every cell of `form-grid.py --tag <tag>`'s grid and round 2's form (FITTED_FLORA's
three knobs, grid.json's "hand"). Each one's closed stand is grid-stand.py's (seed 1, to 100). The
runs kept only metrics.csv, so each is replayed with `--light --snapshots 100`. That is the same
run, and its hash must equal the stored one. It is read for the LAI and the floor over the whole
ring (the mean over the ground cells of ground.csv: metrics' `lai` and `groundLight`, as the lab
panel reads them). The rule:
0. the guard (the user, 2026-11-01): a candidate is out if its lone tree at 100 has W/H under 0.3
   or over 2.5, or height ≥ 190 (the ceiling), or its stand's living limb crown ratio is under 0.2
   (without it, the floor test picked maple's pole, rowan's column and holly's 32-cell mat);
1. the middle row (trees 4–7) is alive ≥ 0.8 at 100, and the stand's LAI is inside the species'
   `stand.lai` band (willow, rowan and holly have no LAI target, so for them this half is empty);
2. among those, the floor nearest the species' measured (or described) `floor`;
3. ties only (floors within 0.002 of the best) go to the deepest living crown, then the lone outline.
If no candidate passes 1, the ones alive ≥ 0.8 with the LAI nearest the band go to 2, and the pick
is flagged. `--pick CELL` takes a named candidate instead (the user's choice: it must pass 0).

    uv run --project analysis python docs/experiments/code/2026-10-31-species-round5/repick.py hornbeam [--tag=-adr32] [--workers 12]

writes runs/form-grid<tag>/<species>/repick.csv and pick.json (write-picks.py and form-picks.py
--from-grid read it), and prints the ranked table.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import polars as pl

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("grid_stand", HERE / "grid-stand.py")
gs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gs)
cap, grid, sweep, REPO = gs.cap, gs.grid, gs.sweep, gs.REPO
TIE = 0.002
GUARD = {"wh": (0.3, 2.5), "ceiling": 190, "crown": 0.2}


def replay(species: str, patch: dict, stored: Path, out: Path) -> tuple[float, float, float, float | None, float]:
    """The stand at seed 1 to 100 with the ground written: LAI, floor, alive, crown ratio, top."""
    params = {"world": gs.STAND, "trees": [{**t, "species": species} for t in cap.STAND_TREES],
              "species": {species: patch}}
    if not (out / "ground.csv").exists():
        out.mkdir(parents=True, exist_ok=True)
        subprocess.run([str(sweep.TREESIM), "--preset", "oakOpen", "--params", "-", "--seed", "1", "--seasons", "100",
                        "--light", "--snapshots", "100", "--quiet", "--out", str(out)],
                       input=json.dumps(params), text=True, check=True)
        for f in ("metamers.csv", "form.csv", "buds.csv"):
            (out / f).unlink(missing_ok=True)
    if stored.exists() and (stored / "hash.txt").read_text().strip() != (out / "hash.txt").read_text().strip():
        raise SystemExit(f"{out}: the replay's hash differs from {stored}'s")
    g = pl.read_csv(out / "ground.csv", infer_schema_length=None).filter(pl.col("season") == 100)
    m = pl.read_csv(out / "metrics.csv", infer_schema_length=None).filter(pl.col("season") == 100)
    mid = m.filter(pl.col("tree").is_in(cap.MEASURED))
    living = mid.filter(pl.col("alive") == 1)
    cr = float(living["limbCrownRatio"].mean()) if living.height else None
    top = float(m.filter(pl.col("alive") == 1)["height"].max())
    return float(g["lai"].mean()), float(g["q"].mean()), living.height / len(cap.MEASURED), cr, top


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("species")
    ap.add_argument("--tag", default="-adr32")
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--pick", help="a named candidate (the user's choice) in place of the rule's")
    args = ap.parse_args()
    sp = args.species
    cells = REPO / "runs" / f"form-grid{args.tag}" / sp
    g = json.loads((cells / "grid.json").read_text())
    knobs = [(p, vs) for p, vs in g["knobs"]]
    spec = tomllib.loads((REPO / "analysis" / "fit" / "targets" / f"{sp}.toml").read_text())
    fixed = spec.get("fixed", {})
    lai_t = next((t for t in spec.get("trait", []) if t["name"] == "stand.lai"), None)
    floor_t = spec["holdout"]["floor"]
    brief = {t["name"]: t for t in spec.get("report", [])}
    stand = pl.read_csv(cells / "stand.csv")
    cands = {r["cell"]: {p: vs[int(i)] for (p, vs), i in zip(knobs, r["cell"].split("-"))}
             for r in stand.iter_rows(named=True)}
    cands["round2"] = dict(g["hand"])
    ev = grid.Evaluator()
    try:
        patches = {c: ev.ask({"amend": sp, "assign": {**fixed, **a}})["patch"] for c, a in cands.items()}
    finally:
        ev.close()
    sweep_dir = REPO / "runs" / f"form-sweep{args.tag}" / sp
    with ThreadPoolExecutor(args.workers) as pool:
        got = dict(zip(cands, pool.map(lambda c: replay(sp, patches[c], cells / f"stand-{c}", cells / f"light-{c}"),
                                       cands)))
    # Round 2's lone tree for its outline and H: the form picks' reference (form-picks.py's round2-1).
    lone = {r["cell"]: (r["outline"], r["H100"], r["wh100"]) for r in stand.iter_rows(named=True)}
    r2 = REPO / "runs" / f"form-picks{args.tag}" / sp / "round2-1.npz"
    if r2.exists():
        import numpy as np
        d = np.load(r2)
        lone["round2"] = (gs.outline(d, brief), float(d["shape100"][4]), float(d["shape100"][1]))
    else:
        lone["round2"] = (float("nan"), float("nan"), float("nan"))
    rows = []
    for c, a in cands.items():
        lai, floor, alive, cr, top = got[c]
        rows.append({"cell": c, **{grid.SHORT.get(p, p): v for p, v in a.items()}, "alive100": alive,
                     "lai": lai, "floor": floor, "crownRatio100": cr, "standTop": top,
                     "outline": lone[c][0], "loneH100": lone[c][1], "loneWH100": lone[c][2]})
    t = pl.DataFrame(rows, infer_schema_length=None)
    lo, hi = (lai_t["target"] - lai_t["band"], lai_t["target"] + lai_t["band"]) if lai_t else (-1e9, 1e9)
    t = t.with_columns(
        laiOut=pl.max_horizontal(pl.lit(lo) - pl.col("lai"), pl.col("lai") - pl.lit(hi), pl.lit(0.0)),
        floorDist=(pl.col("floor") - floor_t["target"]).abs())
    lo_wh, hi_wh = GUARD["wh"]
    t = t.with_columns(guard=pl.col("loneWH100").is_between(lo_wh, hi_wh) & (pl.col("loneH100") < GUARD["ceiling"])
                       & (pl.col("crownRatio100").fill_null(0) >= GUARD["crown"]))
    t.write_csv(cells / "repick.csv")
    ok = t.filter(pl.col("guard") & (pl.col("alive100") >= 0.8))
    inband = ok.filter(pl.col("laiOut") == 0)
    flagged = inband.height == 0
    if flagged:
        inband = ok.filter(pl.col("laiOut") == ok["laiOut"].min())
    best = inband["floorDist"].min()
    near = inband.filter(pl.col("floorDist") <= best + TIE).sort(
        [pl.col("crownRatio100").fill_null(-1), "outline"], descending=[True, False])
    pick = near.row(0, named=True)
    rule = "repick.py (2026-11-01): the guard (lone W/H 0.3-2.5, H < 190, stand limb crown ratio >= 0.2), " \
           "then LAI in band, floor nearest, alive >= 0.8; crown and outline break ties"
    if args.pick:
        forced = t.filter(pl.col("cell") == args.pick)
        if forced.height == 0 or not forced["guard"][0]:
            raise SystemExit(f"{sp}: {args.pick} is not a candidate or fails the guard")
        print(f"(the rule's pick would be {pick['cell']}; taking {args.pick}, the user's choice)")
        pick, flagged = forced.row(0, named=True), False
        rule += f"; the user's choice (2026-11-01), {'round 2' if args.pick == 'round2' else 'cell ' + args.pick}"
    (cells / "pick.json").write_text(json.dumps(
        {"species": sp, "cell": pick["cell"], "assign": cands[pick["cell"]], "flagged": flagged,
         "rule": rule,
         "row": pick}, indent=1))
    pl.Config.set_tbl_rows(60)
    pl.Config.set_tbl_cols(20)
    pl.Config.set_tbl_width_chars(240)
    band = f"LAI {lai_t['target']} ± {lai_t['band']}" if lai_t else "no LAI target"
    print(f"# {sp}: {t.height} candidates; {band}; floor {floor_t['target']}; alive ≥ 0.8: "
          f"{t.filter(pl.col('alive100') >= 0.8).height}; passing the guard: {t['guard'].sum()}; in band: {0 if flagged else inband.height}; "
          f"pick {pick['cell']} {cands[pick['cell']]}{' (FLAGGED: none in the LAI band)' if flagged else ''}")
    print(t.sort(["laiOut", "floorDist"]).select(
        "cell", *[grid.SHORT.get(p, p) for p, _ in knobs], "alive100", "lai", "floor", "crownRatio100",
        "standTop", "loneH100", "loneWH100", "outline").head(12))
    print("round 2:", t.filter(pl.col("cell") == "round2").select("lai", "floor", "alive100", "crownRatio100").row(0))


if __name__ == "__main__":
    main()
