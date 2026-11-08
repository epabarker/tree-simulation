"""Step7: six fresh sequential budget processes; registered in day3 plan.
uv run --project analysis python analysis/experiments/day3_rc.py
"""
import json, subprocess
from pathlib import Path
from treesim.provenance import provenance, file_hash

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'runs/day3-step7'

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    source = provenance(ROOT)
    wasm = file_hash(ROOT/'src/wasm/pkg/core_bg.wasm')
    worker = ROOT/'analysis/experiments/day3_layered_worker.ts'
    old = ROOT/'runs/day3-step5/budget'
    prior = json.loads((old/'manifest.json').read_text())
    runtime = json.loads((ROOT/'runs/day3-step5/runtime.json').read_text())
    if prior['source']['source_sha256'] != source['source_sha256'] or runtime['wasm_sha256'] != wasm:
        raise RuntimeError('reference source/WASM identity mismatch')
    refs = {(r['width'],r['seed']): r for r in json.loads((old/'results.json').read_text()) if r['condition']=='current'}
    manifest = {'source':source,'wasm_sha256':wasm,'worker_sha256':file_hash(worker),
                'runner_sha256':file_hash(__file__),'reference_sha256':file_hash(old/'results.json'),
                'tasks':[[w,s] for w in [160,66] for s in [2,3,9]],'fresh_processes':True}
    # Freeze exact inputs before starting any world. Independently compare old explicit-recruits inputs.
    proof = '''import {forestParams} from './src/core/presets.ts';
const out=[];for(const w of [160,66])for(const s of [2,3,9]){
const p=forestParams(w,s);if(JSON.stringify(p)!==JSON.stringify(forestParams(w,s,{recruits:.25})))throw Error('params differ');out.push({width:w,seed:s,params:p});}console.log(JSON.stringify(out));'''
    manifest['inputs'] = json.loads(subprocess.check_output(['node','--input-type=module','-'],input=proof,text=True,cwd=ROOT))
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    results=[]
    for width,seed in manifest['tasks']:
        dest=OUT/f'w{width}-s{seed}.json'
        if dest.exists(): raise RuntimeError(f'refusing cached measurement: {dest}')
        subprocess.run(['node',str(worker),'budget','current',str(seed),str(width),str(dest)],cwd=ROOT,check=True)
        r=json.loads(dest.read_text());ref=refs[(width,seed)]
        expected=next(x['params'] for x in manifest['inputs'] if x['width']==width and x['seed']==seed)
        assert r['params']==expected
        assert ref['protocol']==r['protocol']=='worker-save-free-swap-restore'
        assert all(r[k]==ref[k] for k in ['gardenHash','specimenHash','restoredHash'])
        r['deltas']={k:r[k]/ref[k]-1 for k in ['gardenMs','totalMs','gardenMetamers','specimenMetamers']}
        r['memory_ok']=r['memoryMB']<230
        r['investigate']=[k for k,v in r['deltas'].items() if v>.20]
        results.append(r)
        (OUT/'results.json').write_text(json.dumps(results,indent=2)+'\n')
        print(width,seed,'MB',r['memoryMB'],'deltas',r['deltas'],flush=True)
    if not all(r['memory_ok'] for r in results):raise RuntimeError('memory gate failed')

if __name__=='__main__':main()
