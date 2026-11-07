"""Registered legacy and completeness denominators, empty stands and exact bars."""
import json,subprocess,sys,importlib.util
from pathlib import Path
import pytest
from treesim.layered_gates import crown_gate,birch_poles
ROOT=Path(__file__).resolve().parents[2]

def rows(seed,value):return {'seed':seed,'crown':[{'species':'beech','season':s,'cbG':value} for s in [100,150]]}

def test_zero_crown_eligibility_does_not_pass():
    g=crown_gate([{'seed':1,'crown':[]}],'beech')
    assert g['legacy']=={'pass':0,'N':0,'bar':0,'ok':False}

def test_crown_75_percent_boundary_and_both_ages():
    rs=[rows(s,.10 if s<16 else .60) for s in range(1,21)]
    assert crown_gate(rs,'beech')['legacy']=={'pass':15,'N':20,'bar':15,'ok':True}
    rs[0]['crown'][1]['cbG']=.60
    assert not crown_gate(rs,'beech')['legacy']['ok']

def test_missing_measurements_are_reported_against_height_eligibility():
    g=crown_gate([rows(s,.2 if s<4 else None) for s in range(1,6)],'beech')
    assert g['legacy']['ok'] and g['legacy']['N']==3
    assert g['height_complete']['N']==5 and not g['height_complete']['ok']
    assert g['missing_tree_snapshots']==4

def test_poles_uses_recruits_at100_inclusive_height_and_hd_boundaries():
    def r(tree,hd,age=100,H=40,alive=1):return dict(tree=tree,slenderness=hd,season=age,height=H,alive=alive,species='birch')
    assert birch_poles([r(0,500),r(1,500,age=150),r(1,500,H=39)],1)['pass']
    assert birch_poles([r(1,120)],1)['pass']
    assert not birch_poles([r(1,120.1)],1)['pass']

@pytest.fixture(scope='module')
def prepared(tmp_path_factory):
    p=tmp_path_factory.mktemp('layered')
    subprocess.run(['node','analysis/experiments/day3_layered_params.ts','prepare',str(p)],cwd=ROOT,check=True)
    return p

def test_layered_factory_oat_only_changes_the_named_root_and_lone_stays_identical(prepared):
    base=json.loads((prepared/'base/s1/params.json').read_text())
    assert len(base['trees'])==12 and base['o4']['maxTrees']==57
    assert base['world']['depth']==24 and base['world']['sidesZ']=='periodic'
    for name,path in [('depth',('world','depth')),('kExt',('c2','kExt')),('eS',('r5','eS')),('dLambda',('r5','dLambda'))]:
        for step,factor in [('m10',.9),('p10',1.1)]:
            p=json.loads((prepared/f'{name}-{step}/s1/params.json').read_text())
            g,k=path;assert p[g][k]==pytest.approx(base[g][k]*factor)
            p[g][k]=base[g][k];assert p==base
    proof=json.loads((prepared/'lone-input-identity.json').read_text())
    assert proof['N']==160 and all(r['before_sha256']==r['after_sha256'] for r in proof['records'])

def test_dag_prepared_stand_does_not_leak_into_lone(prepared,tmp_path):
    subprocess.run([sys.executable,'-m','treesim.build_dag',str(tmp_path),'--worktree',str(ROOT),'--stand-params',str(prepared/'depth-m10/s1/params.json'),'--no-figures'],check=True,cwd=ROOT)
    stand=json.loads((tmp_path/'species_effective_stand.json').read_text());lone=json.loads((tmp_path/'species_effective_lone.json').read_text())
    assert stand['beech']['world']['depth']==pytest.approx(21.6)
    assert stand['beech']['world']['sidesZ']=='periodic'
    assert lone['beech']['world']['depth']==64 and lone['beech']['world'].get('sidesZ')!='periodic'
    assert json.loads((tmp_path/'provenance.json').read_text())['stand_params_sha256']

def test_full_native_reduction_measures_lai_floor_and_planted_crown(tmp_path):
    spec=importlib.util.spec_from_file_location('day3_layered',ROOT/'analysis/experiments/day3_layered.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    p={'trees':[{'species':'beech'},{'species':'hornbeam'},{'species':'beech'}],'world':{'width':160,'depth':24}}
    (tmp_path/'params.json').write_text(json.dumps(p));d=tmp_path/'stand';d.mkdir()
    (d/'run.json').write_text(json.dumps({'params':p,'meta':{'ms':1000}}));(d/'hash.txt').write_text('witness')
    metrics=['season,tree,species,alive,height,slenderness,metamers']
    for s in [100,150,200,300]:
        metrics += [f'{s},{i},{t["species"]},1,50,100,100' for i,t in enumerate(p['trees'])]
    (d/'metrics.csv').write_text('\n'.join(metrics)+'\n')
    geo=['season,tree,birthId,parentBirthId,order,x0,y0,z0,x1,y1,z1']
    light=['season,col,row,shade,lad']
    for s in [100,150,300]:
        for i in range(3):geo += [f'{s},{i},0,-1,0,0,0,0,0,50,0',f'{s},{i},1,0,1,0,10,0,12,10,0']
        for col in [0,1]:
            for row in [0,1]:light.append(f'{s},{col},{row},.95,3')
    (d/'metamers.csv').write_text('\n'.join(geo)+'\n');(d/'light.csv').write_text('\n'.join(light)+'\n')
    r=module.summarise(tmp_path,'base',1)
    assert r['floor']['100']==pytest.approx(.05) and r['lai']['150']==6
    assert r['beech_alive150']==2 and r['metamers200']==300
    assert len(r['crown'])==9 and all(x['cbG']==pytest.approx(.2) for x in r['crown'])
