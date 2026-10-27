# 0008: The natural view draws the simulated shell as a pseudo-3D crown

- **Status:** accepted (user, 2026-10-27)
- **Date:** 2026-10-27
- **Spec:** §2 (Option P), §C1.4 (projected spiral), §11.8

## Context
2D crowns look like an x-ray: a thin foliage shell around a bare interior. That is the correct planar result, and real crowns are shells too (Kitajima et al. 2004 measured 61% light extinction in the outer 0.5 m). A real tree looks full because the viewer sees the 3D shell projected onto a disc, and because laterals pointing toward or away from the viewer foreshorten. A thick 3D slab would simulate this but costs about 50× the light pass and reverses spec §2. See `docs/research/2026-10-27-literature-review.md` §3.

## Decision
The page only, never the core, adds depth. In the natural view each leafy metamer draws a small leaf cluster with a pseudo-depth from a hash of (tree, birthId); back leaves draw behind the wood, darker, and front leaves over it; laterals are foreshortened by the spec's projected-spiral rule β_eff = atan(tan β·|sin φ|). A `depth` view option switches it off, giving the x-ray view, which shows exactly what the model simulates and is used for picking and diagnostics.

## Consequences
No simulation cost and no golden change; instance counts rise 2–4× for leaves. The natural view no longer matches the light overlay one to one, which is why the x-ray view stays. Parallel transects (forest depth) and a thick 3D slab are recorded as held options in the ROADMAP; revisit if trees must be viewed from an angle.
