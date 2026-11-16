#!/usr/bin/env bash
# #134's form-knob screen: every arm × species × seeds 1–5, at most 6 simulators at once.
# Writes runs/134-form-screen/results.jsonl (generated, never committed). Run from the repo root.
set -euo pipefail
here=docs/experiments/code/2026-11-16-form-knob-screen
out=runs/134-form-screen
mkdir -p "$out"
node -e '
const a = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
// Beech first: its runs are the longest.
for (const sp of ["beech", "hornbeam"])
  for (const [arm, assign] of Object.entries(a[sp]))
    for (const seed of [1, 2, 3, 4, 5])
      console.log([sp, arm, seed, JSON.stringify(assign)].join("\t"));
' "$here/arms.json" >"$out/jobs.tsv"
: >"$out/results.jsonl"
while IFS=$'\t' read -r sp arm seed assign; do
  printf '%s\0%s\0%s\0%s\0' "$sp" "$arm" "$seed" "$assign"
done <"$out/jobs.tsv" |
  xargs -0 -n 4 -P 6 node "$here/lone.ts" >>"$out/results.jsonl"
echo "done: $(wc -l <"$out/results.jsonl") runs"
