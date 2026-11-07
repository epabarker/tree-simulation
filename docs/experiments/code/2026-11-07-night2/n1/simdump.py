import sys, json, glob, os
sys.path.insert(0, "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/t")
sys.path.insert(0, "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/a11")
sys.path.insert(0, "/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170/analysis")
import numpy as np
from treesim import coarsen as co, cylinders as cy, simtree
from crown import crown
from reg import regularity
T = "/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/t/"
D_MIN = 0.008621381595730782
out = []
for f in sorted(glob.glob(sys.argv[1] + '/*.json')):
    for t in json.load(open(f))["trees"]:
        st = simtree.from_dump(t); raw = st.cylinders
        c = co.coarsen(raw, co.Resolution(D_MIN, (), ()), inflated=True)
        key = f"{t['species']}-{t['seed']}-{t['season']}"
        x = crown(c, key); x.update(regularity(c))
        # cross-check: a7's leafy-bud tips on the raw skeleton, front view along x only
        live = sorted(set(j for j, s in zip(t["b"]["metamer"], t["b"]["state"]) if s in (1, 2, 5)))
        bt = raw.tip[live]
        y = crown(raw, key, tips=bt, azimuths=[0.0])
        x.update(D_bud=y["D"], ratio_bud=y["shapeRatio"], WH_bud=y["WH"])
        x.update(species=t["species"], seed=t["seed"], season=t["season"], height=cy.height(raw), dbh=float(t["allometry"]["dbh"]), n=len(c))
        out.append(x)
pass
import collections
g = collections.defaultdict(list)
for x in out: g[(x["species"], x["season"])].append(x)
for k, v in sorted(g.items()):
    f = lambda key: f"{np.nanmedian([a[key] for a in v]):.2f}"
    print(k, len(v), "H", f("height"), "D", f("D"), "D_bud(a7)", f("D_bud"), "ratio", f("shapeRatio"), "ratio_bud", f("ratio_bud"), "WH", f("WH"), "WH_bud", f("WH_bud"), "cbH", f("cbH"))
