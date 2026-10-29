//! THROWAWAY (G3, ADR 0024): the Rust slab sweep (production build: no parity) on the 3D
//! prototype's R6 stands, D = 64, τ ∈ {1, 0.2}, seasons 40 and 100.
//!
//! 1. Accuracy, M18's protocol in 3D: every second foliage cell below the stand's top, the exact
//!    light entering it (steps of 0.01 along each of the same K = 16 rays, the faces' depth added
//!    where a ray crosses one) against the sweep's; mean, p50, p90 |ΔQ|/C, and by distance to a face.
//! 2. K convergence at the buds: Q at every live bud for K ∈ {8, 12, 16, 24, 32}, static and
//!    rotated (seasons 0–9: each season's error and the error of the 10-season mean), against
//!    K = 128 static, as mean |ΔQ|/C.
//! 3. Cost natively: compute at each K, single-threaded, median of 5.
//!
//! The deposits are run.ts's DUMP files: Float64 (x, y, z, area) per live bud.

mod diag;
use std::time::Instant;
use tree_core::light::slab_sweep::{SlabParams, SlabSweep};

const W: usize = 210;
const H: usize = 130;
const D: usize = 64;

fn params(k: usize, rotate: bool, tau: f64) -> SlabParams {
    SlabParams {
        k,
        k_ext: 0.5,
        sky_exponent: 1.0,
        min_elevation: 15.0,
        c: 1.0,
        rotate,
        face_tau: [tau, tau],
        periodic_x: true,
    }
}

fn load(path: &str) -> Vec<[f64; 4]> {
    let b = std::fs::read(path).unwrap_or_else(|e| panic!("{path}: {e}"));
    let v: Vec<f64> = b.chunks_exact(8).map(|c| f64::from_le_bytes(c.try_into().unwrap())).collect();
    v.chunks_exact(4).map(|c| [c[0], c[1], c[2], c[3]]).collect()
}

fn sweep(buds: &[[f64; 4]], p: SlabParams) -> SlabSweep {
    let mut s = SlabSweep::new(W, H, D, p);
    for b in buds {
        if b[3] > 0.0 {
            s.deposit(b[0], b[1], b[2], b[3] as f32);
        }
    }
    s
}

fn quantile(v: &mut [f64], q: f64) -> f64 {
    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
    v[((v.len() as f64 - 1.0) * q).round() as usize]
}

/// 1. The sweep against the exact trace, in parallel over cells.
fn accuracy(buds: &[[f64; 4]], tau: f64, exact: bool, shifts: bool) -> String {
    let mut s = sweep(buds, params(16, false, tau));
    s.exact_segments = exact;
    s.integer_shifts = shifts;
    s.compute(0.0);
    let top = s.top();
    let cells: Vec<(usize, usize, usize)> = (0..top)
        .flat_map(|y| (0..D).flat_map(move |z| (0..W).map(move |x| (x, y, z))))
        .filter(|&(x, y, z)| s.lad()[(y * D + z) * W + x] > 0.0)
        .step_by(2)
        .collect();
    let threads = std::thread::available_parallelism().map_or(4, |n| n.get());
    let t0 = Instant::now();
    let errs: Vec<(f64, usize)> = std::thread::scope(|sc| {
        let chunks: Vec<_> = cells.chunks(cells.len().div_ceil(threads)).collect();
        let handles: Vec<_> = chunks
            .into_iter()
            .map(|ch| {
                let s = &s;
                sc.spawn(move || {
                    ch.iter()
                        .map(|&(x, y, z)| {
                            let dq = (s.q()[(y * D + z) * W + x] as f64 - s.exact_q(x, y, z, 0.01)).abs();
                            (dq, z.min(D - 1 - z))
                        })
                        .collect::<Vec<_>>()
                })
            })
            .collect();
        handles.into_iter().flat_map(|h| h.join().unwrap()).collect()
    });
    let mut all: Vec<f64> = errs.iter().map(|e| e.0).collect();
    let mean = all.iter().sum::<f64>() / all.len() as f64;
    let band = |lo: usize, hi: usize| {
        let v: Vec<f64> = errs.iter().filter(|e| e.1 >= lo && e.1 < hi).map(|e| e.0).collect();
        if v.is_empty() { (0.0, 0) } else { (v.iter().sum::<f64>() / v.len() as f64, v.len()) }
    };
    let (b0, n0) = band(0, 4);
    let (b1, n1) = band(4, 16);
    let (b2, n2) = band(16, 64);
    format!(
        "{{\"cells\": {}, \"mean\": {mean:.5}, \"p50\": {:.5}, \"p90\": {:.5}, \"max\": {:.5}, \"byFace\": {{\"0-3\": [{b0:.5}, {n0}], \"4-15\": [{b1:.5}, {n1}], \"16+\": [{b2:.5}, {n2}]}}, \"traceSeconds\": {:.1}}}",
        all.len(),
        quantile(&mut all, 0.5),
        quantile(&mut all, 0.9),
        quantile(&mut all, 1.0),
        t0.elapsed().as_secs_f64()
    )
}

fn at_buds(s: &SlabSweep, buds: &[[f64; 4]]) -> Vec<f64> {
    buds.iter().map(|b| s.sample(b[0], b[1], b[2])[0] as f64).collect()
}

fn mean_abs(a: &[f64], b: &[f64]) -> f64 {
    a.iter().zip(b).map(|(x, y)| (x - y).abs()).sum::<f64>() / a.len() as f64
}

/// 2. K convergence at the buds, and 3. the cost of compute at each K.
fn convergence(buds: &[[f64; 4]], tau: f64) -> String {
    let mut r = sweep(buds, params(128, false, tau));
    r.compute(0.0);
    let reference = at_buds(&r, buds);
    let mut rows = Vec::new();
    for k in [8usize, 12, 16, 24, 32] {
        let mut s = sweep(buds, params(k, false, tau));
        let mut times = Vec::new();
        for _ in 0..5 {
            let t0 = Instant::now();
            s.compute(0.0);
            times.push(t0.elapsed().as_secs_f64() * 1e3);
        }
        let stat = mean_abs(&at_buds(&s, buds), &reference);
        let mut rot = sweep(buds, params(k, true, tau));
        let mut sum = vec![0.0; buds.len()];
        let mut per = 0.0;
        for season in 0..10 {
            rot.compute(season as f64);
            let q = at_buds(&rot, buds);
            per += mean_abs(&q, &reference) / 10.0;
            for (a, b) in sum.iter_mut().zip(&q) {
                *a += b / 10.0;
            }
        }
        let avg = mean_abs(&sum, &reference);
        rows.push(format!(
            "\"{k}\": {{\"static\": {stat:.5}, \"rotatedPerSeason\": {per:.5}, \"rotatedMean10\": {avg:.5}, \"computeMs\": {:.1}}}",
            quantile(&mut times, 0.5)
        ));
    }
    format!("{{\"buds\": {}, {}}}", buds.len(), rows.join(", "))
}

/// Native compute at K = 16, scalar, single-threaded, median of 5: integer shifts (the default),
/// bilinear, and bilinear with the exact segment integral.
fn cost(buds: &[[f64; 4]], tau: f64) -> String {
    let mut out = Vec::new();
    for (exact, shifts) in [(false, true), (false, false), (true, false)] {
        let mut s = sweep(buds, params(16, false, tau));
        s.exact_segments = exact;
        s.integer_shifts = shifts;
        s.simd = false;
        let mut t = Vec::new();
        for _ in 0..5 {
            let t0 = Instant::now();
            s.compute(0.0);
            t.push(t0.elapsed().as_secs_f64() * 1e3);
        }
        out.push(format!("{:.1}", quantile(&mut t, 0.5)));
    }
    format!("{{\"shiftsMs\": {}, \"bilinearMs\": {}, \"bilinearDdaMs\": {}}}", out[0], out[1], out[2])
}

fn main() {
    let dir = std::env::args().nth(1).expect("deposits dir");
    if std::env::args().nth(3).as_deref() == Some("shifts") {
        for (name, tau) in [("d64-hard-r6", 1.0), ("d64-t020-r6", 0.2)] {
            for season in [40, 100] {
                let buds = load(&format!("{dir}/{name}-s{season}.bin"));
                println!("{name} s{season} integer shifts {}", accuracy(&buds, tau, false, true));
            }
        }
        return;
    }
    if std::env::args().nth(3).as_deref() == Some("diag") {
        for (name, tau) in [("d64-hard-r6", 1.0), ("d64-t020-r6", 0.2)] {
            println!("{name} s100");
            diag::run(&load(&format!("{dir}/{name}-s100.bin")), tau);
        }
        return;
    }
    let out = std::env::args().nth(2).expect("out.json");
    let mut parts = Vec::new();
    for (name, tau) in [("d64-hard-r6", 1.0), ("d64-t020-r6", 0.2)] {
        for season in [40, 100] {
            let buds = load(&format!("{dir}/{name}-s{season}.bin"));
            let a = accuracy(&buds, tau, false, true);
            eprintln!("{name} s{season} accuracy, integer shifts (default) {a}");
            let b = accuracy(&buds, tau, false, false);
            eprintln!("{name} s{season} accuracy, bilinear {b}");
            let e = accuracy(&buds, tau, true, false);
            eprintln!("{name} s{season} accuracy, bilinear + exact segments {e}");
            let cost = cost(&buds, tau);
            eprintln!("{name} s{season} cost {cost}");
            let c = convergence(&buds, tau);
            eprintln!("{name} s{season} K {c}");
            parts.push(format!("\"{name}-s{season}\": {{\"tau\": {tau}, \"accuracy\": {a}, \"accuracyBilinear\": {b}, \"accuracyBilinearExactSegments\": {e}, \"cost\": {cost}, \"convergence\": {c}}}"));
        }
    }
    std::fs::write(&out, format!("{{{}}}\n", parts.join(",\n"))).unwrap();
}
