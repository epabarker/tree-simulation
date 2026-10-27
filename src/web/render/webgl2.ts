/**
 * WebGL2 renderer (ADR 0001, M6b): the scene in a handful of instanced draw calls.
 *
 *  - Branches: one quad per metamer, shaded in the fragment shader as a capsule tapering from the
 *    metamer's radius to its continuation's (a signed-distance function, so joints are round and
 *    edges antialiased without multisampling).
 *  - Leaves: one quad per leaf, shaded as a lens (vesica). Buds: squares. Walls: rectangles.
 *  - Shade overlay: a texture. Sky and ground: full-screen gradients.
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
import type { Snapshot } from "../../core/snapshot.ts";
import { BudState } from "../../core/tree.ts";
import { BUD_ACTIVE, BUD_DORMANT, parseColor, SEQUENTIAL, shadeImage } from "./colors.ts";
import { LEAF_STYLES } from "./leaf-styles.ts";
import { MAX_DPR, type Renderer, type RendererOptions } from "./renderer.ts";
import { LEAF_MIN_PX, type Leaves, Scene, type ViewOptions } from "./scene.ts";
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
out vec2 v_p;
out float v_h;
out vec2 v_r;
out vec4 v_color;
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
  gl_Position = toClip(a_a + dir * along + nrm * across);
}`;

const SEGMENT_FS = /* glsl */ `#version 300 es
precision highp float;
uniform float u_px;
in vec2 v_p;
in float v_h;
in vec2 v_r;
in vec4 v_color;
out vec4 outColor;
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
  outColor = vec4(v_color.rgb * alpha, alpha);
}`;

const LEAF_VS = /* glsl */ `#version 300 es
${VIEW}
uniform vec3 u_leaf; // full length (world), width / length, minimum length (CSS px)
in vec2 a_corner;
in vec2 a_pos;
in vec2 a_dir;
in float a_grow;
in vec4 a_color;
out vec2 v_p;
out vec2 v_size;
out vec4 v_color;
void main() {
  float len = max(u_leaf.x, u_leaf.z * u_px) * a_grow;
  float wid = min(max(len * u_leaf.y, u_px), 0.9 * len);
  float along = mix(-u_px, len + u_px, a_corner.y * 0.5 + 0.5);
  float across = a_corner.x * (0.5 * wid + u_px);
  vec2 nrm = vec2(-a_dir.y, a_dir.x);
  v_p = vec2(across, along - 0.5 * len);
  v_size = vec2(len, wid);
  v_color = a_color;
  gl_Position = toClip(a_pos + a_dir * along + nrm * across);
}`;

const LEAF_FS = /* glsl */ `#version 300 es
precision highp float;
uniform float u_px;
in vec2 v_p;
in vec2 v_size;
in vec4 v_color;
out vec4 outColor;
// Lens of half-length b and half-width w: two circles of radius r centred at (±d, 0).
float sdVesica(vec2 p, float r, float d) {
  p = abs(p);
  float b = sqrt(r * r - d * d);
  return ((p.y - b) * d > p.x * b) ? length(p - vec2(0.0, b)) : length(p - vec2(-d, 0.0)) - r;
}
void main() {
  float b = 0.5 * v_size.x;
  float w = 0.5 * v_size.y;
  float d = (b * b - w * w) / (2.0 * w);
  float dist = sdVesica(v_p, d + w, d);
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
  /** Back-layer leaves of the pseudo-depth view, drawn before the branches (ADR 0008). */
  private leafBackBatch!: Batch;
  private budBatch!: Batch;
  private wallBatch!: Batch;
  private image!: Batch;
  private backdrop!: ProgramInfo;
  private shadeTexture: WebGLTexture | null = null;
  private shadeSize: [number, number] = [0, 0];
  private hasShade = false;
  private shadeFor: Snapshot | null = null;
  private paletteCache = new Map<string, Bytes>();
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
    return {
      program,
      buffers,
      vao: createVertexArrayInfo(gl, program, buffers),
      streams,
      count: 0,
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
    };
    this.segments = this.batch(segment, segmentAttribs);
    this.ghostBatch = this.batch(segment, segmentAttribs);
    const leafProgram = this.program(LEAF_VS, LEAF_FS);
    const leafAttribs = {
      a_pos: { size: 2 },
      a_dir: { size: 2 },
      a_grow: { size: 1 },
      a_color: { size: 4, bytes: true },
    };
    this.leafBatch = this.batch(leafProgram, leafAttribs);
    this.leafBackBatch = this.batch(leafProgram, leafAttribs);
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
    const ghosts = view.showGhosts && scene.prev !== null && t < 1;
    const key = [
      t,
      view.colorMode,
      view.showLeaves ? view.leafAge : -1,
      view.depth,
      view.leafStyle,
      view.showBuds,
      view.showObstacles,
      scene.solo,
      ghosts,
      this.themeVersion,
    ].join();
    const u = this.uploaded;
    if (u.next !== s || u.prev !== scene.prev || u.key !== key) {
      scene.depth = view.depth;
      scene.leafStyle = LEAF_STYLES[view.leafStyle];
      scene.computeGeometry(t);
      this.buildSegments(s, view);
      if (ghosts) this.buildGhosts(1 - t);
      else this.ghostBatch.count = 0;
      if (view.showLeaves) this.buildLeaves(view.leafAge, t);
      else this.leafBatch.count = this.leafBackBatch.count = 0;
      if (view.showBuds) this.buildBuds(s, view.colorMode === "light");
      else this.budBatch.count = 0;
      this.buildWalls(s, view);
      this.uploaded = { next: s, prev: scene.prev, key };
    }

    const uniforms = {
      u_view: [cx, (2 * scale) / w, 1 - (2 * groundY) / h, (2 * scale) / h],
      u_px: 1 / scale,
      u_leaf: [scene.leafStyle.length, scene.leafStyle.aspect, LEAF_MIN_PX],
      u_point: [BUD_SIDE_PX, BUD_MIN_SIDE],
    };
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
      if (!view.lite) this.drawBatch(this.leafBackBatch, this.leafBackBatch.count, shifted);
      this.drawBatch(this.segments, this.segments.count, shifted);
      this.drawBatch(this.leafBatch, this.leafBatch.count, shifted);
      this.drawBatch(this.budBatch, this.budBatch.count, shifted);
    }

    // Ground last, so stubs of shoots that turned downward stay underground.
    this.drawBackdrop(1, theme.ground, theme.groundDeep, groundFromBottom);
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
    const g = scene.geom;
    for (let j = 0; j < n; j++) {
      a[2 * j] = g.baseX[j];
      a[2 * j + 1] = g.baseY[j];
      b[2 * j] = g.tipX[j];
      b[2 * j + 1] = g.tipY[j];
      r[2 * j] = g.radius[j];
      r[2 * j + 1] = g.tipRadius[j];
      const c = index[j] * 4;
      color[4 * j] = palette[c] as number;
      color[4 * j + 1] = palette[c + 1] as number;
      color[4 * j + 2] = palette[c + 2] as number;
      // A solo plate draws one specimen: the other trees' wood is fully transparent.
      color[4 * j + 3] =
        scene.solo >= 0 && s.tree[j] !== scene.solo ? 0 : (palette[c + 3] as number);
    }
    this.upload(batch, n);
  }

  private buildGhosts(alpha: number): void {
    const { scene } = this;
    const prev = scene.prev;
    const batch = this.ghostBatch;
    if (!prev) {
      batch.count = 0;
      return;
    }
    let count = 0;
    for (let j = 0; j < prev.metamerCount; j++) if (scene.ghosts[j]) count++;
    const a = this.stream<Floats>(batch, "a_a", count);
    const b = this.stream<Floats>(batch, "a_b", count);
    const r = this.stream<Floats>(batch, "a_r", count);
    const color = this.stream<Bytes>(batch, "a_color", count);
    const [cr, cg, cb] = parseColor(this.theme.ghost);
    const ca = Math.round(255 * 0.6 * alpha);
    const g = scene.prevGeom;
    let k = 0;
    for (let j = 0; j < prev.metamerCount; j++) {
      if (!scene.ghosts[j]) continue;
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

  private buildLeaves(leafAge: number, t: number): void {
    const leaves = this.scene.leaves(leafAge, t);
    const palette = this.paletteBytes(this.theme.leaf[this.scene.leafStyle.palette], 0.92);
    this.fillLeaves(this.leafBackBatch, leaves, 0, leaves.back, palette);
    this.fillLeaves(this.leafBatch, leaves, leaves.back, leaves.count, palette);
  }

  /** Uploads leaves [from, to) of the frame's leaf list into `batch`. */
  private fillLeaves(batch: Batch, leaves: Leaves, from: number, to: number, palette: Bytes): void {
    const n = to - from;
    const pos = this.stream<Floats>(batch, "a_pos", n);
    const dir = this.stream<Floats>(batch, "a_dir", n);
    const grow = this.stream<Floats>(batch, "a_grow", n);
    const color = this.stream<Bytes>(batch, "a_color", n);
    for (let i = 0; i < n; i++) {
      const k = from + i;
      pos[2 * i] = leaves.x[k];
      pos[2 * i + 1] = leaves.y[k];
      dir[2 * i] = leaves.ux[k];
      dir[2 * i + 1] = leaves.uy[k];
      grow[i] = leaves.size[k];
      const c = leaves.color[k] * 4;
      color[4 * i] = palette[c] as number;
      color[4 * i + 1] = palette[c + 1] as number;
      color[4 * i + 2] = palette[c + 2] as number;
      color[4 * i + 3] = palette[c + 3] as number;
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
