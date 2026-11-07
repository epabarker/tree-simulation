"""Fixed registered N3 trials; step5 plan contains gates/seed sets. No tuning.
uv run --project analysis python analysis/experiments/day3_oak.py --out runs/day3-step5/trials --jobs 8
--mode trials (default), budget or analyse; every simulation is a fresh Node process.
"""
import argparse,json,subprocess,math
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from treesim import simtree,coarsen as co,cylinders as cy
from treesim.crown_shape import crown_shape
from treesim.oak_shape import stem_kinks
from treesim.provenance import provenance,file_hash
ROOT=Path(__file__).resolve().parents[2]

def analyse(path,condition,context):
    d=json.loads(path.read_text()); rows=[]
    for t in d['trees']:
        raw=simtree.from_dump(t).cylinders
        shape=crown_shape(co.coarsen(raw,co.Resolution(.008621381595730782,(),()),inflated=True),f"oak-{t['seed']}-{t['season']}") if context=='lone' else {}
        if context=='lone' and not all(math.isfinite(shape[k]) for k in ('D','WH')):raise ValueError('nonfinite lone shape')
        k,n=stem_kinks(t)
        rows.append({'condition':condition,'context':context,'seed':t['seed'],'season':t['season'],'tree':t['index'],'H':cy.height(raw),'kinks':k,'pathlen':n,'metamers':len(t['m']['parent']),**shape})
    return {'condition':condition,'context':context,'rows':rows,'survival':d['survival'],'hash':d['hash'],'params_sha256':file_hash(path.with_suffix('.params.json')) if path.with_suffix('.params.json').exists() else None}

def main():
    a=argparse.ArgumentParser(description=__doc__);a.add_argument('--out',type=Path,required=True);a.add_argument('--jobs',type=int,default=8);a.add_argument('--mode',choices=['trials','budget','analyse'],default='trials');p=a.parse_args()
    if not 1<=p.jobs<=8:a.error('jobs1–8')
    p.out.mkdir(parents=True,exist_ok=True)
    tasks=[(c,ctx,s,160) for c in ['current','n3'] for ctx,seeds in [('lone',range(10001,10021)),('garden',range(1,21))] for s in seeds] if p.mode!='budget' else [(c,'budget',s,w) for c in ['current','n3'] for w in [160,66] for s in [2,3,9]]
    # Tasks and producer hashes are recorded before execution; raw dumps stay in runs/.
    if p.mode!='analyse':(p.out/'manifest.json').write_text(json.dumps({'source':provenance(ROOT),'tasks':tasks,'patch_sha256':file_hash(Path(__file__).with_name('day3_oak_n3.patch.json')),'runner_sha256':file_hash(Path(__file__).with_suffix('.ts')),'analysis_sha256':file_hash(Path(__file__))},indent=2)+'\n')
    def one(task):
        c,ctx,s,w=task;dest=p.out/f'{c}-{ctx}-{s}-w{w}.json'
        if p.mode!='analyse':subprocess.run(['node',str(Path(__file__).with_suffix('.ts')),ctx,c,str(s),str(w),str(dest.resolve())],check=True)
        if ctx=='budget':return json.loads(dest.read_text())
        d=json.loads(dest.read_text());dest.with_suffix('.params.json').write_text(json.dumps(d['params'])+'\n');return analyse(dest,c,ctx)
    results=[]
    with ThreadPoolExecutor(p.jobs) as pool:
        for f in as_completed([pool.submit(one,t) for t in tasks]):
            results.append(f.result());(p.out/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(f'{p.mode}: {len(results)}/{len(tasks)}',flush=True)
if __name__=='__main__':main()
