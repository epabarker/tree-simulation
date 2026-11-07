"""bole.py TAG... : ADR 0044's bole read on comparable trees: the stand at 100, trees with H >= 0.8 x their seed's tallest
and with a limb (limbCrownRatio > 0); also the suppressed rest, separately."""
import sys, glob, importlib.util
from pathlib import Path
import polars as pl
W = "/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170"
D = "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1/stand"
spec = importlib.util.spec_from_file_location("sd", W + "/docs/experiments/code/2026-11-02-beech-round2/stand-diagnosis.py")
sd = importlib.util.module_from_spec(spec); spec.loader.exec_module(sd)
for tag in sys.argv[1:]:
    rows = []
    for run in sorted(glob.glob(f"{D}/runs/stand-{tag}-s*")):
        r = sd.tree_rows(Path(run) / "run")
        top = max(x["height"] for x in r)
        for x in r:
            rows.append({**x, "seed": run, "dominant": x["height"] >= 0.8 * top, "limbed": x["limbCrownRatio"] > 0})
    df = pl.DataFrame(rows)
    for name, sel in (("dominant, limbed", df.filter(pl.col("dominant") & pl.col("limbed"))),
                      ("suppressed or limbless", df.filter(~(pl.col("dominant") & pl.col("limbed"))))):
        if sel.height == 0:
            print(f"{tag:5s} {name}: none"); continue
        print(f"{tag:5s} {name:22s}: trees {sel.height:3d}  leaf below limb base med {sel['leaf below limb base'].median():.3f} "
              f"mean {sel['leaf below limb base'].mean():.3f} p90 {sel['leaf below limb base'].quantile(0.9):.3f}; on trunk med "
              f"{sel['of it, on the trunk'].median()}; H med {sel['height'].median()*0.25:.1f} m; limbCR med {sel['limbCrownRatio'].median():.2f}")
