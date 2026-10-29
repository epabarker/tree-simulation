/**
 * THROWAWAY (2026-10-30): each opening forest as garden 0.14.0 shipped it (the TypeScript core's
 * checkpoint) beside the one `cli/first-paint.ts` now grows (the Rust core), standing still, so
 * the seeds chosen by eye can be checked by eye. `?w=220&s=9` opens one; the arrows step through.
 */
import { type Garden, mountGarden } from "../../../../src/web/garden.ts";

const WIDTHS = [66, 100, 160, 220];
const SEEDS = [9, 10, 12];
const ALL = WIDTHS.flatMap((w) => SEEDS.map((s) => ({ w, s })));
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const pick = $("pick") as HTMLSelectElement;
for (const [k, { w, s }] of ALL.entries()) pick.add(new Option(`${w} cells, seed ${s}`, String(k)));

const q = new URLSearchParams(location.search);
let at = Math.max(0, ALL.findIndex(({ w, s }) => w === Number(q.get("w")) && s === Number(q.get("s"))));
let gardens: Garden[] = [];

async function show(): Promise<void> {
  for (const g of gardens) g.destroy();
  gardens = [];
  const { w, s } = ALL[at] as { w: number; s: number };
  pick.value = String(at);
  history.replaceState(null, "", `?w=${w}&s=${s}`);
  // The plate's aspect a host of this width would have (garden.ts plateWidth: a share of the
  // aspect), so each forest is framed as it is shown.
  const aspect = w <= 66 ? 0.6 : w <= 100 ? 1 : w <= 160 ? 1.4 : 1.8;
  const stats: string[] = [];
  for (const [id, base] of [
    ["old", "./old"],
    ["new", "./new"],
  ] as const) {
    const host = $(id);
    host.style.setProperty("--aspect", String(aspect));
    const g = mountGarden(host, {
      first: { base, widths: [w], seeds: [s] },
      autoplay: false,
      wind: false,
      physics: false,
      adaptive: false,
      interaction: "none",
      loupe: false,
      onSnapshot: (snap) => {
        if (id === "old" || id === "new")
          stats.push(`${id}: season ${snap.season}, ${snap.metrics.filter((m) => m.alive).length} trees, ${snap.metamerCount} metamers`);
        $("stats").textContent = stats.slice(-2).join(" · ");
      },
    });
    gardens.push(g);
  }
  await Promise.all(gardens.map((g) => g.ready));
  document.body.dataset.ready = `${w}-${s}`;
}

$("prev").onclick = () => {
  at = (at + ALL.length - 1) % ALL.length;
  void show();
};
$("next").onclick = () => {
  at = (at + 1) % ALL.length;
  void show();
};
pick.onchange = () => {
  at = Number(pick.value);
  void show();
};
void show();
