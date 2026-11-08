"""Registered N1 confirmation, seeds 1–20, before vs lifespan absent; no fitting.

uv run --project analysis python analysis/experiments/day3_beech.py --out runs/day3-step3/n1 --jobs 8
Use --prepare-only to inspect the manifest/params without simulations.
Outputs metrics/traces and shape summaries; bulky metamer tables are removed after measurement.
"""
import argparse
import csv
import json
import math
import subprocess
import time
from pathlib import Path
from statistics import median
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import polars as pl

from treesim import Run, run_many
from treesim import coarsen as co, cylinders as cy, simtree
from treesim.crown_shape import crown_shape
from treesim.provenance import build_native, file_hash, provenance

ROOT = Path(__file__).resolve().parents[2]
D_MIN = 0.008621381595730782
SEEDS = range(1, 21)


def lone_shape(run, seed):
    """Measure the original full-precision WASM dump, never rounded native CSV."""
    result = []
    dump = json.loads((run / 'trees.json').read_text())
    for tree in dump['trees']:
        season = tree['season']
        raw = simtree.from_dump(tree).cylinders
        c = co.coarsen(raw, co.Resolution(D_MIN, (), ()), inflated=True)
        shape = crown_shape(c, f'beech-{seed}-{season}')
        if not math.isfinite(shape['D']):
            raise ValueError(f'nonfinite D: {run}, {season}')
        result.append({'seed': seed, 'season': season, 'H': cy.height(raw), **shape})
    if {r['season'] for r in result} != {100, 150}:
        raise ValueError('need both living lone snapshots')
    (run / 'shape.json').write_text(json.dumps(result, indent=2) + '\n')
    return result


def run_lone(params_path, dump_path):
    subprocess.run(['node', str(Path(__file__).with_name('day3_beech_lone.ts')),
                    str(params_path), str(dump_path)], check=True)


def layered_crown_bases(run, params):
    from treesim.crown_base import limb_base_ratio
    planted = [i for i, tree in enumerate(params['trees']) if tree['species'] == 'beech']
    names = ['season', 'tree', 'birthId', 'parentBirthId', 'order', 'x0', 'y0', 'z0', 'x1', 'y1', 'z1']
    data = pl.read_csv(run / 'metamers.csv', columns=names, infer_schema_length=0)
    rows = []
    for season in (100, 150):
        for tree in planted:
            frame = data.filter((pl.col('season') == str(season)) & (pl.col('tree') == str(tree)))
            if frame.height == 0:
                continue
            height = frame['y1'].cast(pl.Float64).max() - frame['y0'].cast(pl.Float64).min()
            if height < 40:
                continue  # report the counted canopy denominator separately from all planted survivors
            value = limb_base_ratio(frame.to_dict(as_series=False))
            rows.append({'season': season, 'tree': tree, 'height_m': height * .25, 'cbG': value})
    (run / 'crown-base.json').write_text(json.dumps(rows, indent=2) + '\n')
    return rows


def planted_trace(run, params):
    """Trace every planted beech without inventing a per-cause shedding/death metric."""
    planted = [i for i, tree in enumerate(params['trees']) if tree['species'] == 'beech']
    with (run / 'metrics.csv').open() as f:
        rows = [r for r in csv.DictReader(f) if int(r['tree']) in planted]
    result = []
    for tree in planted:
        history = [r for r in rows if int(r['tree']) == tree]
        last = next((r for r in history if int(float(r['season'])) == 150), None)
        if not last:
            raise ValueError(f'missing planted-tree outcome: {run}, {tree}')
        death = next((r for r in history if r['alive'] == '0'), None)
        previous = [r for r in history if death and float(r['season']) < float(death['season'])]
        before = previous[-1] if previous else None
        # Starvation precedes O4 in the death phase; otherwise leave cause unresolved.
        threshold = params['species']['beech']['r1'].get('kStarve', params['r1']['kStarve'])
        supported = death and float(death['starved']) >= threshold
        fields = ('season', 'alive', 'height', 'metamers', 'shortShoots', 'dormantBuds', 'meanBudQ',
                  'qBase', 'vBase', 'production', 'maintenance', 'reserve', 'starved', 'shed', 'aborted', 'broken', 'groundLight')
        trace = [{k: r[k] for k in fields if k in r} for r in history]
        result.append({'tree': tree, 'alive150': last['alive'] == '1',
                       'death_season': float(death['season']) if death else None,
                       'death_class': 'consistent with starvation' if supported else 'other/unresolved' if death else 'alive',
                       'before_death': before, 'trace': trace})
    (run / 'beech-trace.json').write_text(json.dumps(result, indent=1) + '\n')
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--jobs', type=int, default=8)
    ap.add_argument('--prepare-only', action='store_true')
    a = ap.parse_args()
    if not 1 <= a.jobs <= 8:
        ap.error('registered maximum is 8 workers')
    out = a.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    specs = []
    for context in ('layered', 'lone'):
        for condition in ('before', 'candidate'):
            for seed in SEEDS:
                path = out / f'{context}-{condition}-s{seed}'
                path.mkdir(parents=True, exist_ok=True)
                params_path = path / 'params.json'
                subprocess.run(['node', str(Path(__file__).with_name('day3_beech_params.ts')),
                                context, str(seed), condition, str(params_path)], check=True)
                params = json.loads(params_path.read_text())
                specs.append((context, condition, seed, path, params))
    source = provenance(ROOT)
    manifest = {'source': source, 'D_min': D_MIN, 'seeds': list(SEEDS), 'seasons': 150,
                'jobs': a.jobs, 'instrument_sha256': {p.name: file_hash(p) for p in
                    [Path(__file__), Path(__file__).with_name('day3_beech_params.ts'),
                     Path(__file__).with_name('day3_beech_lone.ts'),
                     ROOT / 'analysis/treesim/crown_shape.py', ROOT / 'analysis/treesim/crown_base.py']}, 'runs': [{'context': c, 'condition': k, 'seed': s,
                    'out': str(p), 'params_sha256': file_hash(p / 'params.json')} for c, k, s, p, _ in specs]}
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    if a.prepare_only:
        print('Prepared 80 runs; no simulations executed')
        return
    binary = build_native(ROOT)
    manifest['binary_sha256'] = file_hash(binary)
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    runs = [Run(out=str(p), preset='mixedWood', seed=s, seasons=150, patch=params,
                snapshots=[100, 150], light=True) for c, _, s, p, params in specs if c == 'layered']
    # The first pre-registered seed measures cost; its result is part of the 20-seed evidence.
    start = time.monotonic()
    run_many(runs[:1], workers=1)
    print(f'First layered-before seed: {time.monotonic()-start:.1f} wall seconds; scheduling remaining 39 layered runs with {a.jobs} workers', flush=True)
    run_many(runs[1:], workers=a.jobs)
    for c, _, _, path, requested in specs:
        if c == 'layered' and json.loads((path / 'run.json').read_text())['params'] != requested:
            raise ValueError(f'CLI preset leaked into requested world: {path}')
    with ThreadPoolExecutor(a.jobs) as pool:
        futures = [pool.submit(run_lone, p / 'params.json', p / 'trees.json')
                   for c, _, _, p, _ in specs if c == 'lone']
        for future in futures:
            future.result()
    report = {'manifest': manifest, 'lone': {}, 'layered': {}}
    for context, condition in (('layered', 'before'), ('layered', 'candidate'), ('lone', 'before'), ('lone', 'candidate')):
        selected = [x for x in specs if x[0] == context and x[1] == condition]
        if context == 'layered':
            rows = [{'seed': seed, 'trees': planted_trace(path, params),
                     'crown_base': layered_crown_bases(path, params)} for _, _, seed, path, params in selected]
            alive = sum(t['alive150'] for row in rows for t in row['trees'])
            report['layered'][condition] = {'alive150': alive, 'planted': 40, 'per_seed': rows}
        else:
            rows = [r for _, _, seed, path, _ in selected for r in lone_shape(path, seed)]
            summary = {}
            for season in (100, 150):
                values = [r for r in rows if r['season'] == season]
                if len(values) != 20:
                    raise ValueError('lone gate needs all 20 seeds')
                summary[str(season)] = {key: {'median': median(r[key] for r in values),
                    'min': min(r[key] for r in values), 'max': max(r[key] for r in values)} for key in ('H', 'D', 'WH')}
                summary[str(season)]['D_in_band'] = sum(.22 <= r['D'] <= .77 for r in values)
            report['lone'][condition] = {'summary': summary, 'per_seed': rows}
        for _, _, _, path, _ in selected:
            for name in ('metamers.csv', 'form.csv', 'buds.csv', 'ground.csv'):
                (path / name).unlink(missing_ok=True)
        (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
        print(context, condition, 'measured', flush=True)
    candidate = report['lone']['candidate']['summary']['150']
    passed = report['layered']['candidate']['alive150'] >= 20 and 26 <= candidate['H']['median'] <= 44.3 and .22 <= candidate['D']['median'] <= .77
    print('N1 candidate:', 'PASS' if passed else 'FAIL', 'survival',report['layered']['candidate']['alive150'],'/40',
          'H150',candidate['H']['median'],'D150',candidate['D']['median'], flush=True)
    if not passed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
