"""Batch runs and analysis for the tree simulation.

The simulation itself lives in TypeScript (src/core); this package runs it headless through
`node cli/run.ts` and loads the CSV it writes into polars.
"""

from treesim.io import load_run, load_runs
from treesim.sweep import REPO, Run, run_many, run_one

__all__ = ["REPO", "Run", "load_run", "load_runs", "run_many", "run_one"]
