"""standsum.py TAG... : the beech closed stand at 100 (ADR 0044's bole read: stand-diagnosis.py's tree_rows) and its
crown base at 100/150 (limbs_rows.py cbG; soft band 0.10-0.56), survival of the 12 trees at 150."""
import sys, glob, json, importlib.util, subprocess
from pathlib import Path
import polars as pl
W = "/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170"
D = "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1/stand"
spec = importlib.util.spec_from_file_location("sd", W + "/docs/experiments/code/2026-11-02-beech-round2/stand-diagnosis.py")
sd = importlib.util.module_from_spec(spec); spec.loader.exec_module(sd)
cb = pl.DataFrame(json.loads(subprocess.run([sys.executable, "-I", D + "/limbs_rows.py", D], capture_output=True, text=True, check=True).stdout))
for tag in sys.argv[1:]:
    rows = []; alive = tot = 0; guard = 0; nseed = 0; gl = []
    for run in sorted(glob.glob(f"{D}/runs/stand-{tag}-s*")):
        rows += sd.tree_rows(Path(run) / "run")
        m = pl.read_csv(run + "/run/metrics.csv", columns=["season", "tree", "alive", "slenderness"])
        m150 = m.filter(pl.col("season") == 150)
        alive += m150["alive"].sum(); tot += m150.height
        # ADR 0044's ecology guard (the beech round 2 plan): at 100, alive >= 10 of 12, floor 3-5%, LAI 6-8, middle-row H/D 70-110
        m100 = m.filter(pl.col("season") == 100)
        l = pl.read_csv(run + "/run/light.csv", schema_overrides={"lad": pl.Float64, "shade": pl.Float64}).filter(pl.col("season") == 100)
        floor = 1 - l.filter(pl.col("row") == 0)["shade"].mean()
        lai = l.group_by("col").agg(pl.col("lad").sum())["lad"].mean()
        hd = m100.filter(pl.col("tree").is_in([4, 5, 6, 7]) & (pl.col("alive") == 1))["slenderness"].median()
        a100 = m100["alive"].sum()
        ok = a100 >= 10 and 0.03 <= floor <= 0.05 and 6 <= lai <= 8 and hd is not None and 70 <= hd <= 110
        guard += ok; nseed += 1; gl.append((a100, round(floor, 3), round(lai, 1), round(hd or 0)))
    df = pl.DataFrame(rows)
    c = cb.filter(pl.col("arg") == tag)
    c100 = c.filter(pl.col("season") == 100)["cbG"]; c150 = c.filter(pl.col("season") == 150)["cbG"]
    inb = lambda s: f"{((s >= 0.10) & (s <= 0.56)).sum()}/{len(s)}"
    print(f"{tag}: trees {df.height}, leaf below limb base med {df['leaf below limb base'].median():.3f} p90 {df['leaf below limb base'].quantile(0.9):.3f}; "
          f"of it on trunk med {df['of it, on the trunk'].median():.2f}, short shoots {df['of it, short shoots'].median():.2f}; "
          f"limbCR med {df['limbCrownRatio'].median():.2f}; cbG med 100 {c100.median():.2f} ({inb(c100)} in band), 150 {c150.median():.2f} ({inb(c150)}); alive@150 {alive}/{tot}")
    import statistics as st
    print(f"   ecology guard at 100: {guard}/{nseed} seeds; medians alive {st.median(g[0] for g in gl)}, floor {st.median(g[1] for g in gl):.3f}, "
          f"LAI {st.median(g[2] for g in gl):.1f}, H/D {st.median(g[3] for g in gl)}")
