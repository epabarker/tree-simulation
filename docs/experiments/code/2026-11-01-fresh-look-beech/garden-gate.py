"""The vigour gate in the garden and the mixed wood (review of the fresh-look beech, 2026-11-01).

ADR 0041–0043's gate g = clamp((v_base − 3000) / 7000) is in absolute units, so a beech at a plate's
edge or in a gap gets a partial response. This grows the garden's own worlds (garden-params.ts)
natively to 100 seasons with the round's beech and reads every beech's v_base and gate every 10
seasons, planted trees and recruits alike (recruits taller than 5 cells).

    node docs/experiments/code/2026-11-01-fresh-look-beech/garden-params.ts runs/fresh-look/garden garden 54 2,3,12,13
    node docs/experiments/code/2026-11-01-fresh-look-beech/garden-params.ts runs/fresh-look/garden garden 146 1,2,3,9,10
    node docs/experiments/code/2026-11-01-fresh-look-beech/garden-params.ts runs/fresh-look/garden mixedWood 0 1,2,3
    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/garden-gate.py runs/fresh-look/garden
    uv run … garden-gate.py runs/fresh-look/garden --off   # the same worlds, the round's rules off
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
LO, HI = 3000.0, 10000.0
SNAP = ",".join(str(s) for s in range(10, 101, 10))


#: The round's rules off for beech: the relay, the fork, the drop, light orthotropy, own-crown
#: pruning. (The level-0 curve stays at 30: the CLI's species patch cannot index into r2.levels.
#: With the relay and the fork off it can bend only R4's released pa-0 shoots.)
OFF = {"r2": {"relay": 0, "forkAt": 0, "vigourShare": 0, "lightSetPoint": None}, "c5": {"Tvig": 0}}


def off_patch() -> str:
    return json.dumps({"beech": OFF})


def run(params: Path, off: bool) -> Path:
    out = params.with_suffix("") if not off else params.parent / "off" / params.stem
    if not (out / "buds.csv").exists():
        cmd = [str(TREESIM), "--preset", "mixedWood", "--params", str(params), "--seasons", "100",
               "--snapshots", SNAP, "--light", "--quiet", "--out", str(out)]
        if off:
            cmd += ["--species-patch", off_patch()]
        subprocess.run(cmd, check=True)
    return out


def main() -> None:
    root = Path(sys.argv[1])
    off = "--off" in sys.argv
    files = sorted(root.glob("*.json"))
    with ThreadPoolExecutor(4) as ex:
        outs = list(ex.map(lambda f: run(f, off), files))
    rows = []
    for f, out in zip(files, outs):
        p = json.loads(f.read_text())
        planted = len(p["trees"])
        m = pl.read_csv(out / "metrics.csv", infer_schema_length=None).filter(
            (pl.col("species") == "beech") & (pl.col("alive") == 1) & (pl.col("height") > 5)
        )
        for (tree,), t in m.group_by(["tree"], maintain_order=True):
            t = t.sort("season")
            g = ((t["vBase"] - LO) / (HI - LO)).clip(0, 1)
            rows.append({
                "world": f.stem,
                "width": p["world"]["width"],
                "tree": tree,
                "planted": tree < planted,
                "x": round(float(t["rootX"][0]), 0),
                "seasons alive (of the snapshots)": t.height,
                "height at last": round(float(t["height"][-1]), 0),
                "vBase max": round(float(t["vBase"].max()), 0),
                "gate max": round(float(g.max()), 2),
                "gate at 40": round(float(g.filter(t["season"] == 40)[0]), 2) if (t["season"] == 40).any() else None,
                "gate at 100": round(float(g.filter(t["season"] == 100)[0]), 2) if (t["season"] == 100).any() else None,
                "partial (0 < gate max < 1)": 0 < float(g.max()) < 1,
            })
    df = pl.DataFrame(rows)
    df.write_csv(root / ("gate-off.csv" if off else "gate.csv"))
    with pl.Config(tbl_rows=200, tbl_cols=20, tbl_width_chars=220):
        print(df)
    s = df.group_by("planted").agg(
        pl.len().alias("beeches"),
        (pl.col("gate max") == 0).sum().alias("gate never opens"),
        pl.col("partial (0 < gate max < 1)").sum().alias("partial"),
        (pl.col("gate max") >= 1).sum().alias("fully open"),
    )
    print(s)


if __name__ == "__main__":
    main()
