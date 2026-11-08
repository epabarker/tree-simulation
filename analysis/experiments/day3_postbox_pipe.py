"""Registered20-seed allocation/pipe grid; current-gate stand evidence only.
uv run --project analysis python analysis/experiments/day3_postbox_pipe.py prepare|pilot|first|second|analyse
"""
import argparse,copy,json,math,subprocess,time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from treesim import fit
from treesim.provenance import file_hash,provenance
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'runs/day3-step8/species/pipe'
SPEC=ROOT/'analysis/experiments/day3_postbox_pipe.json';WORKER=ROOT/'analysis/experiments/day3_postbox_pipe.ts';TARGET=ROOT/'analysis/fit/sources/day3-postbox-tallo.json'
BASE=ROOT/'runs/day3-step8/species/prototypes'

def prepare():
    variants=json.loads(SPEC.read_text());tasks=[]
    for v in variants:
        d=OUT/v['species']/v['condition'];dag=d/'dag/provenance.json'
        assert dag.exists()
        for seed in v['seeds']:
            p=d/f's{seed}.params.json';params=json.loads(p.read_text());original=json.loads((BASE/v['species']/f's{seed}/stand-params.json').read_text())
            restored=copy.deepcopy(params);sp=v['species']
            for group,key in [('c6','r0'),('r1','mw')]:restored['species'][sp][group][key]=original['species'][sp][group][key]
            restored['species'][sp]['r2']['levels'][0]['lambda']=original['species'][sp]['r2']['levels'][0]['lambda'];assert restored==original
            tasks.append({'species':v['species'],'condition':v['condition'],'seed':seed,'params_sha256':file_hash(p),'dag_sha256':file_hash(dag),'base_params_sha256':file_hash(BASE/v['species']/f's{seed}/stand-params.json')})
    old=json.loads((BASE/'manifest.json').read_text());assert old['source']['source_sha256']==provenance(ROOT)['source_sha256']
    m={'source':provenance(ROOT),'wasm_sha256':file_hash(ROOT/'src/wasm/pkg/core_bg.wasm'),'spec_sha256':file_hash(SPEC),'target_sha256':file_hash(TARGET),'worker_sha256':file_hash(WORKER),'runner_sha256':file_hash(__file__),'tasks':tasks,'base_results_sha256':file_hash(BASE/'results.json'),'base_identity_pairs':len(tasks)}
    (OUT/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')

def checked():
    m=json.loads((OUT/'manifest.json').read_text());assert m['source']['source_sha256']==provenance(ROOT)['source_sha256']
    for p,k in [(SPEC,'spec_sha256'),(TARGET,'target_sha256'),(WORKER,'worker_sha256')]:assert file_hash(p)==m[k]
    assert file_hash(ROOT/'src/wasm/pkg/core_bg.wasm')==m['wasm_sha256'];return m

def run(mode):
    m=checked();tasks=m['tasks'][:1] if mode=='pilot' else m['tasks'][1:80] if mode=='first' else m['tasks'][80:]
    def one(t):
        d=OUT/t['species']/t['condition'];p=d/f's{t["seed"]}.params.json';assert file_hash(p)==t['params_sha256'];dest=d/f's{t["seed"]}.json'
        if dest.exists():raise RuntimeError('refusing measured probe overwrite')
        subprocess.run(['node',str(WORKER),'run',str(dest),t['species'],t['condition'],str(t['seed'])],cwd=ROOT,check=True)
        return json.loads(dest.read_text())
    start=time.monotonic()
    with ThreadPoolExecutor(1 if mode=='pilot' else 8) as pool:replies=list(pool.map(one,tasks))
    timing={'N':len(replies),'wall_seconds':time.monotonic()-start,'summed_evaluator_elapsed_seconds':sum(r['elapsedMs'] for r in replies)/1000};(OUT/f'{mode}-timing.json').write_text(json.dumps(timing,indent=2)+'\n');print(timing,flush=True)

def analyse():
    m=checked();targets=json.loads(TARGET.read_text())['species'];baseline=json.loads((BASE/'results.json').read_text());results=[]
    for v in json.loads(SPEC.read_text()):
        sp=v['species'];d=OUT/sp/v['condition'];curve=targets[sp];rows=[]
        for seed in v['seeds']:
            reply=json.loads((d/f's{seed}.json').read_text());traits=fit.tallo_traits(reply['traits']['allometry'],curve);zs=[traits[f'stand.tallo{k}.{i}'] for k in ['H','CR'] for i in range(3)];finite=all(z is not None and math.isfinite(z) for z in zs);stat=max(abs(z) for z in zs) if finite else None
            rows.append({'seed':seed,'traits':traits,'stat':stat,'pass':bool(finite and stat<=curve['control']['T'])})
        changes={}
        for key in [f'stand.{trait}.{i}' for trait in ['H','CR','dbh'] for i in range(3)]:
            a=[r['traits'][key] for r in rows if r['traits'][key] is not None];b=[r['traits'][key] for r in baseline[sp]['rows'] if r['traits'][key] is not None];spread=float(np.quantile(b,.9)-np.quantile(b,.1));shift=float(np.median(a)-np.median(b))
            changes[key]={'median':float(np.median(a)),'base_median':float(np.median(b)),'shift':shift,'base_p90_p10':spread,'beyond_spread':abs(shift)>spread}
        result={'species':sp,'condition':v['condition'],'lambda':v['assign']['r2']['levels'][0]['lambda'],'r0':v['assign']['c6']['r0'],'mw':v['assign']['r1']['mw'],'pipe_scale':v['pipe_scale'],'passed':sum(r['pass'] for r in rows),'N':20,'bar':15,'T':curve['control']['T'],'median_stat':float(np.median([r['stat'] for r in rows if r['stat'] is not None])),'rows':rows,'changes':changes};results.append(result)
    winners={}
    for sp in targets:
        passing=[r for r in results if r['species']==sp and r['passed']>=15]
        winners[sp]=min(passing,key=lambda r:(-r['passed'],r['median_stat'],r['lambda'],r['pipe_scale']))['condition'] if passing else None
    report={'results':results,'stand_only':True,'training_winners':winners,'not_adopted':True};(OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'results':[{k:r[k] for k in ['species','condition','lambda','passed','N','median_stat']} for r in results],'training_winners':winners}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['prepare','pilot','first','second','analyse']);a=p.parse_args()
    if a.mode=='prepare':prepare()
    elif a.mode=='analyse':analyse()
    else:run(a.mode)
