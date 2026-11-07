# 0059: Checkpoint v3 preserves consecutive branch-deficit counts

- **Status:** accepted (the user, day-3 ruling 6, 2026-11-07)
- **Date:** 2026-11-07
- **Spec:** §C5, §R1; ADRs 0024, 0025, 0026

## Context

C5 carbon shedding waits `r1.kShed` consecutive seasons of branch production below
maintenance. `Tree.deficit` was kept outside the metamer table and omitted from
checkpoint v2. A restored world therefore lost a partial streak; the worker's
`intoCheckpoint` also freed the counters before saving. With kShed greater than one,
continuation could delay shedding. The pre-existing state hash excludes these
counters, so immediate hash equality alone cannot detect this defect.

## Decision

Write checkpoint version 3. Preserve the existing header and metamer/bud column
layouts; after **each tree's** bud columns, append one little-endian float64 per
metamer for its deficit counter, padded to an 8-byte boundary. Rows without an
allocated counter write zero. Read v3 counters back and retain them while freeing
a world for the worker swap. Keep the existing v1 planar conversion and v2 column
reader, initialising their absent counters to zero. Never reinterpret their bytes
as v3 or claim to recover the deficit history they did not record.

The growth rules, metamer/bud schemas and existing state-hash schema stay unchanged.
No new kShed setting is adopted. Deficit arrays keep following metamer compaction.
Tests compare saved state/counters and future shedding as well as state hashes.

## Consequences

New checkpoint payloads gain 8 bytes per metamer; alignment is already 8 bytes.
Version 3 continues partial streaks faithfully, including the worker's freeing swap.
Older readers cannot consume v3; existing shipped v1/v2 checkpoints remain readable.
A small immutable fixture from the pre-change v2 writer verifies that compatibility.
Future changes to persistent state need an explicit layout/version decision; do not
classify season-to-season memory as disposable scratch.
