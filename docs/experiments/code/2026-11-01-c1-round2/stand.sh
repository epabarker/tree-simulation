#!/usr/bin/env bash
# C1 round 2: round 1's table under round 2's conditions. `forest` as it now stands (R5 on
# neighbours, planted per area: three staggered rows across the depth, top 200), one knob at a
# time; the lone tree and the hedgerow (one row, both faces open); the edge (front face open).
# Seeds 1–3, 200 seasons (`base` and `lone` 300: SEASONS=300), snapshots (metamers, light, ground)
# at 150 and the last season, after height has levelled off (height.sh).
#   bash docs/experiments/code/2026-11-01-c1-round2/stand.sh runs/c1r2-stand [variant…]
set -euo pipefail
out=${1:-runs/c1r2-stand}; shift || true
bin=rust/target/release/treesim
SEASONS=${SEASONS:-200}
W='"width":210,"height":200,"walls":[],"sides":"periodic","depth":64'
I="\"world\":{$W,\"faces\":[0.2,0.2]}"
declare -A V=(
  [base]="{$I}"
  [kext1]="{$I,\"c2\":{\"kExt\":1}}"
  [tau01]="{\"world\":{$W,\"faces\":[0.1,0.1]}}"
  [tau035]="{\"world\":{$W,\"faces\":[0.35,0.35]}}"
  [trel02]="{$I,\"c5\":{\"Trel\":0.2}}"
  [l042]="{$I,\"c3\":{\"lambda\":0.42}}"
  [xi06]="{$I,\"c4\":{\"xi\":0.6}}"
  [b60]="{$I,\"c1\":{\"branchAngle\":60}}"
  [nor4]="{$I,\"r4\":{\"enabled\":false}}"
  [sky3]="{$I,\"c2\":{\"skyExponent\":3}}"
  [qmin02]="{$I,\"r6\":{\"qMin\":0.2}}"
  [qmin005]="{$I,\"r6\":{\"qMin\":0.05}}"
  [qmin003]="{$I,\"r6\":{\"qMin\":0.03}}"
  [edge]="{\"world\":{$W,\"faces\":[1,0.2]}}"
  [hedgerow]="{\"world\":{$W,\"faces\":[1,1]},\"trees\":[{\"x\":10},{\"x\":31},{\"x\":52},{\"x\":73},{\"x\":94},{\"x\":115},{\"x\":136},{\"x\":157},{\"x\":178},{\"x\":199}]}"
  [lone]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false}}"
)
names=("$@"); [ ${#names[@]} -eq 0 ] && names=(hedgerow edge qmin003 qmin005 qmin02 trel02 nor4 kext1 tau01)
mkdir -p "$out"
for v in "${names[@]}"; do for seed in 1 2 3; do
  python3 -c "import json,sys;a=json.loads(sys.argv[1]);a['seed']=int(sys.argv[2]);print(json.dumps(a))" "${V[$v]}" $seed > "$out/$v-s$seed.json"
  echo "$v-s$seed"
done; done | xargs -P "${JOBS:-3}" -I{} sh -c \
  "[ -f $out/{}/metamers.csv ] || $bin --preset forest --seasons $SEASONS --snapshots 150 --light --params $out/{}.json --quiet --out $out/{} && echo {} done >&2"
