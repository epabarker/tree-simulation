"""Registered step6 A6b/E2; mode prepare runs no seasons, execute runs180 stands.
uv run --project analysis python analysis/experiments/day3_layered.py --out runs/day3-step6 --mode prepare|execute|gforest|report --jobs12
"""
import argparse,json,subprocess,time,resource,math,copy
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from statistics import median
import polars as pl
from treesim import Run,run_many
from treesim import gforest as gf
from treesim.crown_base import limb_base_ratio
from treesim.layered_gates import crown_gate,birch_poles
from treesim.provenance import provenance,file_hash,build_native
ROOT=Path(__file__).resolve().parents[2]
CONDITIONS=['base','depth-m10','depth-p10','kExt-m10','kExt-p10','eS-m10','eS-p10','dLambda-m10','dLambda-p10']
SEEDS=list(range(1,21))
TOOLS=[Path(__file__),Path(__file__).with_name('day3_layered_params.ts'),ROOT/'analysis/treesim/layered_gates.py',ROOT/'analysis/treesim/crown_base.py',ROOT/'analysis/treesim/gforest.py']

def dump(path,obj):path.write_text(json.dumps(obj,indent=2)+'\n')
def read(path):return json.loads(path.read_text())

def native():
    binary=ROOT/'rust/target/native/release/treesim';previous=ROOT/'runs/day3-step5/gforest/evidence.json'
    if binary.exists() and previous.exists():
        old=read(previous)
        if old['provenance']['source_sha256']==provenance(ROOT)['source_sha256'] and old['binary_sha256']==file_hash(binary):
            return binary,{'reused_exact_binary':True,'producer_commit':old['provenance']['commit'],'source_hashes_match':True}
    return build_native(ROOT),{'reused_exact_binary':False,'producer_commit':provenance(ROOT)['commit']}

def summarise(folder,condition,seed):
    params=read(folder/'params.json');run=folder/'stand';actual=read(run/'run.json')
    if actual['params']!=params:raise ValueError(f'executed input mismatch {folder}')
    names=['season','tree','species','alive','height','slenderness','metamers']
    m=pl.read_csv(run/'metrics.csv',columns=names,infer_schema_length=0).with_columns([pl.col(k).cast(pl.Int64) for k in ['season','tree','alive']]+[pl.col(k).cast(pl.Float64) for k in ['height','slenderness','metamers']])
    n=len(params['trees']);crown=[]
    cols=['season','tree','birthId','parentBirthId','order','x0','y0','z0','x1','y1','z1']
    geo=pl.read_csv(run/'metamers.csv',columns=cols,infer_schema_length=0).with_columns([pl.col(k).cast(pl.Int64) for k in cols[:5]])
    geo=geo.filter(pl.col('tree')<n).with_columns([pl.col(k).cast(pl.Float64) for k in cols[5:]])
    alive={(r['season'],r['tree']) for r in m.filter(pl.col('alive')==1).to_dicts()}
    for key,g in geo.group_by(['season','tree'],maintain_order=True):
        season,tree=key
        if key not in alive:continue
        H=g['y1'].max()-g['y0'].min()
        if H<40:continue
        crown.append({'seed':seed,'season':season,'tree':tree,'species':params['trees'][tree]['species'],'height_m':H*.25,'cbG':limb_base_ratio(g.to_dict(as_series=False))})
    light=pl.read_csv(run/'light.csv',schema_overrides={'shade':pl.Float64,'lad':pl.Float64})
    floor={};lai={}
    for season in [100,150,300]:
        l=light.filter(pl.col('season')==season)
        if not l.height:raise ValueError('missing light snapshot')
        floor[str(season)]=1-l.filter(pl.col('row')==0)['shade'].mean()
        lai[str(season)]=l.group_by('col').agg(pl.col('lad').sum())['lad'].mean()
    live150=m.filter((pl.col('season')==150)&(pl.col('alive')==1));last=m.filter((pl.col('season')==300)&(pl.col('alive')==1))
    beech=[i for i,t in enumerate(params['trees']) if t['species']=='beech']
    if len(beech)!=2:raise ValueError('registered desktop candidate requires two planted beech')
    result={'condition':condition,'seed':seed,'params_sha256':file_hash(folder/'params.json'),'hash':(run/'hash.txt').read_text().strip(),
      'effective_depth':int(params['world']['depth']),'crown':crown,'floor':floor,'lai':lai,
      'beech_alive150':live150.filter(pl.col('tree').is_in(beech)).height,'beech_planted':len(beech),
      'poles':birch_poles(m.to_dicts(),n),'live300':last.height,
      'metamers200':m.filter((pl.col('season')==200)&(pl.col('alive')==1))['metamers'].sum(),
      'canopy_per_ha150':live150.filter(pl.col('height')>=60).height/(params['world']['width']*int(params['world']['depth'])*.25**2/10000),
      'thin150':live150.filter(pl.col('height')>=40).height<2,'native_elapsed_s':actual['meta']['ms']/1000,
      'geometry_sha256':file_hash(run/'metamers.csv')}
    dump(folder/'summary.json',result)
    if condition!='base':
        for name in ['metamers.csv','form.csv','buds.csv','ground.csv']:(run/name).unlink(missing_ok=True)
    return result

def report(out):
    summaries={c:[read(out/c/f's{s}/summary.json') for s in SEEDS] for c in CONDITIONS}
    result={}
    for c,rs in summaries.items():
        result[c]={'N':len(rs),'floor':{str(s):gf.dist([r['floor'][str(s)] for r in rs]) for s in [100,150,300]},
          'lai':{str(s):gf.dist([r['lai'][str(s)] for r in rs]) for s in [100,150]},
          'beech_alive150':sum(r['beech_alive150'] for r in rs),'beech_planted':sum(r['beech_planted'] for r in rs),
          'metamers200':gf.dist([r['metamers200'] for r in rs]),'crown_gates':{sp:crown_gate(rs,sp) for sp in ['beech','hornbeam']},
          'pole_pass':sum(r['poles']['pass'] for r in rs),'pole_vacuous_seeds':sum(r['poles']['tall_recruits']==0 for r in rs),
          'canopy_per_ha150':gf.dist([r['canopy_per_ha150'] for r in rs]),'thin150':sum(r['thin150'] for r in rs),
          'cbG':{sp:{str(s):gf.dist([median([x['cbG'] for x in r['crown'] if x['species']==sp and x['season']==s and x['cbG'] is not None]) for r in rs if any(x['species']==sp and x['season']==s and x['cbG'] is not None for x in r['crown'])]) for s in [150,300]} for sp in ['beech','hornbeam','oak','birch']}}
    dump(out/'report.json',result);return result

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',type=Path,required=True);ap.add_argument('--mode',choices=['prepare','execute','gforest','report'],required=True);ap.add_argument('--jobs',type=int,default=12);a=ap.parse_args()
    if not 1<=a.jobs<=12:ap.error('jobs1–12')
    out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
    if a.mode=='prepare':
        if (out/'manifest.json').exists():ap.error('fresh directory required')
        subprocess.run(['node',str(Path(__file__).with_name('day3_layered_params.ts')),'prepare',str(out)],check=True)
        manifest={'source':provenance(ROOT),'seeds':SEEDS,'conditions':CONDITIONS,'width':160,'seasons':300,'snapshots':[100,150,300],
          'instrument_sha256':{str(p.relative_to(ROOT)):file_hash(p) for p in TOOLS},'wasm_sha256':file_hash(ROOT/'src/wasm/pkg/core_bg.wasm'),
          'inputs':{f'{c}/s{s}':file_hash(out/c/f's{s}/params.json') for c in CONDITIONS+['current'] for s in SEEDS}}
        dump(out/'manifest.json',manifest);print('Prepared180 stand tasks +20 comparator reference inputs; no seasons run');return
    if a.mode=='report':report(out);return
    manifest=read(out/'manifest.json')
    if manifest['source']['source_sha256']!=provenance(ROOT)['source_sha256']:raise ValueError('growth source changed')
    for k,h in manifest['instrument_sha256'].items():
        if file_hash(ROOT/k)!=h:raise ValueError(f'instrument changed: {k}')
    for k,h in manifest['inputs'].items():
        if file_hash(out/k/'params.json')!=h:raise ValueError(f'input changed: {k}')
    if a.mode=='execute':
        binary,producer=native();bh=file_hash(binary)
        if manifest.get('binary_sha256',bh)!=bh:raise ValueError('native binary changed')
        manifest.update(binary_sha256=bh,native_producer=producer,jobs=a.jobs);dump(out/'manifest.json',manifest)
        tasks=[(c,s) for c in CONDITIONS for s in SEEDS if not (out/c/f's{s}/summary.json').exists()]
        def batch(ts,workers):
            runs=[Run(out=str(out/c/f's{s}/stand'),preset='mixedWood',seed=s,seasons=300,patch=read(out/c/f's{s}/params.json'),snapshots=[100,150,300],light=True) for c,s in ts]
            run_many(runs,workers=workers)
            for c,s in ts:summarise(out/c/f's{s}',c,s)
        if ('base',1) in tasks:
            start=time.monotonic();cpu=resource.getrusage(resource.RUSAGE_CHILDREN);batch([('base',1)],1)
            used=resource.getrusage(resource.RUSAGE_CHILDREN);manifest['pilot']={'wall_s':time.monotonic()-start,'waited_child_cpu_s':used.ru_utime+used.ru_stime-cpu.ru_utime-cpu.ru_stime};dump(out/'manifest.json',manifest)
            print('Registered base pilot complete',manifest['pilot'],flush=True);tasks.remove(('base',1))
        start=time.monotonic();cpu=resource.getrusage(resource.RUSAGE_CHILDREN)
        for i in range(0,len(tasks),a.jobs):
            batch(tasks[i:i+a.jobs],a.jobs)
            print(f'Stands complete: {180-len(tasks)+min(i+a.jobs,len(tasks))}/180',flush=True)
        used=resource.getrusage(resource.RUSAGE_CHILDREN);manifest['remaining_batch_cost']={'wall_s':time.monotonic()-start,'waited_child_cpu_s':used.ru_utime+used.ru_stime-cpu.ru_utime-cpu.ru_stime};dump(out/'manifest.json',manifest)
        report(out);return
    # Canonical current-garden lone comparators; stand-only planting/depth never leaks into them.
    binary=ROOT/'rust/target/native/release/treesim'
    if file_hash(binary)!=manifest['binary_sha256']:raise ValueError('binary differs from stand producer')
    gfout=out/'gforest';gfout.mkdir(exist_ok=True)
    a.worktree=str(ROOT);a.binary_hash=manifest['binary_sha256'];a.seasons=300;a.label='Layered A6b';a.width=160;a.patch_obj={};a.out=str(gfout)
    params={s:read(out/'current'/f's{s}/params.json') for s in SEEDS[:5]};species=sorted({t['species'] for s in SEEDS for t in read(out/'base'/f's{s}/params.json')['trees']})
    with ThreadPoolExecutor(a.jobs) as pool:
        fs={(sp,s):pool.submit(gf.lone_task,a,sp,params[s]) for sp in species for s in SEEDS[:5]}
        lone={sp:fs[sp,1].result() for sp in species};lone5={sp:{str(s):median(fs[sp,k].result()[str(s)] for k in SEEDS[:5]) for s in [150,300]} for sp in species}
    rows=[]
    for s in SEEDS:
        folder=out/'base'/f's{s}';p=read(folder/'params.json');cost=read(folder/'summary.json')['native_elapsed_s']
        rows.append(gf.summarise(s,str(folder/'stand'),len(p['trees']),p['trees'],lone,cost,float('nan'),300,lone5))
    g=gf.aggregate(rows,a);g.update(provenance=manifest['source'],binary_sha256=manifest['binary_sha256'],params_sha256={str(s):file_hash(out/'base'/f's{s}/params.json') for s in SEEDS},comparator_world_sha256={str(s):file_hash(out/'current'/f's{s}/params.json') for s in SEEDS[:5]},configuration='prepared full A6b stand; unchanged canonical lone comparators',timing_note='native elapsed from run.json; per-stand CPU not measured')
    dump(gfout/'evidence.json',g);(gfout/'evidence.md').write_text(gf.markdown(g));gf.compare(read(ROOT/'analysis/treesim/baselines/B1-v2.json'),g)
if __name__=='__main__':main()
