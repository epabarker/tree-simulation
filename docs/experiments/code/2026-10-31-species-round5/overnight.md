# The night of 2026-11-01: round 5 under ADR 0032

The user's plan (steps 3–5), with its stop rules: `npm run check` fails twice; the pilot's LM rejects every step; a species' stand is dead at 100 in verification; disk under 5 GB; anything needing a principle, bound, target or golden change beyond ADR 0032's. One commit per step, pushed. Nothing is adopted into `flora-fitted.ts`.

Disk at the start: 619 GB free.

## Step 3: the phone budget: holds, proceed

**Decision: the budget holds on the phone's 66-cell plate. Proceeding.** Worker 32.1 ms a season at 40 and 40.7 ms at 100 (limit 250). Memory 74.9 MB at 200 seasons (limit 256). Measured before (b99a153, in a scratch worktree) and after (437a57d, ADR 0032). Files are in `budget/`: `memory.ts` jsonl and `garden-bench.mjs`, headless Firefox at 390 × 844, dpr 2, seed 10.

| measure | before ADR 0032 (b99a153) | after (437a57d) |
|---|---|---|
| phone plate (66 cells), WASM memory at 200 seasons | 74.2 MB | 74.9 MB |
| phone plate, live metamers at 200 | 18,440 | 20,713 |
| garden ?bench, phone viewport (390 × 844, dpr 2), seed 10, 40 seasons: worker ms a season (mean / max) | 25.5 / 40 | 32.1 / 45 |
| the same: draw p95 / frame p95 (ms); long frames | 5 / 17.3; 5 | 7 / 17.4; 62 |
| the same: metamers on screen | 11,027 | 12,157 |
| garden ?bench, 100 seasons: worker ms (mean / max) | 37.6 / 67 | 40.7 / 87 |
| the same: draw p95 / frame p95; long frames | 5 / 17.3; 72 | 6 / 17.3; 91 |
| the same: metamers on screen | 12,654 | 12,325 |
| 160-cell plate + specimen (memory.ts), WASM memory at 200 | 312.5 MB | 342.5 MB |
| the same: live metamers at 200 | 85,252 | 120,590 |

The 160-cell plate with the specimen is over 256 MB both before and after. Per the plan, that is recorded in STATUS's known issues as I3's problem and not acted on. All numbers are also in ADR 0032's consequences.
