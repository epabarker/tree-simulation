# Tree Simulation: Requirements Brief for a Stack Recommendation

I'd like a recommendation on a technology stack (language(s), rendering, tooling) for the project below. The design is in the attached spec, *"Self-Organizing Trees in a 2D World: A Principle-Level Specification for a Procedural Growth Simulator"*. Section numbers below (§) refer to it.

## 1. What it is

- An interactive tree-growth simulation that will live on my personal website.
- **Goal:** complex, beautiful behaviour emerging from simple, local principles. Visual quality and watching the behaviour emerge are the point; scientific accuracy is secondary but welcome.
- **The model:** a self-organizing tree model in the style of Palubicki et al. (2009). Buds compete for light in a shared grid, resources are allocated by the Borchert–Honda rule, low-light branches are shed, and branch girth follows the pipe model. Refinements add carbon balance, physiological age, branch mechanics, dormancy/release and shade avoidance. An optional extension simulates whole stands (seeding and mortality).

## 2. Already decided

- **The simulation is 2D.** The tree is genuinely planar (spec §2, "Option P": a thin slab with round stems), not a flattened 3D tree. Why 2D was chosen:
  - What you see is exactly what competes, so the emergent behaviour is easy to read.
  - It is far cheaper: the shadow triangle costs about (q+1)² per bud, against about (q+1)³ for a 3D pyramid, and a full-sky light sweep becomes affordable.
  - Mechanics use scalar moments.
  - Beauty comes from behaviour rather than heavy 3D rendering.
- **Optional depth effect:** a 2.5D look, such as faded parallax background stands. Each layer would still be an independent 2D simulation.

## 3. Functional requirements

### Simulation (spec §3, §5–§6)
- A per-season update loop over a metamer graph (repeating units of stem segment, leaf and bud).
- Data stored as structure-of-arrays in parent-before-child order, so the root-ward and tip-ward passes are plain linear loops.
- **Light:**
  - A shared 2D light grid read by every tree. It starts as the shadow triangle and is later upgraded to a Beer–Lambert sky sweep over K = 5–9 directions.
  - Multiple trees compete through this one grid.
- **Principles:**
  - Core: C1–C6.
  - Refinements: R1–R5.
  - Optional: O1–O4. These include stand dynamics, where tree numbers change through seeding and death.
  - Each principle can be switched on or off independently, for ablation experiments (§8).
- **Determinism:** a seeded RNG with a separate stream per purpose. Results must be reproducible, and toggling one principle must not reshuffle the random numbers of another.
- **Scale:** from one tree up to a stand of roughly 10+ trees over about 100 seasons. My rough estimate is thousands to tens of thousands of branch segments on screen at once. Stand dynamics could push this higher.
- The build follows the milestone order in §7 (M0 to M11).

### Interactivity
- Play, pause, step one season, and reset/reseed.
- Live parameter controls, e.g. λ, shedding threshold, tropism weights, branch angle and stiffness.
- On/off toggles for each principle.
- Species presets (§9): fir-like conifer, oak-like, weeping willow, birch-like, *Terminalia* tiers, beech-like (Troll architecture).
- Direct manipulation would be a nice touch, e.g. removing a tree to watch neighbours lean in and dormant buds release.
- Touch-friendly on phones.

### Rendering and visuals
- Tapered branches whose radius comes from the pipe model, plus leaves.
- Smooth animation that interpolates lengths, radii and angles between seasons, so growth, sagging and straightening look organic rather than stepped.
- Colouring driven by simulation data (light received, allocated resource, physiological age, stress).
- Possibly shading driven by the simulation's own light grid (an ambient-occlusion-like effect).
- **Diagnostic overlays (§8):**
  - Shadow and leaf-area-density heatmaps
  - Light-direction arrows
  - Bud states and release flashes
  - Shed branches shown as fading ghosts
  - Junction-exponent histograms
- **Small charts on the page:** per-tree carbon bars, size histograms, and a log–log density–mass (self-thinning) trajectory.

## 4. Non-functional requirements

- **Efficient on most devices, including mid-range phones.**
  - Small download and fast start-up.
  - Smooth (ideally 60 fps) animation.
  - The UI must never stutter while the simulation computes, so the simulation should run off the main thread.
- **Personal-website hosting.** Strong preference for static files with no server computation per visitor.
- Layout works down to phone widths.

## 5. Developer constraints and preferences

- I'm most familiar with **Python and R**. I'd like to stay as close to them as possible without compromising performance.
- I'm willing to learn another language if it is useful beyond this project.
- **Experiments:**
  - I want to run parameter sweeps, ablations and validation analyses (§8, §10) in batch, without a browser.
  - The analysis itself would most naturally happen in Python or R.
  - Ideally the simulation has only one implementation, not separate browser and analysis versions.

## 6. Options already considered and rejected (open to challenge)

- **Python in the browser (Pyodide/PyScript) and R in the browser (webR):** rejected because of a multi-megabyte download, slow start-up on phones, and slow plain-Python loops. The simulation's tree traversals are sequential and don't vectorise well in NumPy.
- **Server-driven apps (Shiny, Streamlit, Dash):** rejected because they put the simulation on a server. That costs compute for every visitor and rules out smooth on-device animation.

## 7. Soft nice-to-have (future, not a requirement)

- I may later build a **Neo4j knowledge-graph application** with network visualisation: nodes, links, labels, hover/click, pan/zoom.
- I might also apply the tree simulation to that graph. For example, a "botanical" view of a hierarchy, where relevance acts as light, branch thickness reflects subtree size, and low-relevance branches are pruned. Or a time-lapse of the graph growing.
- A language or renderer that could carry over to that work is a plus, but it shouldn't drive the decision for the tree simulation.

## 8. What I'd like from you

A recommended stack covering:
- the language for the simulation core;
- how it runs off the main thread;
- the rendering technology;
- UI controls and on-page charts;
- build and deploy tooling for a static personal site;
- how the same simulation runs headless for batch experiments analysed in Python or R;
- whether WebAssembly (e.g. Rust) or WebGPU is warranted now or only later.

Please give the reasoning and the main trade-offs, and say what you'd use for a quick prototype (milestones M0–M5) versus the finished version.
