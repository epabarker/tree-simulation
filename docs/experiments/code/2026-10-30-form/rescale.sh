#!/usr/bin/env bash
# Form step 1 (docs/plans/2026-10-30-form.md §2): the scar fix with and without the rescale.
#   bash docs/experiments/code/2026-10-30-form/rescale.sh runs/form            (both groups)
#   ONLY=lone bash docs/experiments/code/2026-10-30-form/rescale.sh runs/form  (one group)
# Both variants run on this commit's build, whose scars record the pipe radius:
#   base: the old girth scale (r0 0.02, m_w 1);
#   k8:   the new defaults (r0 0.0025, m_w 64).
# Each at τ 0.2 (the presets' faces) and τ 0 (faces [0, 0]), seeds 1–3, 300 seasons, snapshots
# 150, 200, 300 with --light (SNAPS=100,150,200 adds 100: step 3).
# forest/: `forest`.
# lone/:   the stand's own lone tree (round 2's control, code/2026-11-01-c1-round2/height.sh):
#   `forest`'s params, one tree on a 210-cell world with open sides and the woods' top, O4 off.
#   (The first runs used `oakOpen`, the fitted oak: a different model, which ran to the top;
#   the note keeps them as a species reading.)
set -euo pipefail
out=${1:-runs/form}
bin=rust/target/release/treesim
J=${JOBS:-12}
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml
mkdir -p "$out"/{forest,lone}
declare -A G=([base]='"c6":{"r0":0.02},"r1":{"mw":1},' [k8]='')
declare -A T=([t02]='0.2' [t0]='0')
LONE='"trees":[{"x":105}],"o4":{"enabled":false},'
for v in base k8; do for t in t02 t0; do for s in 1 2 3; do
  f=${T[$t]}
  echo "{${G[$v]}\"world\":{\"faces\":[$f,$f]},\"seed\":$s}" > "$out/forest/$v-$t-s$s.json"
  echo "{${G[$v]}$LONE\"world\":{\"sides\":\"open\",\"faces\":[$f,$f]},\"seed\":$s}" > "$out/lone/$v-$t-s$s.json"
  for g in forest lone; do
    [ -z "${ONLY:-}" ] || [ "$ONLY" = $g ] && echo "$g/$v-$t-s$s"
  done
done; done; done | xargs -P "$J" -I{} sh -c \
  "[ -f $out/{}/metrics.csv ] || $bin --preset forest --seasons 300 --snapshots ${SNAPS:-150,200} --light --params $out/{}.json --quiet --out $out/{}"
