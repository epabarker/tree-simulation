/**
 * WebGL2 renderer (ADR 0001, M6b): the scene in a handful of instanced draw calls.
 *
 *  - Branches: one quad per metamer, shaded in the fragment shader as a capsule tapering from the
 *    metamer's radius to its continuation's (a signed-distance function, so joints are round and
 *    edges antialiased without multisampling).
 *  - Leaves: one quad per leaf, shaded as its species' outline (leaf-styles.ts LEAF_SHAPES: a width
 *    profile along the leaf, or five lobes about a centre). Buds: squares. Walls: rectangles.
 *  - Shade overlay: a texture. Sky and ground: full-screen gradients.
 *
 * Wood and leaves draw far to near in the Scene's depth slices (I3): per slice the wood's range of
 * its batch, then the leaves'. WebGL2 has no base instance, so a range is drawn by pointing the
 * batch's instance attributes at its first instance (`drawRange`).
 *
 * Positions come from the shared Scene (the tween needs them on the CPU, and picking uses them).
 * Instance data never depends on the camera (zoom-dependent minimum sizes are applied in the
 * shaders), so when only the camera moves, a frame re-uses the uploaded buffers and changes only
 * uniforms.
 */

import {
  type BufferInfo,
  createBufferInfoFromArrays,
  createProgramInfo,
  createTexture,
  createVertexArrayInfo,
  drawBufferInfo,
  type ProgramInfo,
  setAttribInfoBufferFromArray,
  setTextureFromArray,
  setUniforms,
  type VertexArrayInfo,
} from "twgl.js";
import type { Snapshot } from "../../core/types.ts";
import { BudState } from "../../core/types.ts";
import { BUD_ACTIVE, BUD_DORMANT, dimByte, parseColor, SEQUENTIAL, shadeImage } from "./colors.ts";
import { LEAF_PALETTES, LEAF_STYLES } from "./leaf-styles.ts";
import { MAX_DPR, type Renderer, type RendererOptions } from "./renderer.ts";
import {
  DEPTH_SLICES,
  LEAF_MIN_PX,
  LEAF_OPACITY,
  type Leaves,
  Scene,
  type ViewOptions,
  WOOD_CONTRAST,
} from "./scene.ts";
import { readTheme, type Theme } from "./theme.ts";

// World → clip space: x_clip = (x − cx)·sx, y_clip = groundClip + y·sy, with u_view = (cx, sx, groundClip, sy).
const VIEW = /* glsl */ `
uniform vec4 u_view;
uniform float u_px; // world units per CSS pixel
vec4 toClip(vec2 w) { return vec4((w.x - u_view.x) * u_view.y, u_view.z + w.y * u_view.w, 0.0, 1.0); }
`;

const SEGMENT_VS = /* glsl */ `#version 300 es
${VIEW}
in vec2 a_corner;
in vec2 a_a;
in vec2 a_b;
in vec2 a_r;
in vec4 a_color;
in vec4 a_bark; // fissure depth, marks, plates (bark-styles.ts), 0
in float a_s;   // path length from the tree's base to this segment's base, world units
out vec2 v_p;
out float v_h;
out vec2 v_r;
out vec4 v_color;
out vec4 v_bark;
out float v_s;
void main() {
  vec2 d = a_b - a_a;
  float h = length(d);
  vec2 dir = h > 1e-6 ? d / h : vec2(0.0, 1.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  // Never draw thinner than half a pixel; a thinner stem fades by its true coverage instead.
  vec2 r = max(a_r, vec2(0.5 * u_px));
  float coverage = clamp(2.0 * max(a_r.x, a_r.y) / u_px, 0.0, 1.0);
  float pad = max(r.x, r.y) + u_px;
  float along = mix(-pad, h + pad, a_corner.y * 0.5 + 0.5);
  float across = a_corner.x * pad;
  v_p = vec2(across, along);
  v_h = h;
  v_r = r;
  v_color = vec4(a_color.rgb, a_color.a * coverage);
  v_bark = a_bark;
  v_s = a_s;
  gl_Position = toClip(a_a + dir * along + nrm * across);
}`;

const SEGMENT_FS = /* glsl */ `#version 300 es
precision highp float;
uniform float u_px;
in vec2 v_p;
in float v_h;
in vec2 v_r;
in vec4 v_color;
in vec4 v_bark;
in float v_s;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Bark (bark-styles.ts): how dark the bark is at local point p of a stem of radius r, 0 → 1.
// The stem is read as a cylinder seen side on: across the drawn width, the arc length around it;
// along it, the path length from the tree's base, so a pattern runs on unbroken from segment to
// segment. Fissures wander up the stem; plates break them across; birch's marks are short dark
// dashes. Each fades out where its spacing would be under a few pixels, so it never shimmers.
float barkDark(vec2 p, float r) {
  vec4 b = v_bark;
  if (b.x + b.y + b.z <= 0.0) return 0.0;
  float wide = smoothstep(1.5, 3.5, r / u_px);
  if (wide <= 0.0) return 0.0;
  float S = max(0.45, 0.6 * r);
  float fine = smoothstep(2.5, 5.0, S / u_px);
  float u = clamp(p.x / r, -0.999, 0.999);
  float arc = asin(u) * r;
  float y = v_s + p.y;
  float fx = arc / S + 0.55 * sin(y / (2.3 * S)) + 0.2 * sin(y / (0.83 * S) + 1.7);
  float col = floor(fx);
  float d = abs(fract(fx) - 0.5) * 2.0;
  // Each fissure narrows and breaks along its length, so it reads as bark, not stripes.
  float run = 0.55 + 0.45 * sin(y / (1.9 * S) + 6.1 * hash(vec2(col, 3.0)));
  float fissure = (1.0 - smoothstep(0.08, 0.3 * run + 0.05, d)) * b.x;
  float py = y / (1.3 * S) + 0.5 * col;
  float plate = (1.0 - smoothstep(0.05, 0.16, abs(fract(py) - 0.5) * 2.0)) * b.z;
  float my = y / (0.55 * S);
  float mx = arc / (0.9 * S) + 0.5 * floor(my);
  float on = step(0.62, hash(vec2(floor(my), floor(mx))));
  float dash = on * (1.0 - smoothstep(0.15, 0.4, abs(fract(my) - 0.5) * 2.0))
    * (1.0 - smoothstep(0.55, 0.95, abs(fract(mx) - 0.5) * 2.0)) * b.y;
  return wide * fine * max(max(fissure, plate), dash);
}
// Capsule from (0, 0) with radius r1 to (0, h) with radius r2 (I. Quilez, 2D distance functions).
float sdUnevenCapsule(vec2 p, float r1, float r2, float h) {
  p.x = abs(p.x);
  float b = clamp((r1 - r2) / max(h, 1e-6), -0.99, 0.99);
  float a = sqrt(1.0 - b * b);
  float k = dot(p, vec2(-b, a));
  if (k < 0.0) return length(p) - r1;
  if (k > a * h) return length(p - vec2(0.0, h)) - r2;
  return dot(p, vec2(a, b)) - r1;
}
void main() {
  float d = sdUnevenCapsule(v_p, v_r.x, v_r.y, v_h);
  float alpha = clamp(0.5 - d / u_px, 0.0, 1.0) * v_color.a;
  if (alpha <= 0.0) discard;
  float r = mix(v_r.x, v_r.y, clamp(v_p.y / max(v_h, 1e-6), 0.0, 1.0));
  vec3 rgb = v_color.rgb * (1.0 - 0.82 * clamp(barkDark(v_p, r), 0.0, 1.0));
  outColor = vec4(rgb * alpha, alpha);
}`;

const LEAF_VS = /* glsl */ `#version 300 es
${VIEW}
uniform vec3 u_leaf; // full length (world), unused, minimum length (CSS px)
in vec2 a_corner;
in vec2 a_pos;
in vec2 a_dir;
in float a_grow;
in vec2 a_shape; // outline (LEAF_SHAPES index), width over length
in vec4 a_color;
out vec2 v_p;
out vec2 v_size;
flat out float v_shape;
out vec4 v_color;
void main() {
  // A leaf not drawn this frame keeps its place at size 0 (Scene.leaves): put it outside the clip.
  if (a_grow <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float len = max(u_leaf.x, u_leaf.z * u_px) * a_grow;
  float wid = min(max(len * a_shape.y, u_px), 0.9 * len);
  float along = mix(-u_px, len + u_px, a_corner.y * 0.5 + 0.5);
  float across = a_corner.x * (0.5 * wid + u_px);
  vec2 nrm = vec2(-a_dir.y, a_dir.x);
  v_p = vec2(across, along - 0.5 * len);
  v_size = vec2(len, wid);
  v_shape = a_shape.x;
  v_color = a_color;
  gl_Position = toClip(a_pos + a_dir * along + nrm * across);
}`;

const LEAF_FS = /* glsl */ `#version 300 es
precision highp float;
uniform float u_px;
in vec2 v_p;
in vec2 v_size;
flat in float v_shape;
in vec4 v_color;
out vec4 outColor;
const float PI = 3.14159265;
// Half-width as a share of the full half-width at t (base 0, tip 1): leaf-styles.ts leafProfile.
float profile(int shape, float t) {
  float s = sin(PI * t);
  if (shape == 1) return pow(s, 0.6) * (1.0 - 0.25 * t) * (1.0 + 0.06 * sin(t * 40.0));
  if (shape == 2) return (t < 0.3 ? pow(t / 0.3, 0.7) : pow((1.0 - t) / 0.7, 1.1)) * (1.0 + 0.08 * abs(sin(t * 30.0)));
  if (shape == 3) return pow(s, 0.5) * (0.62 + 0.38 * abs(sin(t * PI * 4.5)));
  if (shape == 5) return pow(s, 0.6) * (0.85 + 0.25 * abs(fract(t * 4.5) - 0.5) * 2.0);
  if (shape == 6) return t < 0.08 ? 0.08 : max(0.08, pow(sin(PI * fract(t * 6.0)), 0.8));
  return s;
}
void main() {
  float len = v_size.x;
  float w = 0.5 * v_size.y;
  int shape = int(v_shape + 0.5);
  float dist;
  if (shape == 4) {
    // Palmate (field maple): five lobes about the leaf's centre (palmateRadius).
    vec2 q = vec2(v_p.x / w, v_p.y / (0.5 * len));
    float theta = atan(q.x, q.y);
    float r = 0.55 + 0.45 * pow(abs(cos(2.5 * theta)), 2.0);
    dist = (length(q) - r) * min(w, 0.5 * len);
  } else {
    float t = v_p.y / len + 0.5;
    float hw = w * profile(shape, clamp(t, 0.0, 1.0));
    dist = max(abs(v_p.x) - hw, max(-t * len, (t - 1.0) * len));
  }
  float alpha = clamp(0.5 - dist / u_px, 0.0, 1.0) * v_color.a;
  if (alpha <= 0.0) discard;
  outColor = vec4(v_color.rgb * alpha, alpha);
}`;

const RECT_VS = /* glsl */ `#version 300 es
${VIEW}
in vec2 a_corner;
in vec4 a_rect; // x, y, width, height in world units
in vec4 a_color;
out vec4 v_color;
void main() {
  v_color = a_color;
  gl_Position = toClip(a_rect.xy + (a_corner * 0.5 + 0.5) * a_rect.zw);
}`;

const POINT_VS = /* glsl */ `#version 300 es
${VIEW}
uniform vec2 u_point; // side in CSS px, minimum side in world units
in vec2 a_corner;
in vec2 a_center;
in vec4 a_color;
out vec4 v_color;
void main() {
  v_color = a_color;
  float half_ = 0.5 * max(u_point.x * u_px, u_point.y);
  gl_Position = toClip(a_center + a_corner * half_);
}`;

const FLAT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec4 v_color;
out vec4 outColor;
void main() { outColor = vec4(v_color.rgb * v_color.a, v_color.a); }`;

const IMAGE_VS = /* glsl */ `#version 300 es
${VIEW}
uniform vec4 u_rect;
in vec2 a_corner;
out vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  gl_Position = toClip(u_rect.xy + v_uv * u_rect.zw);
}`;

const IMAGE_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform float u_alpha;
in vec2 v_uv;
out vec4 outColor;
void main() {
  vec4 c = texture(u_image, v_uv);
  float a = c.a * u_alpha;
  outColor = vec4(c.rgb * a, a);
}`;

// A full-screen triangle; the gradient runs between the top edge, the ground line and the bottom.
const BACKDROP_VS = /* glsl */ `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const BACKDROP_FS = /* glsl */ `#version 300 es
precision highp float;
uniform float u_height; // device pixels
uniform float u_ground; // device pixels from the bottom edge
uniform int u_mode;     // 0 = sky, 1 = ground
uniform vec3 u_top;
uniform vec3 u_bottom;
uniform float u_hatch;  // ground drawn as ink hatching, lines this many device pixels apart (0: filled)
uniform float u_line;   // ink line width, device pixels
out vec4 outColor;
void main() {
  float y = gl_FragCoord.y;
  if (u_mode == 0) {
    float t = clamp((u_height - y) / max(1.0, u_height - u_ground), 0.0, 1.0);
    outColor = vec4(mix(u_top, u_bottom, t), 1.0);
  } else {
    if (y > u_ground) discard;
    if (u_hatch > 0.0) {
      // An ink line along the ground, and diagonal hatching below it fading downward.
      float edge = 1.0 - smoothstep(u_line, u_line + 1.0, u_ground - y);
      float d = mod(gl_FragCoord.x + y, u_hatch);
      float hatch = (1.0 - smoothstep(u_line * 0.6, u_line * 0.6 + 1.0, d)) * 0.55;
      hatch *= clamp(y / max(1.0, u_ground), 0.25, 1.0);
      float a = max(edge, hatch);
      if (a <= 0.0) discard;
      outColor = vec4(u_top * a, a);
      return;
    }
    float t = clamp((u_ground - y) / max(1.0, u_ground), 0.0, 1.0);
    outColor = vec4(mix(u_top, u_bottom, t), 1.0);
  }
}`;

const CORNERS = [-1, -1, 1, -1, -1, 1, 1, 1];
const BUD_SIDE_PX = 2.6;
const BUD_MIN_SIDE = 0.22;
const GHOST_RADIUS = 0.05;

type Bytes = Uint8Array<ArrayBuffer>;
type Floats = Float32Array<ArrayBuffer>;

/** One instanced draw: a program, its buffers and the CPU-side arrays they are filled from. */
interface Batch {
  program: ProgramInfo;
  buffers: BufferInfo;
  vao: VertexArrayInfo;
  /**
   * Attribute name → CPU array (grown on demand), components per instance, and how many elements
   * the GPU buffer holds: it grows to the CPU array's capacity, so a frame only overwrites it.
   */
  streams: Map<string, { data: Floats | Bytes; size: number; gpuLength: number }>;
  /** Instances uploaded last time. */
  count: number;
  /** Each instance attribute's location, buffer, type and bytes per instance, for `drawRange`. */
  pointers: {
    location: number;
    buffer: WebGLBuffer;
    size: number;
    type: number;
    normalize: boolean;
    bytes: number;
  }[];
}

function rgb(css: string): [number, number, number] {
  const [r, g, b] = parseColor(css);
  return [r / 255, g / 255, b / 255];
}

export class WebGL2Renderer implements Renderer {
  readonly kind = "webgl2";
  readonly canvas: HTMLCanvasElement;
  readonly scene = new Scene();
  private readonly gl: WebGL2RenderingContext;
  private theme: Theme;
  private themeVersion = 0;
  private lost = false;
  private segments!: Batch;
  private ghostBatch!: Batch;
  private leafBatch!: Batch;
  private budBatch!: Batch;
  private wallBatch!: Batch;
  private image!: Batch;
  private backdrop!: ProgramInfo;
  private shadeTexture: WebGLTexture | null = null;
  private shadeSize: [number, number] = [0, 0];
  private hasShade = false;
  private shadeFor: Snapshot | null = null;
  /** The backdrop beyond a closed stand (Scene.interiorOf): one texel per row of the world. */
  private interiorTexture: WebGLTexture | null = null;
  private interiorHeight = 0;
  private interiorFor = { s: null as Snapshot | null, theme: -1 };
  private paletteCache = new Map<string, Bytes>();
  /** Where each depth slice's leaves start in `leafBatch` (a copy of the scene's `Leaves.slices`). */
  private leafSlices = new Int32Array(DEPTH_SLICES + 1);
  /** What the uploaded instance data was built from; if nothing differs it can be re-used. */
  private uploaded: { next: Snapshot | null; prev: Snapshot | null; key: string } = {
    next: null,
    prev: null,
    key: "",
  };

  private readonly transparent: boolean;
  private maxDpr: number;

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    this.transparent = options.transparent ?? false;
    this.maxDpr = options.maxDpr ?? MAX_DPR;
    // Colours are premultiplied throughout (blend ONE, ONE_MINUS_SRC_ALPHA), as a page expects.
    const gl = canvas.getContext("webgl2", {
      alpha: this.transparent,
      antialias: false,
      depth: false,
    });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    this.theme = readTheme(canvas);
    this.init();
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.init();
      this.lost = false;
    });
    this.resize();
  }

  private program(vs: string, fs: string): ProgramInfo {
    const p = createProgramInfo(this.gl, [vs, fs]);
    if (!p) throw new Error("WebGL2 shader failed to compile");
    return p;
  }

  private batch(
    program: ProgramInfo,
    attribs: Record<string, { size: number; bytes?: boolean }>,
  ): Batch {
    const gl = this.gl;
    const arrays: Record<string, object> = {
      a_corner: { numComponents: 2, data: new Float32Array(CORNERS) },
    };
    const streams: Batch["streams"] = new Map();
    for (const [name, { size, bytes }] of Object.entries(attribs)) {
      const data = bytes ? new Uint8Array(64 * size) : new Float32Array(64 * size);
      streams.set(name, { data, size, gpuLength: data.length });
      arrays[name] = {
        numComponents: size,
        data,
        divisor: 1,
        drawType: gl.DYNAMIC_DRAW,
        normalize: !!bytes,
      };
    }
    const buffers = createBufferInfoFromArrays(gl, arrays);
    const pointers: Batch["pointers"] = [];
    for (const [name, { size, bytes }] of Object.entries(attribs)) {
      const location = gl.getAttribLocation(program.program, name);
      const buffer = buffers.attribs?.[name]?.buffer;
      if (location < 0 || !buffer) continue;
      const type = bytes ? gl.UNSIGNED_BYTE : gl.FLOAT;
      pointers.push({
        location,
        buffer,
        size,
        type,
        normalize: !!bytes,
        bytes: size * (bytes ? 1 : 4),
      });
    }
    return {
      program,
      buffers,
      vao: createVertexArrayInfo(gl, program, buffers),
      streams,
      count: 0,
      pointers,
    };
  }

  /** Creates every GPU resource; called again after a lost context is restored. */
  private init(): void {
    const segment = this.program(SEGMENT_VS, SEGMENT_FS);
    const segmentAttribs = {
      a_a: { size: 2 },
      a_b: { size: 2 },
      a_r: { size: 2 },
      a_color: { size: 4, bytes: true },
      a_bark: { size: 4, bytes: true },
      a_s: { size: 1 },
    };
    this.segments = this.batch(segment, segmentAttribs);
    this.ghostBatch = this.batch(segment, segmentAttribs);
    const leafProgram = this.program(LEAF_VS, LEAF_FS);
    const leafAttribs = {
      a_pos: { size: 2 },
      a_dir: { size: 2 },
      a_grow: { size: 1 },
      a_shape: { size: 2 },
      a_color: { size: 4, bytes: true },
    };
    this.leafBatch = this.batch(leafProgram, leafAttribs);
    this.budBatch = this.batch(this.program(POINT_VS, FLAT_FS), {
      a_center: { size: 2 },
      a_color: { size: 4, bytes: true },
    });
    this.wallBatch = this.batch(this.program(RECT_VS, FLAT_FS), {
      a_rect: { size: 4 },
      a_color: { size: 4, bytes: true },
    });
    this.image = this.batch(this.program(IMAGE_VS, IMAGE_FS), {});
    this.backdrop = this.program(BACKDROP_VS, BACKDROP_FS);
    this.shadeTexture = null;
    this.shadeSize = [0, 0];
    this.interiorTexture = null;
    this.interiorFor = { s: null, theme: -1 };
    this.uploaded = { next: null, prev: null, key: "" };
    this.shadeFor = null;
  }

  refreshTheme(): void {
    this.theme = readTheme(this.canvas);
    this.paletteCache.clear();
    this.themeVersion += 1;
  }

  setSnapshot(s: Snapshot): void {
    this.scene.setSnapshot(s);
    this.shadeFor = null;
  }

  /** Uploads the shade overlay of `s`, at most once per snapshot and only while it is shown. */
  private uploadShade(s: Snapshot): void {
    if (this.shadeFor === s) return;
    this.shadeFor = s;
    this.hasShade = !!s.shadow;
    if (!s.shadow) return;
    const gl = this.gl;
    const pixels = new Uint8Array(shadeImage(s.shadow, s.width, s.height).buffer);
    const options = {
      width: s.width,
      height: s.height,
      minMag: gl.NEAREST,
      wrap: gl.CLAMP_TO_EDGE,
      auto: false,
    };
    if (!this.shadeTexture || this.shadeSize[0] !== s.width || this.shadeSize[1] !== s.height) {
      this.shadeTexture = createTexture(gl, { ...options, src: pixels });
      this.shadeSize = [s.width, s.height];
    } else {
      setTextureFromArray(gl, this.shadeTexture, pixels, options);
    }
  }

  /** Uploads the backdrop's rows in the interior's colour, alpha by closure, once per snapshot and theme. */
  private uploadInterior(s: Snapshot, rows: Float32Array): void {
    const f = this.interiorFor;
    if (f.s === s && f.theme === this.themeVersion) return;
    const gl = this.gl;
    const [r, g, b] = parseColor(this.theme.interior);
    const pixels = new Uint8Array(4 * rows.length);
    for (let y = 0; y < rows.length; y++) {
      pixels[4 * y] = r;
      pixels[4 * y + 1] = g;
      pixels[4 * y + 2] = b;
      pixels[4 * y + 3] = Math.round(255 * (rows[y] as number));
    }
    const options = {
      width: 1,
      height: rows.length,
      minMag: gl.LINEAR,
      wrap: gl.CLAMP_TO_EDGE,
      auto: false,
    };
    if (!this.interiorTexture || this.interiorHeight !== rows.length) {
      this.interiorTexture = createTexture(gl, { ...options, src: pixels });
      this.interiorHeight = rows.length;
    } else {
      setTextureFromArray(gl, this.interiorTexture, pixels, options);
    }
    this.interiorFor = { s, theme: this.themeVersion };
  }

  setMaxDpr(dpr: number): void {
    this.maxDpr = dpr;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.scene.setSize(rect.width, rect.height, dpr);
  }

  /** Palette colours as RGBA bytes, cached per palette and alpha. */
  private paletteBytes(palette: readonly string[], alpha = 1): Bytes {
    const key = `${palette.join("|")}@${alpha}`;
    let bytes = this.paletteCache.get(key);
    if (!bytes) {
      const out = new Uint8Array(palette.length * 4);
      palette.forEach((css, i) => {
        const [r, g, b, a] = parseColor(css);
        out[i * 4] = r;
        out[i * 4 + 1] = g;
        out[i * 4 + 2] = b;
        out[i * 4 + 3] = Math.round(a * alpha);
      });
      bytes = out;
      this.paletteCache.set(key, bytes);
    }
    return bytes;
  }

  /** The CPU array behind attribute `name` of `batch`, with room for `count` instances. */
  private stream<T extends Floats | Bytes>(batch: Batch, name: string, count: number): T {
    const s = batch.streams.get(name);
    if (!s) throw new Error(`no attribute ${name}`);
    const needed = count * s.size;
    if (s.data.length < needed) {
      const length = Math.max(needed, s.data.length * 2);
      s.data = s.data instanceof Uint8Array ? new Uint8Array(length) : new Float32Array(length);
    }
    return s.data as T;
  }

  /**
   * Uploads the first `count` instances of every stream of `batch`. A buffer is reallocated only
   * when the instances outgrow it (to the CPU array's doubled capacity); otherwise the frame's
   * data overwrites its start with bufferSubData (M15: a tween frame used to reallocate them all).
   */
  private upload(batch: Batch, count: number): void {
    batch.count = count;
    if (count <= 0) return;
    for (const [name, stream] of batch.streams) {
      const attrib = batch.buffers.attribs?.[name];
      if (!attrib) continue;
      const used = count * stream.size;
      if (stream.gpuLength < used) {
        setAttribInfoBufferFromArray(this.gl, attrib, stream.data);
        stream.gpuLength = stream.data.length;
      } else {
        setAttribInfoBufferFromArray(this.gl, attrib, stream.data.subarray(0, used), 0);
      }
    }
  }

  private drawBatch(batch: Batch, count: number, uniforms: Record<string, unknown>): void {
    if (count <= 0) return;
    const gl = this.gl;
    gl.useProgram(batch.program.program);
    gl.bindVertexArray(batch.vao.vertexArrayObject ?? null);
    setUniforms(batch.program, uniforms);
    drawBufferInfo(gl, batch.vao, gl.TRIANGLE_STRIP, 4, 0, count);
  }

  /**
   * Instances [first, first + count) of `batch`, whose program is in use with its uniforms set:
   * its instance attributes are pointed at `first` (and left there; `drawBatch`'s batches never
   * take a range).
   */
  private drawRange(batch: Batch, first: number, count: number): void {
    if (count <= 0) return;
    const gl = this.gl;
    gl.bindVertexArray(batch.vao.vertexArrayObject ?? null);
    for (const p of batch.pointers) {
      gl.bindBuffer(gl.ARRAY_BUFFER, p.buffer);
      gl.vertexAttribPointer(p.location, p.size, p.type, p.normalize, 0, first * p.bytes);
    }
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
  }

  draw(t: number, view: ViewOptions): void {
    if (this.lost) return;
    const { gl, scene, theme } = this;
    const s = scene.next;
    const { width: w, height: h, dpr } = scene;
    const { cx, scale } = scene.camera;
    const groundY = scene.groundY();

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const groundFromBottom = (h - groundY) * dpr;
    if (this.transparent) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
      this.drawBackdrop(0, theme.skyTop, theme.skyBottom, groundFromBottom);
    }
    if (!s) return;

    // Rebuild instance data only when the scene changed; a camera move only changes uniforms.
    // Falling wood (M16) is drawn while any is left; without physics, ghosts fade during a tween.
    const ghosts = view.showGhosts && (scene.physics || (scene.prev !== null && t < 1));
    const key = [
      t,
      view.colorMode,
      view.showLeaves ? view.leafAge : -1,
      view.leafStyle,
      view.leafOpacity,
      view.clearBole,
      view.girth,
      view.interior,
      view.barkLight,
      view.woodContrast,
      view.showBuds,
      view.showObstacles,
      scene.solo,
      scene.animating() ? scene.time : 0, // wind and falling wood move every frame
      ghosts,
      this.themeVersion,
    ].join();
    const u = this.uploaded;
    if (u.next !== s || u.prev !== scene.prev || u.key !== key) {
      scene.leafStyle = LEAF_STYLES[view.leafStyle];
      scene.clearBole = view.clearBole ?? false;
      scene.girth = view.girth ?? 1;
      scene.barkLight = view.barkLight ?? 0;
      scene.woodContrast = view.woodContrast ?? WOOD_CONTRAST;
      scene.computeGeometry(t);
      this.buildSegments(s, view);
      if (ghosts) this.buildGhosts(1 - t);
      else this.ghostBatch.count = 0;
      if (view.showLeaves) this.buildLeaves(view.leafAge, t, view.leafOpacity ?? LEAF_OPACITY);
      else this.leafBatch.count = 0;
      if (view.showBuds) this.buildBuds(s, view.colorMode === "light");
      else this.budBatch.count = 0;
      this.buildWalls(s, view);
      this.uploaded = { next: s, prev: scene.prev, key };
    }

    const uniforms = {
      u_view: [cx, (2 * scale) / w, 1 - (2 * groundY) / h, (2 * scale) / h],
      u_px: 1 / scale,
      u_leaf: [scene.leafStyle.length, scene.leafStyle.aspect, view.leafMinPx ?? LEAF_MIN_PX],
      u_point: [BUD_SIDE_PX, BUD_MIN_SIDE],
    };
    // The backdrop beyond a closed stand, over the sky and behind everything else.
    scene.interior = view.interior ?? false;
    const rows = scene.interiorOf(s);
    if (rows) {
      this.uploadInterior(s, rows);
      const [x0, x1] = scene.interiorSpan(s);
      this.drawBatch(this.image, 1, {
        ...uniforms,
        u_rect: [x0, 0, x1 - x0, rows.length],
        u_image: this.interiorTexture,
        u_alpha: 1,
      });
    }
    if (view.showShadow) this.uploadShade(s);
    if (view.showShadow && this.hasShade && this.shadeTexture) {
      this.drawBatch(this.image, 1, {
        ...uniforms,
        u_rect: [0, 0, s.width, s.height],
        u_image: this.shadeTexture,
        u_alpha: 0.75,
      });
    }
    this.drawBatch(this.wallBatch, this.wallBatch.count, uniforms);
    // On a ring seen whole, each batch is drawn once per copy of the world (Scene.wrapOffsets).
    for (const offset of scene.wrapOffsets()) {
      const shifted = { ...uniforms, u_view: [cx - offset, ...uniforms.u_view.slice(1)] };
      this.drawBatch(this.ghostBatch, this.ghostBatch.count, shifted);
      this.drawSlices(s, shifted);
      this.drawBatch(this.budBatch, this.budBatch.count, shifted);
    }

    // Ground last, so stubs of shoots that turned downward stay underground.
    this.drawBackdrop(1, theme.ground, theme.groundDeep, groundFromBottom);
  }

  /**
   * The wood and the crowns' leaves far to near, slice by slice (wood, then that slice's leaves),
   * then the falling leaves over everything. Each program's uniforms are set once.
   */
  private drawSlices(s: Snapshot, uniforms: Record<string, unknown>): void {
    const gl = this.gl;
    const wood = this.segments;
    const leaf = this.leafBatch;
    const woodAt = this.scene.woodSlices(s);
    const leafAt = this.leafSlices;
    const leafCount = leaf.count;
    for (const b of leafCount > 0 ? [wood, leaf] : [wood]) {
      gl.useProgram(b.program.program);
      setUniforms(b.program, uniforms);
    }
    let program: Batch | null = leafCount > 0 ? leaf : wood;
    const use = (b: Batch) => {
      if (program === b) return;
      gl.useProgram(b.program.program);
      program = b;
    };
    for (let i = 0; i < DEPTH_SLICES; i++) {
      const w0 = woodAt[i] as number;
      const w1 = Math.min(woodAt[i + 1] as number, wood.count);
      if (w1 > w0) {
        use(wood);
        this.drawRange(wood, w0, w1 - w0);
      }
      if (leafCount === 0) continue;
      const l0 = leafAt[i] as number;
      const l1 = leafAt[i + 1] as number;
      if (l1 > l0) {
        use(leaf);
        this.drawRange(leaf, l0, l1 - l0);
      }
    }
    if (leafCount > (leafAt[DEPTH_SLICES] as number)) {
      use(leaf);
      const from = leafAt[DEPTH_SLICES] as number;
      this.drawRange(leaf, from, leafCount - from);
    }
  }

  private drawBackdrop(mode: number, top: string, bottom: string, groundFromBottom: number): void {
    const gl = this.gl;
    gl.useProgram(this.backdrop.program);
    gl.bindVertexArray(null);
    setUniforms(this.backdrop, {
      u_height: this.canvas.height,
      u_ground: groundFromBottom,
      u_mode: mode,
      u_top: rgb(top),
      u_bottom: rgb(bottom),
      u_hatch: mode === 1 && this.theme.groundHatch ? 5 * this.scene.dpr : 0,
      u_line: Math.max(1, this.scene.dpr),
    });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  private buildSegments(s: Snapshot, view: ViewOptions): void {
    const { scene } = this;
    const n = s.metamerCount;
    const palette = this.paletteBytes(scene.palette(view.colorMode, this.theme));
    const index = scene.colorIndices(view.colorMode, palette.length / 4);
    const batch = this.segments;
    const a = this.stream<Floats>(batch, "a_a", n);
    const b = this.stream<Floats>(batch, "a_b", n);
    const r = this.stream<Floats>(batch, "a_r", n);
    const color = this.stream<Bytes>(batch, "a_color", n);
    const bark = this.stream<Bytes>(batch, "a_bark", n);
    const along = this.stream<Floats>(batch, "a_s", n);
    const g = scene.geom;
    // Each metamer's path length from its tree's base (rows are parent before child), so the bark's
    // pattern runs on along an axis; and its texture, in the natural view only.
    const path = this.pathLength(s, n);
    const textured = view.colorMode === "natural";
    const tex = scene.bark;
    // Bark by light (Scene.woodLight), in the natural view: each stem's colour dimmed by its shade.
    const light = textured ? scene.woodLight(s) : null;
    const lit = light ? this.litColors(s, light, palette, index) : null;
    // Far to near in z (I2), so nearer wood covers farther.
    const order = scene.drawOrder(s);
    for (let k = 0; k < n; k++) {
      const j = order[k] as number;
      along[k] = path[j] as number;
      for (let q = 0; q < 4; q++) bark[4 * k + q] = textured ? (tex[4 * j + q] as number) : 0;
      a[2 * k] = g.baseX[j];
      a[2 * k + 1] = g.baseY[j];
      b[2 * k] = g.tipX[j];
      b[2 * k + 1] = g.tipY[j];
      r[2 * k] = g.radius[j];
      r[2 * k + 1] = g.tipRadius[j];
      const c = index[j] * 4;
      for (let q = 0; q < 3; q++)
        color[4 * k + q] = lit ? (lit[3 * j + q] as number) : (palette[c + q] as number);
      // A solo plate draws one specimen: the other trees' wood is fully transparent.
      color[4 * k + 3] =
        scene.solo >= 0 && s.tree[j] !== scene.solo ? 0 : (palette[c + 3] as number);
    }
    this.upload(batch, n);
  }

  private litFor = { s: null as Snapshot | null, k: 0, theme: -1 };
  private lit = new Uint8Array(0);

  /** Each metamer's wood colour under bark by light, once per snapshot (tweens rebuild every frame). */
  private litColors(s: Snapshot, light: Float32Array, palette: Uint8Array, index: Uint16Array) {
    const f = this.litFor;
    const k = this.scene.barkLight;
    if (f.s === s && f.k === k && f.theme === this.themeVersion) return this.lit;
    const n = s.metamerCount;
    if (this.lit.length < 3 * n) this.lit = new Uint8Array(6 * n);
    for (let j = 0; j < n; j++) {
      const c = (index[j] as number) * 4;
      const m = light[j] as number;
      for (let q = 0; q < 3; q++) this.lit[3 * j + q] = dimByte(palette[c + q] as number, m);
    }
    this.litFor = { s, k, theme: this.themeVersion };
    return this.lit;
  }

  private path = new Float32Array(0);
  private pathFor: Snapshot | null = null;
  private pathLength(s: Snapshot, n: number): Float32Array {
    if (this.pathFor === s) return this.path;
    this.pathFor = s;
    if (this.path.length < n) this.path = new Float32Array(2 * n);
    // The snapshot's lengths, not the frame's: the pattern stays put through a tween and the wind.
    for (let j = 0; j < n; j++) {
      const p = s.parent[j] as number;
      this.path[j] = p >= 0 ? (this.path[p] as number) + (s.length[p] as number) : 0;
    }
    return this.path;
  }

  private buildGhosts(alpha: number): void {
    const { scene } = this;
    if (scene.physics) {
      this.buildDebris();
      return;
    }
    const prev = scene.prev;
    const batch = this.ghostBatch;
    if (!prev) {
      batch.count = 0;
      return;
    }
    let count = 0;
    // A solo plate (one specimen) shows only that tree's falling branches.
    const shown = (j: number): boolean =>
      scene.ghosts[j] === 1 && (scene.solo < 0 || prev.tree[j] === scene.solo);
    for (let j = 0; j < prev.metamerCount; j++) if (shown(j)) count++;
    const a = this.stream<Floats>(batch, "a_a", count);
    const b = this.stream<Floats>(batch, "a_b", count);
    const r = this.stream<Floats>(batch, "a_r", count);
    const color = this.stream<Bytes>(batch, "a_color", count);
    const [cr, cg, cb] = parseColor(this.theme.ghost);
    const ca = Math.round(255 * 0.6 * alpha);
    const g = scene.prevGeom;
    let k = 0;
    for (let j = 0; j < prev.metamerCount; j++) {
      if (!shown(j)) continue;
      a[2 * k] = g.baseX[j];
      a[2 * k + 1] = g.baseY[j];
      b[2 * k] = g.tipX[j];
      b[2 * k + 1] = g.tipY[j];
      r[2 * k] = GHOST_RADIUS;
      r[2 * k + 1] = GHOST_RADIUS;
      color[4 * k] = cr;
      color[4 * k + 1] = cg;
      color[4 * k + 2] = cb;
      color[4 * k + 3] = ca;
      k++;
    }
    this.upload(batch, count);
  }

  /** Falling and fallen wood (M16): in the ghost colour, at its true radius, fading on the ground. */
  private buildDebris(): void {
    const d = this.scene.debris();
    const batch = this.ghostBatch;
    const n = d.count;
    const a = this.stream<Floats>(batch, "a_a", n);
    const b = this.stream<Floats>(batch, "a_b", n);
    const r = this.stream<Floats>(batch, "a_r", n);
    const color = this.stream<Bytes>(batch, "a_color", n);
    const [cr, cg, cb] = parseColor(this.theme.ghost);
    for (let k = 0; k < n; k++) {
      a[2 * k] = d.ax[k] as number;
      a[2 * k + 1] = d.ay[k] as number;
      b[2 * k] = d.bx[k] as number;
      b[2 * k + 1] = d.by[k] as number;
      r[2 * k] = d.r[k] as number;
      r[2 * k + 1] = d.r[k] as number;
      // Straight colour: the fragment shader premultiplies by coverage × this alpha.
      color[4 * k] = cr;
      color[4 * k + 1] = cg;
      color[4 * k + 2] = cb;
      color[4 * k + 3] = Math.round(255 * 0.85 * (d.alpha[k] as number));
    }
    this.upload(batch, n);
  }

  private buildLeaves(leafAge: number, t: number, opacity: number): void {
    const leaves = this.scene.leaves(leafAge, t);
    // One summer and one autumn ramp per palette; each leaf takes its species' (M19).
    const palette = LEAF_PALETTES.map((p) => this.paletteBytes(this.theme.leaf[p], opacity));
    const autumn = LEAF_PALETTES.map((p) => this.paletteBytes(this.theme.autumn[p], opacity));
    this.fillLeaves(this.leafBatch, leaves, 0, leaves.count, palette, autumn);
    this.leafSlices.set(leaves.slices);
  }

  /** Uploads leaves [from, to) of the frame's leaf list into `batch`. */
  private fillLeaves(
    batch: Batch,
    leaves: Leaves,
    from: number,
    to: number,
    palettes: Bytes[],
    autumns: Bytes[],
  ): void {
    const n = to - from;
    const pos = this.stream<Floats>(batch, "a_pos", n);
    const dir = this.stream<Floats>(batch, "a_dir", n);
    const grow = this.stream<Floats>(batch, "a_grow", n);
    const shape = this.stream<Floats>(batch, "a_shape", n);
    const color = this.stream<Bytes>(batch, "a_color", n);
    for (let i = 0; i < n; i++) {
      const k = from + i;
      shape[2 * i] = leaves.shape[k] as number;
      shape[2 * i + 1] = leaves.aspect[k] as number;
      pos[2 * i] = leaves.x[k];
      pos[2 * i + 1] = leaves.y[k];
      dir[2 * i] = leaves.ux[k];
      dir[2 * i + 1] = leaves.uy[k];
      grow[i] = leaves.size[k];
      const c = leaves.color[k] * 4;
      const palette = palettes[leaves.palette[k] as number] as Bytes;
      const autumn = autumns[leaves.palette[k] as number] as Bytes;
      // Green to autumn colour as the leaf turns (M17).
      const u = leaves.turn[k] as number;
      for (let q = 0; q < 4; q++) {
        const green = palette[c + q] as number;
        color[4 * i + q] =
          u > 0 ? Math.round(green + ((autumn[c + q] as number) - green) * u) : green;
      }
    }
    this.upload(batch, n);
  }

  /** Buds coloured by state, or by their light Q (√ of Q over the brightest bud's) when `byLight`. */
  private buildBuds(s: Snapshot, byLight: boolean): void {
    const n = s.budCount;
    const batch = this.budBatch;
    const g = this.scene.geom;
    const center = this.stream<Floats>(batch, "a_center", n);
    const color = this.stream<Bytes>(batch, "a_color", n);
    let max = 0;
    if (byLight) for (let i = 0; i < n; i++) max = Math.max(max, s.budQ[i]);
    const ramp = this.paletteBytes(SEQUENTIAL);
    const states = this.paletteBytes([BUD_ACTIVE, BUD_DORMANT]);
    const steps = SEQUENTIAL.length;
    for (let i = 0; i < n; i++) {
      const m = s.budMetamer[i];
      center[2 * i] = g.tipX[m];
      center[2 * i + 1] = g.tipY[m];
      let src: Bytes;
      let c: number;
      if (byLight) {
        src = ramp;
        c = 4 * (max > 0 ? Math.min(steps - 1, Math.floor(Math.sqrt(s.budQ[i] / max) * steps)) : 0);
      } else {
        src = states;
        c = s.budState[i] === BudState.dormant ? 4 : 0; // short shoots are leafy, like active buds
      }
      color[4 * i] = src[c] as number;
      color[4 * i + 1] = src[c + 1] as number;
      color[4 * i + 2] = src[c + 2] as number;
      color[4 * i + 3] = src[c + 3] as number;
    }
    this.upload(batch, n);
  }

  /** Walls in the wall colour, and with `showObstacles` (the lab) the obstacles as fainter boxes. */
  private buildWalls(s: Snapshot, view: ViewOptions): void {
    const rects = [
      ...s.walls.map((w) => ({ ...w, alpha: 1 })),
      ...(view.showObstacles ? s.obstacles.map((o) => ({ ...o, alpha: 0.45 })) : []),
    ];
    const n = rects.length;
    const batch = this.wallBatch;
    const rect = this.stream<Floats>(batch, "a_rect", n);
    const color = this.stream<Bytes>(batch, "a_color", n);
    const [cr, cg, cb, ca] = parseColor(this.theme.wall);
    rects.forEach((wall, k) => {
      rect[4 * k] = wall.x;
      rect[4 * k + 1] = wall.y;
      rect[4 * k + 2] = wall.width;
      rect[4 * k + 3] = wall.height;
      color[4 * k] = cr;
      color[4 * k + 1] = cg;
      color[4 * k + 2] = cb;
      color[4 * k + 3] = Math.round(ca * wall.alpha);
    });
    this.upload(batch, n);
  }
}
