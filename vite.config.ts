import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative base: the same build works on GitHub Pages and in a subfolder of another site.
  base: "./",
  worker: { format: "es" },
  build: {
    target: "es2023",
    sourcemap: true,
    // The lab, and the garden alone as a host page would show it (garden.html, ADR 0014).
    rollupOptions: { input: { main: "index.html", garden: "garden.html" } },
  },
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
    // Visible-test checks grow several 5-seed stands inside one test; 5 s is too tight under load.
    testTimeout: 30_000,
  },
});
