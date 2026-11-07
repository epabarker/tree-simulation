import sys, json, glob, collections
sys.path.insert(0, "/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170/analysis")
import numpy as np
from treesim import simtree, cylinders as cy
g=collections.defaultdict(list)
for f in sorted(glob.glob(sys.argv[1]+"/*.json")):
    for t in json.load(open(f))["trees"]:
        st=simtree.from_dump(t); raw=st.cylinders
        g[(t["species"],t["season"])].append((cy.height(raw), len(t["m"]["parent"]), float(t["allometry"]["dbh"])))
for k,v in sorted(g.items()):
    if k[1] in (100,150):
        a=np.array(v); print(k, len(v), "H med %.1f [%.1f-%.1f]"%(np.median(a[:,0]),a[:,0].min(),a[:,0].max()), "metamers med %d"%np.median(a[:,1]), "DBH %.2f"%np.median(a[:,2]))
