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

  push(season: number, metrics: readonly TreeMetrics[]): void {
    for (const m of metrics) this.rows.push({ ...m, season });
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
    const width = Math.max(240, Math.min(420, this.container.clientWidth / 2 - 16));
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
        marks: [Plot.lineY(rows, { x: "season", y: "metamers", stroke: tree, tip: true })],
      }),
      Plot.plot({
        ...common,
        title: "Height",
        y: { label: "height (cells)", grid: true },
        x: { label: "season" },
        marks: [Plot.lineY(rows, { x: "season", y: "height", stroke: tree, tip: true })],
      }),
    ];
    this.container.replaceChildren(...charts);
  }
}
