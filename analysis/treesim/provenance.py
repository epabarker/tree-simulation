"""Small source fingerprints shared by the on-demand instruments."""
import hashlib
import subprocess
from pathlib import Path


def file_hash(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def provenance(repo):
    repo = Path(repo).resolve()
    def git(*args):
        return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()
    sources = []
    for folder in ('rust/core/src', 'rust/cli/src', 'src/core'):
        sources.extend(p for p in (repo / folder).rglob('*') if p.is_file())
    sources.extend(repo / p for p in ('rust/presets.json', 'rust/Cargo.lock',
                                    'analysis/fit/hand-overrides.toml', 'cli/trials.ts'))
    return {'repository': str(repo), 'commit': git('rev-parse', 'HEAD'),
            'dirty': bool(git('status', '--porcelain')),
            'source_sha256': {str(p.relative_to(repo)): file_hash(p) for p in sorted(sources)}}


def build_native(repo):
    repo = Path(repo).resolve()
    subprocess.run(['cargo', 'build', '--release', '--locked', '-q', '-p', 'treesim',
                    '--target-dir', 'target/native'], cwd=repo / 'rust', check=True)
    return repo / 'rust/target/native/release/treesim'
