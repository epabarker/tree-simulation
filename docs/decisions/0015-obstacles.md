# 0015: Obstacles, solid regions with no shade, and planting by visitors

- **Status:** accepted
- **Date:** 2026-10-27
- **Spec:** beyond the spec. It touches §C1 (growth), §C5 (shedding through `removeBranches`), §6 (Phase 1 and the per-tree pass), and the event log (`World`, ADR 0002's replay).

## Context
- **The design phase** (D1–D3, user, 2026-10-27) makes the simulation the site's core style. The site should be playful and exploratory, with the forest on every page. The user wants page elements to shape where trees grow, and chose two prototypes: **Clearings** (content sits in clearings the forest grows around) and **Field guide** (tap a tree for its card; plant seeds).
- **Walls (M3)** only add shade: they bend growth through the light field, but nothing keeps branches out of them, and they suppress whatever grows beneath.
- **The user's choice:** a page element should be **solid with no shade**. Trees can't grow into it, it casts no shadow, crowns grow right up to its edges, and the ground beneath stays lit.

## Decision
- **`world.obstacles`:** an optional list of rectangles in cells, outside the light model. None by default, which changes nothing: every golden is unchanged. `principles/obstacles.ts` implements it.
  - **Growth (`growShoot`):** a shoot stops before a metamer whose tip would lie inside an obstacle. If its first metamer is blocked, the bud keeps its state and tries again next season. The check reads no RNG and adds no rows.
  - **Clearance:** at the start of a season (Phase 1, before deposits), and again at the end of each tree's pass (after R3, which can sag a limb inside), any metamer whose tip lies inside an obstacle is shed with its subtree through C5's `removeBranches`. That leaves scars, and a bud bank with R4.
    - A tree whose first metamer is inside dies.
    - No season therefore ends with wood inside an obstacle.
    - When obstacles move (a `params` event), the forest is pruned and regrows around them.
  - **On a ring** x wraps, so obstacles drawn over the page's wrapped copies work too.
- **`plantTree` event:** `World.plantTree(x)` queues a seedling for the next season boundary, appended to `trees` like an O4 recruit. It is refused within a cell of a live trunk, and logged like any event, so runs still replay exactly. The worker exposes it.
- **On the page:** the garden marks elements as obstacles from their screen rectangles through the camera. The snapshot carries `obstacles` so the lab can outline them. The `clearing` preset shows the rule in the lab.

## Consequences
- **Easier:**
  - The page layout becomes part of the forest's environment. Content carves clearings, a resize reshapes them, and visitors can sow trees.
  - The rule is local and cheap: one rectangle test per new metamer, plus one per tip twice a season when obstacles exist.
- **Harder:**
  - Obstacles live in screen space, so the garden must map them through the camera, and they move when the camera or layout does. A page that scrolls content across the forest would prune it as it scrolls. Hosts should mark only content that stays put (D2 decides how).
  - A page world's event log grows with each obstacle update.
- **Not done:**
  - Obstacles don't shade or reflect light, and roots ignore them.
  - Seed establishment ignores obstacles: a seed under an obstacle that touches the ground dies at clearance.
- **Revisit if:** an obstacle should also be shading or glowing (the two options the user did not choose), or if scrolling content needs the forest to scroll with it.
