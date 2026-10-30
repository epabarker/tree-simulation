#!/usr/bin/env bash
# C1, first round: `forest` (full model, D = 64, K 16 rotating, top 200) at the default and one
# knob moved at a time; planted in two and three rows across the depth (21-cell spacing); the edge
# look; a lone tree under the same rules; the knobs of crown spread (λ, ξ, branch angle), stand
# and lone; R4 off and its release threshold; R1's L_h (the height plateau), stand
# and lone; the sky's exponent (brightness toward the zenith); R6's Q_ss and R1's m_f (the
# compensation light); Q_ss 0.03 with darker faces; R5 sensing neighbours only, and off;
# the round's candidate (R5 on neighbours, Q_ss 0.03), stand, edge and lone. Seeds 1–3, 100 seasons,
# snapshots (metamers, light) at 45 and 100.
#   bash docs/experiments/code/2026-10-31-c1/runs.sh runs/c1 [variant…]
set -euo pipefail
out=${1:-runs/c1}; shift || true
bin=rust/target/release/treesim
W='"width":210,"height":200,"walls":[],"sides":"periodic","depth":64'
declare -A V=(
  [base]="{\"world\":{$W,\"faces\":[0.2,0.2]}}"
  [kext075]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c2\":{\"kExt\":0.75}}"
  [kext1]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c2\":{\"kExt\":1}}"
  [tau01]="{\"world\":{$W,\"faces\":[0.1,0.1]}}"
  [tau035]="{\"world\":{$W,\"faces\":[0.35,0.35]}}"
  [trel02]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c5\":{\"Trel\":0.2}}"
  [edge]="{\"world\":{$W,\"faces\":[1,0.2]}}"
  [rows2]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"trees\":[{\"x\": 10.0, \"z\": 16.0}, {\"x\": 31.0, \"z\": 16.0}, {\"x\": 52.0, \"z\": 16.0}, {\"x\": 73.0, \"z\": 16.0}, {\"x\": 94.0, \"z\": 16.0}, {\"x\": 115.0, \"z\": 16.0}, {\"x\": 136.0, \"z\": 16.0}, {\"x\": 157.0, \"z\": 16.0}, {\"x\": 178.0, \"z\": 16.0}, {\"x\": 199.0, \"z\": 16.0}, {\"x\": 20.5, \"z\": 48.0}, {\"x\": 41.5, \"z\": 48.0}, {\"x\": 62.5, \"z\": 48.0}, {\"x\": 83.5, \"z\": 48.0}, {\"x\": 104.5, \"z\": 48.0}, {\"x\": 125.5, \"z\": 48.0}, {\"x\": 146.5, \"z\": 48.0}, {\"x\": 167.5, \"z\": 48.0}, {\"x\": 188.5, \"z\": 48.0}, {\"x\": 209.5, \"z\": 48.0}]}"
  [rows3]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"trees\":[{\"x\": 10, \"z\": 10.7}, {\"x\": 31, \"z\": 10.7}, {\"x\": 52, \"z\": 10.7}, {\"x\": 73, \"z\": 10.7}, {\"x\": 94, \"z\": 10.7}, {\"x\": 115, \"z\": 10.7}, {\"x\": 136, \"z\": 10.7}, {\"x\": 157, \"z\": 10.7}, {\"x\": 178, \"z\": 10.7}, {\"x\": 199, \"z\": 10.7}, {\"x\": 17, \"z\": 32.0}, {\"x\": 38, \"z\": 32.0}, {\"x\": 59, \"z\": 32.0}, {\"x\": 80, \"z\": 32.0}, {\"x\": 101, \"z\": 32.0}, {\"x\": 122, \"z\": 32.0}, {\"x\": 143, \"z\": 32.0}, {\"x\": 164, \"z\": 32.0}, {\"x\": 185, \"z\": 32.0}, {\"x\": 206, \"z\": 32.0}, {\"x\": 24, \"z\": 53.3}, {\"x\": 45, \"z\": 53.3}, {\"x\": 66, \"z\": 53.3}, {\"x\": 87, \"z\": 53.3}, {\"x\": 108, \"z\": 53.3}, {\"x\": 129, \"z\": 53.3}, {\"x\": 150, \"z\": 53.3}, {\"x\": 171, \"z\": 53.3}, {\"x\": 192, \"z\": 53.3}, {\"x\": 3, \"z\": 53.3}]}"
  [l046]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c3\":{\"lambda\":0.46}}"
  [lone-l046]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"c3\":{\"lambda\":0.46}}"
  [l042]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c3\":{\"lambda\":0.42}}"
  [lone-l042]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"c3\":{\"lambda\":0.42}}"
  [xi06]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c4\":{\"xi\":0.6}}"
  [lone-xi06]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"c4\":{\"xi\":0.6}}"
  [b60]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c1\":{\"branchAngle\":60}}"
  [lone-b60]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"c1\":{\"branchAngle\":60}}"
  [nor4]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r4\":{\"enabled\":false}}"
  [qrel03]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r4\":{\"qRel\":0.3}}"
  [lh40]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r1\":{\"Lh\":40}}"
  [lone-lh40]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"r1\":{\"Lh\":40}}"
  [lh30]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r1\":{\"Lh\":30}}"
  [lone-lh30]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"r1\":{\"Lh\":30}}"
  [sky2]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c2\":{\"skyExponent\":2}}"
  [sky3]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"c2\":{\"skyExponent\":3}}"
  [qmin02]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r6\":{\"qMin\":0.2}}"
  [mf012]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r1\":{\"mf\":0.12}}"
  [qmin005]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r6\":{\"qMin\":0.05}}"
  [qmin003]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r6\":{\"qMin\":0.03}}"
  [lone-qmin005]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"r6\":{\"qMin\":0.05}}"
  [qmin003-tau01]="{\"world\":{$W,\"faces\":[0.1,0.1]},\"r6\":{\"qMin\":0.03}}"
  [qmin003-tau005]="{\"world\":{$W,\"faces\":[0.05,0.05]},\"r6\":{\"qMin\":0.03}}"
  [r5n]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r5\":{\"signal\":\"neighbours\"}}"
  [r5off]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r5\":{\"enabled\":false}}"
  [lone-r5n]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"r5\":{\"signal\":\"neighbours\"}}"
  [lone-r5off]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"r5\":{\"enabled\":false}}"
  [cand]="{\"world\":{$W,\"faces\":[0.2,0.2]},\"r5\":{\"signal\":\"neighbours\"},\"r6\":{\"qMin\":0.03}}"
  [lone-cand]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false},\"r5\":{\"signal\":\"neighbours\"},\"r6\":{\"qMin\":0.03}}"
  [edge-cand]="{\"world\":{$W,\"faces\":[1,0.2]},\"r5\":{\"signal\":\"neighbours\"},\"r6\":{\"qMin\":0.03}}"
  [lone]="{\"world\":{\"width\":210,\"height\":200,\"walls\":[],\"sides\":\"open\",\"depth\":64,\"faces\":[0.2,0.2]},\"trees\":[{\"x\":105}],\"o4\":{\"enabled\":false}}"
)
names=("$@"); [ ${#names[@]} -eq 0 ] && names=(base kext075 kext1 tau01 tau035 trel02 edge rows3 l046 l042 xi06 b60 nor4 qrel03 lh40 lh30 sky2 sky3 qmin02 qmin005 qmin003 qmin003-tau01 qmin003-tau005 mf012 r5n r5off cand edge-cand lone lone-cand lone-r5n lone-r5off lone-qmin005 lone-lh40 lone-lh30 lone-l046 lone-l042 lone-xi06 lone-b60)
mkdir -p "$out"
for v in "${names[@]}"; do for seed in 1 2 3; do
  python3 -c "import json,sys;a=json.loads(sys.argv[1]);a['seed']=int(sys.argv[2]);print(json.dumps(a))" "${V[$v]}" $seed > "$out/$v-s$seed.json"
  echo "$v-s$seed"
done; done | xargs -P "${JOBS:-2}" -I{} sh -c \
  "$bin --preset forest --seasons 100 --snapshots 45 --light --params $out/{}.json --quiet --out $out/{} && echo {} done >&2"
