#!/bin/bash
# gforest.sh LABEL FACES : G-forest (evidence.py, 20 seeds, 300 seasons) on the A4 garden (depth 28, faceWood 1), faces = FACES.
cd /tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/F
export PATH=$HOME/.cargo/bin:$PATH RECRUITS=0.25 NARROW=28 FACEWOOD=1
[ -n "$2" ] && export FACES=$2
python3 -I evidence.py run --worktree /home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-a28199a6f8557d21d --seeds 1-20 --jobs 4 --out G_$1 --label $1 > G_$1.log 2>&1
python3 -I evidence.py compare baseline.json G_$1/evidence.json >> G_$1.log 2>&1
