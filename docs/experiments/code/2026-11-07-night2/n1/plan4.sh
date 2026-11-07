#!/bin/bash
# plan4.sh : after plan3, the brief's remaining levers at L 20 (12 seeds), then the shade house (base, lifespan off).
D=/tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/0d08166a-77f7-4440-a296-cafcc1cf2019/scratchpad/n1
until grep -q "plan3-finished" /tmp/claude-1000/-home-edbarker-Documents-Projects-tree-simulation/92f0cb68-2f4d-4fb1-a27f-a67a16a030b2/tasks/bb73t4tvw.output; do sleep 15; done
$D/queue.sh 1-12 hj35 '{"beech":{"r2.hJ":35}}' hj55 '{"beech":{"r2.hJ":55}}' ks10 '{"beech":{"r1.kStarve":10}}' st4 '{"beech":{"r1.store":4}}'
mkdir -p $D/shade
for r in 4 4.8; do
  SPPATCH='' $D/shade.sh base $r 1-6
  SPPATCH='{"beech":{"r6.lifespan":1000}}' $D/shade.sh loff $r 1-6
done
echo plan4-finished
