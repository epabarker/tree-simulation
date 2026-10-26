/**
 * Small on-page charts (Observable Plot), loaded after the first frame so they never delay it.
 * The page keeps one metrics row per tree per season; charts redraw at most a few times a second.
 */

import type { TreeMetrics } from "../../core/metrics.ts";

export type MetricsRow = TreeMetrics & { season: number };

type PlotModule = typeof import("@observablehq/plot");

export class Charts {
  private plot: PlotModule | null = null;
  private rows: MetricsRow[] = [];
  private junctions: Float32Array = new Float32Array(0);
  private pipeN = 2;
  private pending = false;
  private lastDraw = 0;
  private readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async load(): Promise<void> {
    this.plot = await import("@observablehq/plot");
    this.draw();
  }

  reset(): void {
    this.rows = [];
    this.schedule();
  }

  push(
    season: number,
    metrics: readonly TreeMetrics[],
    junctions: Float32Array,
    pipeN: number,
  ): void {
    for (const m of metrics) this.rows.push({ ...m, season });
    this.junctions = junctions;
    this.pipeN = pipeN;
    this.schedule();
  }

  private schedule(): void {
    if (this.pending) return;
    this.pending = true;
    const wait = Math.max(0, 250 - (performance.now() - this.lastDraw));
    setTimeout(() => {
      this.pending = false;
      this.lastDraw = performance.now();
      this.draw();
    }, wait);
  }

  private draw(): void {
    const Plot = this.plot;
    if (!Plot) return;
    // Three across on a wide screen, wrapping to fewer on narrow ones.
    const width = Math.max(240, Math.min(380, (this.container.clientWidth - 32) / 3 - 16));
    const rows = this.rows;
    const common = { width, height: 180, marginLeft: 48, style: { background: "transparent" } };
    const tree = (d: MetricsRow) => `tree ${d.tree}`;
    const charts = [
      Plot.plot({
        ...common,
        title: "Metamers per tree",
        y: { type: "log", label: "metamers", grid: true },
        x: { label: "season" },
        color: { legend: false },
        marks: [Plot.lineY(rows, { x: "season", y: "metamers", stroke: tree, z: tree, tip: true })],
      }),
      Plot.plot({
        ...common,
        title: "Height",
        y: { label: "height (cells)", grid: true },
        x: { label: "season" },
        marks: [Plot.lineY(rows, { x: "season", y: "height", stroke: tree, z: tree, tip: true })],
      }),
    ];
    const lastSeason = rows.length > 0 ? (rows[rows.length - 1] as MetricsRow).season : 0;
    const latest = rows.filter((d) => d.season === lastSeason && d.alive);
    if (latest.length > 1) {
      charts.push(
        Plot.plot({
          ...common,
          title: "Light captured per tree (Q_base)",
          x: { label: "tree" },
          y: { label: "Q_base", grid: true },
          marks: [
            Plot.barY(latest, { x: "tree", y: "qBase", fill: tree, tip: true }),
            Plot.ruleY([0]),
          ],
        }),
      );
    }
    if (this.junctions.length > 0) {
      charts.push(
        Plot.plot({
          ...common,
          title: "Junction exponent Δ (C6)",
          x: { label: "Δ in r_p^Δ = Σ r_c^Δ", domain: [1, 4] },
          y: { label: "junctions", grid: true },
          marks: [
            Plot.rectY(
              Array.from(this.junctions),
              Plot.binX({ y: "count" }, { x: (d: number) => d, interval: 0.1 }),
            ),
            Plot.ruleX([this.pipeN], { stroke: "currentColor", strokeDasharray: "3,3" }),
          ],
        }),
      );
    }
    this.container.replaceChildren(...charts);
  }
}
