"""Registered TreeML no-refit beech transfer. register|pilot|remaining|analyse.
uv run --project analysis python analysis/experiments/day3_beech_treeml.py register
"""
import argparse,copy,csv,json,math,subprocess,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,ProcessPoolExecutor
import numpy as np
from treesim import level1 as l1,qsm,coarsen as co
from treesim.describe import describe
from treesim.provenance import provenance,file_hash
from day3_species_beech import registration,ROOT,REG
from day3_beech_holdout import site_gate,WIN
OUT=ROOT/'runs/day3-step8/beech/treeml';WORKER=ROOT/'analysis/experiments/day3_postbox_lone.ts'

def register():
    reg=registration();OUT.mkdir(parents=True,exist_ok=True)
    metadata=ROOT/'data/reference/treeml/231025_TreeML_Dataset.csv';data=list(csv.DictReader(metadata.open()))
    selected=[r for r in data if r['botanical_name']=='Fagus sylvatica' and math.isfinite(float(r['DBH_m_'])) and float(r['DBH_m_'])>0]
    assert len(selected)==14
    names=reg['fitted']+reg['held_out'];at=float(np.median([float(r['DBH_m_']) for r in selected]));trees=[];hashes={};controls={k:{'dmin':0,'upper':0} for k in names}
    v31=json.loads((ROOT/'analysis/fit/sources/phase1-tolerances.json').read_text());v32=json.loads((ROOT/'analysis/fit/sources/phase1-tolerances-v3.2.json').read_text());table={r['descriptor']:r for r in v31['table'] if r['species']=='beech'};table.update({r['descriptor']:r for r in v32['table']})
    for row in selected:
        path=ROOT/'data/reference/treeml/optcsv'/('OptQSM_'+row['treeID']+'.csv');hashes[str(path.relative_to(ROOT))]=file_hash(path)
        c=qsm.read(path).cylinders;fine=describe(c);tree={'tree':row['treeID'],'dbh':float(row['DBH_m_']),**{k:float(fine[k]) for k in names}};trees.append(tree)
        for version,d in [('dmin',reg['d_min_m']),('upper',v31['resolution']['biodiv']['upper_end']['d'])]:
            reduced=describe(co.coarsen(c,co.Resolution(d,(),())))
            for k in names:controls[k][version]+=int(math.isfinite(fine[k]) and math.isfinite(reduced[k]) and abs(reduced[k]-fine[k])<=table[k]['tolerance'])
    target=copy.deepcopy(reg);target['real']={k:l1.distribution([t[k] for t in trees],[t['dbh'] for t in trees],at) for k in names};target['size_match']['dbh']=at
    target['TreeML']={'N':14,'source':'Yazdi et al.2024 TreeML-Data, doi10.6084/m9.figshare.c.6788358.v1','metadata_sha256':file_hash(metadata),'qsm_sha256':hashes,'controls':controls,'control_bar':13,'controls_pass':all(n>=13 for by in controls.values() for n in by.values()),'no_refit':True,'limitations':'Borrowed BioDiv tolerance/resolution; no independent TreeML repeat-noise floor; urban management/size/site confounds.'}
    target['TreeML']['finite_reference']=all(v['n']>=10 and math.isfinite(v['sd']) and v['sd']>0 for v in target['real'].values())
    (OUT/'reference-trees.json').write_text(json.dumps(trees,indent=1)+'\n')
    (OUT/'reference-registration.json').write_text(json.dumps(target,indent=2)+'\n')
    script='''import {readFileSync} from 'node:fs';import {loneParams,withAssign} from './cli/trials.ts';const winner=JSON.parse(readFileSync('analysis/experiments/day3_beech_winner.json','utf8'));const out=[];for(const [name,assign] of [['current',{}],['winner',winner.assign]])for(let seed=21061;seed<=21080;seed++)out.push({name,seed,params:withAssign(loneParams('beech',seed),'beech',assign)});console.log(JSON.stringify(out));'''
    inputs=json.loads(subprocess.check_output(['node','--input-type=module','-'],input=script,cwd=ROOT,text=True))
    for item in inputs:
        dest=OUT/item['name']/f's{item["seed"]}';dest.mkdir(parents=True,exist_ok=True);(dest/'params.json').write_text(json.dumps(item['params'])+'\n')
    manifest={'source':provenance(ROOT),'parent_registration_sha256':file_hash(REG),'reference_sha256':file_hash(OUT/'reference-registration.json'),'winner_sha256':file_hash(WIN),'worker_sha256':file_hash(WORKER),'runner_sha256':file_hash(__file__),'inputs':[{k:v for k,v in item.items() if k!='params'}|{'params_sha256':file_hash(OUT/item['name']/f's{item["seed"]}'/'params.json')} for item in inputs]}
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print('TreeML14: target DBH',at,'controls',target['TreeML']['controls_pass'],'finite',target['TreeML']['finite_reference'],flush=True)

def run(mode):
    registration();manifest=json.loads((OUT/'manifest.json').read_text());assert manifest['worker_sha256']==file_hash(WORKER)
    selected=manifest['inputs'][:1] if mode=='pilot' else manifest['inputs'][1:]
    if mode=='remaining' and not (OUT/'current/s21061/result.json').exists():raise RuntimeError('pilot required')
    def one(item):
        dest=OUT/item['name']/f's{item["seed"]}';assert item['params_sha256']==file_hash(dest/'params.json')
        if (dest/'result.json').exists():raise RuntimeError('refusing measured-seed overwrite')
        subprocess.run(['node',str(WORKER),str(dest/'params.json'),str(dest)],cwd=ROOT,check=True)
        return json.loads((dest/'result.json').read_text())
    start=time.monotonic()
    with ThreadPoolExecutor(1 if mode=='pilot' else 8) as pool:results=list(pool.map(one,selected))
    timing={'N':len(results),'wall_seconds':time.monotonic()-start,'summed_evaluator_elapsed_seconds':sum(r['elapsedMs'] for r in results)/1000};(OUT/f'{mode}-timing.json').write_text(json.dumps(timing,indent=2)+'\n');print(timing,flush=True)

def describe_one(job):
    path,seed,dmin,names=job;tree=json.loads(Path(path).read_text())['trees'][0]
    return {'seed':seed,**l1.describe_sim(tree,dmin,names)} if tree['alive'] else None

def analyse():
    registration();reg=json.loads((OUT/'reference-registration.json').read_text());seeds=reg['day3_seeds']['treeml'];names=reg['fitted']+reg['held_out'];report={}
    for name in ['current','winner']:
        replies=[json.loads((OUT/name/f's{s}/result.json').read_text()) for s in seeds];season=l1.match_season([l1.seed_dbh(r['allometry']) for r in replies],reg['size_match']['dbh'])
        if season not in l1.DUMP_SEASONS:report[name]={'season':season,'pass':False,'reason':'unmatched'};continue
        jobs=[(r['dumps'][str(season)],s,reg['d_min_m'],names) for s,r in zip(seeds,replies)]
        with ProcessPoolExecutor(8) as pool:trees=[t for t in pool.map(describe_one,jobs) if t is not None]
        stats=site_gate(reg,trees,seeds,names);stats.update(season=season,trees=len(trees));stats['pass']=stats['pass'] and reg['TreeML']['controls_pass'] and reg['TreeML']['finite_reference'];report[name]=stats
        (OUT/name/'described-trees.json').write_text(json.dumps(trees,indent=1)+'\n')
    (OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({n:{k:r.get(k) for k in ['season','trees','passed','N','spread_ok','pass']} for n,r in report.items()}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['register','pilot','remaining','analyse']);a=p.parse_args()
    if a.mode=='register':register()
    elif a.mode=='analyse':analyse()
    else:run(a.mode)
