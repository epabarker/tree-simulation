"""Registered candidate phoneSeed3 vector; no production-baseline update."""
import argparse,json,subprocess,csv
from pathlib import Path
from treesim import Run,run_many
from treesim.provenance import file_hash,provenance
ROOT=Path(__file__).resolve().parents[2]
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--out',type=Path,required=True);a=ap.parse_args();out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
    subprocess.run(['node',str(Path(__file__).with_name('day3_layered_worker.ts')),'params','base','3','66',str(out/'params.json')],check=True)
    p=json.loads((out/'params.json').read_text());run_many([Run(out=str(out/'run'),preset='mixedWood',seed=3,seasons=150,patch=p,snapshots=[50,100,150])],workers=1)
    if json.loads((out/'run/run.json').read_text())['params']!=p:raise ValueError('input mismatch')
    with (out/'run/metrics.csv').open() as f:rows=list(csv.DictReader(f))
    vector={}
    for s in [50,100,150]:
        live=[r for r in rows if int(r['season'])==s and r['alive']=='1']
        vector.update({f'live{s}':len(live),f'planted{s}':sum(int(r['tree'])<len(p['trees']) for r in live),f'canopy{s}':sum(float(r['height'])>=40 for r in live),f'metamers{s}':sum(int(float(r['metamers'])) for r in live)})
    base=json.loads((ROOT/'tests/regressions.json').read_text())['phoneSeed3']['vector']
    result={'source':provenance(ROOT),'params_sha256':file_hash(out/'params.json'),'candidate':vector,'shipping_reference':base,'changed':{k:{'before':base.get(k),'candidate':v} for k,v in vector.items() if base.get(k)!=v}}
    (out/'comparison.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['changed'],indent=2))
    for name in ['metamers.csv','form.csv','buds.csv']:(out/'run'/name).unlink(missing_ok=True)
if __name__=='__main__':main()
