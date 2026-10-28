/**
 * The control panel (Tweakpane): playback, presets, one folder per implemented principle and
 * view options. Principle folders are generated from SECTIONS, so a new principle only needs
 * an entry here (see .claude/skills/implement-principle).
 */

import { Pane } from "tweakpane";
import type { Params, ParamsPatch } from "../../core/params.ts";
import { type PresetName, presets } from "../../core/presets.ts";
import type { PlaybackState, Stats } from "../garden.ts";
import type { LeafStyleName } from "../render/leaf-styles.ts";
import type { ColorMode, ViewOptions } from "../render/scene.ts";

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
  section:
    | "c1"
    | "c2"
    | "c3"
    | "c4"
    | "c5"
    | "c6"
    | "r1"
    | "r2"
    | "r3"
    | "r4"
    | "r5"
    | "r6"
    | "o2"
    | "o4";
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
    title: "C2 Light",
    toggle: true,
    fields: [
      {
        key: "model",
        label: "model",
        options: {
          "sky sweep (M6)": "sky",
          "shadow triangle": "triangle",
          "pooled (§8 ablation)": "pooled",
        },
      },
      { key: "kExt", label: "k_ext (sky)", min: 0.05, max: 3, step: 0.05 },
      { key: "K", label: "K directions (sky)", min: 1, max: 31, step: 1 },
      { key: "rotate", label: "rotate directions (sky)" },
      { key: "skyTilt", label: "sky tilt (sun side)", min: -1, max: 1, step: 0.05 },
      { key: "skyExponent", label: "zenith weighting", min: 0, max: 4, step: 0.1 },
      { key: "a", label: "a strength (triangle)", min: 0.05, max: 3, step: 0.05 },
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
      { key: "Trel", label: "T_rel × crown-top light", min: 0, max: 1, step: 0.01 },
      { key: "topQuantile", label: "crown-top quantile", min: 0.5, max: 1, step: 0.01 },
    ],
  },
  {
    section: "c6",
    title: "C6 Pipe girth",
    toggle: true,
    fields: [
      { key: "n", label: "n pipe exponent", min: 1.5, max: 3.5, step: 0.05 },
      { key: "r0", label: "r0 tip radius", min: 0.005, max: 0.3, step: 0.005 },
    ],
  },
  {
    section: "r1",
    title: "R1 Carbon balance",
    toggle: true,
    fields: [
      { key: "mw", label: "m_w sapwood cost", min: 0, max: 5, step: 0.05 },
      { key: "mf", label: "m_f foliage cost", min: 0, max: 0.4, step: 0.005 },
      { key: "Lh", label: "L_h path length (0 = off)", min: 0, max: 200, step: 5 },
      { key: "fRep", label: "f_rep reproduction", min: 0, max: 0.9, step: 0.05 },
      { key: "maturity", label: "maturity height", min: 0, max: 150, step: 5 },
      { key: "kStarve", label: "k_starve seasons", min: 1, max: 10, step: 1 },
      {
        key: "shed",
        label: "branch shedding",
        options: { "carbon or relative (R1)": "carbon", "C5 light rule": "c5" },
      },
    ],
  },
  {
    // The pa table itself comes from the species presets (ADR 0009); these are its ontogeny knobs.
    section: "r2",
    title: "R2 Physiological age",
    toggle: true,
    fields: [
      { key: "aC", label: "a_c λ decline from age", min: 0, max: 100, step: 1 },
      { key: "dLambda", label: "Δλ decline", min: 0, max: 0.15, step: 0.005 },
      { key: "ramp", label: "decline over (seasons)", min: 1, max: 60, step: 1 },
    ],
  },
  {
    // Posture set-points per pa come from the presets' R2 table (ADR 0011).
    section: "r3",
    title: "R3 Mechanics",
    toggle: true,
    fields: [
      { key: "E", label: "E stiffness", min: 1e5, max: 1e7, step: 1e5 },
      { key: "phi", label: "φ sag set", min: 0, max: 2, step: 0.05 },
      {
        key: "sag",
        label: "sag",
        options: { "load increment": "increment", "creep (whole load)": "creep" },
      },
      { key: "leafMass", label: "leaf mass", min: 0, max: 0.02, step: 0.0005 },
      { key: "posture", label: "posture control" },
      { key: "betaG", label: "β_g gravitropism", min: 0, max: 1, step: 0.01 },
      { key: "gamma", label: "γ proprioception", min: 0, max: 1, step: 0.01 },
      { key: "c", label: "c reaction-wood rate", min: 0, max: 1, step: 0.01 },
      { key: "sigmaTarget", label: "σ_target stress", min: 500, max: 20000, step: 100 },
      { key: "girthGain", label: "stress girth gain", min: 0, max: 1, step: 0.05 },
      { key: "sigmaBreak", label: "σ_break (0 = off)", min: 0, max: 30000, step: 500 },
    ],
  },
  {
    section: "r4",
    title: "R4 Dormancy & release",
    toggle: true,
    fields: [
      { key: "vBreak", label: "v_break release", min: 1, max: 6, step: 0.1 },
      { key: "vCont", label: "v_cont continue", min: 0.5, max: 3, step: 0.1 },
      { key: "delta", label: "δ per dormant season", min: 0, max: 0.2, step: 0.005 },
      { key: "lDorm", label: "L_dorm lifespan", min: 1, max: 100, step: 1 },
      { key: "juvenile", label: "reiteration (pa levels)", min: 0, max: 3, step: 1 },
    ],
  },
  {
    section: "r5",
    title: "R5 Shade avoidance",
    toggle: true,
    fields: [
      { key: "eS", label: "e_s elongation", min: 0, max: 2, step: 0.05 },
      { key: "dLambda", label: "δλ leader bias", min: 0, max: 0.15, step: 0.005 },
      { key: "dB", label: "δ_b fewer breaks", min: 0, max: 4, step: 0.1 },
      { key: "dA", label: "δ_A upright", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    section: "r6",
    title: "R6 Short shoots",
    toggle: true,
    fields: [
      { key: "qMin", label: "Q_ss light threshold", min: 0, max: 1, step: 0.01 },
      { key: "leafArea", label: "a_ss leaf area", min: 0, max: 4, step: 0.05 },
    ],
  },
  {
    section: "o2",
    title: "O2 Abrasion",
    toggle: true,
    fields: [
      { key: "sway", label: "k_sway", min: 0, max: 0.005, step: 0.0001 },
      { key: "maxSway", label: "max sway (cells)", min: 0, max: 8, step: 0.5 },
      { key: "pAbr", label: "p_abr", min: 0, max: 1, step: 0.05 },
    ],
  },
  {
    // Seeds come from R1's reproductive sink: set R1's f_rep and maturity height too.
    section: "o4",
    title: "O4 Stand dynamics",
    toggle: true,
    fields: [
      { key: "cSeed", label: "c_seed per seed", min: 0.5, max: 50, step: 0.5 },
      { key: "d", label: "d dispersal (cells)", min: 1, max: 100, step: 1 },
      { key: "qEst", label: "Q_est ground light", min: 0, max: 1, step: 0.01 },
      { key: "pEst", label: "p_est", min: 0, max: 1, step: 0.05 },
      { key: "m0", label: "m₀ background death", min: 0, max: 0.05, step: 0.001 },
    ],
  },
];

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
    monitors.addBinding(stats, "renderer", { readonly: true });
    monitors.addBinding(stats, "quality", { label: "quality", readonly: true });
    monitors.addBinding(stats, "fps", { readonly: true, format: (v: number) => v.toFixed(0) });
    monitors.addBinding(stats, "drawMs", {
      label: "draw ms (CPU)",
      readonly: true,
      format: (v: number) => v.toFixed(2),
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
        // A field without options or a range is a checkbox (a boolean param).
        const options = f.options
          ? { options: f.options }
          : f.min !== undefined
            ? { min: f.min, max: f.max, step: f.step }
            : {};
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
      "stress σ/σ_target (R3)": "stress",
    };
    viewFolder.addBinding(view, "colorMode", { label: "colour", options: colorOptions });
    viewFolder.addBinding(view, "showLeaves", { label: "leaves" });
    viewFolder.addBinding(view, "depth", { label: "depth (off = x-ray)" });
    const leafOptions: Record<string, LeafStyleName> = {
      broadleaf: "broadleaf",
      "needles (conifer)": "needle",
      "small (birch)": "small",
      "large (tropical)": "large",
    };
    viewFolder.addBinding(view, "leafStyle", { label: "leaf style", options: leafOptions });
    viewFolder.addBinding(view, "leafAge", {
      label: "leaf age (seasons)",
      min: 1,
      max: 12,
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
