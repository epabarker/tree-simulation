#!/bin/bash
# plan3.sh : after the HEAD control, R4's light release for beech (ADR 0044: the cap's dormant buds may be released) at L 20.
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
until grep -q "plan2-finished" /tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/92f0cb68-2f4d-4fb1-a27f-a67a16a030b2/tasks/bry1ex0om.output; do sleep 15; done
$D/queue.sh 1-12 rq05 '{"beech":{"r4.qRel":0.05}}' rq03 '{"beech":{"r4.qRel":0.03}}' rq03L40 '{"beech":{"r4.qRel":0.03,"r6.lifespan":40}}'
echo plan3-finished
