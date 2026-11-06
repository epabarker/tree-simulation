"""Load CLI output (runs/<id>/run.json, metrics.csv, metamers.csv, form.csv) into polars."""

from __future__ import annotations

import json
from pathlib import Path

import polars as pl


def load_run(path: str | Path) -> dict:
    """One run: {"run": name, "meta", "params", "events", and DataFrames "metrics", "metamers",
    "form" (crown form at the snapshot seasons; empty for runs written before M26)}."""
    path = Path(path)
    record = json.loads((path / "run.json").read_text())
    form = path / "form.csv"
    return {
        "run": path.name,
        "meta": record["meta"],
        "params": record["params"],
        "events": record["events"],
        # Infer column types from the whole file: a column can start as whole numbers.
        "metrics": pl.read_csv(path / "metrics.csv", infer_schema_length=None),
        "metamers": pl.read_csv(path / "metamers.csv", infer_schema_length=None),
        # NaN is written as "NaN" (no limbs to measure, say); read it as a float, not a string.
        "form": pl.read_csv(form, infer_schema_length=None) if form.exists() else pl.DataFrame(),
    }


def load_runs(root: str | Path, table: str = "metrics") -> pl.DataFrame:
    """Concatenates one table ("metrics", "metamers" or "form") over every run under `root`,
    adding `run` and `seed` columns."""
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
