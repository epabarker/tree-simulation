# 0004: Shoot size — cap the resource, then n = ⌊v⌋, l = v/n

- **Status:** accepted (user asked for web research, 2026-10-26)
- **Date:** 2026-10-26
- **Spec:** §C3.4 "Bud: n = ⌊v⌋ metamers (capped), length l = v/n"; §C1.6 "metamers per shoot cap"

## Context
The spec's wording leaves open *what* is capped. If n is capped but l = v/n still uses the full v, a well-fed leader grows internodes tens of cells long (seen at M2: height 71 by season 20 at λ = 0.56), breaking the "internode ≈ one grid cell" assumption (§C1, §C2). Sources:

| Source | Cap | Rule |
|---|---|---|
| Palubicki et al. 2009 §4.2 ([PDF](https://www.algorithmicbotany.org/papers/selforg.sig2009.small.pdf)) | none | n = ⌊v⌋, l = v/n, so l ∈ [1, 2) |
| bernardosulzbach/self-organizing-tree-models (C++, `Tree::addNewShoot`) | none | n = ⌊v⌋, l = v/⌊v⌋ · base length |
| inuritdino/SOT — the LPFG Self-Organizing Tree example (`lsystem.l`) | **on the resource**: `vig = min(v_share, MAXGROW)`, MAXGROW = 19.9 | `num = (int)vig; length = (vig/num)·NODELENGTH` ("total shoot length = vigor·NODELENGTH") |
| Guerra 2026, *Growing trees* | "a configured cap" on metamers | length not stated |

No source caps n while keeping the uncapped v in l.

## Decision
Cap the bud's resource first, then apply Palubicki's rule unchanged: v' = min(v, `c1.maxMetamersPerShoot`), n = ⌊v'⌋, l = v'/n · l0. Resource above the cap is lost. This is the literal reading of §C3.4 with v the capped resource, and matches the only capped implementation found (SOT).

## Consequences
Internodes stay within [1, 2)·l0; a shoot at the cap has internodes of exactly l0 (the M2 version used v/⌊v⌋, which depended on the discarded resource). Goldens regenerated. Revisit if R1 (carbon balance) makes the discarded resource matter, e.g. by storing it as reserve.
