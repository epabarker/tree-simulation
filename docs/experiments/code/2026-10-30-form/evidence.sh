#!/usr/bin/env bash
# Form step 5 (plan §6, with the user's criteria of 2026-10-30): 20-seed evidence at this commit's
# defaults (k8, σ_break 7000, windthrow from H/D 80). 300 seasons.
#   forest/: `forest`, seeds 1–20, at τ 0 and τ 0.2; snapshots 100, 150 with --light (the floor).
#   lone/:   the stand's own lone tree (`forest`'s params, one tree, open sides, O4 off), seeds 1–20,
#            at τ 0 and τ 0.2.
#   bash docs/experiments/code/2026-10-30-form/evidence.sh runs/evidence
set -euo pipefail
out=${1:-runs/evidence}
bin=rust/target/release/treesim
J=${JOBS:-12}
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml
mkdir -p "$out"/{forest,lone}
declare -A T=([t02]='0.2' [t0]='0')
LONE='"trees":[{"x":105}],"o4":{"enabled":false},'
for t in t0 t02; do for s in $(seq 1 20); do
  f=${T[$t]}
  echo "{\"world\":{\"faces\":[$f,$f]},\"seed\":$s}" > "$out/forest/$t-s$s.json"
  echo "{$LONE\"world\":{\"sides\":\"open\",\"faces\":[$f,$f]},\"seed\":$s}" > "$out/lone/$t-s$s.json"
  echo "forest/$t-s$s"; echo "lone/$t-s$s"
done; done | xargs -P "$J" -I{} sh -c '
  case {} in forest/*) extra="--snapshots 100,150 --light";; *) extra="";; esac
  [ -f '"$out"'/{}/metrics.csv ] || '"$bin"' --preset forest --seasons 300 $extra --params '"$out"'/{}.json --quiet --out '"$out"'/{}'
