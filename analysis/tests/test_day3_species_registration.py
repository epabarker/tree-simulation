"""Scientific registration integrity: frozen targets/split and form-only candidates."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]

def test_current_beech_preserves_real_targets_and_five_historical_holdouts():
    old_path=ROOT/'analysis/fit/sources/level1-beech.json'
    old=json.loads(old_path.read_text());new=json.loads((ROOT/'analysis/fit/sources/day3-beech-v7.json').read_text())
    assert old['status']=='superseded' and old['version']==6
    assert new['parent']['sha256']==hashlib.sha256(old_path.read_bytes()).hexdigest()
    for key in ['fitted','held_out','real','demol','size_match','d_min_m','descriptors','location_weights']:
        assert new[key]==old[key],key
    assert len(new['held_out'])==5 and len(new['fitted'])==13
    assert not new['fixed'] and not new['candidate_protocol']['current_assign']
    assert new['current_effective']['r6'].get('lifespan') is None
    assert new['target_identity']['differences']==0

def test_beech_training_selection_and_confirmations_are_disjoint_twenty_seed_blocks():
    reg=json.loads((ROOT/'analysis/fit/sources/day3-beech-v7.json').read_text())
    blocks=list(reg['day3_seeds'].values())
    assert all(len(b)==20 and len(set(b))==20 for b in blocks)
    assert len(set().union(*map(set,blocks)))==sum(map(len,blocks))

def test_historical_candidates_change_only_registered_form_not_physiology():
    reg=json.loads((ROOT/'analysis/fit/sources/day3-beech-v7.json').read_text())
    candidates=json.loads((ROOT/'analysis/experiments/day3_beech_candidates.json').read_text())['candidates']
    assert candidates['current']=={}
    for name,prior in [('prior-v3','level1-pilot-v3'),('prior-v4','level1-pilot-v4')]:
        source=json.loads((ROOT/f'docs/experiments/fits/{prior}/beech.json').read_text())['fit']['assign']
        assert set(candidates[name])==set(reg['start'])
        assert candidates[name]=={k:source[k] for k in reg['start']}
        assert all(k.startswith('r2.') for k in candidates[name])
