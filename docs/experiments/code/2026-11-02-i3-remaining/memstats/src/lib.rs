//! tree-core under a counting allocator: live bytes, their peak, and a breakdown of what the
//! world holds by Vec capacity (the bytes reserved, which is what linear memory pays for).

use std::alloc::{GlobalAlloc, Layout, System};
use std::sync::atomic::{AtomicUsize, Ordering::Relaxed};
use tree_core::checkpoint::{load_world, save_world};
use tree_core::json;
use tree_core::light::Light;
use tree_core::snapshot::SnapshotBuilder;
use tree_core::tree::Tree;
use tree_core::world::World as Core;
use wasm_bindgen::prelude::*;

struct Counting;
static LIVE: AtomicUsize = AtomicUsize::new(0);
static PEAK: AtomicUsize = AtomicUsize::new(0);
static CALLS: AtomicUsize = AtomicUsize::new(0);

fn grew(n: usize) {
    let now = LIVE.fetch_add(n, Relaxed) + n;
    PEAK.fetch_max(now, Relaxed);
    CALLS.fetch_add(1, Relaxed);
}

unsafe impl GlobalAlloc for Counting {
    unsafe fn alloc(&self, l: Layout) -> *mut u8 {
        let p = unsafe { System.alloc(l) };
        if !p.is_null() {
            grew(l.size());
        }
        p
    }
    unsafe fn alloc_zeroed(&self, l: Layout) -> *mut u8 {
        let p = unsafe { System.alloc_zeroed(l) };
        if !p.is_null() {
            grew(l.size());
        }
        p
    }
    unsafe fn dealloc(&self, p: *mut u8, l: Layout) {
        unsafe { System.dealloc(p, l) };
        LIVE.fetch_sub(l.size(), Relaxed);
    }
    unsafe fn realloc(&self, p: *mut u8, l: Layout, n: usize) -> *mut u8 {
        let q = unsafe { System.realloc(p, l, n) };
        if !q.is_null() {
            LIVE.fetch_sub(l.size(), Relaxed);
            grew(n);
        }
        q
    }
}

#[global_allocator]
static A: Counting = Counting;

#[wasm_bindgen]
pub fn live_bytes() -> f64 {
    LIVE.load(Relaxed) as f64
}

#[wasm_bindgen]
pub fn peak_bytes() -> f64 {
    PEAK.load(Relaxed) as f64
}

#[wasm_bindgen]
pub fn alloc_calls() -> f64 {
    CALLS.load(Relaxed) as f64
}

#[wasm_bindgen]
pub fn reset_peak() {
    PEAK.store(LIVE.load(Relaxed), Relaxed);
}

#[wasm_bindgen]
pub fn memory_bytes() -> f64 {
    (core::arch::wasm32::memory_size(0) * 65536) as f64
}

fn cap<T>(v: &Vec<T>) -> usize {
    v.capacity() * std::mem::size_of::<T>()
}
fn used<T>(v: &Vec<T>) -> usize {
    v.len() * std::mem::size_of::<T>()
}

macro_rules! sum {
    ($f:ident, $t:expr; $($c:ident),*) => { 0 $(+ $f(&$t.$c))* };
}

fn metamer_cols(t: &Tree, f: fn(&Vec<f64>) -> usize, g: fn(&Vec<i32>) -> usize, h: fn(&Vec<u8>) -> usize) -> usize {
    let m = &t.m;
    sum!(f, m; base_x, base_y, base_z, hx, hy, hz, lx, ly, lz, azimuth, length, radius, scar_sum_n,
        q_sum, v_in, stress_wood, mx, my, mz)
        + sum!(g, m; birth_id, parent, axis, axis_node, birth_season, n_sum)
        + sum!(h, m; slot, order, pa_shift)
}

fn bud_cols(t: &Tree, f: fn(&Vec<f64>) -> usize, g: fn(&Vec<i32>) -> usize, h: fn(&Vec<u8>) -> usize) -> usize {
    let b = &t.b;
    sum!(f, b; hx, hy, hz, lx, ly, lz, azimuth, q, vx, vy, vz, v)
        + sum!(g, b; birth_id, metamer, age)
        + sum!(h, b; slot, state, order)
}

fn scratch(t: &Tree, f: fn(&Vec<f64>) -> usize, h: fn(&Vec<u8>) -> usize) -> usize {
    sum!(f, t; q_slot, v_slot, scratch_f, p_sum, m_sum, path_len, prev_radius, load_w, load_s,
        stress, node_shade, deficit)
        + h(&t.scratch_u)
}

#[wasm_bindgen]
pub struct World {
    core: Core,
    snap: SnapshotBuilder,
}

#[wasm_bindgen]
impl World {
    #[wasm_bindgen(constructor)]
    pub fn new(params: &str) -> World {
        World {
            core: Core::new(json::parse(params).unwrap()),
            snap: SnapshotBuilder::default(),
        }
    }

    pub fn load(bytes: &[u8]) -> World {
        World {
            core: load_world(bytes).unwrap(),
            snap: SnapshotBuilder::default(),
        }
    }

    pub fn save(&self) -> Vec<u8> {
        save_world(&self.core)
    }

    /// As tree-wasm's `into_checkpoint`: frees what a checkpoint does not hold, then saves.
    pub fn into_checkpoint(mut self) -> Vec<u8> {
        self.snap = SnapshotBuilder::default();
        self.core.light = Light::Uniform { width: 0.0, height: 0.0, depth: 0.0, q: 0.0 };
        self.core.owner = Vec::new();
        for t in &mut self.core.trees {
            for v in [
                &mut t.q_slot, &mut t.v_slot, &mut t.scratch_f, &mut t.p_sum, &mut t.m_sum,
                &mut t.path_len, &mut t.prev_radius, &mut t.load_w, &mut t.load_s, &mut t.stress,
                &mut t.node_shade, &mut t.deficit,
            ] {
                *v = Vec::new();
            }
            t.scratch_u = Vec::new();
        }
        save_world(&self.core)
    }

    pub fn step(&mut self, discard: bool) {
        self.core.step(&mut |_| {});
        if discard {
            self.core.discard_dead();
        }
    }

    pub fn snapshot(&mut self) -> usize {
        self.snap.build(&mut self.core, false, false);
        self.snap.metamers
    }

    /// [metamers (live trees), buds, trees in the table, live trees,
    ///  metamer table: capacity bytes, used bytes; buds: capacity, used; scratch: capacity, used;
    ///  the trees Vec itself (headers), light fields (lad, q, vx, vy, vz), owner grid,
    ///  snapshot bytes (capacity), live bytes, peak, memory].
    pub fn report(&self) -> Vec<f64> {
        let c = &self.core;
        let (mut nm, mut nb, mut live) = (0, 0, 0);
        let (mut mc, mut mu, mut bc, mut bu, mut sc, mut su) = (0, 0, 0, 0, 0, 0);
        for t in &c.trees {
            if t.alive {
                live += 1;
                nm += t.m.len();
                nb += t.b.len();
            }
            mc += metamer_cols(t, cap, cap, cap);
            mu += metamer_cols(t, used, used, used);
            bc += bud_cols(t, cap, cap, cap);
            bu += bud_cols(t, used, used, used);
            sc += scratch(t, cap, cap);
            su += scratch(t, used, used);
        }
        let headers = c.trees.capacity() * std::mem::size_of::<Tree>()
            + c.trees.iter().map(|t| t.species.capacity()).sum::<usize>();
        let light = match &c.light {
            Light::Slab(s) => s.sweep.lad().len() * 4 * 5,
            _ => 0,
        };
        [
            nm,
            nb,
            c.trees.len(),
            live,
            mc,
            mu,
            bc,
            bu,
            sc,
            su,
            headers,
            light,
            cap(&c.owner),
            cap(&self.snap.bytes),
            LIVE.load(Relaxed),
            PEAK.load(Relaxed),
            core::arch::wasm32::memory_size(0) * 65536,
        ]
        .iter()
        .map(|&x| x as f64)
        .collect()
    }
}
