//! Per-season snapshots for the renderer, built into one buffer so that the page
//! takes them out of linear memory in a single copy (I1). Flat arrays over every live tree's
//! metamers, trees in id order, each tree's rows parent-before-child; `prev_index` maps each
//! metamer to its row in the previous snapshot (−1 if new), merged by birth id tree by tree.
//!
//! In 3D (I2) a metamer's segment runs from (x0, y0, z0) along its heading (dirX, dirY, dirZ); its
//! frame's reference is (refX, refY, refZ). `angle` and `length` are the segment as drawn in the
//! picture's plane (projected along z), so a renderer that draws (x, y) can rebuild positions
//! from them exactly as before.
//!
//! Layout (each array starts on an 8-byte boundary, in this order; `src/wasm/world.ts` reads it):
//! metrics f64[trees × METRIC_NUMBERS], parent i32[nm], x0 f32, y0 f32, angle f32, length f32,
//! radius f32, z0 f32, dirX f32, dirY f32, dirZ f32, refX f32, refY f32, refZ f32, tree i32,
//! birthId i32, order u8, light f32, resource f32, age f32, stress f32, prevIndex i32,
//! budMetamer i32[nb], budState u8[nb], budQ f32[nb], junctions f32[nj], shadow f32[W·H or 0].

use crate::math;
use crate::metrics::{METRIC_NUMBERS, tree_metrics};
use crate::principles::c3::is_live_bud;
use crate::principles::c6::junction_exponents;
use crate::world::World;

#[derive(Default)]
pub struct SnapshotBuilder {
    prev_tree: Vec<i32>,
    prev_birth: Vec<i32>,
    /// The last snapshot: its bytes and counts.
    pub bytes: Vec<u8>,
    pub metamers: usize,
    pub buds: usize,
    pub junctions: usize,
    pub shadow: usize,
    pub trees: usize,
    pub species: Vec<String>,
}

fn pad8(v: &mut Vec<u8>) {
    while !v.len().is_multiple_of(8) {
        v.push(0);
    }
}

fn put_f32(v: &mut Vec<u8>, xs: &[f32]) {
    for x in xs {
        v.extend_from_slice(&x.to_le_bytes());
    }
    pad8(v);
}

fn put_i32(v: &mut Vec<u8>, xs: &[i32]) {
    for x in xs {
        v.extend_from_slice(&x.to_le_bytes());
    }
    pad8(v);
}

impl SnapshotBuilder {
    pub fn reset(&mut self) {
        self.prev_tree.clear();
        self.prev_birth.clear();
    }

    pub fn build(&mut self, world: &mut World, junctions: bool, field: bool) {
        let live: Vec<usize> = (0..world.trees.len())
            .filter(|&i| world.trees[i].alive)
            .collect();
        let mut deltas = Vec::new();
        if junctions && world.params().c6.enabled {
            for &i in &live {
                junction_exponents(&world.trees[i], &mut deltas);
            }
        }
        let nm: usize = live.iter().map(|&i| world.trees[i].m.len()).sum();
        let nb_all: usize = live.iter().map(|&i| world.trees[i].b.len()).sum();
        let mut parent = vec![0i32; nm];
        let (mut x0, mut y0, mut angle, mut length, mut radius) = (
            vec![0f32; nm],
            vec![0f32; nm],
            vec![0f32; nm],
            vec![0f32; nm],
            vec![0f32; nm],
        );
        // z0, the heading, the reference.
        let mut depth: [Vec<f32>; 7] = std::array::from_fn(|_| vec![0f32; nm]);
        let (mut tree_of, mut birth) = (vec![0i32; nm], vec![0i32; nm]);
        let mut order = vec![0u8; nm];
        let (mut light, mut resource, mut age, mut stress) = (
            vec![0f32; nm],
            vec![0f32; nm],
            vec![0f32; nm],
            vec![0f32; nm],
        );
        let (mut bud_m, mut bud_s, mut bud_q) = (
            Vec::with_capacity(nb_all),
            Vec::with_capacity(nb_all),
            Vec::with_capacity(nb_all),
        );
        let season = world.season;
        let mut offset = 0usize;
        for &ti in &live {
            let t = &world.trees[ti];
            let mechanics = world.params_of(t).r3.enabled;
            let c = &t.m;
            for i in 0..c.len() {
                let j = offset + i;
                parent[j] = if c.parent[i] >= 0 {
                    (offset as i32) + c.parent[i]
                } else {
                    -1
                };
                x0[j] = c.base_x[i] as f32;
                y0[j] = c.base_y[i] as f32;
                angle[j] = math::atan2(c.hy[i], c.hx[i]) as f32;
                length[j] = (c.length[i] * math::hypot(c.hx[i], c.hy[i])) as f32;
                for (k, v) in [
                    c.base_z[i],
                    c.hx[i],
                    c.hy[i],
                    c.hz[i],
                    c.lx[i],
                    c.ly[i],
                    c.lz[i],
                ]
                .into_iter()
                .enumerate()
                {
                    depth[k][j] = v as f32;
                }
                radius[j] = c.radius[i] as f32;
                tree_of[j] = t.id as i32;
                birth[j] = c.birth_id[i];
                order[j] = c.order[i];
                light[j] = if c.n_sum[i] > 0 {
                    (c.q_sum[i] / c.n_sum[i] as f64) as f32
                } else {
                    0.0
                };
                resource[j] = c.v_in[i] as f32;
                age[j] = (season - c.birth_season[i] as f64) as f32;
                stress[j] = if mechanics {
                    t.stress.get(i).copied().unwrap_or(0.0) as f32
                } else {
                    0.0
                };
            }
            let b = &t.b;
            for i in 0..b.len() {
                if !is_live_bud(b.state[i]) {
                    continue;
                }
                bud_m.push(offset as i32 + b.metamer[i]);
                bud_s.push(b.state[i]);
                bud_q.push(b.q[i] as f32);
            }
            offset += c.len();
        }

        // prevIndex: a two-pointer merge of birth ids, tree by tree.
        let mut prev_index = vec![-1i32; nm];
        let mut ranges: Vec<(i32, usize, usize)> = Vec::new();
        let mut i = 0;
        while i < self.prev_tree.len() {
            let mut e = i;
            while e < self.prev_tree.len() && self.prev_tree[e] == self.prev_tree[i] {
                e += 1;
            }
            ranges.push((self.prev_tree[i], i, e));
            i = e;
        }
        let mut i = 0;
        while i < nm {
            let tr = tree_of[i];
            let mut e = i;
            while e < nm && tree_of[e] == tr {
                e += 1;
            }
            let (mut p, end) = ranges
                .iter()
                .rev()
                .find(|r| r.0 == tr)
                .map_or((0, 0), |r| (r.1, r.2));
            for j in i..e {
                let id = birth[j];
                while p < end && self.prev_birth[p] < id {
                    p += 1;
                }
                prev_index[j] = if p < end && self.prev_birth[p] == id {
                    p as i32
                } else {
                    -1
                };
            }
            i = e;
        }
        self.prev_tree = tree_of.clone();
        self.prev_birth = birth.clone();

        let shadow: Vec<f32> = if field {
            world
                .light
                .field(world.params().c2.c)
                .map(|f| f.iter().map(|&x| x as f32).collect())
                .unwrap_or_default()
        } else {
            Vec::new()
        };
        let mut v = Vec::new();
        self.species.clear();
        for &ti in &live {
            let m = tree_metrics(&world.trees[ti], Some(world));
            for x in m.values {
                v.extend_from_slice(&x.to_le_bytes());
            }
            self.species.push(m.species);
        }
        debug_assert_eq!(METRIC_NUMBERS.len(), 39);
        put_i32(&mut v, &parent);
        for a in [&x0, &y0, &angle, &length, &radius] {
            put_f32(&mut v, a);
        }
        for a in &depth {
            put_f32(&mut v, a);
        }
        put_i32(&mut v, &tree_of);
        put_i32(&mut v, &birth);
        v.extend_from_slice(&order);
        pad8(&mut v);
        for a in [&light, &resource, &age, &stress] {
            put_f32(&mut v, a);
        }
        put_i32(&mut v, &prev_index);
        put_i32(&mut v, &bud_m);
        v.extend_from_slice(&bud_s);
        pad8(&mut v);
        put_f32(&mut v, &bud_q);
        let deltas: Vec<f32> = deltas.iter().map(|&d| d as f32).collect();
        put_f32(&mut v, &deltas);
        put_f32(&mut v, &shadow);
        self.bytes = v;
        self.metamers = nm;
        self.buds = bud_m.len();
        self.junctions = deltas.len();
        self.shadow = shadow.len();
        self.trees = live.len();
    }
}
