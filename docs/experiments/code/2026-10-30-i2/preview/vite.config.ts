/**
 * I2's preview page: after `bake.ts` (3D stands) and `bake-2d.sh` (today's 2D forests) have filled
 * runs/i2-preview-public/{stands,flat}:
 *   npx vite build -c docs/experiments/code/2026-10-30-i2/preview/vite.config.ts
 * Deployed on the site's preview-3d branch at /preview/i2/, beside its /garden/0.14.0/.
 */
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = import.meta.dirname;
const repo = resolve(here, "../../../../..");

export default defineConfig({
  root: here,
  base: "./",
  publicDir: resolve(repo, "runs/i2-preview-public"),
  worker: { format: "es" },
  build: {
    outDir: process.env.PREVIEW_OUT ?? resolve(repo, "runs/preview-i2"),
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: { input: { i2: resolve(here, "i2.html") } },
  },
  server: { fs: { allow: [repo] } },
});
