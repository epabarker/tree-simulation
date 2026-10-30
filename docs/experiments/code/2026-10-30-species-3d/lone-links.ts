// Species step 1b: lab links for the lone trial's world (oakOpen: one tree in the open, 160 wide,
// the woods' top) with beech's round-2 patch (as adopted, FLORA) and round 3's fitted patch.
//   node docs/experiments/code/2026-10-30-species-3d/lone-links.ts http://192.168.178.130:5173/
import { readFileSync } from "node:fs";
import { FITTED_FLORA } from "../../../../src/core/flora-fitted.ts";
import { encodePatch } from "../../../../src/web/ui/share.ts";

const origin = process.argv[2] ?? "http://localhost:5173/";
const round3 = JSON.parse(readFileSync("docs/experiments/fits/round3/beech.json", "utf8")).fit.patch;
const link = (patch: unknown) =>
  `${origin}?preset=oakOpen&seed=1&p=${encodePatch({ trees: [{ x: 80, species: "beech" }], species: { beech: patch } } as never)}`;
console.log(`round 2 (as adopted): ${link(FITTED_FLORA.beech)}`);
console.log(`round 3 (fitted):     ${link(round3)}`);
