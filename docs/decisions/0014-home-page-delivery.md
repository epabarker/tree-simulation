# 0014: The garden is the edbarker.dev home page, delivered as a versioned release

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** none directly. It touches ADR 0001 (static hosting, bundle budget) and the AGENTS invariant "No SharedArrayBuffer". It records the M12 review's decisions ([review](../reviews/2026-10-27-m12-review.md)).

## Context
- The stack brief says the simulation "will live on my personal website", and ADR 0001 deploys to Pages "or a subfolder of the personal site".
- The personal site is the private repo `epabarker/edbarker-dev`:
  - Astro 7 and Tailwind 4;
  - fully static, served by Cloudflare Workers static assets at `https://edbarker.dev`;
  - a placeholder home page and `/cv`.
- The user wants the simulation to *be* the home page: the name, a few links and a short explanation over a living forest.
- Today's page is a lab console: panel, charts and instructions in a single `index.html`. Its Pages URL is unreachable, because the user site's custom domain no longer resolves (parked).

## Decision
- **One code path.** The page code is split into `mountGarden(host, options)` (`src/web/garden.ts`). It holds the worker, the renderer, the frame loop and the observers. The lab (`main.ts`) is the garden plus the panel, charts and HUD.
- **The garden build.** A second build writes `dist-garden/`:
  - `garden.js` and its worker;
  - no Tweakpane and no Plot;
  - a gzip budget of 60 kB, checked in CI.
- **Release.** A tag `garden-v*` makes CI attach `garden-<ver>.tgz` to a GitHub Release. It holds `garden/` and the lab build in `lab/`, which already uses `base: "./"`.
- **The site.** A script in the site repo downloads a pinned release into `public/garden/<ver>/` and `public/lab/`, and the files are committed (vendored). There is no npm package and no build-time dependency on this repo. Versioned paths are served as immutable.
- **Hosting.** The lab is also hosted at `edbarker.dev/lab`. The Pages deployment stays as it is.

## Consequences
- **Easier:**
  - The site builds hermetically, with no npm account and no git dependency.
  - Every site deploy pins an exact simulation version, and rolling back is a one-line change.
  - A working lab URL no longer depends on the parked custom-domain problem.
- **Harder:**
  - Each change reaches the site in two steps: tag here, then sync there.
  - The vendored files make the site repo larger, by roughly 0.2 MB per version kept.
- **SharedArrayBuffer.** Cloudflare can send COOP/COEP headers (`_headers`), so it becomes technically possible on edbarker.dev. The AGENTS invariant stands until a separate ADR reverses it. That happens only if M18's benchmark calls for several workers.
- **Revisit** if the site moves off a static host, or if a second consumer of the garden appears. An npm package would then pay off.
