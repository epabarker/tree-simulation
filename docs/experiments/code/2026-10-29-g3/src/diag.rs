//! THROWAWAY (G3): where the slab sweep's error comes from. For each of the K = 16 directions
//! alone (weight 1), the sweep's transmission e^(−k G) at every 4th foliage cell against the exact
//! trace's, box mean and exact segments: mean |Δ|, mean signed Δ (negative: the sweep is darker),
//! by elevation.
use tree_core::light::slab_sweep::{Directions, SlabParams, SlabSweep, sky};

const W: usize = 210;
const H: usize = 130;
const D: usize = 64;

pub fn run(buds: &[[f64; 4]], tau: f64) {
    let p = SlabParams { k: 16, k_ext: 0.5, sky_exponent: 1.0, min_elevation: 15.0, c: 1.0, rotate: false, face_tau: [tau, tau], periodic_x: true };
    let all = sky(16, 15.0, 1.0, 1.0, 0.5, 0.0);
    for k in 0..16 {
        let one = Directions { x: vec![all.x[k]], y: vec![all.y[k]], z: vec![all.z[k]], w: vec![1.0] };
        let mut line = format!("k {k:2} elev {:4.1}° sx {:+5.2} sz {:+5.2}", all.y[k].asin().to_degrees(), all.x[k] / all.y[k], all.z[k] / all.y[k]);
        for (label, exact, shifts) in [("box", false, false), ("dda", true, false), ("shift", false, true)] {
            let mut s = SlabSweep::with_directions(W, H, D, p, one.clone());
            for b in buds {
                if b[3] > 0.0 {
                    s.deposit(b[0], b[1], b[2], b[3] as f32);
                }
            }
            s.exact_segments = exact;
            s.integer_shifts = shifts;
            s.compute(0.0);
            let (mut abs, mut signed, mut n) = (0.0, 0.0, 0usize);
            let mut i = 0usize;
            for y in 0..s.top() {
                for z in 0..D {
                    for x in 0..W {
                        let c = (y * D + z) * W + x;
                        if s.lad()[c] > 0.0 {
                            i += 1;
                            if i % 4 == 0 {
                                let d = s.q()[c] as f64 - s.exact_q(x, y, z, 0.01);
                                abs += d.abs();
                                signed += d;
                                n += 1;
                            }
                        }
                    }
                }
            }
            line += &format!(" | {label}: |Δ| {:.4} Δ {:+.4}", abs / n as f64, signed / n as f64);
        }
        println!("{line}");
    }
}
