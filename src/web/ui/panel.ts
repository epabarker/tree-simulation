/**
 * The control panel (Tweakpane): playback, presets, one folder per implemented principle and
 * view options. Principle folders are generated from SECTIONS, so a new principle only needs
 * an entry here (see .claude/skills/implement-principle).
 */

import { Pane } from "tweakpane";
import type { Params, ParamsPatch } from "../../core/params.ts";
import { type PresetName, presets } from "../../core/presets.ts";
import type { ColorMode, ViewOptions } from "../render/canvas2d.ts";

interface FieldSpec {
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: Record<string, string>;
  /** Changing this field starts a new run instead of patching the running one. */
  restart?: boolean;
}

interface SectionSpec {
  section: "c1" | "c2" | "c3" | "c4" | "c5" | "c6";
  title: string;
  /** Adds an on/off checkbox bound to the section's `enabled` flag. */
  toggle?: boolean;
  fields: FieldSpec[];
}

const SECTIONS: SectionSpec[] = [
  {
    section: "c1",
    title: "C1 Buds",
    fields: [
      { key: "branchAngle", label: "β branch angle°", min: 10, max: 90, step: 1 },
      { key: "maxMetamersPerShoot", label: "shoot cap", min: 1, max: 8, step: 1 },
    ],
  },
  {
    section: "c2",
    title: "C2 Light (shadow)",
    toggle: true,
    fields: [
      { key: "a", label: "a strength", min: 0.1, max: 3, step: 0.05 },
      { key: "b", label: "b decay", min: 1.05, max: 4, step: 0.05 },
      { key: "qMax", label: "q max depth", min: 1, max: 12, step: 1 },
      { key: "C", label: "C full light", min: 0.1, max: 3, step: 0.05 },
      { key: "perceptionAngle", label: "θ wedge half-angle°", min: 10, max: 90, step: 1 },
      { key: "perceptionDistance", label: "r perception", min: 1, max: 8, step: 1 },
    ],
  },
  {
    section: "c3",
    title: "C3 Allocation",
    fields: [
      {
        key: "mode",
        label: "mode",
        options: { "Borchert–Honda": "bh", "equal (ablation)": "equal", "none (M0–M1)": "none" },
      },
      { key: "lambda", label: "λ apical bias", min: 0.4, max: 0.65, step: 0.005 },
      { key: "alpha", label: "α resource", min: 0.5, max: 5, step: 0.1 },
    ],
  },
  {
    section: "c4",
    title: "C4 Direction",
    toggle: true,
    fields: [
      { key: "wd", label: "w_d previous", min: 0, max: 3, step: 0.05 },
      { key: "xi", label: "ξ light", min: 0, max: 2, step: 0.05 },
      { key: "eta", label: "η tropism", min: -1, max: 1, step: 0.05 },
      { key: "setPoint", label: "A_set°", min: 0, max: 180, step: 1 },
      { key: "epsilon", label: "ε noise", min: 0, max: 2, step: 0.05 },
      { key: "sigma", label: "σ noise°", min: 0, max: 90, step: 1 },
    ],
  },
  {
    section: "c5",
    title: "C5 Shedding",
    toggle: true,
    fields: [
      { key: "T", label: "T light per metamer", min: 0, max: 0.5, step: 0.01 },
      { key: "g", label: "g grace (seasons)", min: 0, max: 15, step: 1 },
    ],
  },
  {
    section: "c6",
    title: "C6 Pipe girth",
    toggle: true,
    fields: [
      { key: "n", label: "n pipe exponent", min: 1.5, max: 3.5, step: 0.05 },
      { key: "r0", label: "r0 tip radius", min: 0.02, max: 0.3, step: 0.01 },
    ],
  },
];

export interface PlaybackState {
  playing: boolean;
  speed: number;
}

export interface Stats {
  season: number;
  metamers: number;
  workerMs: number;
}

export interface PanelCallbacks {
  onPlay(playing: boolean): void;
  onStep(): void;
  onRestart(params: Params): void;
  onPatch(patch: ParamsPatch): void;
  onPreset(name: PresetName): void;
  onView(): void;
  onFit(): void;
  onExport(): void;
}

export class Panel {
  readonly pane: Pane;
  private params: Params;

  constructor(
    container: HTMLElement,
    params: Params,
    playback: PlaybackState,
    stats: Stats,
    view: ViewOptions & { preset: PresetName },
    cb: PanelCallbacks,
  ) {
    this.params = params;
    const compact = window.matchMedia("(max-width: 700px)").matches;
    this.pane = new Pane({ container, title: "Controls", expanded: !compact });
    const pane = this.pane;

    const play = pane.addButton({ title: playback.playing ? "Pause" : "Play" });
    play.on("click", () => {
      playback.playing = !playback.playing;
      play.title = playback.playing ? "Pause" : "Play";
      cb.onPlay(playback.playing);
    });
    this.setPlaying = (playing: boolean) => {
      playback.playing = playing;
      play.title = playing ? "Pause" : "Play";
    };
    pane.addButton({ title: "Step one season" }).on("click", () => cb.onStep());
    pane.addBinding(playback, "speed", { label: "seasons / s", min: 0.5, max: 20, step: 0.5 });

    const presetOptions: Record<string, string> = {};
    for (const [name, preset] of Object.entries(presets)) presetOptions[preset.label] = name;
    pane
      .addBinding(view, "preset", { label: "preset", options: presetOptions })
      .on("change", (ev) => cb.onPreset(ev.value as PresetName));
    pane.addButton({ title: "Reset" }).on("click", () => cb.onRestart(this.params));
    pane.addButton({ title: "Reseed" }).on("click", () => {
      this.params.seed = Math.floor(Math.random() * 1_000_000);
      pane.refresh();
      cb.onRestart(this.params);
    });
    pane.addBinding(this.params, "seed", { label: "seed", step: 1 }).on("change", (ev) => {
      if (ev.last) cb.onRestart(this.params);
    });

    const monitors = pane.addFolder({ title: "Stats", expanded: false });
    monitors.addBinding(stats, "season", { readonly: true, format: (v: number) => v.toFixed(0) });
    monitors.addBinding(stats, "metamers", { readonly: true, format: (v: number) => v.toFixed(0) });
    monitors.addBinding(stats, "workerMs", {
      label: "worker ms/season",
      readonly: true,
      format: (v: number) => v.toFixed(1),
    });

    for (const spec of SECTIONS) {
      const folder = pane.addFolder({ title: spec.title, expanded: false });
      const target = this.params[spec.section] as unknown as Record<string, unknown>;
      if (spec.toggle) {
        folder.addBinding(target, "enabled", { label: "enabled" }).on("change", (ev) => {
          cb.onPatch({ [spec.section]: { enabled: ev.value } } as ParamsPatch);
        });
      }
      for (const f of spec.fields) {
        const options = f.options
          ? { options: f.options }
          : { min: f.min, max: f.max, step: f.step };
        folder.addBinding(target, f.key, { label: f.label, ...options }).on("change", (ev) => {
          if (!ev.last) return;
          if (f.restart) cb.onRestart(this.params);
          else cb.onPatch({ [spec.section]: { [f.key]: ev.value } } as ParamsPatch);
        });
      }
    }

    const viewFolder = pane.addFolder({ title: "View", expanded: false });
    const colorOptions: Record<string, ColorMode> = {
      "natural (bark by age)": "natural",
      "branch order": "order",
      "light (Q per metamer)": "light",
      "resource v": "resource",
      age: "age",
      tree: "tree",
    };
    viewFolder.addBinding(view, "colorMode", { label: "colour", options: colorOptions });
    viewFolder.addBinding(view, "showLeaves", { label: "leaves" });
    viewFolder.addBinding(view, "leafAge", {
      label: "leaf age (seasons)",
      min: 1,
      max: 8,
      step: 1,
    });
    viewFolder.addBinding(view, "showBuds", { label: "buds" });
    viewFolder.addBinding(view, "showShadow", { label: "shadow" });
    viewFolder.addBinding(view, "showGhosts", { label: "shed ghosts" });
    viewFolder.on("change", () => cb.onView());
    viewFolder.addButton({ title: "Fit view" }).on("click", () => cb.onFit());
    viewFolder.addButton({ title: "Export run (JSON)" }).on("click", () => cb.onExport());
  }

  /** Updates the play button without triggering a callback. */
  setPlaying: (playing: boolean) => void;

  /** Replaces the params shown in the panel (after a preset change). */
  setParams(params: Params): void {
    for (const key of Object.keys(params) as (keyof Params)[]) {
      const target = this.params[key];
      const source = params[key];
      if (target && typeof target === "object" && !Array.isArray(target)) {
        Object.assign(target, source);
      } else {
        (this.params as unknown as Record<string, unknown>)[key] = source;
      }
    }
    this.pane.refresh();
  }

  get current(): Params {
    return this.params;
  }
}
