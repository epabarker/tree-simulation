"""#138's re-probe on M: bar 6 (Tallo's crown at DBH, per species) and the stand H/D, read by #134's stand check
script (code/2026-11-16-beech-stand-check/stand.py, unchanged) on this probe's garden runs, each arm against M.

    uv run --project analysis python -I docs/experiments/code/2026-11-19-sapling-release-on-m/stand.py [-j 10]

Writes runs/138-dl-on-m/{measure/, summary.json, tables.md} through stand.py; prints the tables.
"""

import importlib.util
import multiprocessing
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("stand", HERE.parent / "2026-11-16-beech-stand-check" / "stand.py")
stand = importlib.util.module_from_spec(_spec)
sys.modules["stand"] = stand  # the pool's workers pickle stand.measure by its module's name
_spec.loader.exec_module(stand)

stand.ROOT = stand.REPO / "runs" / "138-dl-on-m"
stand.ARMS = tuple(a for a in ("M", "Mbh40", "Mdl40", "Mbh25") if (stand.ROOT / a).exists())
stand.BASELINE = {a: "M" for a in stand.ARMS if a != "M"}

if __name__ == "__main__":
    multiprocessing.set_start_method("fork", force=True)  # the workers keep this module's ROOT and ARMS
    stand.main()
