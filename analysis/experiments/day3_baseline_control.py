"""B0 quarter-cap composition control, registered in day3 step4 before measurement.
prepare dumps original and quarter-cap params and verifies only o4.maxTrees differs.
execute runs the historical binary for20 seeds,300 seasons; no lone comparators needed.
"""
import argparse,csv,json,os,subprocess,time
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
from treesim.provenance import build_native,file_hash,provenance

ROOT=Path(__file__).resolve().parents[2]

def differences(a,b,p=()):
    if isinstance(a,dict) and isinstance(b,dict):
        for k in a.keys()|b.keys():
            if k not in a or k not in b: yield p+(k,)
            else: yield from differences(a[k],b[k],p+(k,))
    elif isinstance(a,list) and isinstance(b,list) and len(a)==len(b):
        for i,(x,y) in enumerate(zip(a,b)): yield from differences(x,y,p+(str(i),))
    elif a!=b: yield p

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('mode',choices=('prepare','execute'))
    ap.add_argument('--worktree',type=Path,default=ROOT/'.claude/worktrees/b0')
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--jobs',type=int,default=8)
    a=ap.parse_args(); wt=a.worktree.resolve(); out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
    if not 1<=a.jobs<=8: ap.error('jobs1–8')
    if a.mode=='prepare':
        if (out/'manifest.json').exists(): ap.error('choose fresh output directory')
        commit=subprocess.check_output(['git','-C',str(wt),'rev-parse','HEAD'],text=True).strip()
        if not commit.startswith('d2c4f53'): ap.error('control requires B0 d2c4f53')
        records=[]
        for seed in range(1,21):
            folder=out/f's{seed}';folder.mkdir(exist_ok=True)
            for cap,name in [('1','original.json'),('.25','params.json')]:
                env=dict(os.environ);env['RECRUITS']=cap
                for key in ('NARROW','FACEWOOD','FACES'): env.pop(key,None)
                p=subprocess.check_output(['node',str(ROOT/'analysis/treesim/dump_garden.ts'),str(wt),'160',str(seed)],env=env,text=True)
                (folder/name).write_text(p)
            before=json.loads((folder/'original.json').read_text());after=json.loads((folder/'params.json').read_text())
            delta=list(differences(before,after))
            if delta!=[('o4','maxTrees')]: raise ValueError(delta)
            records.append({'seed':seed,'original_cap':before['o4']['maxTrees'],'quarter_cap':after['o4']['maxTrees'],'params_sha256':file_hash(folder/'params.json')})
        manifest={'source':provenance(wt),'width':160,'seasons':300,'seeds':records,'tool_sha256':file_hash(Path(__file__))}
        (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
        print('Prepared20 control inputs: only o4.maxTrees differs; no simulations run')
        return
    manifest=json.loads((out/'manifest.json').read_text())
    if provenance(wt)['source_sha256']!=manifest['source']['source_sha256']: raise ValueError('historical source changed')
    binary=build_native(wt)
    def one(rec):
        seed=rec['seed']; folder=out/f's{seed}'; p=folder/'params.json';dest=folder/'run'
        if file_hash(p)!=rec['params_sha256']:raise ValueError('params changed')
        start=time.monotonic()
        subprocess.run([str(binary),'--preset','mixedWood','--params',str(p),'--seasons','300','--out',str(dest),'--quiet'],check=True)
        actual=json.loads((dest/'run.json').read_text())
        if actual['params']!=json.loads(p.read_text()):raise ValueError('executed params differ')
        with (dest/'metrics.csv').open() as f: rows=list(csv.DictReader(f))
        last=[r for r in rows if r['season']=='300' and r['alive']=='1']
        comp={}
        for r in last:comp[r['species']]=comp.get(r['species'],0)+1
        planted=len(json.loads(p.read_text())['trees'])
        result={'seed':seed,'live300':len(last),'composition300':comp,'planted_alive300':sum(int(r['tree'])<planted for r in last),
                'wall_seconds':time.monotonic()-start,'native_ms':actual['meta']['ms'],'hash':(dest/'hash.txt').read_text().strip()}
        for name in ('metamers.csv','form.csv','buds.csv','ground.csv'):(dest/name).unlink(missing_ok=True)
        return result
    results=[]
    with ThreadPoolExecutor(a.jobs) as pool:
        for i,f in enumerate(as_completed([pool.submit(one,r) for r in manifest['seeds']]),1):
            results.append(f.result())
            (out/'report.json').write_text(json.dumps({'manifest':manifest,'binary_sha256':file_hash(binary),'N':len(results),'per_seed':results},indent=2)+'\n')
            print(f'B0 quarter-cap control {i}/20 complete',flush=True)

if __name__=='__main__':main()
