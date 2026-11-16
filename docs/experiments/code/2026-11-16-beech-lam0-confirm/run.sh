#!/usr/bin/env bash
# #134's beech λ₀ confirmation (docs/experiments/2026-11-16-beech-lam0-confirm.md): every arm of
# <arms.json> × seeds <first>–<last>, the lone beech to season 100, by the form-knob screen's
# lone.ts. At most 6 simulators at once. Writes runs/134-beech-lam0/<name>.jsonl (generated,
# never committed). Run from the repo root.
#
#   bash docs/experiments/code/2026-11-16-beech-lam0-confirm/run.sh <arms.json> <name> <first> <last>
set -euo pipefail
lone=docs/experiments/code/2026-11-16-form-knob-screen/lone.ts
arms=$1
name=$2
first=$3
last=$4
out=runs/134-beech-lam0
mkdir -p "$out"
node -e '
const a = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const [lo, hi] = [Number(process.argv[2]), Number(process.argv[3])];
// Seed-major, so a stopped run still holds every arm on its first seeds.
for (let seed = lo; seed <= hi; seed++)
  for (const [arm, assign] of Object.entries(a.beech))
    console.log(["beech", arm, seed, JSON.stringify(assign)].join("\t"));
' "$arms" "$first" "$last" >"$out/$name.tsv"
: >"$out/$name.jsonl"
while IFS=$'\t' read -r sp arm seed assign; do
  printf '%s\0%s\0%s\0%s\0' "$sp" "$arm" "$seed" "$assign"
done <"$out/$name.tsv" |
  xargs -0 -n 4 -P 6 node "$lone" >>"$out/$name.jsonl"
echo "done: $(wc -l <"$out/$name.jsonl") runs"
