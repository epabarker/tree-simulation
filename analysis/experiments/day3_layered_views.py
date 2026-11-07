"""Registered step6 snapshot/budget processes; no fitting. Native E2 must finish first.
uv run --project analysis python analysis/experiments/day3_layered_views.py --mode snapshots|budget --out runs/day3-step6 --jobs 12
"""
import argparse,json,subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
from treesim.provenance import provenance,file_hash
ROOT=Path(__file__).resolve().parents[2]
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--mode',choices=['snapshots','budget'],required=True);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--jobs',type=int,default=12);a=ap.parse_args()
    if not 1<=a.jobs<=12:ap.error('jobs1–12')
    out=a.out.resolve()/a.mode;out.mkdir(parents=True,exist_ok=True)
    tasks=[(c,w,s) for c in ['current','base'] for w in [160,66] for s in [6,2,3,9,10,12]] if a.mode=='snapshots' else [('base',w,s) for w in [160,66] for s in [2,3,9]]
    manifest={'source':provenance(ROOT),'tasks':tasks,'wasm_sha256':file_hash(ROOT/'src/wasm/pkg/core_bg.wasm'),'worker_sha256':file_hash(Path(__file__).with_name('day3_layered_worker.ts')),'factory_sha256':file_hash(Path(__file__).with_name('day3_layered_params.ts'))}
    if a.mode=='budget':
        old=ROOT/'runs/day3-step5/budget';prior=json.loads((old/'manifest.json').read_text());runtime=json.loads((ROOT/'runs/day3-step5/runtime.json').read_text())
        if prior['source']['source_sha256']!=manifest['source']['source_sha256'] or runtime['wasm_sha256']!=manifest['wasm_sha256']:raise ValueError('current reference model/WASM changed; rerun reference before comparison')
        refs=[r for r in json.loads((old/'results.json').read_text()) if r['condition']=='current']
        if len(refs)!=6 or any(r['protocol']!='worker-save-free-swap-restore' for r in refs):raise ValueError('invalid current reference')
        # Current factory is the same forestParams default .25; source hashes and step5 worker
        # digest are pinned. These are the six original fresh current cases, not six new runs.
        manifest['current_reference']={'source':str(old),'report_sha256':file_hash(old/'results.json'),'producer_manifest_sha256':file_hash(old/'manifest.json'),'records':refs}
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    def one(task):
        c,w,s=task;dest=out if a.mode=='snapshots' else out/f'{c}-w{w}-s{s}.json'
        subprocess.run(['node',str(Path(__file__).with_name('day3_layered_worker.ts')),a.mode,c,str(s),str(w),str(dest)],check=True)
        return {'condition':c,'width':w,'seed':s} if a.mode=='snapshots' else json.loads(dest.read_text())
    results=[]
    with ThreadPoolExecutor(a.jobs if a.mode=='snapshots' else 1) as pool:
        for f in as_completed([pool.submit(one,t) for t in tasks]):
            results.append(f.result());(out/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(a.mode,len(results),'/',len(tasks),flush=True)
if __name__=='__main__':main()
