#!/usr/bin/env bash
# Trace A: the lone hornbeam at HEAD, with maturity at 140 cells (35 m), and with maturity out of
# reach (1e9), seeds 1–3 to season 150, at most 6 at once. Writes runs/137-ceiling/trace.jsonl
# (generated, never committed). Run from the repo root.
set -euo pipefail
here=docs/experiments/code/2026-11-16-stub-churn-and-hornbeam-ceiling
out=runs/137-ceiling
mkdir -p "$out"
{
  for seed in 1 2 3; do
    printf '%s\0%s\0%s\0%s\0' head "$seed" 150 '{}'
    printf '%s\0%s\0%s\0%s\0' mat140 "$seed" 150 '{"r1.maturity":140}'
    printf '%s\0%s\0%s\0%s\0' matOff "$seed" 150 '{"r1.maturity":1e9}'
  done
} | xargs -0 -n 4 -P 6 node "$here/ceiling.ts" >"$out/trace.jsonl"
echo "done: $(wc -l <"$out/trace.jsonl") rows"
