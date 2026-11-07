"""Day-3 ruling 7: compare the frozen old binary/params with current holly on seeds 1–20.

Before editing, retain the binary and dump_effective.ts output. Then:
  uv run --project analysis python analysis/experiments/day3_holly_keys.py \
    --before-binary runs/day3-step2/before-treesim \
    --before-params runs/day3-step2/before-params/species_effective_lone.json \
    --out runs/day3-step2/holly --jobs 3

Registered in docs/plans/2026-11-07-day3.md before any run. This verifies a dead-key
removal at its existing setting, not a biological effect or a sweep of new settings.
"""
import argparse
import copy
import json
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from treesim.provenance import build_native, file_hash, provenance

ROOT = Path(__file__).resolve().parents[2]


def differences(a, b, path=()):
    if isinstance(a, dict) and isinstance(b, dict):
        for key in sorted(a.keys() | b.keys()):
            if key not in a or key not in b:
                yield path + (key,)
            else:
                yield from differences(a[key], b[key], path + (key,))
    elif isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        for i, (x, y) in enumerate(zip(a, b)):
            yield from differences(x, y, path + (str(i),))
    elif a != b:
        yield path


def run(binary, params, out):
    out.mkdir(parents=True, exist_ok=True)
    path = out / 'params.json'
    path.write_text(json.dumps(params))
    start = time.monotonic()
    subprocess.run([str(binary), '--preset', 'mixedWood', '--params', str(path), '--seasons', '150',
                    '--out', str(out), '--quiet'], stdout=subprocess.DEVNULL, check=True)
    value = (out / 'hash.txt').read_text().strip()
    for name in ('metamers.csv', 'form.csv', 'buds.csv', 'ground.csv'):
        (out / name).unlink(missing_ok=True)
    return {'hash': value, 'wall_seconds': time.monotonic() - start, 'params_sha256': file_hash(path)}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--before-binary', required=True, type=Path)
    ap.add_argument('--before-params', required=True, type=Path)
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--jobs', type=int, default=3)
    a = ap.parse_args()
    if not 1 <= a.jobs <= 12:
        ap.error('jobs must be 1–12')
    out = a.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    before = json.loads(a.before_params.read_text())['holly']
    after_dir = out / 'after-params'
    subprocess.run(['node', str(ROOT / 'analysis/treesim/dump_effective.ts'), str(ROOT), str(after_dir)], check=True)
    after = json.loads((after_dir / 'species_effective_lone.json').read_text())['holly']
    delta = list(differences(before, after))
    allowed = {('r2', k) for k in ('vigourTreeLo', 'vigourTreeHi')} | {
        ('species', 'holly', 'r2', k) for k in ('vigourTreeLo', 'vigourTreeHi')}
    if not delta or not set(delta) <= allowed:
        raise ValueError(f'unrelated or missing effective-param changes: {delta}')
    binary = build_native(ROOT)
    manifest = {'source': provenance(ROOT), 'before_binary_sha256': file_hash(a.before_binary),
                'after_binary_sha256': file_hash(binary), 'before_params_sha256': file_hash(a.before_params),
                'differences': delta, 'seeds': list(range(1, 21)), 'seasons': 150, 'jobs': a.jobs}
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    def pair(seed):
        result = {'seed': seed}
        for label, p, executable in [('before', before, a.before_binary.resolve()), ('after', after, binary)]:
            params = copy.deepcopy(p)
            params['seed'] = seed
            result[label] = run(executable, params, out / label / f's{seed}')
        result['identical'] = result['before']['hash'] == result['after']['hash']
        return result
    with ThreadPoolExecutor(a.jobs) as ex:
        rows = list(ex.map(pair, range(1, 21)))
    report = {**manifest, 'identical': sum(row['identical'] for row in rows), 'N': 20, 'per_seed': rows}
    (out / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f"Holly dead-key deletion: {report['identical']}/20 identical (hard bar 20/20)")
    if report['identical'] != 20:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
