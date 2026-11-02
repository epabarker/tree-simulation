"""The oak in the garden itself (the user's garden world, the phone's 66-cell plate, seeds 10, 2, 3,
100 seasons, storms on): does an oak variant stand to 100, and how tall and slender is it? Track C
saw the "held" oak (dLambda 0.04) thrown at seed 10 by 92 (H 119, H/D 84: ADR 0027's windthrow
ramp starts at 80) where today's stands (H 97, H/D 47). Variants keep "held" and add girth or a
height ceiling. Reads every planted oak's fate.

    node docs/experiments/code/2026-11-01-fresh-look-beech/garden-params.ts runs/overrides/garden garden 66 10,2,3
    uv run --project analysis python docs/experiments/code/2026-11-02-overrides/oak-garden.py runs/overrides/garden
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import polars as pl

REPO = Path(__file__).resolve().parents[4]
TREESIM = Path(os.environ.get("TREESIM", REPO / "rust" / "target" / "release" / "treesim"))
PICK = {"r2": {"levels": None}}  # the adopted pick is in the build already
HELD = {"r2": {"dLambda": 0.04}}
VARIANTS = {
    "today": None,
    "held": HELD,
    "held-r0x15": {"r2": {"dLambda": 0.04}, "c6": {"r0": 0.004236}},
    "held-r0x2": {"r2": {"dLambda": 0.04}, "c6": {"r0": 0.005648}},
    "held-lh25": {"r2": {"dLambda": 0.04}, "r1": {"Lh": 25}},
}
SNAP = ",".join(str(s) for s in range(10, 101, 10))


def run(params: Path, name: str, patch) -> Path:
    out = params.parent / name / params.stem
    if not (out / "metrics.csv").exists():
        cmd = [str(TREESIM), "--preset", "mixedWood", "--params", str(params), "--seasons", "100",
               "--snapshots", SNAP, "--quiet", "--out", str(out)]
        if patch:
            cmd += ["--species-patch", json.dumps({"oak": patch})]
        subprocess.run(cmd, check=True)
    return out


def main() -> None:
    root = Path(sys.argv[1])
    files = sorted(root.glob("*.json"))
    jobs = [(f, n, p) for n, p in VARIANTS.items() for f in files]
    with ThreadPoolExecutor(4) as ex:
        list(ex.map(lambda j: run(*j), jobs))
    rows = []
    for f in files:
        planted = len(json.loads(f.read_text())["trees"])
        for name in VARIANTS:
            m = pl.read_csv(root / name / f.stem / "metrics.csv", infer_schema_length=None)
            oaks = m.filter((pl.col("species") == "oak") & (pl.col("tree") < planted))
            for (tree,), t in oaks.group_by(["tree"], maintain_order=True):
                t = t.sort("season")
                at = lambda s, c: float(t.filter(pl.col("season") == s)[c][0]) if (t["season"] == s).any() else None
                last = t.filter(pl.col("alive") == 1)["season"].max()
                rows.append({"world": f.stem, "variant": name, "tree": tree,
                             "alive at 100": int(at(100, "alive") or 0), "last alive": last,
                             "H 60": at(60, "height"), "H/D 60": at(60, "slenderness"),
                             "H 100": at(100, "height"), "H/D 100": at(100, "slenderness"),
                             "H/D max": float(t.filter(pl.col("alive") == 1)["slenderness"].max())})
    df = pl.DataFrame(rows)
    df.write_csv(root / "oak-garden.csv")
    with pl.Config(tbl_rows=60, tbl_width_chars=180):
        print(df.sort("world", "variant", "tree"))
        print(df.group_by("variant", maintain_order=True).agg(pl.len().alias("oaks"), pl.col("alive at 100").sum(),
              pl.col("H 100").median().round(0), pl.col("H/D 100").median().round(0), pl.col("H/D max").median().round(0)))


if __name__ == "__main__":
    main()
