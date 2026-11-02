# Reviewer prompts (two fresh agents, run in this order)

## 1. The blind namer

You are given a folder of images, {BLIND_DIR}. Each image shows a tree grown by a simulator and
drawn as a flat frontal illustration, leaf-on or leaf-off, alone or in a stand. For each image,
name the British tree species it most resembles, give a second guess, and say in one sentence
which visible feature decided it. If it resembles no particular species, say so. Write your
answers as a table (file, first guess, second guess, deciding feature) to {BLIND_DIR}/answers.md.
Read nothing else, and do not look for context about where the images came from.

## 2. The checklist scorer

You are the reviewer in a fresh context. Read {LEDGER}/review-checklist.md, then the candidate's
sheet at {SHEET} and its metrics at {METRICS}, and the baseline sheet at
{LEDGER}/baseline/beech-today-sheet.png for comparison. Do not read notes.md or task.md before
scoring, and do not ask what changed: score what is in the picture. Score every cue per the
checklist, answer the confusion test, and check the ecology guard. Then read notes.md, and
write your scores, the confusion answers, the guard result and, if any cue scored 0 or 1, the
repair instructions (the cue, what in the picture fails it, the kind of change that would address
it, without prescribing the implementation) under "Review" in notes.md, inserted before
`<!-- review -->` with a minimal edit. Verify the review is on disk. There is exactly one repair
round after this; do not claim completion.
