/**
 * The opening forests' comparison page: `npx vite build -c docs/experiments/code/2026-10-30-first-paint/vite.config.ts`,
 * after copying garden 0.14.0's `first/` to runs/first-compare/old and `node cli/first-paint.ts
 * runs/first-compare/new` (the public directory).
 */
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = import.meta.dirname;
const repo = resolve(here, "../../../..");

export default defineConfig({
  root: here,
  base: "./",
  publicDir: resolve(repo, "runs/first-compare"),
  worker: { format: "es" },
  build: {
    outDir: process.env.PREVIEW_OUT ?? resolve(repo, "runs/preview-first"),
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: { input: { compare: resolve(here, "compare.html") } },
  },
  server: { fs: { allow: [repo] } },
});
