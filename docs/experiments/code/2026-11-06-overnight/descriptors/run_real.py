import sys, json, csv
from pathlib import Path
from multiprocessing import Pool
sys.path.insert(0, str(Path(__file__).parent))
sys.path.insert(0, "/home/edbarker/Documents/Projects/tree-simulation/analysis")
import numpy as np
from treesim import qsm, coarsen as co, cylinders as cy
from reg import regularity
S = Path("/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad")
D_MIN = 0.008621381595730782
cat = json.load(open(S / "a9/work/catalogue.json"))

def job(r):
    try:
        c = qsm.read(r["path"]).cylinders
        c = co.coarsen(c, co.Resolution(D_MIN, (), ()), inflated=False)
        out = regularity(c)
        out.update(tree=r["tree"], species=r["species"], set=r["set"], regime=r["regime"], height=cy.height(c), dbh=cy.dbh(c), n=len(c))
        return out
    except Exception as e:
        return dict(tree=r["tree"], err=str(e)[:200])

if __name__ == "__main__":
    sel = [r for r in cat if r["species"] in ("Carpinus betulus", "Fagus sylvatica") and "err" not in r and r.get("dbh", 0) >= 0.10]
    print(len(sel), flush=True)
    with Pool(10) as p: res = p.map(job, sel, chunksize=1)
    json.dump(res, open(Path(__file__).parent / "real.json", "w"))
    print([x for x in res if "err" in x][:3])
