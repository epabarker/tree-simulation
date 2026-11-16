#!/usr/bin/env bash
# #134's form-knob screen, wave 2 (arms2.json, added after wave 1; the note's §2.1): appends to
# runs/134-form-screen/results.jsonl, at most 6 simulators at once. Run from the repo root.
set -euo pipefail
here=docs/experiments/code/2026-11-16-form-knob-screen
out=runs/134-form-screen
mkdir -p "$out"
node -e '
const a = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
for (const sp of ["beech", "hornbeam"])
  for (const [arm, assign] of Object.entries(a[sp]))
    for (const seed of [1, 2, 3, 4, 5])
      console.log([sp, arm, seed, JSON.stringify(assign)].join("\t"));
' "$here/arms2.json" >"$out/jobs2.tsv"
while IFS=$'\t' read -r sp arm seed assign; do
  printf '%s\0%s\0%s\0%s\0' "$sp" "$arm" "$seed" "$assign"
done <"$out/jobs2.tsv" |
  xargs -0 -n 4 -P 6 node "$here/lone.ts" >>"$out/results.jsonl"
echo "done: $(wc -l <"$out/results.jsonl") runs"
