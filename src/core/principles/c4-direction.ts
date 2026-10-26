/**
 * C4. Shoot direction as a weighted sum (spec §C4; Palubicki et al. §4.3).
 *
 * Each new metamer points along d = normalize(w_d·d_prev + ξ·V + η·t(A_set) + ε·u), where d_prev
 * is the default direction (the bud's, then the previous metamer's), V the optimal light
 * direction from C2, t(A_set) a unit vector at the set-point angle from vertical (pointing to
 * the side the shoot already heads), and u = d_prev rotated by an angle ~ N(0, σ²)
 * [RNG: directionNoise, keyed by the new metamer's birthId and the season]. In 2D a direction
 * is one angle.
 *
 * Params: c4.wd, c4.xi (ξ), c4.eta (η), c4.setPoint (A_set), c4.epsilon (ε), c4.sigma (σ).
 */

import { DEG, type Params } from "../params.ts";

/**
 * The new direction (radians) from the default direction `prev`, the light direction (vx, vy)
 * and a noise angle `noise` (radians, already drawn from N(0, σ²)).
 */
export function shootDirection(
  prev: number,
  vx: number,
  vy: number,
  noise: number,
  c4: Params["c4"],
): number {
  const dx = Math.cos(prev);
  const dy = Math.sin(prev);
  const setPoint = c4.setPoint * DEG;
  const side = dx >= 0 ? 1 : -1;
  const tx = Math.sin(setPoint) * side;
  const ty = Math.cos(setPoint);
  const ux = Math.cos(prev + noise);
  const uy = Math.sin(prev + noise);
  const x = c4.wd * dx + c4.xi * vx + c4.eta * tx + c4.epsilon * ux;
  const y = c4.wd * dy + c4.xi * vy + c4.eta * ty + c4.epsilon * uy;
  return x === 0 && y === 0 ? prev : Math.atan2(y, x);
}
