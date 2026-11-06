#!/usr/bin/env bash
# Read-only status of a Level 0 night: level0_status.sh [night1|night2|night3]  (default night1). Level 0 v2's targets
# (docs/experiments/2026-11-03-level0-targets.md); v1's runs are in runs/level0-v1/ and fits/level0-v1/.
# Per species: last log line, last "gen" line (the fit writes <species>-progress.csv only at the end, so live
# progress is read from the log), the progress CSV's last row if finished, elapsed since the log was created, ETA.
cd "$(dirname "$0")/../.."
case "${1:-night1}" in
  night1) SPECIES=(beech oak birch); BUDGET=1200 ;;
  night2) SPECIES=(hornbeam maple pine fir); BUDGET=900 ;;
  night3) SPECIES=(rowan); BUDGET=1200 ;;
  *) echo "usage: $0 [night1|night2|night3]" >&2; exit 2 ;;
esac
echo "tmux: $(tmux ls 2>&1 | grep level0 || echo 'no session')"
if [[ "$(uname)" == Darwin ]]; then pgrep_cmd=(pgrep -fl); else pgrep_cmd=(pgrep -af); fi  # macOS's -a is ancestors, not the command line
echo "fit:  $("${pgrep_cmd[@]}" 'level0_fit.py' | grep -v pgrep | grep -o -- '--species [a-z]*' | head -1 || true)"
for s in "${SPECIES[@]}"; do
  log=runs/level0/$s.log
  echo "--- $s (budget $BUDGET evals)"
  [[ -f $log ]] || { echo "  not started"; continue; }
  echo "  last:   $(tail -n 1 "$log" | cut -c1-200)"
  gen=$(grep -E '^gen [0-9]+:' "$log" | tail -n 1)
  echo "  gen:    ${gen:-none yet (first generation = 60 evals, ≈ 9 min)}"
  csv=docs/experiments/fits/level0/$s-progress.csv
  [[ -f $csv ]] && echo "  csv:    $(tail -n 1 "$csv") (generation,best,median; fit finished)"
  [[ -f docs/experiments/fits/level0/$s.json ]] && echo "  DONE: results file written"
  gate=runs/level0/$s.gate.txt
  [[ -f $gate ]] && echo "  GATE:   $(tail -n 1 "$gate")"
  if [[ -f docs/experiments/fits/level0/$s.json ]]; then
    # Finished: the results file's own budget and wall time, no ETA (the log's age keeps growing after the end).
    python3 - "docs/experiments/fits/level0/$s.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
print(f"  finished: {d['status']}, {d['evaluations']} evals, {d['wall_seconds'] / 3600:.2f} h wall")
PY
    continue
  fi
  # the log's creation time: its lines carry no timestamps
  if [[ "$(uname)" == Darwin ]]; then first=$(stat -f %B "$log"); else first=$(stat -c %W "$log"); fi
  now=$(date +%s); el=$((now - first))
  printf '  elapsed: %dh%02dm since the log began\n' $((el/3600)) $((el%3600/60))
  ev=$(echo "$gen" | grep -oE '[0-9]+ evals' | grep -oE '^[0-9]+')
  if [[ -n $ev && $ev -gt 0 ]]; then
    eta=$(( el * (BUDGET - ev) / ev ))
    printf '  evals:  %d / %d (%d%%), ETA ≈ %dh%02dm\n' "$ev" "$BUDGET" $((100*ev/BUDGET)) $((eta/3600)) $((eta%3600/60))
  fi
done

# --- per species: best loss per generation; best-so-far candidate against the hand params (read-only, stdlib python)
for s in "${SPECIES[@]}"; do
  log=runs/level0/$s.log
  [[ -f $log ]] || continue
  echo "=== $s: generation bests: $(grep -E '^gen [0-9]+:' "$log" | sed -E 's/^gen ([0-9]+): best ([0-9.]+).*/g\1 \2/' | tr '\n' ' ')"
  python3 - "$s" <<'PY'
import json, os, sys
s = sys.argv[1]
best_p = f"docs/experiments/fits/level0/{s}-best.json"
hand_p = f"runs/level0-smoke/{s}/{s}.json"
best = json.load(open(best_p)) if os.path.exists(best_p) else None
hand = json.load(open(hand_p)).get("hand") if os.path.exists(hand_p) else None
CAT = ["stand.height", "stand.height100", "stand.height150", "stand.lai", "stand.lateShare", "shade.survivalLight",
       "stand.talloH", "stand.talloCR", "death.lone", "death.stand"]
def f(x, n=2): return "—" if x is None else f"{x:.{n}f}"
def zrow(t, k):
    return "  ".join(f"{a}: {f(t.get(f'stand.{k}.{i}'))}" for i, a in enumerate((60, 100, 150)))
for name, c in (("best-so-far", best), ("hand (v1's dry run: shipped params, v1's targets and z)", hand)):
    if c is None:
        print(f"  {name}: none recorded"); continue
    t = c["traits"]
    extra = f", generation {c['generation']}" if "generation" in c else ""
    print(f"  {name}: loss {c['loss']:.2f}{extra}")
    print(f"    z talloH  {zrow(t, 'talloH')}")
    print(f"    z talloCR {zrow(t, 'talloCR')}")
    print(f"    height at 60: {t['stand.height']:.1f} cells (target 84)" if s == "beech" else f"    height at 60: {t['stand.height']:.1f} cells")
    print("    loss by trait: " + ", ".join(f"{k.split('.',1)[1]} {c['contributions'][k]:.2f}" for k in CAT if k in c["contributions"]))
PY
done

# --- per species: best-so-far knob values against hand and bounds. "Within 5% of a bound" is in the search's own
# coordinate (log for log knobs): u = position in [0, 1]; flagged when u < 0.05 or u > 0.95.
for s in "${SPECIES[@]}"; do
  [[ -f docs/experiments/fits/level0/$s-best.json ]] || continue
  python3 - "$s" <<'PY'
import json, math, os, sys, tomllib
s = sys.argv[1]
best = json.load(open(f"docs/experiments/fits/level0/{s}-best.json"))
tg = tomllib.load(open(f"analysis/fit/targets/{s}.toml", "rb"))
hand_p = f"runs/level0-smoke/{s}/{s}.json"
res_p = f"docs/experiments/fits/level0/{s}.json"
hand = {}
for p in (res_p, hand_p):
    if os.path.exists(p):
        hand = json.load(open(p))["hand"]["values"]; break
by = {p["path"]: p for p in tg["param"]}
print(f"=== {s}: knobs, best-so-far (generation {best['generation']}) vs hand and bounds")
print(f"  {'knob':13} {'best':>10} {'hand':>10} {'best/hand':>9} {'lower':>9} {'upper':>9} {'u':>5}  scale")
for k in tg["level0"]["knobs"]:
    p = by[k]; lo, hi, v = p["lo"], p["hi"], best["assign"][k]; h = hand.get(k)
    lg = bool(p.get("log"))
    u = ((math.log(v) - math.log(lo)) / (math.log(hi) - math.log(lo))) if lg else (v - lo) / (hi - lo)
    flag = "  <-- within 5% of the lower bound" if u < 0.05 else "  <-- within 5% of the upper bound" if u > 0.95 else ""
    hs = "—" if h is None else f"{h:.4g}"; rs = "—" if h is None else f"{v / h:.2f}"
    print(f"  {k:13} {v:10.4g} {hs:>10} {rs:>9} {lo:9.4g} {hi:9.4g} {u:5.2f}  {'log' if lg else 'lin'}{flag}")
PY
done
