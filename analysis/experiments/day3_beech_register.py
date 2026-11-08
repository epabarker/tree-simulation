"""Re-register day3 beech without rewriting superseded v6 or changing targets.
uv run --project analysis python analysis/experiments/day3_beech_register.py
"""
import copy,json,math,subprocess
from pathlib import Path
import numpy as np
from treesim import level1 as l1,tolerance as tol
from treesim.provenance import provenance,file_hash
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'runs/day3-step8/beech';REG=ROOT/'analysis/fit/sources/day3-beech-v7.json'

def equal(a,b):
    if isinstance(a,float) and not math.isfinite(a):return b is None or isinstance(b,float) and not math.isfinite(b)
    return a==b

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    prior_path=l1.registration_path('beech');prior=json.loads(prior_path.read_text())
    assert prior['version']==6 and prior['status']=='superseded'
    names=prior['fitted']+prior['held_out'];at=prior['size_match']['dbh']
    trees=l1.real_trees('biodiv','Fagus_sylvatica');demol=l1.real_trees('demol','FSYL')
    assert len(trees)==53 and len(demol)==15
    differences=[]
    for k in names:
        d=l1.distribution([t['d'][k] for t in trees],[t['dbh'] for t in trees],at)
        for field,v in d.items():
            if not equal(v,prior['real'][k][field]):differences.append([k,field,v,prior['real'][k][field]])
        if k in prior['demol']['descriptors']:
            ds=l1.detrended(l1.as_sim(demol),k,prior['real'][k]['slope'],at)
            actual={'n':len(ds),'median':float(np.median(ds)) if ds else None,'sd':float(np.std(ds,ddof=1)) if len(ds)>1 else None}
            for field,v in actual.items():
                if not equal(v,prior['demol']['descriptors'][k][field]):differences.append(['Demol',k,field,v,prior['demol']['descriptors'][k][field]])
    if differences:raise RuntimeError(f'real targets moved: {differences}')
    # The reference manifest expanded; pin the actual selected source files, not unrelated additions.
    selected=[r for r in tol.real_sets() if (r['dataset'],r['species']) in [('biodiv','Fagus_sylvatica'),('demol','FSYL')]]
    inputs={str(Path(r['path']).relative_to(ROOT)):file_hash(r['path']) for r in selected}
    inputs['data/reference/biodiv/labels.csv']=file_hash(ROOT/'data/reference/biodiv/labels.csv')
    reg=copy.deepcopy(prior);reg.update(version=7,status='day3 current baseline; no fit/adoption',written='2026-11-08; user preserves five historical holdouts (5/18)',provisional='No species-validation or adoption claim; current instrument/baseline screen',parent={'path':str(prior_path.relative_to(ROOT)),'sha256':file_hash(prior_path)},source=provenance(ROOT))
    reg.pop('superseded',None)
    reg['hashes']=l1.file_hashes(tuple(prior['hashes']))
    reg['hashes']['analysis/experiments/day3_beech_register.py']=file_hash(__file__)
    reg['wasm_sha256']=file_hash(ROOT/'src/wasm/pkg/core_bg.wasm')
    reg['reference_inputs_sha256']=inputs
    reg['target_identity']={'BioDiv_trees':53,'Demol_trees':15,'descriptors':18,'differences':0,'real_summaries':'Recomputed current-code distributions and applicable Demol summaries exactly equal v6; noise/resolution fixed, not reselected.'}
    reg['diagnostic_only']=['leanAngle']
    reg['day3_seeds']={'training':list(range(21001,21021)),'selection':list(range(21021,21041)),'confirmation':list(range(21041,21061)),'treeml':list(range(21061,21081))}
    reg['candidate_protocol']={'current_assign':{},'physiology':'shipping species defaults pinned by model hashes; no historical fixed/form overlay','training_only':True}
    input_path=OUT/'current-inputs.json'
    subprocess.run(['node','analysis/experiments/day3_beech_params.ts',str(input_path)],cwd=ROOT,check=True)
    data=json.loads(input_path.read_text());eff=data['effective'];start={}
    for knob in reg['knobs']:
        value=eff
        for key in knob['path'].split('.'):
            if isinstance(value,list):value=value[int(key)]
            elif key=='postureSetPoint' and key not in value:value=value['setPoint']
            else:value=value[key]
        start[knob['path']]=value
    reg['historical_v6_assignments']={'fixed':reg['fixed'],'start':reg['start']}
    reg['fixed']={};reg['start']=start;reg['frozen_level0']={}
    reg['frozen_form_source']='Shipping effective current params; assign={} baseline, source-hashed default physiology.'
    reg['current_effective']=eff;reg['current_input_sha256']=file_hash(input_path)
    reg['hashes']['analysis/experiments/day3_beech_params.ts']=file_hash(ROOT/'analysis/experiments/day3_beech_params.ts')
    REG.write_text(json.dumps(reg,indent=1,default=float)+'\n')
    (OUT/'reference-identity.json').write_text(json.dumps({'registration_sha256':file_hash(REG),'identity':reg['target_identity'],'reference_inputs_sha256':inputs},indent=2)+'\n')
    print('v7:18 exact real target distributions; five unchanged holdouts;53 BioDiv/15 Demol; no model run',flush=True)

if __name__=='__main__':main()
