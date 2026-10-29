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
    testTimeout: 300_000,
  },
});
