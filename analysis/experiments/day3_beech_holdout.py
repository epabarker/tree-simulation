"""Frozen day3 beech current/winner held-out confirmation; no selection/refitting.
uv run --project analysis python analysis/experiments/day3_beech_holdout.py run|analyse|gallery
"""
import argparse,copy,json,math,time
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from treesim import level1 as l1,fit,gallery
from treesim.fit_level1 import Pool,level1_spec
from treesim.provenance import provenance,file_hash
from day3_species_beech import registration,REG,ROOT
OUT=ROOT/'runs/day3-step8/beech/confirmation';WIN=ROOT/'analysis/experiments/day3_beech_winner.json'

def site_gate(reg,trees,seeds,spread_names):
    assert len(seeds)==20 and len(set(seeds))==20 and len(reg['held_out'])==5
    rows=[]
    for seed in seeds:
        selected=[t for t in trees if t['seed']==seed]
        z=l1.seed_z(reg,selected,reg['held_out']);rows.append({'seed':seed,'N':len(selected),'z':z,'pass':l1.seed_passes(z)})
    spread=l1.spread_ratios(reg,trees,spread_names)
    stats={k:l1.score(l1.detrended(trees,k,reg['real'][k]['slope'],reg['size_match']['dbh']),reg['real'][k]) for k in spread_names}
    finite=all(s['n']>=l1.MIN_TREES and math.isfinite(s['z']) and math.isfinite(s['sd']) for s in stats.values())
    passed=sum(r['pass'] for r in rows)
    return {'passed':passed,'N':20,'bar':15,'per_seed':rows,'spread':spread,'spread_ok':l1.spread_passes(spread),'stats':stats,'finite':finite,'pass':passed>=15 and finite and l1.spread_passes(spread)}

def run():
    reg=registration();winner=json.loads(WIN.read_text());assert not winner['held_out_scored']
    seeds=reg['day3_seeds']['confirmation'];tasks=[]
    for name,assign in [('current',{}),('winner',winner['assign'])]:
        raw=OUT/name/'raw';raw.mkdir(parents=True,exist_ok=True)
        for seed in seeds:
            if (raw/f'reply-s{seed}.json').exists():raise RuntimeError('refusing held-out-seed overwrite')
            tasks.append((name,seed,{'species':'beech','assign':assign,'seeds':[seed],'trials':['stand150'],'level1':{'scratch':str(raw),'key':f'{name}-s{seed}','dumpSeasons':list(l1.DUMP_SEASONS)}}))
    (OUT/'manifest.json').write_text(json.dumps({'source':provenance(ROOT),'registration_sha256':file_hash(REG),'winner_sha256':file_hash(WIN),'runner_sha256':file_hash(__file__),'tasks':tasks,'workers':8},indent=1)+'\n')
    pool=Pool(8);start=time.monotonic()
    try:replies=pool.map([r for n,s,r in tasks])
    finally:pool.close()
    for (name,seed,r),reply in zip(tasks,replies):(OUT/name/f'raw/reply-s{seed}.json').write_text(json.dumps(reply)+'\n')
    timing={'wall_seconds':time.monotonic()-start,'summed_evaluator_elapsed_seconds':sum(r.get('ms',0) for r in replies)/1000}
    (OUT/'timing.json').write_text(json.dumps(timing,indent=2)+'\n');print(timing,flush=True)

def analyse():
    reg=registration();seeds=reg['day3_seeds']['confirmation'];report={}
    for name in ['current','winner']:
        raw=OUT/name/'raw';replies=[json.loads((raw/f'reply-s{s}.json').read_text()) for s in seeds]
        season=l1.match_season([l1.seed_dbh(r['level1'][0]['allometry']) for r in replies],reg['size_match']['dbh'])
        if season not in l1.DUMP_SEASONS:
            report[name]={'season':season,'pass':False,'reason':'unmatched'};continue
        names=reg['fitted']+reg['held_out'];jobs=[(r['level1'][0]['dumps'][str(season)],s,reg['d_min_m'],names) for s,r in zip(seeds,replies)]
        with ProcessPoolExecutor(8) as ex:parts=l1.describe_files(jobs,ex)
        trees=[t for part in parts for t in part];(OUT/name/'described-trees.json').write_text(json.dumps(trees,indent=1)+'\n')
        biodiv=site_gate(reg,trees,seeds,names)
        demolreg=copy.deepcopy(reg)
        for k,d in reg['demol']['descriptors'].items():demolreg['real'][k].update(d)
        demol=site_gate(demolreg,trees,seeds,list(reg['demol']['descriptors']))
        report[name]={'season':season,'trees':len(trees),'biodiv':biodiv,'demol':demol,'outside_BioDiv_dbh':sum(not reg['real_dbh_range_m'][0]<=t['dbh']<=reg['real_dbh_range_m'][1] for t in trees),'pass':biodiv['pass'] and demol['pass']}
    (OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({n:{'season':r['season'],'trees':r.get('trees'),'biodiv_passed':r.get('biodiv',{}).get('passed'),'biodiv_spread':r.get('biodiv',{}).get('spread_ok'),'demol_passed':r.get('demol',{}).get('passed'),'demol_spread':r.get('demol',{}).get('spread_ok'),'pass':r['pass']} for n,r in report.items()}),flush=True)

def shape():
    reg=registration();winner=json.loads(WIN.read_text());pool=fit.Pool(8)
    OUT.mkdir(parents=True,exist_ok=True)
    inputs={'source':provenance(ROOT),'winner_sha256':file_hash(WIN),'gallery_sha256':{str(p.relative_to(ROOT)):file_hash(p) for p in gallery.GALLERY.glob('beech-*.json')},'seeds':gallery.SEEDS}
    (OUT/'gallery-manifest.json').write_text(json.dumps(inputs,indent=2)+'\n')
    try:flag=gallery.shape_flag(pool,level1_spec('beech',reg),{'current':{},'winner':winner['assign']})
    finally:pool.close()
    (OUT/'gallery.json').write_text(json.dumps(flag,indent=2)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['run','analyse','gallery']);a=p.parse_args()
    {'run':run,'analyse':analyse,'gallery':shape}[a.mode]()
