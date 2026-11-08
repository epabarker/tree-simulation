"""Fixed three-candidate current-physiology beech screen; held-outs never scored.
uv run --project analysis python analysis/experiments/day3_beech_screen.py pilot|remaining|analyse
"""
import argparse,json,time,math
from pathlib import Path
from concurrent.futures import ProcessPoolExecutor
from treesim import level1 as l1,fit
from treesim.fit_level1 import Pool,level1_spec,total,without_held_out,assert_no_held_out
from treesim.provenance import provenance,file_hash
from day3_species_beech import registration,REG,ROOT
OUT=ROOT/'runs/day3-step8/beech/screen'
CAND=ROOT/'analysis/experiments/day3_beech_candidates.json'

def tasks(reg,candidates):
    out=[]
    for name,assign in candidates.items():
        raw=OUT/name/'raw';raw.mkdir(parents=True,exist_ok=True)
        for seed in reg['day3_seeds']['training']:
            out.append((name,seed,{'species':'beech','assign':assign,'seeds':[seed],
              'trials':['lone','stand150','shade'],'level1':{'scratch':str(raw),'key':f'{name}-s{seed}','dumpSeasons':list(l1.DUMP_SEASONS)}}))
    return out

def run(mode):
    reg=registration();candidates=json.loads(CAND.read_text())['candidates'];jobs=tasks(reg,candidates)
    selected=jobs[:1] if mode=='pilot' else jobs[1:];workers=1 if mode=='pilot' else 8
    if mode=='remaining' and not (OUT/'current/raw/reply-s21001.json').exists():raise RuntimeError('pilot required')
    manifest={'source':provenance(ROOT),'registration_sha256':file_hash(REG),'candidate_sha256':file_hash(CAND),'runner_sha256':file_hash(__file__),'tasks':jobs,'selected':[(n,s) for n,s,r in selected],'workers':workers}
    (OUT/f'{mode}-manifest.json').write_text(json.dumps(manifest,indent=1)+'\n')
    for name,seed,r in selected:
        if (OUT/name/f'raw/reply-s{seed}.json').exists():raise RuntimeError('refusing measured-seed overwrite')
    pool=Pool(workers);start=time.monotonic()
    try:replies=pool.map([r for n,s,r in selected])
    finally:pool.close()
    for (name,seed,r),reply in zip(selected,replies):(OUT/name/f'raw/reply-s{seed}.json').write_text(json.dumps(reply)+'\n')
    timing={'N':len(selected),'wall_seconds':time.monotonic()-start,'summed_evaluator_elapsed_seconds':sum(r.get('ms',0) for r in replies)/1000}
    (OUT/f'{mode}-timing.json').write_text(json.dumps(timing,indent=2)+'\n');print(timing,flush=True)

def analyse():
    reg=registration();candidates=json.loads(CAND.read_text())['candidates'];spec=level1_spec('beech',reg);report=[]
    for name,assign in candidates.items():
        seeds=reg['day3_seeds']['training'];raw=OUT/name/'raw';replies=[json.loads((raw/f'reply-s{s}.json').read_text()) for s in seeds]
        season=l1.match_season([l1.seed_dbh(r['level1'][0]['allometry']) for r in replies],reg['size_match']['dbh'])
        valid=season in l1.DUMP_SEASONS;trees=None
        if valid:
            jobs=[(r['level1'][0]['dumps'][str(season)],s,reg['d_min_m'],reg['fitted']) for s,r in zip(seeds,replies)]
            with ProcessPoolExecutor(8) as executor:parts=l1.describe_files(jobs,executor)
            trees=[t for part in parts for t in part]
            assert_no_held_out(reg,trees)
            (OUT/name/'training-trees.json').write_text(json.dumps(trees,indent=1)+'\n')
        per_seed=[without_held_out(reg,fit.seed_traits(r,spec.tallo)) for r in replies]
        traits=without_held_out(reg,fit.mean_traits(per_seed));traits.update(l1.level1_traits(reg,trees,season,[]))
        valid=valid and all(isinstance(traits.get(f'l1.{k}.{field}'),(int,float)) and math.isfinite(traits[f'l1.{k}.{field}']) for k in reg['fitted'] for field in ['z','s'])
        loss,terms=total(spec,reg,traits)
        result={'name':name,'assign':assign,'seeds':seeds,'matched_season':season,'valid':valid,'trees':len(trees or []),'loss':loss if valid and math.isfinite(loss) else None,'contributions':terms,'traits':traits,'held_out_scored':False}
        assert_no_held_out(reg,result);report.append(result)
    (OUT/'training-results.json').write_text(json.dumps(report,indent=2)+'\n')
    finite=[r for r in report if r['loss'] is not None];winner=min(finite,key=lambda r:r['loss'])['name'] if finite else None
    print(json.dumps({'results':[{k:r[k] for k in ['name','matched_season','trees','loss']} for r in report],'training_winner':winner}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['pilot','remaining','analyse']);a=p.parse_args()
    if a.mode=='analyse':analyse()
    else:run(a.mode)
