"""Separate source-frozen prototypes through existing species trials, no adoption.
uv run --project analysis python analysis/experiments/day3_postbox_trials.py prepare|pilot|remaining|analyse
"""
import argparse,json,math,subprocess,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from treesim import fit
from treesim.provenance import provenance,file_hash
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'runs/day3-step8/species/prototypes'
CAND=ROOT/'analysis/experiments/day3_postbox_candidates.json';TARGET=ROOT/'analysis/fit/sources/day3-postbox-tallo.json'
LONE=ROOT/'analysis/experiments/day3_postbox_lone.ts';STAND=ROOT/'analysis/experiments/day3_postbox_stand.ts'

def prepare():
    OUT.mkdir(parents=True,exist_ok=True)
    script='''import {readFileSync} from 'node:fs';import {loneParams,standParams,withAssign} from './cli/trials.ts';const cs=JSON.parse(readFileSync('analysis/experiments/day3_postbox_candidates.json','utf8'));const out=[];for(const c of cs)for(const seed of c.trainingSeeds)out.push({name:c.name,seed,lone:withAssign(loneParams(c.name,seed),c.name,c.assign),stand:withAssign(standParams(c.name,seed),c.name,c.assign)});console.log(JSON.stringify(out));'''
    worlds=json.loads(subprocess.check_output(['node','--input-type=module','-'],input=script,text=True,cwd=ROOT));tasks=[]
    for r in worlds:
        dest=OUT/r['name']/f's{r["seed"]}';dest.mkdir(parents=True,exist_ok=True)
        hashes={}
        for context in ['lone','stand']:
            p=dest/f'{context}-params.json';p.write_text(json.dumps(r[context])+'\n');hashes[context]=file_hash(p)
        tasks.append({'name':r['name'],'seed':r['seed'],'params_sha256':hashes})
    manifest={'source':provenance(ROOT),'wasm_sha256':file_hash(ROOT/'src/wasm/pkg/core_bg.wasm'),'candidate_sha256':file_hash(CAND),'target_sha256':file_hash(TARGET),'runner_sha256':file_hash(__file__),'lone_worker_sha256':file_hash(LONE),'stand_worker_sha256':file_hash(STAND),'tasks':tasks,'stand_hash_kind':'SHA256 of existing standard trial traits, not core state hash'}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

def checked():
    m=json.loads((OUT/'manifest.json').read_text());assert m['source']['source_sha256']==provenance(ROOT)['source_sha256']
    for path,key in [(CAND,'candidate_sha256'),(TARGET,'target_sha256'),(LONE,'lone_worker_sha256'),(STAND,'stand_worker_sha256')]:
        if file_hash(path)!=m[key]:raise RuntimeError(f'input/tool moved:{path}')
    assert m['wasm_sha256']==file_hash(ROOT/'src/wasm/pkg/core_bg.wasm')
    return m

def run(mode):
    m=checked();tasks=m['tasks'][:1] if mode=='pilot' else m['tasks'][1:]
    def one(t):
        dest=OUT/t['name']/f's{t["seed"]}'
        for context in ['lone','stand']:assert file_hash(dest/f'{context}-params.json')==t['params_sha256'][context]
        if (dest/'stand-result.json').exists() or (dest/'lone/result.json').exists():raise RuntimeError('refusing measured-seed overwrite')
        subprocess.run(['node',str(LONE),str(dest/'lone-params.json'),str(dest/'lone')],cwd=ROOT,check=True)
        subprocess.run(['node',str(STAND),t['name'],str(t['seed']),str(dest/'stand-result.json')],cwd=ROOT,check=True)
        return {'name':t['name'],'seed':t['seed']}
    start=time.monotonic()
    with ThreadPoolExecutor(1 if mode=='pilot' else 8) as pool:results=list(pool.map(one,tasks))
    timing={'N':len(results),'wall_seconds':time.monotonic()-start};(OUT/f'{mode}-timing.json').write_text(json.dumps(timing,indent=2)+'\n');print(timing,flush=True)

def analyse():
    m=checked();targets=json.loads(TARGET.read_text())['species'];report={}
    for name,curve in targets.items():
        rows=[];lo,hi=curve['height_anchor_m'][::2]
        for task in [t for t in m['tasks'] if t['name']==name]:
            dest=OUT/name/f's{task["seed"]}';lone=json.loads((dest/'lone/result.json').read_text());stand=json.loads((dest/'stand-result.json').read_text())
            tree=lone['allometry'][-1]['trees'][0];height=tree.get('height');alive=tree['alive'];height_ok=alive and height is not None and math.isfinite(height) and lo<=height<=hi
            traits=fit.tallo_traits(stand['traits']['allometry'],curve);values=[traits[f'stand.tallo{k}.{i}'] for k in ['H','CR'] for i in range(3)]
            finite=all(v is not None and math.isfinite(v) for v in values);stat=max(abs(v) for v in values) if finite else None
            eligible={}
            from treesim import tallo
            for i,season in enumerate(fit.LEVEL0_SEASONS):
                for trait,key in [('H','height'),('CR','crownRadius')]:eligible[f'{trait}{season}']=sum(tallo.z_score(curve[trait],100*t['dbh'],t[key]) is not None for t in stand['traits']['allometry'] if t['season']==season)
            rows.append({'seed':task['seed'],'height150_m':height,'height_pass':bool(height_ok),'alive':alive,'maturity_crossed':bool(height is not None and 4*height>=curve['initial_maturity_cells']),'tallo_stat':stat,'tallo_pass':bool(finite and stat<=curve['control']['T']),'eligible':eligible,'traits':traits,'lone_hash':lone['hash'],'stand_traits_sha256':stand['traits_sha256']})
        height_pass=sum(r['height_pass'] for r in rows);tallo_pass=sum(r['tallo_pass'] for r in rows)
        out={'N':20,'height_band_m':[lo,hi],'height_passed':height_pass,'height_median_m':float(np.median([r['height150_m'] for r in rows if r['height150_m'] is not None])),'T':curve['control']['T'],'tallo_passed':tallo_pass,'bar':15,'maturity_crossed':sum(r['maturity_crossed'] for r in rows),'source_control':curve['control']['self_consistency'],'pass':height_pass>=15 and tallo_pass>=15 and curve['control']['self_consistency']['ok'],'rows':rows}
        report[name]=out
    (OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({n:{k:v for k,v in r.items() if k!='rows'} for n,r in report.items()}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['prepare','pilot','remaining','analyse']);a=p.parse_args()
    if a.mode=='prepare':prepare()
    elif a.mode=='analyse':analyse()
    else:run(a.mode)
