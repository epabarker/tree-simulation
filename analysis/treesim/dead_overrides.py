"""On-demand E3: prepare first, then explicitly execute a registered hash experiment.

uv run --project analysis python -m treesim.dead_overrides prepare --out runs/e3
uv run --project analysis python -m treesim.dead_overrides execute --out runs/e3 --jobs 3

The manifest freezes source fingerprints, effective params and all perturbations.
No simulation runs during prepare. execute refuses changed sources or manifests;
it retains final hashes, params and errors, removing bulky geometry after success.
This reports observed hash equality, never proves that a knob is causally dead.
"""
import argparse
import copy
import hashlib
import json
import math
import subprocess
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import build_dag
from .gforest import apply_patch, set_path
from .provenance import build_native, file_hash, provenance

SPECIES = ('beech', 'hornbeam', 'birch', 'oak', 'holly', 'maple', 'rowan', 'willow')
SEEDS = list(range(1, 21))


def leaves(value, prefix=''):
    if isinstance(value, dict):
        for key, child in sorted(value.items()):
            yield from leaves(child, f'{prefix}.{key}' if prefix else key)
    elif isinstance(value, list):
        for i, child in enumerate(value):
            yield from leaves(child, f'{prefix}.{i}')
    else:
        yield prefix, value


def read_path(params, path):
    value = params
    for key in path.split('.'):
        value = value[int(key)] if isinstance(value, list) else value[key]
    return value


def perturbations(value):
    if isinstance(value, bool):
        return [('toggle', not value)]
    if isinstance(value, (float, int)) and math.isfinite(value):
        if value == 0:
            return [('zero-plus', 0.1)]
        return [('m10', value * 0.9), ('p10', value * 1.1)]
    return []


def manifest_digest(manifest):
    return hashlib.sha256(json.dumps(manifest, sort_keys=True).encode()).hexdigest()


def prepare(repo, out):
    out.mkdir(parents=True, exist_ok=True)
    manifest_path = out / 'manifest.json'
    if manifest_path.exists():
        raise ValueError('manifest exists; choose a fresh output directory')
    overrides = tomllib.loads((repo / 'analysis/fit/hand-overrides.toml').read_text())
    params, worlds = {}, {}
    for seed in SEEDS:
        sd = out / 'inputs' / f's{seed}'
        subprocess.run(['node', str(Path(__file__).with_name('dump_effective.ts')),
                        str(repo), str(sd), '160', str(seed)], check=True)
        params[str(seed)] = {c: json.loads((sd / f'species_effective_{c}.json').read_text())
                             for c in ('lone', 'stand')}
        worlds[str(seed)] = {'lone': json.loads((sd / 'species_worlds_lone.json').read_text()),
                             'stand': json.loads((sd / 'garden_params.json').read_text())}
    conditions, unsupported = [], []
    for sp in SPECIES:
        own = dict(overrides.get('broadleaf', {}).get('assign', {}))
        own.update(overrides.get(sp, {}))
        for path, override in leaves(own):
            candidates, effective_base = {}, {}
            for context in ('lone', 'stand'):
                try:
                    value = read_path(params['1'][context][sp], path)
                except (KeyError, IndexError, TypeError):
                    unsupported.append({'species': sp, 'path': path, 'context': context,
                                        'value': override, 'reason': 'absent from effective params'})
                    continue
                effective_base[context] = value
                changes = perturbations(value)
                if not changes:
                    unsupported.append({'species': sp, 'path': path, 'context': context,
                                        'value': value, 'reason': 'unsupported effective leaf'})
                for step, patched in changes:
                    candidates.setdefault(step, {})[context] = patched
            for step, values in candidates.items():
                cond = {'species': sp, 'path': path, 'base_override': override,
                        'base_effective': effective_base, 'step': step, 'values': values,
                        'dag': {}}
                for context, patched in values.items():
                    p = copy.deepcopy(params['1'][context][sp])
                    set_path(p, path, patched)
                    edges, pp, _ = build_dag.build(p, build_dag.CONTEXTS[context])
                    reach = build_dag.lags(edges, pp)
                    cond['dag'][context] = {'dead': sorted(n for n, _, _ in build_dag.PARAMS
                        if not reach.get(n) and n not in build_dag.SELF_GATED)}
                cond['id'] = hashlib.sha256(json.dumps(cond, sort_keys=True).encode()).hexdigest()[:16]
                conditions.append(cond)
    manifest = {'version': 1, 'source': provenance(repo), 'seeds': SEEDS,
                'seasons': {'lone': 150, 'stand': 300}, 'width': 160,
                'params': params, 'worlds': worlds, 'conditions': conditions, 'unsupported': unsupported,
                'tool_sha256': {p.name: file_hash(p) for p in
                    [Path(__file__), Path(build_dag.__file__), Path(__file__).with_name('gforest.py'),
                     Path(__file__).with_name('dump_effective.ts'), Path(__file__).with_name('provenance.py')]}}
    manifest_path.write_text(json.dumps(manifest, indent=1) + '\n')
    (out / 'manifest.sha256').write_text(manifest_digest(manifest) + '\n')
    print(f'Registered {len(conditions)} perturbations × 2 contexts × 20 seeds; no simulations run')


def run_hash(binary, params, seasons, out):
    out.mkdir(parents=True, exist_ok=True)
    param_path = out / 'params.json'
    param_path.write_text(json.dumps(params))
    subprocess.run([str(binary), '--preset', 'mixedWood', '--params', str(param_path),
                    '--seasons', str(seasons), '--out', str(out), '--quiet'], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    result = (out / 'hash.txt').read_text().strip()
    if not result:
        raise ValueError('empty final hash')
    for name in ('metamers.csv', 'form.csv', 'buds.csv', 'ground.csv', 'light.csv'):
        (out / name).unlink(missing_ok=True)
    return result


def summarise(rows):
    good = [r for r in rows if 'identical' in r]
    identical = sum(r['identical'] for r in good)
    return {'expected': 20, 'completed': len(good), 'identical': identical,
            'errors': [r for r in rows if 'error' in r],
            'finding': 'no observed effect at this setting' if len(good) == 20 and identical == 20
                       else 'effect observed' if any(not r['identical'] for r in good)
                       else 'incomplete; no conclusion'}


def candidate_params(manifest, context, species, seed, condition=None):
    worlds = manifest['worlds'][str(seed)]
    params = copy.deepcopy(worlds['lone'][species] if context == 'lone' else worlds['stand'])
    if condition:
        apply_patch(params, {species: {condition['path']: condition['values'][context]}})
    return params


def execute(repo, out, jobs):
    manifest = json.loads((out / 'manifest.json').read_text())
    if manifest_digest(manifest) != (out / 'manifest.sha256').read_text().strip():
        raise ValueError('manifest changed; prepare a new experiment')
    current = provenance(repo)
    if current['commit'] != manifest['source']['commit'] or current['source_sha256'] != manifest['source']['source_sha256']:
        raise ValueError('source changed; prepare a new experiment')
    for name, digest in manifest['tool_sha256'].items():
        if file_hash(Path(__file__).with_name(name)) != digest:
            raise ValueError(f'tool changed: {name}; prepare a new experiment')
    binary = build_native(repo)
    (out / 'execution.json').write_text(json.dumps({'binary_sha256': file_hash(binary), 'jobs': jobs}))
    def task(context, sp, seed, condition=None):
        tag = condition['id'] if condition else 'base'
        dest = out / 'runs' / context / sp / tag / f's{seed}'
        p = candidate_params(manifest, context, sp, seed, condition)
        return run_hash(binary, p, manifest['seasons'][context], dest)
    report = {'source': manifest['source'], 'conditions': []}
    # Only one wave at a time: never exceed --jobs simulation processes.
    with ThreadPoolExecutor(jobs) as ex:
        for sp in SPECIES:
            for context in ('lone', 'stand'):
                bases = {seed: ex.submit(task, context, sp, seed) for seed in SEEDS}
                base_results = {}
                for seed, future in bases.items():
                    try:
                        base_results[seed] = future.result()
                    except Exception as error:
                        base_results[seed] = {'error': str(error)}
                for cond in (c for c in manifest['conditions'] if c['species'] == sp and context in c['values']):
                    futures = {seed: ex.submit(task, context, sp, seed, cond)
                               for seed in SEEDS if isinstance(base_results[seed], str)}
                    rows = []
                    for seed in SEEDS:
                        try:
                            if seed not in futures:
                                raise RuntimeError(f'base failed: {base_results[seed]}')
                            rows.append({'seed': seed, 'identical': futures[seed].result() == base_results[seed]})
                        except Exception as error:
                            rows.append({'seed': seed, 'error': str(error)})
                    result = {**cond, 'context': context, **summarise(rows), 'per_seed': rows}
                    report['conditions'].append(result)
                    (out / 'report.json').write_text(json.dumps(report, indent=1) + '\n')
                    print(sp, context, cond['path'], cond['step'], result['finding'],
                          f"{result['identical']}/20 identical; {result['completed']}/20 completed", flush=True)

    if any(row['errors'] for row in report['conditions']):
        raise ValueError('experiment has failed runs; see report.json; no complete equality claim for those conditions')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('command', choices=('prepare', 'execute'))
    ap.add_argument('--worktree', type=Path, default=Path(__file__).resolve().parents[2])
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--jobs', type=int, default=3)
    a = ap.parse_args()
    if not 1 <= a.jobs <= 12:
        ap.error('jobs must be 1–12')
    repo, out = a.worktree.resolve(), a.out.resolve()
    try:
        if a.command == 'prepare':
            prepare(repo, out)
        else:
            execute(repo, out, a.jobs)
    except (ValueError, subprocess.CalledProcessError) as error:
        ap.exit(1, f'{error}\n')


if __name__ == '__main__':
    main()
