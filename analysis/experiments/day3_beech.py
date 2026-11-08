"""Step8 current-beech training-only screen, retained raw dumps, no held-out scoring.
uv run --project analysis python analysis/experiments/day3_beech.py pilot|remaining|analyse
"""
import argparse,json,time
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from treesim import level1 as l1
from treesim.fit_level1 import Pool
from treesim.provenance import provenance,file_hash
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'runs/day3-step8/beech'
REG=ROOT/'analysis/fit/sources/day3-beech-v7.json'

def registration():
    reg=json.loads(REG.read_text())
    moved=[p for p,h in reg['hashes'].items() if file_hash(ROOT/p)!=h]
    if moved:raise RuntimeError(f'registration source moved: {moved}')
    if reg['source']['source_sha256']!=provenance(ROOT)['source_sha256']:raise RuntimeError('simulation source moved')
    if reg['wasm_sha256']!=file_hash(ROOT/'src/wasm/pkg/core_bg.wasm'):raise RuntimeError('WASM moved')
    if reg['current_input_sha256']!=file_hash(OUT/'current-inputs.json'):raise RuntimeError('inputs moved')
    return reg

def run(seeds,workers):
    reg=registration();raw=OUT/'current/raw';raw.mkdir(parents=True,exist_ok=True)
    tasks=[{'species':'beech','assign':{},'seeds':[s],'trials':['stand150'],
            'level1':{'scratch':str(raw),'key':f'current-s{s}','dumpSeasons':list(l1.DUMP_SEASONS)}} for s in seeds]
    for s in seeds:
        if (raw/f'reply-s{s}.json').exists():raise RuntimeError('refusing overwrite of measured seed')
    manifest={'source':provenance(ROOT),'registration_sha256':file_hash(REG),'runner_sha256':file_hash(__file__),'tasks':tasks,'workers':workers}
    (OUT/f'current/{"pilot" if len(seeds)==1 else "remaining"}-manifest.json').write_text(json.dumps(manifest,indent=1)+'\n')
    pool=Pool(workers);start=time.monotonic()
    try:replies=pool.map(tasks)
    finally:pool.close()
    for s,r in zip(seeds,replies):
        (raw/f'reply-s{s}.json').write_text(json.dumps(r)+'\n')
    timing={'N':len(seeds),'wall_seconds':time.monotonic()-start,'reported_cpu_seconds':sum(r.get('ms',0) for r in replies)/1000}
    (OUT/f'current/{"pilot" if len(seeds)==1 else "remaining"}-timing.json').write_text(json.dumps(timing,indent=2)+'\n')
    print(timing,flush=True)

def analyse():
    reg=registration();seeds=reg['day3_seeds']['training'];raw=OUT/'current/raw'
    replies=[json.loads((raw/f'reply-s{s}.json').read_text()) for s in seeds]
    sizes=[l1.seed_dbh(r['level1'][0]['allometry']) for r in replies]
    season=l1.match_season(sizes,reg['size_match']['dbh']);names=reg['fitted']
    report={'seeds':seeds,'assign':{},'season':season,'valid_dump_season':season in l1.DUMP_SEASONS,'training_only':True,'held_out_scored':False,'allometry':sizes}
    if season in l1.DUMP_SEASONS:
        jobs=[(r['level1'][0]['dumps'][str(season)],s,reg['d_min_m'],names) for s,r in zip(seeds,replies)]
        with ProcessPoolExecutor(8) as pool:parts=l1.describe_files(jobs,pool)
        trees=[t for part in parts for t in part]
        traits=l1.level1_traits(reg,trees,season,[])
        assert not any(f'l1.{h}.' in k for h in reg['held_out'] for k in traits)
        report.update(trees=len(trees),training_traits=traits,training_contributions=l1.level1_contributions(reg,traits))
        (OUT/'current/training-trees.json').write_text(json.dumps(trees,indent=1)+'\n')
    (OUT/'current/training-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['allometry','training_traits','training_contributions']}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['pilot','remaining','analyse']);a=p.parse_args()
    if a.mode=='analyse':analyse()
    else:run([21001] if a.mode=='pilot' else list(range(21002,21021)),1 if a.mode=='pilot' else 8)
