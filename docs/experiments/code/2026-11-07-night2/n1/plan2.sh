#!/bin/bash
# plan2.sh : finite long lifespans on the layered wood (12 seeds), then G-forest for HEAD (control) against B0.
export PATH=/home/edbarker/.cargo/bin:$PATH
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
W=/home/edbarker/Documents/Projects/tree-simulation/.claude/worktrees/agent-ab3a6eb89541b0170
$D/queue.sh 1-12 L100 '{"beech":{"r6.lifespan":100}}' L150 '{"beech":{"r6.lifespan":150}}'
cd $D && RECRUITS=0.25 python3 evidence.py run --worktree $W --patch p-head.json --seeds 1-20 --jobs 4 --out $D/gf-head --label head > $D/gf-head.log 2>&1
echo plan2-finished
