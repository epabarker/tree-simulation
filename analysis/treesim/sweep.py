"""Run many headless simulations in parallel. Each run is its own Node process, so threads suffice."""

from __future__ import annotations

import json
import os
import subprocess
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]


@dataclass
class Run:
    """One CLI invocation. `out` is relative to the repo root, e.g. "runs/m2-lambda/l0.46-seed1"."""

    out: str
    preset: str = "explosion"
    seed: int = 1
    seasons: int = 30
    patch: dict = field(default_factory=dict)
    snapshots: list[int] = field(default_factory=list)
    light: bool = False  # also write light.csv (per-cell shade) at the snapshot seasons
    # {species: patch}, each merged into that species' groups (a "species" entry in `patch`
    # replaces the species' whole patch instead); M26
    species_patch: dict = field(default_factory=dict)


def run_one(run: Run) -> Path:
    cmd = [
        "node", "cli/run.ts",
        "--preset", run.preset,
        "--seed", str(run.seed),
        "--seasons", str(run.seasons),
        "--params", "-",
        "--out", run.out,
        "--quiet",
    ]
    if run.snapshots:
        cmd += ["--snapshots", ",".join(str(s) for s in run.snapshots)]
    if run.light:
        cmd.append("--light")
    if run.species_patch:
        cmd += ["--species-patch", json.dumps(run.species_patch)]
    subprocess.run(cmd, input=json.dumps(run.patch), text=True, cwd=REPO, check=True)
    return REPO / run.out


def run_many(runs: list[Run], workers: int | None = None) -> list[Path]:
    with ThreadPoolExecutor(workers or os.cpu_count() or 4) as pool:
        return list(pool.map(run_one, runs))
