"""Lexical staleness guard for the hand-written DAG (not a Rust parser).

Recognises direct Params group reads, typed group arguments and simple borrowed
aliases. Each newly read field must appear in the edge table or an explained
exception. Per-level shorthand is checked conservatively against PaLevel fields.
"""
import re
from pathlib import Path

TYPES = {'WorldP': 'world', 'PaLevel': 'r2.levels[k]',
         **{f'{p.upper()}{i}': f'{p}{i}' for p, n in [('c', 6), ('r', 6), ('o', 4)] for i in range(1, n + 1)}}


def field_names(source):
    """Rust fields -> JSON names from the typed decoder; special derived fields explicit."""
    result = {}
    for typ, group in TYPES.items():
        block = re.search(r'pub struct ' + typ + r'\s*\{(.*?)\n\}', source, re.S)
        if not block:
            continue
        for field in re.findall(r'pub (\w+):', block[1]):
            # Typed decoder is authoritative for unusual names such as E, T and agedBy.
            match = re.search(r'\b' + field + r':\s*(?:num|opt|flag|text)\(\w+,\s*"([^"]+)"', source)
            name = match[1] if match else re.sub(r'_([a-z])', lambda m: m[1].upper(), field)
            result[(group, field)] = name
    result.update({('world', 'periodic'): 'periodic', ('world', 'periodic_z'): 'periodicZ',
                   ('r1', 'shed_carbon'): 'shed', ('r3', 'c'): 'c',
                   ('c1', 'bud_break_width'): 'budBreak.width',
                   ('c1', 'bud_break_stochastic'): 'budBreak.mode', ('r3', 'sag_increment'): 'sag',
                   ('r2.levels[k]', 'aged_by_tree'): 'agedBy'})
    return result


def parameter_reads(source, names):
    source = re.sub(r'//[^\n]*|/\*.*?\*/', '', source.split('#[cfg(test)]')[0], flags=re.S)
    reads = set()
    for group, field in re.findall(r'\b\w+\.(world|c[1-6]|r[1-6]|o[1-4])\.(\w+)', source):
        if (group, field) in names:
            reads.add(group + '.' + names[(group, field)])
    aliases = {name: TYPES[typ] for name, typ in re.findall(r'\b(\w+):\s*&(?:mut\s+)?(\w+)\b', source) if typ in TYPES}
    for name, group in re.findall(r'let\s+(\w+)\s*=\s*&\w+\.(world|c[1-6]|r[1-6]|o[1-4])\s*;', source):
        aliases[name] = group
    # The core's per-level access patterns: pa_level() Option bindings,
    # direct borrowed rows, and the |l| shorthand in level iterators/map closures.
    for alias in re.findall(r'let\s+Some\((\w+)\)\s*=\s*pa_level\(', source):
        aliases[alias] = 'r2.levels[k]'
    for alias in re.findall(r'let\s+(\w+)\s*=\s*&[\w.]+\.levels\[', source):
        aliases[alias] = 'r2.levels[k]'
    if 'pa_level(' in source or '.levels.iter()' in source:
        aliases['l'] = 'r2.levels[k]'
    for alias, group in aliases.items():
        for field in re.findall(r'\b' + alias + r'\.(\w+)', source):
            if (group, field) in names:
                reads.add(group + '.' + names[(group, field)])
    return reads


def table_paths(params):
    paths = set()
    for name, _, _ in params:
        group, _, tail = name.rpartition('.')
        for part in name.split(' / '):
            part = part.split(' (')[0]
            if part == 'Hi' and tail.startswith('vigourTreeLo'):
                part = 'vigourTreeHi'
            paths.add(part if '.' in part else group + '.' + part)
    return paths


def missing_reads(repo, params):
    repo = Path(repo)
    names = field_names((repo / 'rust/core/src/params.rs').read_text())
    covered = table_paths(params)
    missing = {}
    # Principles plus season, light and stand consumers; new files are included automatically.
    for path in (repo / 'rust/core/src').rglob('*.rs'):
        if path.name in {'params.rs', 'testing.rs'}:
            continue
        uncovered = {p for p in parameter_reads(path.read_text(), names)
                     if p not in covered and p != 'r2.levels'}
        if uncovered:
            missing[str(path.relative_to(repo))] = sorted(uncovered)
    return missing
