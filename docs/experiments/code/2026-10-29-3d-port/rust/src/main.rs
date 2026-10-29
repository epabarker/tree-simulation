//! Native timing of the scratch kernel, single-threaded and with T threads splitting the
//! directions (each thread its own scratch and accumulators, summed at the end).
use std::time::Instant;

macro_rules! run {
    ($k:ident, $T:ty, $args:expr) => {{
        let a = $args;
        let (w, h, d, kc, px, pz, fast, threads, reps) = (a.w, a.h, a.d, a.k, a.px, a.pz, a.fast, a.threads, a.reps);
        let mut s = slab::$k::Slab::new(w, h, d, kc, px, pz, 0.5, 15.0, 1.0, 1.0, fast);
        let mut top = 0usize;
        for i in 0..a.dep.len() / 4 {
            let (x, y, ar) = (a.dep[4 * i], a.dep[4 * i + 1], a.dep[4 * i + 3]);
            let z = d as f64 * ((0.5 + i as f64 * ((5f64.sqrt() - 1.0) / 2.0)) % 1.0);
            let mut ii = x.floor() as isize; let jj = y.floor() as isize; let mut zz = z.floor() as isize;
            if px { ii = ii.rem_euclid(w as isize); }
            if pz { zz = zz.rem_euclid(d as isize); }
            if ii < 0 || ii >= w as isize || jj < 0 || jj >= h as isize || zz < 0 || zz >= d as isize { continue; }
            s.lad[((jj as usize * d) + zz as usize) * w + ii as usize] += ar as $T;
            top = top.max(jj as usize + 1);
        }
        s.top = top;
        let n = top * w * d;
        let mut times = vec![];
        if a.rows {
            for _ in 0..reps { let t0 = Instant::now(); s.compute_threaded(threads); times.push(t0.elapsed().as_secs_f64() * 1e3); }
        } else if threads <= 1 {
            let mut sc = s.scratch(kc);
            for _ in 0..reps { let t0 = Instant::now(); s.compute(&mut sc); times.push(t0.elapsed().as_secs_f64() * 1e3); }
        } else {
            let parts: Vec<Vec<usize>> = (0..threads).map(|t| (0..kc).filter(|k| k % threads == t).collect()).collect();
            let mut scs: Vec<_> = parts.iter().map(|p| s.scratch(p.len())).collect();
            let mut outs: Vec<[Vec<$T>; 4]> = (0..threads).map(|_| [vec![0.0; n], vec![0.0; n], vec![0.0; n], vec![0.0; n]]).collect();
            for _ in 0..reps {
                let t0 = Instant::now();
                std::thread::scope(|sco| {
                    let sr = &s;
                    for ((p, sc), o) in parts.iter().zip(scs.iter_mut()).zip(outs.iter_mut()) {
                        sco.spawn(move || { let [q, x, y, z] = o; sr.march(p, sc, q, x, y, z); });
                    }
                });
                if a.noreduce { times.push(t0.elapsed().as_secs_f64() * 1e3); continue; }
                // reduce into the slab's own field
                for (dst, f) in [(&mut s.q, 0usize), (&mut s.vx, 1), (&mut s.vy, 2), (&mut s.vz, 3)] {
                    dst[..n].copy_from_slice(&outs[0][f]);
                    for t in 1..threads { let src = &outs[t][f]; for c in 0..n { dst[c] += src[c]; } }
                }
                s.open_fill();
                times.push(t0.elapsed().as_secs_f64() * 1e3);
            }
        }
        times.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let mut sum = 0.0f64; for c in 0..n { sum += s.q[c] as f64; }
        println!("{{\"ms\":{:.3},\"min\":{:.3},\"updates\":{},\"checksum\":{:.6}}}", times[times.len() / 2], times[0], kc * n, sum);
    }};
}

struct A { noreduce: bool, rows: bool, w: usize, h: usize, d: usize, k: usize, px: bool, pz: bool, fast: bool, threads: usize, reps: usize, dep: Vec<f64> }

fn main() {
    let v: Vec<String> = std::env::args().collect();
    let bytes = std::fs::read(&v[1]).unwrap();
    let dep: Vec<f64> = bytes.chunks_exact(8).map(|c| f64::from_le_bytes(c.try_into().unwrap())).collect();
    let p = |i: usize| v[i].parse::<usize>().unwrap();
    let a = A { noreduce: v.len() > 12 && v[12] == "noreduce", rows: v.len() > 12 && v[12] == "rows", w: p(2), h: p(3), d: p(4), k: p(5), px: v[6] == "1", pz: v[7] == "1", fast: v[9] == "1", threads: p(10), reps: p(11), dep };
    if v[8] == "f32" { run!(k32, f32, a) } else { run!(k64, f64, a) }
}
