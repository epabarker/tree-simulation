#!/usr/bin/env bash
# #135's floored height rule (docs/experiments/2026-11-19-floored-height-rule.md): every arm of
# <arms.json> × its species × seeds <first>–<last>, the lone tree to season 100, by lone.ts.
# At most <jobs> simulators at once (default 10; check `pgrep -c treesim` and other sessions'
# runs first: the machine's cap is 12). Writes runs/135-floored-height/<name>.jsonl (generated,
# never committed). Run from the repo root.
#
#   bash docs/experiments/code/2026-11-19-floored-height/run.sh <arms.json> <name> <first> <last> [jobs] [arm,arm]
set -euo pipefail
here=docs/experiments/code/2026-11-19-floored-height
arms=$1
name=$2
first=$3
last=$4
jobs=${5:-10}
only=${6:-}
out=runs/135-floored-height
mkdir -p "$out"
node -e '
const a = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).arms;
const [lo, hi] = [Number(process.argv[2]), Number(process.argv[3])];
const only = process.argv[4] ? process.argv[4].split(",") : null;
// Seed-major, so a stopped run still holds every arm on its first seeds.
for (let seed = lo; seed <= hi; seed++)
  for (const [arm, spec] of Object.entries(a)) {
    if (only && !only.includes(arm)) continue;
    for (const sp of spec.species)
      console.log([sp, arm, seed, JSON.stringify(spec.params ?? {}),
        JSON.stringify((spec.assign ?? {})[sp] ?? {})].join("\t"));
  }
' "$arms" "$first" "$last" "$only" >"$out/$name.tsv"
: >"$out/$name.jsonl"
while IFS=$'\t' read -r sp arm seed world assign; do
  printf '%s\0%s\0%s\0%s\0%s\0' "$sp" "$arm" "$seed" "$world" "$assign"
done <"$out/$name.tsv" |
  xargs -0 -n 5 -P "$jobs" node "$here/lone.ts" >>"$out/$name.jsonl"
echo "done: $(wc -l <"$out/$name.jsonl") of $(wc -l <"$out/$name.tsv") runs"
