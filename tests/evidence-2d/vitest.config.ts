/**
 * The 2D evidence (I2, ADR 0025): the milestone tests calibrated on the 2D model, run against the
 * 3D core as calibration's backlog. They are expected to fail until C1–C8 re-derive them in 3D
 * (under AGENTS.md's seed rule). `npm run evidence:2d`.
 */
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
    include: ["tests/evidence-2d/**/*.test.ts"],
    environment: "node",
    // A 3D stand's season is ≈ 0.2 s natively and more in WASM: the 2D tests' 90 s does not fit.
    testTimeout: 1_800_000,
  },
});
