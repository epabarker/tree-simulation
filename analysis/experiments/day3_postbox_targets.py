"""Data-only registered new-species Tallo targets; no old targets or models changed.
uv run --project analysis python analysis/experiments/day3_postbox_targets.py
"""
import json,math
from pathlib import Path
import numpy as np
import polars as pl
from treesim import tallo
from treesim.provenance import file_hash,provenance
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'runs/day3-step8/species';DEST=ROOT/'analysis/fit/sources/day3-postbox-tallo.json'

def main():
    OUT.mkdir(parents=True,exist_ok=True);old=file_hash(tallo.TARGETS);df=tallo.load();rng=np.random.default_rng(20261108);species={}
    for name,taxon in [('sycamore','Acer pseudoplatanus'),('ash','Fraxinus excelsior')]:
        curves={}
        for trait,col in tallo.TRAITS.items():
            d=df.filter((pl.col('species')==taxon)&(pl.col(tallo.OUTLIER[trait])=='N')&(pl.col(col)>0)&(pl.col('stem_diameter_cm')>0)).select('species','reference_id',pl.col('stem_diameter_cm').alias('dbh'),pl.col(col).alias('y'))
            if len(d)<max(tallo.SMALL_N if trait=='H' else 30,30):raise RuntimeError(f'{name}/{trait} sparse: {len(d)}; no unregistered borrowing')
            curves[trait]=tallo.fit_curve(d,False,rng)
        if not curves['H']['support'][0]<=40<=curves['H']['support'][1]:raise RuntimeError('registered40cm anchor outside support')
        joint=df.filter((pl.col('species')==taxon)&(pl.col('height_outlier')=='N')&(pl.col('crown_radius_outlier')=='N')&(pl.col('height_m')>0)&(pl.col('crown_radius_m')>0)&(pl.col('stem_diameter_cm')>0))
        zs=[]
        for dbh,h,c in joint.select('stem_diameter_cm','height_m','crown_radius_m').iter_rows():
            a=tallo.z_score(curves['H'],dbh,h);b=tallo.z_score(curves['CR'],dbh,c)
            if a is not None and b is not None and math.isfinite(a) and math.isfinite(b):zs.append((a,b))
        if len(zs)<30:raise RuntimeError(f'{name} only{len(zs)}joint support rows')
        a=np.array(zs);control=tallo.control(a[:,0],a[:,1],rng);control={k:v for k,v in control.items() if not k.startswith('_')}
        q=np.exp(tallo.predict(curves['H'],40)[0]);curves.update(control=control,gated=control['self_consistency']['ok'],taxon=taxon,joint_rows=len(zs),height_anchor_dbh_cm=40,height_anchor_m=q.tolist(),initial_maturity_cells=float(q[1]/.25),initial_fRep=.8)
        species[name]=curves;print(name,'H/CR',curves['H']['n'],curves['CR']['n'],'joint',len(zs),'height',q.tolist(),'maturity',curves['initial_maturity_cells'],'control',control['self_consistency'],flush=True)
    assert old==file_hash(tallo.TARGETS)
    report={'source':provenance(ROOT),'Tallo_sha256':file_hash(tallo.TALLO),'frozen_old_targets_sha256':old,'instrument_sha256':file_hash(ROOT/'analysis/treesim/tallo.py'),'runner_sha256':file_hash(__file__),'region':tallo.REGION,'rng':20261108,'species':species,'scope':'Separate candidate targets; frozen old species and sycamore reference-only record unchanged.'}
    DEST.write_text(json.dumps(report,indent=1)+'\n');(OUT/'targets-manifest.json').write_text(json.dumps({'target_sha256':file_hash(DEST),'source':report['source']},indent=2)+'\n')

if __name__=='__main__':main()
