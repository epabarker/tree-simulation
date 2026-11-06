import sys, json
from pathlib import Path
from multiprocessing import Pool
S = Path("/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad")
sys.path.insert(0, str(S/"a11")); sys.path.insert(0, "/home/edbarker/Documents/Projects/tree-simulation/analysis")
import numpy as np, scipy.io as sio
from treesim import qsm, coarsen as co, cylinders as cy
from reg import regularity
D_MIN = 0.008621381595730782
BD = Path("/home/edbarker/Documents/Projects/tree-simulation/data/reference/biodiv")
def job(a):
    f, sp = a
    out = []
    try:
        d = sio.loadmat(f, squeeze_me=True, struct_as_record=False)
        qs = list(np.atleast_1d(d["QSMs"]))
        ks = qsm.optimum_set(qs)
        for k in ks:
            q = qsm._from_struct(qs[k], "treeqsm-2.4", k, len(qs))
            c = co.coarsen(q.cylinders, co.Resolution(D_MIN, (), ()), inflated=False)
            r = regularity(c); r.update(tree=f.name.removesuffix("_all.mat"), species=sp, model=int(k), height=cy.height(c), dbh=cy.dbh(c), n=len(c))
            out.append(r)
    except Exception as e:
        out.append(dict(tree=f.name, err=repr(e)[:200]))
    return out
if __name__ == "__main__":
    sp, nw = sys.argv[1], int(sys.argv[2])
    import csv
    lab = {r["treeID"]: r["species"] for r in csv.DictReader(open(BD/"labels.csv"))}
    want = "Fagus_sylvatica" if sp == "beech" else "Carpinus_betulus"
    fs = [(f, sp) for f in sorted((BD/"qsm-all/QSM/all").glob("*_all.mat")) if lab.get(f.name.removesuffix("_all.mat")) == want]
    print(len(fs), flush=True)
    with Pool(nw) as p: res = [r for rr in p.imap_unordered(job, fs) for r in rr]
    json.dump(res, open(S/f"a14/rep_{sp}.json", "w"))
    print(len(res), [r for r in res if "err" in r][:3])
