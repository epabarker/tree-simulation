import json, sys, numpy as np
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent)); sys.path.insert(0,"/home/edbarker/Documents/Projects/tree-simulation/analysis")
import reg, run_real, run_sim
from multiprocessing import Pool
from treesim import qsm, coarsen as co
import numpy as np
from treesim import cylinders as cy
cfg = (float(sys.argv[1]), float(sys.argv[2]))  # site gap, ins win
def jr(r):
    reg.INS_WIN = cfg[1]
    c = qsm.read(r["path"]).cylinders
    c = co.coarsen(c, co.Resolution(run_real.D_MIN,(),()), inflated=False)
    o = reg.regularity(c, site_gap=cfg[0]); o.update(species=r["species"], set=r["set"], h=r["height"], dbh=r["dbh"]); return o
def js(r):
    reg.INS_WIN = cfg[1]
    t = json.load(open(run_sim.T / f"{r['tid']}.json")); rad=np.array(t["radius"])
    c = cy.Cylinders(np.array(t["start"]),np.array(t["axis"]),np.array(t["length"]),rad,rad,np.array(t["parent"]))
    o = reg.regularity(c, site_gap=cfg[0]); o.update(cfg=r["cfg"], regime=r["regime"]); return o
if __name__=="__main__":
    cat=json.load(open(run_real.S/"a9/work/catalogue.json"))
    sel=[r for r in cat if r["species"]=="Carpinus betulus" and r.get("dbh",0)>=0.10 and 12<=r["height"]<=22]
    sims=[]
    for f in sorted((run_real.S/"a9/work/sims").glob("R*.idx.json")): sims+=[r for r in json.load(open(f)) if r["cfg"] in ("R0","R1","R2","R3","R4") and r["regime"]=="lone"]
    with Pool(10) as p: a=p.map(jr,sel); b=p.map(js,sims)
    for d in ["spacingCV","attachPerM","insertSD","elevSD","curvPersist","earlyFork"]:
        rv=np.array([x[d] for x in a if x[d]==x[d]])
        s=" ".join(f"{c}:{np.nanmedian([x[d] for x in b if x['cfg']==c]):.2f}" for c in ("R0","R1","R2","R3","R4"))
        print(cfg, d, f"real {np.median(rv):.2f} sd {rv.std(ddof=1):.2f} |", s)
