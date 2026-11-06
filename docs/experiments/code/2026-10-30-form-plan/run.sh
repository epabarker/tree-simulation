#!/usr/bin/env bash
# The Form plan's checks (docs/plans/2026-10-30-form.md §0), seeds 1–3, natively.
#   bash docs/experiments/code/2026-10-30-form-plan/run.sh runs/form-plan
# inv/: the lone oak (oakOpen), 60 seasons, R3 and O2 off, base against r0 ÷ 8, m_w × 64. The oak is a
#   species tree, so its params go through --species-patch (a --params patch would not reach it, §0.6).
# diag/: `forest`, 150 seasons (snapshot 100, --light): base, k7 (r0 0.002857, m_w 49), τ 0.
# r3/:  `forest`, 100 seasons: k8 (r0 0.0025, m_w 64), and k8 with sag, posture or stress-wood girth off.
# scar/: `forest`, 150 seasons, base and k8, on a scratch build whose scars record the pipe radius
#   (c5.rs:91: `c.radius[i] - c.stress_wood[i]`), built to $out/target-scar and the source restored.
set -euo pipefail
out=${1:-runs/form-plan}
bin=rust/target/release/treesim
J=${JOBS:-12}
mkdir -p "$out"/{inv,diag,r3}
W='"width":210,"height":200,"walls":[],"sides":"periodic","depth":64'
OFF='"o2":{"enabled":false,"stormP":0}'
declare -A SP=(
  [base]='{"oak":{"r3":{"enabled":false}}}'
  [k8]='{"oak":{"r3":{"enabled":false},"c6":{"r0":0.00282375},"r1":{"mw":64}}}'
)
for v in base k8; do for s in 1 2 3; do echo "{\"seed\":$s,$OFF}" > "$out/inv/$v-s$s.json"; done; done
for v in base k8; do for s in 1 2 3; do
  [ -f "$out/inv/$v-s$s/metrics.csv" ] || $bin --preset oakOpen --seasons 60 --params "$out/inv/$v-s$s.json" \
    --species-patch "${SP[$v]}" --quiet --out "$out/inv/$v-s$s" &
done; done; wait
declare -A D=(
  [base]='{}'
  [k7]='{"c6":{"r0":0.002857},"r1":{"mw":49}}'
  [tau0]="{\"world\":{$W,\"faces\":[0,0]}}"
)
for v in base k7 tau0; do for s in 1 2 3; do
  python3 -c "import json,sys;a=json.loads(sys.argv[1]);a['seed']=int(sys.argv[2]);print(json.dumps(a))" "${D[$v]}" $s > "$out/diag/$v-s$s.json"
  echo "$v-s$s"
done; done | xargs -P "$J" -I{} sh -c \
  "[ -f $out/diag/{}/metrics.csv ] || $bin --preset forest --seasons 150 --snapshots 100 --light --params $out/diag/{}.json --quiet --out $out/diag/{}"
K='"c6":{"r0":0.0025},"r1":{"mw":64}'
declare -A R=(
  [k8]="{$K}"
  [nosag]="{$K,\"r3\":{\"phi\":0}}"
  [nopost]="{$K,\"r3\":{\"posture\":false}}"
  [nogirth]="{$K,\"r3\":{\"girthGain\":0}}"
)
for v in k8 nosag nopost nogirth; do for s in 1 2 3; do
  python3 -c "import json,sys;a=json.loads(sys.argv[1]);a['seed']=int(sys.argv[2]);print(json.dumps(a))" "${R[$v]}" $s > "$out/r3/$v-s$s.json"
  echo "$v-s$s"
done; done | xargs -P "$J" -I{} sh -c \
  "[ -f $out/r3/{}/metrics.csv ] || $bin --preset forest --seasons 100 --params $out/r3/{}.json --quiet --out $out/r3/{}"

# scar/: the scar fix, on a scratch build (the working tree is restored before the runs).
mkdir -p "$out/scar/diag"
sed -i 's/let r = math::pow(c.radius\[i\], n);/let r = math::pow(c.radius[i] - c.stress_wood[i], n);/' rust/core/src/principles/c5.rs
cargo build -q --release -p treesim --manifest-path rust/Cargo.toml --target-dir "$out/target-scar"
git checkout rust/core/src/principles/c5.rs
for s in 1 2 3; do
  echo "{\"seed\":$s}" > "$out/scar/diag/base-s$s.json"
  echo "{\"seed\":$s,$K}" > "$out/scar/diag/k8-s$s.json"
done
for v in base k8; do for s in 1 2 3; do echo "$v-s$s"; done; done | xargs -P "$J" -I{} sh -c \
  "[ -f $out/scar/diag/{}/metrics.csv ] || $out/target-scar/release/treesim --preset forest --seasons 150 --snapshots 100 --light --params $out/scar/diag/{}.json --quiet --out $out/scar/diag/{}"
