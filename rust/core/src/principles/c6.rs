//! C6. Pipe-model girth with memory (spec §C6; c6-girth.ts). Tips have radius r0; basipetally
//! r_parent^n = Σ r_child^n + Σ r_scar^n, and a radius never shrinks. R3's stress wood is local:
//! the pipe radius r − stressWood is what enters the parent's sum.
//!
//! Params: c6.n, c6.r0.

use crate::math;
use crate::params::Params;
use crate::tree::{Tree, ensure};

pub fn update_girth(tree: &mut Tree, params: &Params) {
    let nm = tree.m.len();
    let (n, r0) = (params.c6.n, params.c6.r0);
    let tip_n = math::pow(r0, n);
    ensure(&mut tree.scratch_f, nm);
    ensure(&mut tree.scratch_u, nm);
    let child_sum = &mut tree.scratch_f;
    let has_child = &mut tree.scratch_u;
    child_sum[..nm].fill(0.0);
    has_child[..nm].fill(0);
    let c = &mut tree.m;
    for i in (0..nm).rev() {
        let base = if has_child[i] != 0 {
            child_sum[i]
        } else {
            tip_n
        };
        let r = math::pow(base + c.scar_sum_n[i], 1.0 / n) + c.stress_wood[i];
        if r > c.radius[i] {
            c.radius[i] = r;
        }
        let p = c.parent[i];
        if p >= 0 {
            child_sum[p as usize] += math::pow(c.radius[i] - c.stress_wood[i], n);
            has_child[p as usize] = 1;
        }
    }
}

/// Leonardo exponent Δ at every junction with two or more children (r_p^Δ = Σ r_c^Δ, §10), by
/// Newton's method from Δ = 0.5; junctions without a root in [0.5, 8] are skipped. Appends to
/// `out`.
pub fn junction_exponents(tree: &Tree, out: &mut Vec<f64>) {
    let nm = tree.m.len();
    let (parent, radius) = (&tree.m.parent, &tree.m.radius);
    let mut first = vec![-1i32; nm];
    let mut next = vec![0i32; nm];
    for i in (1..nm).rev() {
        let p = parent[i];
        if p < 0 {
            continue;
        }
        next[i] = first[p as usize];
        first[p as usize] = i as i32;
    }
    let mut logs: Vec<f64> = Vec::new();
    for p in 0..nm {
        if first[p] < 0 || next[first[p] as usize] < 0 {
            continue;
        }
        let rp = radius[p];
        logs.clear();
        let mut solvable = true;
        let mut k = first[p];
        while k >= 0 {
            let x = radius[k as usize] / rp;
            if x >= 1.0 || x <= 0.0 {
                solvable = false;
            }
            logs.push(math::ln(x));
            k = next[k as usize];
        }
        if !solvable {
            continue;
        }
        let f = |d: f64| {
            let mut sum = -1.0;
            for &l in &logs {
                sum += math::exp(d * l);
            }
            sum
        };
        if f(0.5) < 0.0 || f(8.0) > 0.0 {
            continue;
        }
        let mut d = 0.5;
        for _ in 0..100 {
            let mut fd = -1.0;
            let mut slope = 0.0;
            for &l in &logs {
                let e = math::exp(d * l);
                fd += e;
                slope += e * l;
            }
            let step = fd / slope;
            if !(step < 0.0) || step > -1e-13 {
                break;
            }
            d -= step;
        }
        out.push(d);
    }
}
