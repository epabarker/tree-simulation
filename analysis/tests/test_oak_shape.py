"""N3 instrument semantics: thickest child, stable ties and strict angle cutoff."""
import math
from treesim.oak_shape import stem_kinks

def tree(radii,angles):
    return {'m':{'parent':[-1,0,0,1], 'radius':radii,
        'hx':[math.sin(math.radians(a)) for a in angles],
        'hy':[math.cos(math.radians(a)) for a in angles], 'hz':[0]*4}}

def test_kinks_follows_thickest_child_instead_of_straightest_or_index():
    assert stem_kinks(tree([1,.1,.2,.1],[0,0,40,0]))==(1,2)

def test_equal_radius_tie_uses_first_child_and_follows_its_descendant():
    assert stem_kinks(tree([1,.2,.2,.1],[0,40,0,80]))==(2,3)

def test_kink_cutoff_is_strict_and_heading_dot_is_clamped():
    t=tree([1,.1,.2,.1],[0,0,40,0])
    exact=math.degrees(math.acos(t['m']['hy'][2]))
    assert stem_kinks(t,exact)==(0,2)
    t['m']['hy'][2]=1.00000000001;t['m']['hx'][2]=0
    assert stem_kinks(t)==(0,2)
