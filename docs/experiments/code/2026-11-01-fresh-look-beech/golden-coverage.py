"""Which of the round's rules a golden case exercises (review, 2026-11-01).

Runs each beech golden case natively as it stands and with one rule switched off at a time; a rule
is exercised by the case if switching it off changes the case's final state hash. The "absent"
row checks the other direction: with every rule off the case must still run.

    uv run --project analysis python docs/experiments/code/2026-11-01-fresh-look-beech/golden-coverage.py
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
TREESIM = Path(os.environ.get("TREESIM", REPO / "rust" / "target" / "release" / "treesim"))

CASES = [("beechOpen", 1, 40), ("beechWood", 1, 30)]
RULES = {
    "relay gate (ADR 0039)": {"r2": {"relayCrowd": None}},
    "vigour fork + arm hold (ADR 0040)": {"r2": {"forkAt": 0}},
    "vigour drop (ADR 0041)": {"r2": {"vigourShare": 0}},
    "light orthotropy (ADR 0042)": {"r2": {"lightSetPoint": None}},
    "own-crown pruning (ADR 0043)": {"c5": {"Tvig": 0}},
}


def run(preset: str, seed: int, seasons: int, patch: dict | None) -> tuple[str, float]:
    with tempfile.TemporaryDirectory() as d:
        cmd = [str(TREESIM), "--preset", preset, "--seed", str(seed), "--seasons", str(seasons),
               "--quiet", "--out", d]
        if patch:
            cmd += ["--species-patch", json.dumps({"beech": patch})]
        t = time.time()
        subprocess.run(cmd, check=True)
        return (Path(d) / "hash.txt").read_text().strip(), time.time() - t


def main() -> None:
    for preset, seed, seasons in CASES:
        base, secs = run(preset, seed, seasons, None)
        print(f"{preset}:seed{seed}:s{seasons}  hash {base}  ({secs:.1f} s natively)")
        for name, patch in RULES.items():
            h, _ = run(preset, seed, seasons, patch)
            print(f"  off: {name:36} {h}  {'EXERCISED' if h != base else 'not exercised'}")


if __name__ == "__main__":
    main()
