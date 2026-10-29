//! Scratch kernel for the 3D-port measurement: the fused slab row march of cli/slab-light.ts
//! (SlabSweep.computeFused), line for line, generic over f64/f32 and libm/polynomial exp.
#![allow(clippy::too_many_arguments, clippy::needless_range_loop)]

const GOLDEN: f64 = 0.618_033_988_749_894_9; // (√5 − 1)/2, as (Math.sqrt(5) - 1) / 2

macro_rules! slab_impl {
    ($m:ident, $T:ty, $fexp:ident) => {
        pub mod $m {
            pub type T = $T;
            use crate::GOLDEN;
            use super::scale;

            #[inline(always)]
            pub fn $fexp(x: T) -> T {
                // e^x = 2^n · e^r, |r| ≤ ln2/2, Taylor to r^6: relative error ≈ 1.2e-7.
                let x = if x < -80.0 { -80.0 } else { x };
                let n = (x * core::f64::consts::LOG2_E as T + 0.5).floor();
                let r = x - n * core::f64::consts::LN_2 as T;
                let p = 1.0
                    + r * (1.0
                        + r * (0.5
                            + r * (1.0 / 6.0
                                + r * (1.0 / 24.0 + r * (1.0 / 120.0 + r * (1.0 / 720.0))))));
                p * scale(n)
            }

            pub struct Dirs {
                pub x: Vec<f64>,
                pub y: Vec<f64>,
                pub z: Vec<f64>,
                pub w: Vec<f64>,
            }

            pub fn dirs(k_count: usize, min_elev: f64, sky_exp: f64, c: f64) -> Dirs {
                let lo = (min_elev.clamp(1.0, 89.0) * std::f64::consts::PI / 180.0).sin();
                let mut d = Dirs { x: vec![0.0; k_count], y: vec![0.0; k_count], z: vec![0.0; k_count], w: vec![0.0; k_count] };
                let mut total = 0.0;
                for k in 0..k_count {
                    let sin_e = if k_count == 1 { 1.0 } else { lo + ((1.0 - lo) * (k as f64 + 0.5)) / k_count as f64 };
                    let cos_e = (1.0 - sin_e * sin_e).sqrt();
                    let az = 2.0 * std::f64::consts::PI * ((k as f64 * GOLDEN) % 1.0);
                    d.x[k] = cos_e * az.cos();
                    d.y[k] = sin_e;
                    d.z[k] = cos_e * az.sin();
                    d.w[k] = sin_e.powf(sky_exp);
                    total += d.w[k];
                }
                for k in 0..k_count { d.w[k] = d.w[k] * c / total; }
                d
            }

            /// Scratch of one marcher (one thread, or the whole kernel single-threaded).
            pub struct Scratch {
                pub up: Vec<T>,
                pub next: Vec<T>,
                pub g: Vec<T>,
                pub l: Vec<T>,
                pub i: Vec<T>,
                pub r: Vec<T>,
                pub s: Vec<T>,
            }

            pub struct Slab {
                pub w: usize,
                pub h: usize,
                pub d: usize,
                pub px: bool,
                pub pz: bool,
                pub kext: f64,
                pub fast: bool,
                pub dirs: Dirs,
                pub lad: Vec<T>,
                pub q: Vec<T>,
                pub vx: Vec<T>,
                pub vy: Vec<T>,
                pub vz: Vec<T>,
                pub top: usize,
                pub pad_x: usize,
                pub pad_z: usize,
            }

            #[inline(always)]
            fn pad_line(src: &[T], s0: usize, w: usize, dst: &mut [T], d0: usize, pad: usize, periodic: bool) {
                dst[d0 + pad..d0 + pad + w].copy_from_slice(&src[s0..s0 + w]);
                for j in 0..pad {
                    if periodic {
                        let cl = ((j as isize - pad as isize).rem_euclid(w as isize)) as usize;
                        let cr = (w + j) % w;
                        dst[d0 + j] = src[s0 + cl];
                        dst[d0 + pad + w + j] = src[s0 + cr];
                    } else {
                        dst[d0 + j] = 0.0;
                        dst[d0 + pad + w + j] = 0.0;
                    }
                }
            }

            impl Slab {
                pub fn new(w: usize, h: usize, d: usize, k: usize, px: bool, pz: bool, kext: f64, min_elev: f64, sky_exp: f64, c: f64, fast: bool) -> Slab {
                    let n = w * h * d;
                    let dirs = dirs(k, min_elev, sky_exp, c);
                    let (mut pad_x, mut pad_z) = (2usize, 2usize);
                    for kk in 0..k {
                        let sx = dirs.x[kk] / dirs.y[kk];
                        let sz = dirs.z[kk] / dirs.y[kk];
                        pad_x = pad_x.max(sx.floor().abs() as usize + 2).max((0.5 + sx).floor().abs() as usize + 2);
                        pad_z = pad_z.max(sz.floor().abs() as usize + 2).max((0.5 + sz).floor().abs() as usize + 2);
                    }
                    Slab { w, h, d, px, pz, kext, fast, dirs, lad: vec![0.0; n], q: vec![0.0; n], vx: vec![0.0; n], vy: vec![0.0; n], vz: vec![0.0; n], top: 0, pad_x, pad_z }
                }

                pub fn scratch(&self, k_count: usize) -> Scratch {
                    let plane = self.w * self.d;
                    let nx = self.w + 2 * self.pad_x;
                    let nz = self.d + 2 * self.pad_z;
                    Scratch { up: vec![0.0; k_count * plane], next: vec![0.0; k_count * plane], g: vec![0.0; nx * nz], l: vec![0.0; nx * nz], i: vec![0.0; (nx + 1) * nz], r: vec![0.0; self.w * nz], s: vec![0.0; self.w * (nz + 1)] }
                }

                /// The fused march over directions `ks`, accumulating into (q, vx, vy, vz).
                pub fn march(&self, ks: &[usize], sc: &mut Scratch, q: &mut [T], vx: &mut [T], vy: &mut [T], vz: &mut [T]) {
                    let (w, d, top) = (self.w, self.d, self.top);
                    let plane = w * d;
                    let n = top * plane;
                    let (pad_x, pad_z) = (self.pad_x, self.pad_z);
                    let nx = w + 2 * pad_x;
                    let nz = d + 2 * pad_z;
                    let kext = self.kext as T;
                    let lad = &self.lad[..];
                    let Scratch { up, next, g: gb, l: lb, i: ib, r: rb, s: sb } = sc;
                    let mut up: &mut Vec<T> = up;
                    let mut next: &mut Vec<T> = next;
                    for v in up.iter_mut() { *v = 0.0; }
                    q[..n].fill(0.0);
                    vx[..n].fill(0.0);
                    vy[..n].fill(0.0);
                    vz[..n].fill(0.0);
                    if top == 0 { return; }
                    let mut row = top - 1;
                    loop {
                        let base = row * plane;
                        for (kk, &k) in ks.iter().enumerate() {
                            let wk = self.dirs.w[k] as T;
                            let (dx, dy, dz) = (self.dirs.x[k] as T, self.dirs.y[k] as T, self.dirs.z[k] as T);
                            let u = &up[kk * plane..kk * plane + plane];
                            let qq = &mut q[base..base + plane];
                            let xx = &mut vx[base..base + plane];
                            let yy = &mut vy[base..base + plane];
                            let zz = &mut vz[base..base + plane];
                            if self.fast {
                                for c in 0..plane {
                                    let light = wk * $fexp(-kext * u[c]);
                                    qq[c] += light;
                                    xx[c] += light * dx;
                                    yy[c] += light * dy;
                                    zz[c] += light * dz;
                                }
                            } else {
                                for c in 0..plane {
                                    let dd = u[c];
                                    let light = if dd == 0.0 { wk } else { wk * (-kext * dd).exp() };
                                    qq[c] += light;
                                    xx[c] += light * dx;
                                    yy[c] += light * dy;
                                    zz[c] += light * dz;
                                }
                            }
                        }
                        if row == 0 { break; }
                        for zi in 0..nz {
                            let mut z = zi as isize - pad_z as isize;
                            if self.pz { z = z.rem_euclid(d as isize); }
                            let d0 = zi * nx;
                            let i0 = zi * (nx + 1);
                            if z < 0 || z >= d as isize { lb[d0..d0 + nx].fill(0.0); } else { pad_line(lad, base + z as usize * w, w, lb, d0, pad_x, self.px); }
                            let mut acc: T = 0.0;
                            for j in 0..nx { ib[i0 + j] = acc; acc += lb[d0 + j]; }
                            ib[i0 + nx] = acc;
                        }
                        for (kk, &k) in ks.iter().enumerate() {
                            let dyf = self.dirs.y[k];
                            let sx = self.dirs.x[k] / dyf;
                            let sz = self.dirs.z[k] / dyf;
                            let per_row = (1.0 / dyf) as T;
                            let kx = sx.floor();
                            let fx = (sx - kx) as T;
                            let mx = (0.5 + sx).floor();
                            let frx = (0.5 + sx - mx) as T;
                            let kz = sz.floor();
                            let fz = (sz - kz) as T;
                            let mz = (0.5 + sz).floor();
                            let frz = (0.5 + sz - mz) as T;
                            let vert_x = sx.abs() < 1e-9;
                            let vert_z = sz.abs() < 1e-9;
                            let (sxt, szt) = (sx as T, sz as T);
                            let (kx, mx, kz, mz) = (kx as isize, mx as isize, kz as isize, mz as isize);
                            let u0 = kk * plane;
                            for zi in 0..nz {
                                let mut z = zi as isize - pad_z as isize;
                                if self.pz { z = z.rem_euclid(d as isize); }
                                let d0 = zi * nx;
                                if z < 0 || z >= d as isize { gb[d0..d0 + nx].fill(0.0); } else { pad_line(up, u0 + z as usize * w, w, gb, d0, pad_x, self.px); }
                                let i0 = zi * (nx + 1);
                                let r0 = zi * w;
                                let rr = &mut rb[r0..r0 + w];
                                if vert_x {
                                    rr.copy_from_slice(&lb[d0 + pad_x..d0 + pad_x + w]);
                                } else {
                                    let a0 = &ib[i0 + pad_x..i0 + pad_x + w];
                                    let a1 = &ib[(i0 as isize + pad_x as isize + mx) as usize..][..w];
                                    let l0 = &lb[d0 + pad_x..d0 + pad_x + w];
                                    let l1 = &lb[(d0 as isize + pad_x as isize + mx) as usize..][..w];
                                    for col in 0..w {
                                        let from = a0[col] + 0.5 * l0[col];
                                        let to = a1[col] + frx * l1[col];
                                        rr[col] = (to - from) / sxt;
                                    }
                                }
                            }
                            if !vert_z {
                                sb[..w].fill(0.0);
                                for zi in 0..nz {
                                    let s0 = zi * w;
                                    let (lo, hi) = sb.split_at_mut(s0 + w);
                                    let prev = &lo[s0..s0 + w];
                                    let cur = &mut hi[..w];
                                    let rr = &rb[s0..s0 + w];
                                    for col in 0..w { cur[col] = prev[col] + rr[col]; }
                                }
                            }
                            for z in 0..d {
                                let zj = z + pad_z;
                                let g0 = ((zj as isize + kz) * nx as isize + pad_x as isize + kx) as usize;
                                let g1 = g0 + nx;
                                let r = zj * w;
                                let rm = (zj as isize + mz) as usize * w;
                                let o = u0 + z * w;
                                let ga = &gb[g0..g0 + w + 1];
                                let gc = &gb[g1..g1 + w + 1];
                                let out = &mut next[o..o + w];
                                if vert_z {
                                    let rr = &rb[r..r + w];
                                    for col in 0..w {
                                        let g = (1.0 - fz) * (ga[col] * (1.0 - fx) + ga[col + 1] * fx) + fz * (gc[col] * (1.0 - fx) + gc[col + 1] * fx);
                                        out[col] = g + rr[col] * per_row;
                                    }
                                } else {
                                    let s0 = &sb[r..r + w];
                                    let r0 = &rb[r..r + w];
                                    let s1 = &sb[rm..rm + w];
                                    let r1 = &rb[rm..rm + w];
                                    for col in 0..w {
                                        let g = (1.0 - fz) * (ga[col] * (1.0 - fx) + ga[col + 1] * fx) + fz * (gc[col] * (1.0 - fx) + gc[col + 1] * fx);
                                        let from = s0[col] + 0.5 * r0[col];
                                        let to = s1[col] + frz * r1[col];
                                        out[col] = g + ((to - from) / szt) * per_row;
                                    }
                                }
                            }
                        }
                        core::mem::swap(&mut up, &mut next);
                        row -= 1;
                    }
                }

                /// Threaded fused march: per row, thread t marches directions k ≡ t (mod T) and
                /// accumulates the row's light into its own plane; after a barrier each thread sums
                /// one slice of the T planes into (q, v); a second barrier ends the row.
                pub fn compute_threaded(&mut self, threads: usize) {
                    use std::sync::Barrier;
                    let (w, d, top) = (self.w, self.d, self.top);
                    let plane = w * d;
                    let n = top * plane;
                    let kc = self.dirs.w.len();
                    let parts: Vec<Vec<usize>> = (0..threads).map(|t| (0..kc).filter(|k| k % threads == t).collect()).collect();
                    let mut partial: Vec<T> = vec![0.0; threads * 4 * plane];
                    let mut q = core::mem::take(&mut self.q);
                    let mut vx = core::mem::take(&mut self.vx);
                    let mut vy = core::mem::take(&mut self.vy);
                    let mut vz = core::mem::take(&mut self.vz);
                    let pp = partial.as_mut_ptr() as usize;
                    let qp = [q.as_mut_ptr() as usize, vx.as_mut_ptr() as usize, vy.as_mut_ptr() as usize, vz.as_mut_ptr() as usize];
                    let barrier = Barrier::new(threads);
                    let me = &*self;
                    if top > 0 {
                        std::thread::scope(|sco| {
                            for (t, ks) in parts.iter().enumerate() {
                                let barrier = &barrier;
                                sco.spawn(move || {
                                    let mut sc = me.scratch(ks.len());
                                    // one-row field for this thread: q, vx, vy, vz planes
                                    let mine = unsafe { core::slice::from_raw_parts_mut((pp as *mut T).add(t * 4 * plane), 4 * plane) };
                                    let lo = t * plane / threads;
                                    let hi = (t + 1) * plane / threads;
                                    let mut row = top - 1;
                                    me.march_rows(ks, &mut sc, top, &mut |r: usize, light_into: &mut dyn FnMut(&mut [T])| {
                                        mine.fill(0.0);
                                        light_into(mine);
                                        barrier.wait();
                                        let base = r * plane;
                                        for f in 0..4 {
                                            let dst = unsafe { core::slice::from_raw_parts_mut((qp[f] as *mut T).add(base), plane) };
                                            for c in lo..hi {
                                                let mut acc: T = 0.0;
                                                for u in 0..threads { acc += unsafe { *(pp as *const T).add(u * 4 * plane + f * plane + c) }; }
                                                dst[c] = acc;
                                            }
                                        }
                                        barrier.wait();
                                        let _ = &mut row;
                                    });
                                });
                            }
                        });
                    }
                    let _ = n;
                    self.q = q; self.vx = vx; self.vy = vy; self.vz = vz;
                    drop(partial);
                    self.open_fill();
                }

                /// The fused march, row by row: `row_done(row, light_into)` gets a closure that adds
                /// the row's light from this marcher's directions into a 4-plane buffer.
                pub fn march_rows(&self, ks: &[usize], sc: &mut Scratch, top: usize, row_done: &mut dyn FnMut(usize, &mut dyn FnMut(&mut [T]))) {
                    let (w, d) = (self.w, self.d);
                    let plane = w * d;
                    let (pad_x, pad_z) = (self.pad_x, self.pad_z);
                    let nx = w + 2 * pad_x;
                    let nz = d + 2 * pad_z;
                    let kext = self.kext as T;
                    let lad = &self.lad[..];
                    let Scratch { up, next, g: gb, l: lb, i: ib, r: rb, s: sb } = sc;
                    let mut up: &mut Vec<T> = up;
                    let mut next: &mut Vec<T> = next;
                    for v in up.iter_mut() { *v = 0.0; }
                    let mut row = top - 1;
                    loop {
                        let base = row * plane;
                        {
                            let u_all: &Vec<T> = up;
                            let mut light_into = |buf: &mut [T]| {
                                let (qq, rest) = buf.split_at_mut(plane);
                                let (xx, rest) = rest.split_at_mut(plane);
                                let (yy, zz) = rest.split_at_mut(plane);
                                for (kk, &k) in ks.iter().enumerate() {
                                    let wk = self.dirs.w[k] as T;
                                    let (dx, dy, dz) = (self.dirs.x[k] as T, self.dirs.y[k] as T, self.dirs.z[k] as T);
                                    let u = &u_all[kk * plane..kk * plane + plane];
                                    for c in 0..plane {
                                        let dd = u[c];
                                        let light = if self.fast { wk * $fexp(-kext * dd) } else if dd == 0.0 { wk } else { wk * (-kext * dd).exp() };
                                        qq[c] += light; xx[c] += light * dx; yy[c] += light * dy; zz[c] += light * dz;
                                    }
                                }
                            };
                            row_done(row, &mut light_into);
                        }
                        if row == 0 { break; }
                        for zi in 0..nz {
                            let mut z = zi as isize - pad_z as isize;
                            if self.pz { z = z.rem_euclid(d as isize); }
                            let d0 = zi * nx;
                            let i0 = zi * (nx + 1);
                            if z < 0 || z >= d as isize { lb[d0..d0 + nx].fill(0.0); } else { pad_line(lad, base + z as usize * w, w, lb, d0, pad_x, self.px); }
                            let mut acc: T = 0.0;
                            for j in 0..nx { ib[i0 + j] = acc; acc += lb[d0 + j]; }
                            ib[i0 + nx] = acc;
                        }
                        for (kk, &k) in ks.iter().enumerate() {
                            let dyf = self.dirs.y[k];
                            let sx = self.dirs.x[k] / dyf;
                            let sz = self.dirs.z[k] / dyf;
                            let per_row = (1.0 / dyf) as T;
                            let kx = sx.floor(); let fx = (sx - kx) as T;
                            let mx = (0.5 + sx).floor(); let frx = (0.5 + sx - mx) as T;
                            let kz = sz.floor(); let fz = (sz - kz) as T;
                            let mz = (0.5 + sz).floor(); let frz = (0.5 + sz - mz) as T;
                            let vert_x = sx.abs() < 1e-9;
                            let vert_z = sz.abs() < 1e-9;
                            let (sxt, szt) = (sx as T, sz as T);
                            let (kx, mx, kz, mz) = (kx as isize, mx as isize, kz as isize, mz as isize);
                            let u0 = kk * plane;
                            for zi in 0..nz {
                                let mut z = zi as isize - pad_z as isize;
                                if self.pz { z = z.rem_euclid(d as isize); }
                                let d0 = zi * nx;
                                if z < 0 || z >= d as isize { gb[d0..d0 + nx].fill(0.0); } else { pad_line(up, u0 + z as usize * w, w, gb, d0, pad_x, self.px); }
                                let i0 = zi * (nx + 1);
                                let r0 = zi * w;
                                let rr = &mut rb[r0..r0 + w];
                                if vert_x { rr.copy_from_slice(&lb[d0 + pad_x..d0 + pad_x + w]); } else {
                                    let a0 = &ib[i0 + pad_x..i0 + pad_x + w];
                                    let a1 = &ib[(i0 as isize + pad_x as isize + mx) as usize..][..w];
                                    let l0 = &lb[d0 + pad_x..d0 + pad_x + w];
                                    let l1 = &lb[(d0 as isize + pad_x as isize + mx) as usize..][..w];
                                    for col in 0..w { rr[col] = ((a1[col] + frx * l1[col]) - (a0[col] + 0.5 * l0[col])) / sxt; }
                                }
                            }
                            if !vert_z {
                                sb[..w].fill(0.0);
                                for zi in 0..nz {
                                    let s0 = zi * w;
                                    let (lo, hi) = sb.split_at_mut(s0 + w);
                                    let prev = &lo[s0..s0 + w];
                                    let cur = &mut hi[..w];
                                    let rr = &rb[s0..s0 + w];
                                    for col in 0..w { cur[col] = prev[col] + rr[col]; }
                                }
                            }
                            for z in 0..d {
                                let zj = z + pad_z;
                                let g0 = ((zj as isize + kz) * nx as isize + pad_x as isize + kx) as usize;
                                let g1 = g0 + nx;
                                let r = zj * w;
                                let rm = (zj as isize + mz) as usize * w;
                                let o = u0 + z * w;
                                let ga = &gb[g0..g0 + w + 1];
                                let gc = &gb[g1..g1 + w + 1];
                                let out = &mut next[o..o + w];
                                for col in 0..w {
                                    let g = (1.0 - fz) * (ga[col] * (1.0 - fx) + ga[col + 1] * fx) + fz * (gc[col] * (1.0 - fx) + gc[col + 1] * fx);
                                    let mean = if vert_z { rb[r + col] } else { ((sb[rm + col] + frz * rb[rm + col]) - (sb[r + col] + 0.5 * rb[r + col])) / szt };
                                    out[col] = g + mean * per_row;
                                }
                            }
                        }
                        core::mem::swap(&mut up, &mut next);
                        row -= 1;
                    }
                }

                pub fn open_fill(&mut self) {
                    let n = self.top * self.w * self.d;
                    let (mut q, mut x, mut y, mut z) = (0.0f64, 0.0, 0.0, 0.0);
                    for k in 0..self.dirs.w.len() {
                        let wk = self.dirs.w[k];
                        q += wk; x += wk * self.dirs.x[k]; y += wk * self.dirs.y[k]; z += wk * self.dirs.z[k];
                    }
                    self.q[n..].fill(q as T);
                    self.vx[n..].fill(x as T);
                    self.vy[n..].fill(y as T);
                    self.vz[n..].fill(z as T);
                }

                pub fn compute(&mut self, sc: &mut Scratch) {
                    let ks: Vec<usize> = (0..self.dirs.w.len()).collect();
                    let mut q = core::mem::take(&mut self.q);
                    let mut vx = core::mem::take(&mut self.vx);
                    let mut vy = core::mem::take(&mut self.vy);
                    let mut vz = core::mem::take(&mut self.vz);
                    self.march(&ks, sc, &mut q, &mut vx, &mut vy, &mut vz);
                    self.q = q; self.vx = vx; self.vy = vy; self.vz = vz;
                    self.open_fill();
                }
            }
        }
    };
}

#[inline(always)]
pub fn scale32(n: f32) -> f32 { f32::from_bits(((n as i32 + 127) as u32) << 23) }
#[inline(always)]
pub fn scale64(n: f64) -> f64 { f64::from_bits(((n as i64 + 1023) as u64) << 52) }

mod s32 { pub use super::scale32 as scale; }
mod s64 { pub use super::scale64 as scale; }

pub mod k32 { use super::s32::scale; slab_impl!(m, f32, fexp); pub use m::*; }
pub mod k64 { use super::s64::scale; slab_impl!(m, f64, fexp); pub use m::*; }

// ---- WebAssembly exports (no bindgen): one slab at a time per precision ----

macro_rules! exports {
    ($k:ident, $st:ident, $new:ident, $lad:ident, $q:ident, $top:ident, $comp:ident, $T:ty) => {
        pub static mut $st: Option<($k::Slab, $k::Scratch)> = None;
        #[no_mangle]
        pub extern "C" fn $new(w: usize, h: usize, d: usize, k: usize, px: u32, pz: u32, kext: f64, min_elev: f64, sky_exp: f64, c: f64, fast: u32) {
            let s = $k::Slab::new(w, h, d, k, px != 0, pz != 0, kext, min_elev, sky_exp, c, fast != 0);
            let sc = s.scratch(k);
            unsafe { $st = Some((s, sc)); }
        }
        #[no_mangle]
        pub extern "C" fn $lad() -> *mut $T { unsafe { (*core::ptr::addr_of_mut!($st)).as_mut().unwrap().0.lad.as_mut_ptr() } }
        #[no_mangle]
        pub extern "C" fn $q() -> *mut $T { unsafe { (*core::ptr::addr_of_mut!($st)).as_mut().unwrap().0.q.as_mut_ptr() } }
        #[no_mangle]
        pub extern "C" fn $top(t: usize) { unsafe { (*core::ptr::addr_of_mut!($st)).as_mut().unwrap().0.top = t; } }
        #[no_mangle]
        pub extern "C" fn $comp() { unsafe { let (s, sc) = (*core::ptr::addr_of_mut!($st)).as_mut().unwrap(); s.compute(sc); } }
    };
}
#[allow(non_upper_case_globals)]
pub mod wasm_exports {
    use super::{k32, k64};
    exports!(k32, S32, new32, lad32, q32, top32, compute32, f32);
    exports!(k64, S64, new64, lad64, q64, top64, compute64, f64);
}

/// Explicit f32x4 version of k32::Slab::march (WebAssembly SIMD128): the light accumulation with a
/// lane-wise polynomial exp, the x-means, the z prefix sums and the final bilinear/box loop.
#[cfg(target_arch = "wasm32")]
pub mod simd32 {
    use crate::k32::{Scratch, Slab, T};
    use core::arch::wasm32::*;

    #[inline(always)]
    unsafe fn ld(p: &[f32], i: usize) -> v128 { v128_load(p.as_ptr().add(i) as *const v128) }
    #[inline(always)]
    unsafe fn st(p: &mut [f32], i: usize, v: v128) { v128_store(p.as_mut_ptr().add(i) as *mut v128, v) }

    #[inline(always)]
    unsafe fn vexp(x: v128) -> v128 {
        let x = f32x4_pmax(x, f32x4_splat(-80.0));
        let n = f32x4_floor(f32x4_add(f32x4_mul(x, f32x4_splat(core::f32::consts::LOG2_E)), f32x4_splat(0.5)));
        let r = f32x4_sub(x, f32x4_mul(n, f32x4_splat(core::f32::consts::LN_2)));
        let mut p = f32x4_splat(1.0 / 720.0);
        for c in [1.0 / 120.0, 1.0 / 24.0, 1.0 / 6.0, 0.5, 1.0, 1.0] {
            p = f32x4_add(f32x4_mul(p, r), f32x4_splat(c));
        }
        let e = i32x4_shl(i32x4_add(i32x4_trunc_sat_f32x4(n), i32x4_splat(127)), 23);
        f32x4_mul(p, e)
    }

    pub fn march(s: &Slab, ks: &[usize], sc: &mut Scratch, q: &mut [T], vx: &mut [T], vy: &mut [T], vz: &mut [T]) {
        unsafe { march_inner(s, ks, sc, q, vx, vy, vz) }
    }

    unsafe fn march_inner(s: &Slab, ks: &[usize], sc: &mut Scratch, q: &mut [T], vx: &mut [T], vy: &mut [T], vz: &mut [T]) {
        let (w, d, top) = (s.w, s.d, s.top);
        let plane = w * d;
        let n = top * plane;
        let (pad_x, pad_z) = (s.pad_x, s.pad_z);
        let nx = w + 2 * pad_x;
        let nz = d + 2 * pad_z;
        let kext = s.kext as f32;
        let lad = &s.lad[..];
        let Scratch { up, next, g: gb, l: lb, i: ib, r: rb, s: sb } = sc;
        let mut up: &mut Vec<T> = up;
        let mut next: &mut Vec<T> = next;
        for v in up.iter_mut() { *v = 0.0; }
        q[..n].fill(0.0); vx[..n].fill(0.0); vy[..n].fill(0.0); vz[..n].fill(0.0);
        if top == 0 { return; }
        let w4 = w & !3;
        let p4 = plane & !3;
        let mut row = top - 1;
        loop {
            let base = row * plane;
            for (kk, &k) in ks.iter().enumerate() {
                let wk = s.dirs.w[k] as f32;
                let (dx, dy, dz) = (s.dirs.x[k] as f32, s.dirs.y[k] as f32, s.dirs.z[k] as f32);
                let u0 = kk * plane;
                let (vw, vdx, vdy, vdz, vk) = (f32x4_splat(wk), f32x4_splat(dx), f32x4_splat(dy), f32x4_splat(dz), f32x4_splat(-kext));
                let mut c = 0;
                while c < p4 {
                    let light = f32x4_mul(vw, vexp(f32x4_mul(vk, ld(up, u0 + c))));
                    let i = base + c;
                    st(q, i, f32x4_add(ld(q, i), light));
                    st(vx, i, f32x4_add(ld(vx, i), f32x4_mul(light, vdx)));
                    st(vy, i, f32x4_add(ld(vy, i), f32x4_mul(light, vdy)));
                    st(vz, i, f32x4_add(ld(vz, i), f32x4_mul(light, vdz)));
                    c += 4;
                }
                while c < plane {
                    let light = wk * crate::k32::fexp(-kext * up[u0 + c]);
                    let i = base + c;
                    q[i] += light; vx[i] += light * dx; vy[i] += light * dy; vz[i] += light * dz;
                    c += 1;
                }
            }
            if row == 0 { break; }
            for zi in 0..nz {
                let mut z = zi as isize - pad_z as isize;
                if s.pz { z = z.rem_euclid(d as isize); }
                let d0 = zi * nx;
                let i0 = zi * (nx + 1);
                if z < 0 || z >= d as isize { lb[d0..d0 + nx].fill(0.0); } else { pad_line(lad, base + z as usize * w, w, lb, d0, pad_x, s.px); }
                let mut acc = 0.0f32;
                for j in 0..nx { *ib.get_unchecked_mut(i0 + j) = acc; acc += *lb.get_unchecked(d0 + j); }
                ib[i0 + nx] = acc;
            }
            for (kk, &k) in ks.iter().enumerate() {
                let dyf = s.dirs.y[k];
                let sx = s.dirs.x[k] / dyf;
                let sz = s.dirs.z[k] / dyf;
                let per_row = (1.0 / dyf) as f32;
                let kx = sx.floor(); let fx = (sx - kx) as f32;
                let mx = (0.5 + sx).floor(); let frx = (0.5 + sx - mx) as f32;
                let kz = sz.floor(); let fz = (sz - kz) as f32;
                let mz = (0.5 + sz).floor(); let frz = (0.5 + sz - mz) as f32;
                let vert_x = sx.abs() < 1e-9;
                let vert_z = sz.abs() < 1e-9;
                let (kx, mx, kz, mz) = (kx as isize, mx as isize, kz as isize, mz as isize);
                let inv_sx = f32x4_splat(1.0 / sx as f32);
                let inv_sz = f32x4_splat(1.0 / sz as f32);
                let (half, vfrx, vfrz) = (f32x4_splat(0.5), f32x4_splat(frx), f32x4_splat(frz));
                let u0 = kk * plane;
                for zi in 0..nz {
                    let mut z = zi as isize - pad_z as isize;
                    if s.pz { z = z.rem_euclid(d as isize); }
                    let d0 = zi * nx;
                    if z < 0 || z >= d as isize { gb[d0..d0 + nx].fill(0.0); } else { pad_line(up, u0 + z as usize * w, w, gb, d0, pad_x, s.px); }
                    let i0 = zi * (nx + 1);
                    let r0 = zi * w;
                    if vert_x {
                        rb[r0..r0 + w].copy_from_slice(&lb[d0 + pad_x..d0 + pad_x + w]);
                    } else {
                        let a0 = i0 + pad_x;
                        let a1 = (i0 as isize + pad_x as isize + mx) as usize;
                        let l0 = d0 + pad_x;
                        let l1 = (d0 as isize + pad_x as isize + mx) as usize;
                        let mut col = 0;
                        while col < w4 {
                            let from = f32x4_add(ld(ib, a0 + col), f32x4_mul(half, ld(lb, l0 + col)));
                            let to = f32x4_add(ld(ib, a1 + col), f32x4_mul(vfrx, ld(lb, l1 + col)));
                            st(rb, r0 + col, f32x4_mul(f32x4_sub(to, from), inv_sx));
                            col += 4;
                        }
                        while col < w {
                            let from = ib[a0 + col] + 0.5 * lb[l0 + col];
                            let to = ib[a1 + col] + frx * lb[l1 + col];
                            rb[r0 + col] = (to - from) * (1.0 / sx as f32);
                            col += 1;
                        }
                    }
                }
                if !vert_z {
                    sb[..w].fill(0.0);
                    for zi in 0..nz {
                        let s0 = zi * w;
                        let mut col = 0;
                        while col < w4 { let v = f32x4_add(ld(sb, s0 + col), ld(rb, s0 + col)); st(sb, s0 + w + col, v); col += 4; }
                        while col < w { sb[s0 + w + col] = sb[s0 + col] + rb[s0 + col]; col += 1; }
                    }
                }
                let (a00, a01) = ((1.0 - fz) * (1.0 - fx), (1.0 - fz) * fx);
                let (a10, a11) = (fz * (1.0 - fx), fz * fx);
                let (v00, v01, v10, v11) = (f32x4_splat(a00), f32x4_splat(a01), f32x4_splat(a10), f32x4_splat(a11));
                let vpr = f32x4_splat(per_row);
                for z in 0..d {
                    let zj = z + pad_z;
                    let g0 = ((zj as isize + kz) * nx as isize + pad_x as isize + kx) as usize;
                    let g1 = g0 + nx;
                    let r = zj * w;
                    let rm = (zj as isize + mz) as usize * w;
                    let o = u0 + z * w;
                    let mut col = 0;
                    while col < w4 {
                        let g = f32x4_add(
                            f32x4_add(f32x4_mul(v00, ld(gb, g0 + col)), f32x4_mul(v01, ld(gb, g0 + col + 1))),
                            f32x4_add(f32x4_mul(v10, ld(gb, g1 + col)), f32x4_mul(v11, ld(gb, g1 + col + 1))),
                        );
                        let mean = if vert_z { ld(rb, r + col) } else {
                            let from = f32x4_add(ld(sb, r + col), f32x4_mul(half, ld(rb, r + col)));
                            let to = f32x4_add(ld(sb, rm + col), f32x4_mul(vfrz, ld(rb, rm + col)));
                            f32x4_mul(f32x4_sub(to, from), inv_sz)
                        };
                        st(next, o + col, f32x4_add(g, f32x4_mul(mean, vpr)));
                        col += 4;
                    }
                    while col < w {
                        let g = a00 * gb[g0 + col] + a01 * gb[g0 + col + 1] + a10 * gb[g1 + col] + a11 * gb[g1 + col + 1];
                        let mean = if vert_z { rb[r + col] } else { ((sb[rm + col] + frz * rb[rm + col]) - (sb[r + col] + 0.5 * rb[r + col])) * (1.0 / sz as f32) };
                        next[o + col] = g + mean * per_row;
                        col += 1;
                    }
                }
            }
            core::mem::swap(&mut up, &mut next);
            row -= 1;
        }
    }

    fn pad_line(src: &[f32], s0: usize, w: usize, dst: &mut [f32], d0: usize, pad: usize, periodic: bool) {
        dst[d0 + pad..d0 + pad + w].copy_from_slice(&src[s0..s0 + w]);
        for j in 0..pad {
            if periodic {
                let cl = ((j as isize - pad as isize).rem_euclid(w as isize)) as usize;
                dst[d0 + j] = src[s0 + cl];
                dst[d0 + pad + w + j] = src[s0 + (w + j) % w];
            } else {
                dst[d0 + j] = 0.0;
                dst[d0 + pad + w + j] = 0.0;
            }
        }
    }

    pub fn compute(s: &mut Slab, sc: &mut Scratch) {
        let ks: Vec<usize> = (0..s.dirs.w.len()).collect();
        let mut q = core::mem::take(&mut s.q);
        let mut vx = core::mem::take(&mut s.vx);
        let mut vy = core::mem::take(&mut s.vy);
        let mut vz = core::mem::take(&mut s.vz);
        march(s, &ks, sc, &mut q, &mut vx, &mut vy, &mut vz);
        s.q = q; s.vx = vx; s.vy = vy; s.vz = vz;
        s.open_fill();
    }
}

#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn compute32simd() {
    unsafe {
        let (s, sc) = (*core::ptr::addr_of_mut!(wasm_exports::S32)).as_mut().unwrap();
        simd32::compute(s, sc);
    }
}

/// One lane of the lane-parallel march (G1): directions k ≡ lane (mod lanes) into this instance's
/// own (q, v), its partial field. A sample would sum the lanes' fields at one cell.
#[cfg(target_arch = "wasm32")]
#[no_mangle]
pub extern "C" fn compute32simd_lane(lane: usize, lanes: usize) {
    unsafe {
        let (s, sc) = (*core::ptr::addr_of_mut!(wasm_exports::S32)).as_mut().unwrap();
        let ks: Vec<usize> = (0..s.dirs.w.len()).filter(|k| k % lanes == lane).collect();
        let mut q = core::mem::take(&mut s.q);
        let mut vx = core::mem::take(&mut s.vx);
        let mut vy = core::mem::take(&mut s.vy);
        let mut vz = core::mem::take(&mut s.vz);
        simd32::march(s, &ks, sc, &mut q, &mut vx, &mut vy, &mut vz);
        s.q = q; s.vx = vx; s.vy = vy; s.vz = vz;
    }
}

/// The 3D shadow pyramid (cli/slab-light.ts SlabPyramid) in Rust, for the review's equal-terms
/// comparison: deposit a·b^(−q) over (2q+1)² cells per layer; V from the perception cone, either
/// literally (every cell of the (2r+1)³ box, distance and angle tested per cell, bud at its true
/// position) or from a cone precomputed once with the bud at its cell's centre.
pub mod pyr {
    pub struct Pyr {
        pub w: usize, pub h: usize, pub d: usize, pub px: bool, pub pz: bool,
        pub s: Vec<f32>, pub weights: Vec<f32>, pub a: f32, pub c: f32,
        pub cos_half: f32, pub r: i32, pub top: usize,
        /// (dx, dy, dz, unit vector) of every cone cell, for the precomputed search.
        pub cone: Vec<(i32, i32, i32, f32, f32, f32)>,
    }
    impl Pyr {
        pub fn new(w: usize, h: usize, d: usize, px: bool, pz: bool, a: f64, b: f64, qmax: usize, c: f64, angle_deg: f64, r: usize) -> Pyr {
            let weights = (0..=qmax).map(|q| (a * b.powi(-(q as i32))) as f32).collect();
            let cos_half = (angle_deg * std::f64::consts::PI / 180.0).cos() as f32;
            let r = r.max(1) as i32;
            let mut cone = vec![];
            for dy in -r..=r { for dz in -r..=r { for dx in -r..=r {
                let (ex, ey, ez) = (dx as f32, dy as f32, dz as f32);
                let dd = (ex * ex + ey * ey + ez * ez).sqrt();
                if dd == 0.0 || dd > r as f32 || ey / dd < cos_half { continue; }
                cone.push((dx, dy, dz, ex / dd, ey / dd, ez / dd));
            }}}
            Pyr { w, h, d, px, pz, s: vec![0.0; w * h * d], weights, a: a as f32, c: c as f32, cos_half, r, top: 0, cone }
        }
        pub fn clear(&mut self) { let n = self.top * self.w * self.d; self.s[..n].fill(0.0); self.top = 0; }
        pub fn deposit(&mut self, x: f64, y: f64, z: f64, area: f32) {
            let (w, h, d) = (self.w as isize, self.h as isize, self.d as isize);
            let i = x.floor() as isize; let j = y.floor() as isize; let zc = z.floor() as isize;
            if j < 0 || j >= h { return; }
            self.top = self.top.max(j as usize + 1);
            for (q, &wq) in self.weights.iter().enumerate() {
                let q = q as isize;
                let row = j - q;
                if row < 0 { break; }
                let wv = wq * area;
                for dz in -q..=q {
                    let mut zz = zc + dz;
                    if self.pz { zz = zz.rem_euclid(d); } else if zz < 0 || zz >= d { continue; }
                    let base = ((row * d + zz) * w) as usize;
                    if self.px {
                        for dx in -q..=q { let mut col = i.rem_euclid(w) + dx; if col < 0 { col += w } else if col >= w { col -= w } self.s[base + col as usize] += wv; }
                    } else {
                        let lo = (i - q).max(0); let hi = (i + q).min(w - 1);
                        for col in lo..=hi { self.s[base + col as usize] += wv; }
                    }
                }
            }
        }
        #[inline]
        fn cell(&self, col: isize, row: isize, zz: isize) -> Option<usize> {
            let (w, h, d) = (self.w as isize, self.h as isize, self.d as isize);
            if row < 0 || row >= h { return None; }
            let col = if self.px { col.rem_euclid(w) } else if col < 0 || col >= w { return None } else { col };
            let zz = if self.pz { zz.rem_euclid(d) } else if zz < 0 || zz >= d { return None } else { zz };
            Some(((row * d + zz) * w + col) as usize)
        }
        /// Q and V at a bud, the TS way.
        pub fn sample_literal(&self, x: f64, y: f64, z: f64) -> [f32; 4] {
            let (i, j, zc) = (x.floor() as isize, y.floor() as isize, z.floor() as isize);
            let Some(c0) = self.cell(i, j, zc) else { return [0.0, 0.0, 1.0, 0.0] };
            let q = (self.c - self.s[c0] + self.a).max(0.0);
            let (fx, fy, fz) = ((x - x.floor()) as f32, y as f32, (z - z.floor()) as f32);
            let r = self.r as isize;
            let mut best = f32::INFINITY; let mut v = [0.0f32, 1.0, 0.0];
            for row in (j - r).max(0)..=(j + r).min(self.h as isize - 1) {
                for dzc in -r..=r { for dxc in -r..=r {
                    let Some(c) = self.cell(i + dxc, row, zc + dzc) else { continue };
                    let ex = dxc as f32 + 0.5 - fx; let ey = row as f32 + 0.5 - fy; let ez = dzc as f32 + 0.5 - fz;
                    let dd = (ex * ex + ey * ey + ez * ez).sqrt();
                    if dd > self.r as f32 || dd == 0.0 || ey / dd < self.cos_half { continue; }
                    let sh = self.s[c];
                    if sh < best { best = sh; v = [ex / dd, ey / dd, ez / dd]; }
                }}
            }
            [q, v[0], v[1], v[2]]
        }
        /// Q and V with the cone precomputed (the bud at its cell's centre).
        pub fn sample_cone(&self, x: f64, y: f64, z: f64) -> [f32; 4] {
            let (i, j, zc) = (x.floor() as isize, y.floor() as isize, z.floor() as isize);
            let Some(c0) = self.cell(i, j, zc) else { return [0.0, 0.0, 1.0, 0.0] };
            let q = (self.c - self.s[c0] + self.a).max(0.0);
            let mut best = f32::INFINITY; let mut v = [0.0f32, 1.0, 0.0];
            for &(dx, dy, dz, ux, uy, uz) in &self.cone {
                let Some(c) = self.cell(i + dx as isize, j + dy as isize, zc + dz as isize) else { continue };
                let sh = self.s[c];
                if sh < best { best = sh; v = [ux, uy, uz]; }
            }
            [q, v[0], v[1], v[2]]
        }
    }
}

pub mod pyr_exports {
    use super::pyr::Pyr;
    static mut P: Option<Pyr> = None;
    static mut BUF: Vec<f64> = Vec::new();
    #[no_mangle]
    pub extern "C" fn pyr_new(w: usize, h: usize, d: usize, px: u32, pz: u32) {
        unsafe { P = Some(Pyr::new(w, h, d, px != 0, pz != 0, 0.15, 1.5, 6, 1.0, 45.0, 4)); }
    }
    #[no_mangle]
    pub extern "C" fn pyr_buf(n: usize) -> *mut f64 {
        unsafe { let b = &mut *core::ptr::addr_of_mut!(BUF); b.resize(n, 0.0); b.as_mut_ptr() }
    }
    /// Deposits the n buds (x, y, z, area) in the buffer.
    #[no_mangle]
    pub extern "C" fn pyr_deposit(n: usize) {
        unsafe {
            let p = (*core::ptr::addr_of_mut!(P)).as_mut().unwrap();
            let b = &*core::ptr::addr_of!(BUF);
            p.clear();
            for k in 0..n { p.deposit(b[4 * k], b[4 * k + 1], b[4 * k + 2], b[4 * k + 3] as f32); }
        }
    }
    /// Samples the n buds; mode 0 literal, 1 precomputed cone. Returns Σ Q + Σ vy (a checksum).
    #[no_mangle]
    pub extern "C" fn pyr_sample(n: usize, mode: u32) -> f64 {
        unsafe {
            let p = (*core::ptr::addr_of!(P)).as_ref().unwrap();
            let b = &*core::ptr::addr_of!(BUF);
            let mut acc = 0.0f64;
            for k in 0..n {
                let o = if mode == 0 { p.sample_literal(b[4 * k], b[4 * k + 1], b[4 * k + 2]) } else { p.sample_cone(b[4 * k], b[4 * k + 1], b[4 * k + 2]) };
                acc += (o[0] + o[2]) as f64;
            }
            acc
        }
    }
}
