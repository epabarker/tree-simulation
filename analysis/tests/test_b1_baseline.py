"""Frozen B1's approved contract: relative counts are not absolute-band validation."""
import json
from pathlib import Path
from treesim import gforest

def test_b1_is_frozen_at_the_registered_current_garden_configuration():
    b=json.loads((Path(__file__).parents[1]/'treesim/baselines/B1-v2.json').read_text())
    assert b['N']==20 and b['seeds']==list(range(1,21))
    assert b['configuration']['recruits']==.25 and b['width']==160 and b['seasons']==300
    assert b['configuration']['crown_version']==2
    assert b['authoritative_checks']==['floor100','hd300','crown_v2','plateau']
    assert b['bars']=={'floor100':-2,'hd300':-2,'crown_v2':12,'plateau':10}
    assert {k:b['pass'][k] for k in b['authoritative_checks']}=={'floor100':0,'hd300':0,'crown_v2':14,'plateau':12}
    assert 'per_seed' not in b
    assert gforest.compare(b,b)
