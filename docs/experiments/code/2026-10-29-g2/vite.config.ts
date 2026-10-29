/** The G2 browser check: `npx vite build -c docs/experiments/code/2026-10-29-g2/vite.config.ts`. */
import { resolve } from "node:path";
import { defineConfig } from "vite";

const here = import.meta.dirname;
export default defineConfig({
  root: here,
  base: "./",
  build: {
    outDir: process.env.G2_OUT ?? resolve(here, "../../../../runs/g2-browser"),
    emptyOutDir: true,
    target: "es2023",
    rollupOptions: { input: { browser: resolve(here, "browser.html") } },
  },
});
