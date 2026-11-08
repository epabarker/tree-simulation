"""Existing coarsening tiers rechecked on frozen current confirmation, no retuning.
uv run --project analysis python analysis/experiments/day3_beech_resolution.py
"""
import csv,json,math
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from treesim import level1 as l1,tiers,simtree
from treesim.provenance import file_hash
from day3_species_beech import registration,REG,ROOT
import phase1_degradation as pd
OUT=ROOT/'runs/day3-step8/beech/confirmation'

def main():
    reg=registration();v31path=ROOT/'analysis/fit/sources/phase1-tolerances.json';v32path=ROOT/'analysis/fit/sources/phase1-tolerances-v3.2.json'
    v31=json.loads(v31path.read_text());v32=json.loads(v32path.read_text());res=v31['resolution']['biodiv']
    points=tiers.evaluation_points({int(k):v for k,v in res['grid'].items()},res['d_min'],res['upper_end']['d']);versions=[n for n,d in points]
    table={r['descriptor']:r for r in v31['table'] if r['species']=='beech'};table.update({r['descriptor']:r for r in v32['table']})
    control_path=ROOT/'runs/phase1/control-grid.csv'
    controls={r['descriptor']:float(r['share']) for r in csv.DictReader(control_path.open()) if r['dataset']=='biodiv' and r['species']=='beech' and r['version']=='p2' and r['share'] not in ['', 'nan']}
    controls.update(v32['control']['dmin'])
    raw=OUT/'current/raw';seeds=reg['day3_seeds']['confirmation'];replies=[json.loads((raw/f'reply-s{s}.json').read_text()) for s in seeds]
    season=l1.match_season([l1.seed_dbh(r['level1'][0]['allometry']) for r in replies],reg['size_match']['dbh'])
    if season not in l1.DUMP_SEASONS:raise RuntimeError('unmatched current instrument')
    jobs=[];keys=[]
    for seed,r in zip(seeds,replies):
        for t in json.loads(Path(r['level1'][0]['dumps'][str(season)]).read_text())['trees']:
            if t['alive']:jobs.append((simtree.from_dump(t),points,res['d_min']));keys.append(seed)
    names=reg['fitted']+reg['held_out']+['leanAngle']
    (OUT/'resolution-manifest.json').write_text(json.dumps({'registration_sha256':file_hash(REG),'runner_sha256':file_hash(__file__),'v31_sha256':file_hash(v31path),'v32_sha256':file_hash(v32path),'controls_sha256':file_hash(control_path),'season':season,'seeds':seeds,'points':points,'trees':len(jobs)},indent=2)+'\n')
    with ProcessPoolExecutor(8) as ex:described=list(ex.map(pd._describe_tree,jobs))
    rows=[]
    for name in names:
        values={seed:{v:[] for v in [tiers.FINE,*versions,tiers.INFLATED]} for seed in seeds}
        for seed,d in zip(keys,described):
            for version in values[seed]:values[seed][version].append(pd._num(d[version].get(name)))
        expected=reg['descriptors'].get(name);tolerance=pd._num(table[name]['tolerance']);neutral=controls[name]
        a=tiers.tier_a(values,versions,tolerance);b=tiers.tier_b(values,versions,tolerance,pd.ct.neutral(neutral))
        rows.append({'descriptor':name,'expected':expected,'observed':'A' if a else 'B' if b else 'held out','pass':a if expected=='A' else a or b if expected=='B' else None,'counts_A':{v:tiers.seeds_within(values,v,tiers.FINE,tolerance) for v in [*versions,tiers.INFLATED]},'counts_B':{v:tiers.seeds_within(values,v,versions[0],tolerance) for v in [*versions[1:],tiers.INFLATED]},'tolerance':tolerance,'control_share':neutral})
    report={'rows':rows,'pass':all(r['pass'] for r in rows if r['expected'] is not None),'gate_N':18,'diagnostic':'leanAngle; no fit/gate promotion'}
    (OUT/'resolution.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report),flush=True)

if __name__=='__main__':main()
