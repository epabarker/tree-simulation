import sys, json, glob
from pathlib import Path
from multiprocessing import Pool
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, "/home/edbarker/Documents/Projects/tree-simulation/analysis")
import numpy as np
from treesim import cylinders as cy
from reg import regularity
S = Path("/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad")
T = S / "a9/render/t"

def job(r):
    try:
        t = json.load(open(T / f"{r['tid']}.json"))
        rad = np.array(t["radius"])
        c = cy.Cylinders(np.array(t["start"]), np.array(t["axis"]), np.array(t["length"]), rad, rad, np.array(t["parent"]))
        out = regularity(c)
        out.update({k: r[k] for k in ("tid", "cfg", "regime", "seed", "season", "height", "dbh", "n")})
        return out
    except Exception as e:
        return dict(tid=r["tid"], err=str(e)[:200])

if __name__ == "__main__":
    rows = []
    for f in sorted(glob.glob(str(S / "a9/work/sims/R*.idx.json"))):
        rows += [r for r in json.load(open(f)) if r["cfg"] in ("R0","R1","R2","R3","R4","R5")]
    print(len(rows), flush=True)
    with Pool(10) as p: res = p.map(job, rows, chunksize=4)
    json.dump(res, open(Path(__file__).parent / "sim.json", "w"))
    print([x for x in res if "err" in x][:3])
