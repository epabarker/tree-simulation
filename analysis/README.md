# Analysis

Python tools for batch runs. The simulation is TypeScript (`src/core`). This package runs it headless through `node cli/run.ts` and loads the CSV output into polars.

```bash
# from the repo root
uv run --project analysis python analysis/experiments/m0_growth.py
```

- `treesim.Run` and `treesim.run_many([...])` run the CLI in parallel, one Node process per run.
- `treesim.load_runs("runs/<experiment>")` loads a metrics table across runs, with `run` and `seed` columns; pass `table="metamers"` for geometry.
- `experiments/` holds one script per milestone or experiment. Each script recreates its own `runs/` folder, and figures go to `analysis/out/` (not committed).
- For notebooks: `uv run --project analysis --with jupyterlab jupyter lab`.

**R.** The same CSV files load with `readr::read_csv()`. R itself isn't installed yet; when it's needed, run `sudo dnf install R`.
