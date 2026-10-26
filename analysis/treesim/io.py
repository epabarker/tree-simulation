"""Load CLI output (runs/<id>/run.json, metrics.csv, metamers.csv) into polars."""

from __future__ import annotations

import json
from pathlib import Path

import polars as pl


def load_run(path: str | Path) -> dict:
    """One run: {"run": name, "meta", "params", "events", "metrics": DataFrame, "metamers": DataFrame}."""
    path = Path(path)
    record = json.loads((path / "run.json").read_text())
    return {
        "run": path.name,
        "meta": record["meta"],
        "params": record["params"],
        "events": record["events"],
        # Infer column types from the whole file: a column can start as whole numbers.
        "metrics": pl.read_csv(path / "metrics.csv", infer_schema_length=None),
        "metamers": pl.read_csv(path / "metamers.csv", infer_schema_length=None),
    }


def load_runs(root: str | Path, table: str = "metrics") -> pl.DataFrame:
    """Concatenates one table over every run under `root`, adding `run` and `seed` columns."""
    frames = []
    for run_json in sorted(Path(root).rglob("run.json")):
        run = load_run(run_json.parent)
        frames.append(
            run[table].with_columns(
                pl.lit(run["run"]).alias("run"),
                pl.lit(run["params"]["seed"]).alias("seed"),
            )
        )
    if not frames:
        raise FileNotFoundError(f"no run.json under {root}")
    # Columns can infer as Int64 in one run and Float64 in another; relax to the supertype.
    return pl.concat(frames, how="diagonal_relaxed")
