# The blind naming test

The measure the project has lacked: can a viewer who was not told the species name it?

## Protocol

1. The solver's candidate is rendered with the harness (seeds 1–3: stand at 100, lone at 60 and
   100, leaf-on and leaf-off).
2. The renders are copied into a folder with neutral names (`tree-k-stand100.png`, …), mixed with
   the same views of **two decoys** rendered the same way from the repository's other species
   (chosen by the orchestrator, not the reviewer: one conifer, one broadleaf), and shuffled.
3. A fresh reviewer agent is given the folder and this question only, with no species list:
   "Each image shows a tree grown by a simulator and drawn as a flat frontal illustration. For each,
   name the British tree species it most resembles, give a second guess, and say in one sentence
   which feature decided it. If it does not resemble any species, say so."
4. The orchestrator records, per seed and setting, whether beech was the first guess.

## Pass

A species is done when the blind reviewer names it on 2 of 3 seeds in the stand at 100 and in the
lone tree at 60, and the user agrees on the phone.

## Notes

- The reviewer never sees task.md, notes.md or the checklist before naming; the checklist scoring
  is a second, separate pass by a second fresh agent.
- The decoys guard against a reviewer that answers "beech" to everything because the folder name
  or the conversation leaked it.
- The user's own blind look, on the phone, is the final gate.
