"""Durable gate/DAG/E3 instruments; no reference data or simulations required."""
import copy
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from treesim import build_dag, gforest
from treesim.dag_coverage import field_names, missing_reads, parameter_reads, table_paths
from treesim.dead_overrides import candidate_params, leaves, manifest_digest, perturbations, summarise
from treesim.provenance import file_hash

ROOT = Path(__file__).resolve().parents[2]


def evidence():
    return json.loads((ROOT / 'docs/experiments/code/2026-11-07-night2/gates/B0-v2.json').read_text())


def test_diagnostic_counts_cannot_fail_gforest(capsys):
    base, new = evidence(), evidence()
    new['pass']['hd300_all'] = 0
    new['pass']['crown_v2'] = 0  # v1 remains authoritative until step 2
    new['dist']['metamers200']['median'] *= 2
    assert gforest.compare(base, new)
    output = capsys.readouterr().out
    assert 'diagnostic hd300_all: 0' in output
    assert 'G-budget (separate): FAIL' in output
    assert 'VERDICT (four checks): PASS' in output


@pytest.mark.parametrize('version,crown', [(1, 'crown'), (2, 'crown_v2')])
@pytest.mark.parametrize('key', ['floor100', 'hd300', 'crown', 'plateau'])
def test_each_authoritative_count_has_an_inclusive_bar(version, crown, key, capsys):
    base, new = evidence(), evidence()
    if key == 'crown':
        key = crown
    new['pass'][key] = base['pass'][key] - 2
    assert gforest.compare(base, new, version)
    assert 'at its limit' in capsys.readouterr().out
    new['pass'][key] -= 1
    assert not gforest.compare(base, new, version)


def test_selected_crown_version_is_the_only_crown_gate():
    base, new = evidence(), evidence()
    new['pass']['crown'] = 0
    assert not gforest.compare(base, new, 1)
    assert gforest.compare(base, new, 2)


def test_comparison_refuses_mismatched_or_small_samples():
    base, new = evidence(), evidence()
    new['N'] = 19
    with pytest.raises(ValueError, match='at least 20'):
        gforest.compare(base, new)


def test_dotted_patches_preserve_unrelated_levels_and_nested_fields():
    params = {'species': {'oak': {'r2': {'levels': [{'lambda': .6}, {'lambda': .5}], 'relay': 0}}}}
    gforest.apply_patch(params, {'oak': {'r2.levels.1.lambda': .55, 'r2': {'relay': 2}}})
    assert params['species']['oak']['r2'] == {'levels': [{'lambda': .6}, {'lambda': .55}], 'relay': 2}


def test_reaggregate_retains_both_crown_fields_and_provenance(tmp_path, monkeypatch):
    value = evidence()
    value['provenance'] = {'commit': 'registered'}
    path = tmp_path / 'evidence.json'
    path.write_text(json.dumps(value))
    monkeypatch.setattr(sys, 'argv', ['gforest', 'reaggregate', str(path)])
    gforest.main()
    result = json.loads(path.read_text())
    assert result['pass'] == value['pass']
    assert result['provenance'] == value['provenance']
    assert 'crown v2' in path.with_suffix('.md').read_text()


def test_promoted_tools_resolve_their_companion_paths():
    helper = Path(gforest.HERE) / 'dump_garden.ts'
    assert helper.is_file()
    assert (ROOT / 'runs/lonecache') == Path(gforest.HERE).parents[1] / 'runs/lonecache'


def test_current_rust_reads_are_covered_by_hand_table():
    assert missing_reads(ROOT, build_dag.PARAMS) == {}


def test_coverage_guard_finds_new_direct_and_typed_reads():
    names = field_names((ROOT / 'rust/core/src/params.rs').read_text())
    names[('r1', 'new_knob')] = 'newKnob'
    names[('r6', 'new_clock')] = 'newClock'
    source = 'fn apply(params: &Params, short: &R6) { params.r1.new_knob; short.new_clock; }'
    missing = parameter_reads(source, names) - table_paths(build_dag.PARAMS)
    assert missing == {'r1.newKnob', 'r6.newClock'}


def test_coverage_removing_a_known_read_is_detected():
    reduced = [row for row in build_dag.PARAMS if row[0] != 'r6.lifespan']
    assert any('r6.lifespan' in rows for rows in missing_reads(ROOT, reduced).values())


def test_dag_is_importable_without_uncommitted_effective_json():
    assert build_dag.EFF == {}
    edges, pp, _ = build_dag.build()
    build_dag.assert_acyclic(pp)
    assert edges


def test_override_enumeration_and_perturbations():
    assert dict(leaves({'r2.levels': [{'lambda': .5}], 'r6.lifespan': None})) == {
        'r2.levels.0.lambda': .5, 'r6.lifespan': None}
    assert perturbations(True) == [('toggle', False)]
    assert perturbations(0) == [('zero-plus', .1)]
    assert perturbations('carbon') == []
    assert perturbations(.5) == [('m10', .45), ('p10', .55)]


def test_dead_override_report_requires_every_registered_seed():
    rows = [{'seed': i, 'identical': True} for i in range(1, 21)]
    assert summarise(rows)['finding'] == 'no observed effect at this setting'
    assert summarise(rows[:-1])['finding'] == 'incomplete; no conclusion'
    rows[0] = {'seed': 1, 'error': 'failed native run'}
    assert summarise(rows)['completed'] == 19
    assert summarise(rows)['finding'] == 'incomplete; no conclusion'
    rows[0] = {'seed': 1, 'identical': False}
    assert summarise(rows)['finding'] == 'effect observed'


def test_manifest_fingerprint_tracks_the_candidate_not_key_order():
    assert manifest_digest({'a': 1, 'b': 2}) == manifest_digest({'b': 2, 'a': 1})
    assert manifest_digest({'a': 1}) != manifest_digest({'a': 2})


@pytest.mark.skipif(not shutil.which('node') or not (ROOT / 'src/wasm/pkg/core_bg.wasm').exists(),
                    reason='instrument integration needs Node 24 and built WASM; analysis-only CI has neither')
def test_actual_lone_and_garden_params_and_candidate_relay(tmp_path):
    patch = tmp_path / 'patch.json'
    patch.write_text(json.dumps({'oak': {'r2.relay': 2}}))
    dest = tmp_path / 'dag'
    subprocess.run([sys.executable, '-m', 'treesim.build_dag', str(dest), '--worktree', str(ROOT),
                    '--patch', str(patch), '--no-figures'], check=True)
    dag = json.loads((dest / 'dag.json').read_text())
    assert dag['provenance']['commit']
    assert dag['provenance']['source_sha256']['rust/core/src/season.rs']
    lone = json.loads((dest / 'species_effective_lone.json').read_text())
    stand = json.loads((dest / 'species_effective_stand.json').read_text())
    garden = json.loads((dest / 'garden_params.json').read_text())
    assert lone['oak']['r2']['relay'] == stand['oak']['r2']['relay'] == 2
    assert not lone['oak']['o4']['enabled']
    assert stand['oak']['o4'] == {**garden['o4'], **garden['species']['oak']['o4']}
    assert 'r2.relayAge' not in dag['per_species']['stand']['oak']['dead']
    assert dag['provenance']['effective_sha256']['stand'] == file_hash(dest / 'species_effective_stand.json')


def test_stand_perturbation_changes_only_the_target_species_overlay():
    garden = {'r2': {'relay': 0}, 'species': {'oak': {'r2': {'relay': 1}},
                'beech': {'r2': {'relay': 3}}}, 'trees': [{'species': 'oak'}, {'species': 'beech'}]}
    manifest = {'worlds': {'1': {'stand': garden}}}
    patched = candidate_params(manifest, 'stand', 'oak', 1, {'path': 'r2.relay', 'values': {'stand': 2}})
    assert patched['r2']['relay'] == 0
    assert patched['species']['oak']['r2']['relay'] == 2
    assert patched['species']['beech']['r2']['relay'] == 3
    assert garden['species']['oak']['r2']['relay'] == 1
    assert patched['trees'] == garden['trees']


def test_sweep_analyser_retains_cli_and_writes_input_provenance(tmp_path):
    sweep = tmp_path / 'sweep'
    (sweep / 'res').mkdir(parents=True)
    jobs = []
    for tag, height in [('oak_base', 30), ('oak_r1-maturity_m10', 27), ('oak_r1-maturity_p10', 33)]:
        rows = [{'tag': tag, 'seed': seed, 'season': season, 'H': height, 'WH': .7, 'D': .3}
                for seed in (1, 2, 3) for season in (100, 150)]
        (sweep / 'res' / f'{tag}.json').write_text(json.dumps(rows))
        for seed in (1, 2, 3):
            jobs.append(f'{tag}\toak\t{seed}\t' + json.dumps({'r1.maturity': height * 4}))
    (sweep / 'jobs.tsv').write_text('\n'.join(jobs) + '\n')
    (sweep / 'values.json').write_text(json.dumps({'oak': {'r1.maturity': 120}}))
    out = tmp_path / 'effects.csv'
    subprocess.run([sys.executable, '-m', 'treesim.sweep_effects', str(sweep), str(out),
                    '--source-commit', 'fixture-producer'], check=True)
    import csv
    rows = list(csv.DictReader(out.open()))
    assert len(rows) == 4
    assert {r['dH_median'] for r in rows} == {'-3', '3'}
    metadata = json.loads(out.with_suffix('.csv.provenance.json').read_text())
    assert metadata['source_commit'] == 'fixture-producer'
    assert metadata['inputs_sha256']['values.json'] == file_hash(sweep / 'values.json')
