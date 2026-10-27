/**
 * R3. Mechanics: sag, posture control, stress-driven girth (spec §R3, ADR 0011; Jirasek et al.
 * 2000; Moulia et al. 2006; Alméras & Fournier 2009; Bastien et al. 2013; Minamino & Tateno 2014).
 *
 * Once a season, after girth (§6 rule 2: new wood both stiffens and pays for posture), every
 * metamer's base carries the weight W of its wood (ρ_w·πr²l, at its midpoint), its leaves (leaf
 * mass × leaf area, at its tip) and everything above it, with first moment S = Σ weight·x.
 * The bending moment at its base is M = S − W·x_base: exact, local, one basipetal pass.
 * - **Stress-driven girth:** where the surface stress σ = 4|M|/(πr³) exceeds σ_target, the base
 *   adds wood, Δr = gain·r·(σ/σ_target − 1), never past σ = σ_target. That wood is local
 *   (`stressWood`, not passed on to the parent's pipe sum; c6-girth.ts).
 * - **Sag:** the elastic curvature κ_e = M/(E·πr⁴/4) sets permanently by Δθ = −φ·κ_e·l each season
 *   (new wood is laid down on the bent stem; Jirasek et al. 2000). The sign turns the load toward
 *   the ground, so a hanging branch is at rest.
 * - **Posture control:** reaction wood turns the metamer toward its posture set-point, Bastien's
 *   AC model: Δθ = −β_g·sin(A − A_set) − γ·κ·l, with κ·l the kink to the previous metamer of the
 *   same axis (proprioception). It is clamped to ±c·Δr/r: no new girth, no correction.
 * Every metamer's turn is computed from the start-of-pass geometry (all elements sense at once, so
 * gravitropism alone overshoots as in Bastien et al. 2013), then turns accumulate acropetally:
 * each rotates its whole subtree about its base. Buds turn with their metamer. Breakage (§R3.4
 * optional) waits for R4 release (ADR 0011).
 *
 * Params: r3.enabled, r3.rho (ρ_w), r3.leafMass, r3.E, r3.phi (φ), r3.posture, r3.betaG (β_g),
 * r3.gamma (γ), r3.c, r3.sigmaTarget (σ_target), r3.girthGain; posture set-points from r2.levels
 * (`postureSetPoint`, else `setPoint`) or c4.setPoint; r6 leaf areas.
 */

import { DEG, type Params } from "../params.ts";
import { Slot, type Tree } from "../tree.ts";
import { isLiveBud } from "./c3-allocation.ts";
import { paLevel } from "./r2-physiological-age.ts";
import { depositArea } from "./r6-short-shoots.ts";

/** Largest sag a metamer takes in one season, radians: keeps a light, thin tip from flipping over. */
export const MAX_SAG = 0.2;

/** Posture set-point A_set (radians from vertical) of an axis of order `order`. */
export function postureSetPoint(order: number, params: Params): number {
  const level = paLevel(order, params.r2);
  if (!level) return params.c4.setPoint * DEG;
  return (level.postureSetPoint ?? level.setPoint) * DEG;
}

/** An angle wrapped into (−π, π]. */
export function wrapAngle(a: number): number {
  let x = a % (2 * Math.PI);
  if (x > Math.PI) x -= 2 * Math.PI;
  else if (x <= -Math.PI) x += 2 * Math.PI;
  return x;
}

/**
 * Posture turn (radians, counter-clockwise positive) of a metamer at absolute angle `angle`
 * (0 = +x, π/2 = up) with set-point `setPoint` from vertical on the side it heads, `kink` its angle
 * to the previous metamer of its axis, and relative girth growth `dr` = Δr/r this season.
 */
export function postureTurn(
  angle: number,
  setPoint: number,
  kink: number,
  dr: number,
  r3: Params["r3"],
): number {
  const side = Math.cos(angle) >= 0 ? 1 : -1;
  const target = Math.PI / 2 - side * setPoint;
  const want = -r3.betaG * Math.sin(wrapAngle(angle - target)) - r3.gamma * kink;
  const limit = r3.c * Math.max(0, dr);
  return Math.min(limit, Math.max(-limit, want));
}

/**
 * The MECHANICS step of §6, after C6 girth. Expects `tree.prevRadius` to hold each metamer's
 * radius from before this season's girth pass.
 */
export function updateMechanics(tree: Tree, params: Params): void {
  const { r3 } = params;
  const nm = tree.m.length;
  const c = tree.m.cols;
  const { loadW: W, loadS: S, stress, prevRadius } = tree;

  // Leaf weight at each node, from the leaf area the light model sees (R6 by shoot type).
  W.fill(0, 0, nm);
  S.fill(0, 0, nm);
  const b = tree.b.cols;
  for (let j = 0; j < tree.b.length; j++) {
    if (!isLiveBud(b.state[j])) continue;
    const m = b.metamer[j];
    const w = r3.leafMass * depositArea(b.state[j], params.r6);
    W[m] += w;
    S[m] += w * tree.tipX(m);
  }

  // Basipetal: loads, moments, stress-driven girth, and each metamer's own turn (children always
  // come later in the table, so their loads are in W and S by the time their parent is reached).
  const turn = tree.scratchF;
  const sigmaT = r3.sigmaTarget;
  for (let i = nm - 1; i >= 0; i--) {
    const r = c.radius[i];
    const l = c.length[i];
    const x0 = c.baseX[i];
    const wood = r3.rho * Math.PI * r * r * l;
    const w = W[i] + wood;
    const s = S[i] + wood * (x0 + 0.5 * l * Math.cos(c.angle[i]));
    const M = s - w * x0;
    const p = c.parent[i];
    if (p >= 0) {
      W[p] += w;
      S[p] += s;
    }

    let rNew = r;
    let sigma = (4 * Math.abs(M)) / (Math.PI * r * r * r);
    if (r3.girthGain > 0 && sigmaT > 0 && sigma > sigmaT) {
      const rTarget = Math.cbrt((4 * Math.abs(M)) / (Math.PI * sigmaT));
      const dr = Math.min(r3.girthGain * r * (sigma / sigmaT - 1), rTarget - r);
      rNew = r + dr;
      c.radius[i] = rNew;
      c.stressWood[i] += dr;
      sigma = (4 * Math.abs(M)) / (Math.PI * rNew * rNew * rNew);
    }
    stress[i] = sigmaT > 0 ? sigma / sigmaT : 0;

    // Sag: a load to the right of the base (M > 0) turns the metamer clockwise.
    const load = r3.sag === "increment" ? M - c.moment[i] : M;
    c.moment[i] = M;
    const kappa = load / ((r3.E * Math.PI * rNew ** 4) / 4);
    const sag = Math.min(MAX_SAG, Math.max(-MAX_SAG, -r3.phi * kappa * l));
    let post = 0;
    if (r3.posture) {
      const a = c.angle[i];
      const kink = p >= 0 && c.slot[i] === Slot.main ? wrapAngle(a - c.angle[p]) : 0;
      const prev = prevRadius[i] > 0 ? prevRadius[i] : rNew;
      const dr = (rNew - prev) / rNew;
      post = postureTurn(a, postureSetPoint(c.order[i], params), kink, dr, r3);
    }
    turn[i] = sag + post;
  }

  // Acropetal: accumulate turns down each path, rotate, and rebuild positions from the root.
  for (let i = 0; i < nm; i++) {
    const p = c.parent[i];
    if (p >= 0) {
      turn[i] += turn[p];
      c.baseX[i] = tree.tipX(p);
      c.baseY[i] = tree.tipY(p);
    }
    c.angle[i] += turn[i];
  }
  for (let j = 0; j < tree.b.length; j++) {
    if (isLiveBud(b.state[j])) b.angle[j] += turn[b.metamer[j]];
  }
}
