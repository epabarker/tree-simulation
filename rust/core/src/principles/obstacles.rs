//! Obstacles: solid regions with no shade (ADR 0015; obstacles.ts). A shoot stops before a
//! metamer that would end inside one; at the start of a season and after mechanics, any branch
//! whose tip lies inside one is shed (a tree whose first metamer is inside dies).
//!
//! Params: world.obstacles, world.sides.

use super::c5::remove_branches;
use crate::params::Params;
use crate::tree::{Tree, ensure};

/// True when (x, y) lies inside one of the obstacles (x wrapped on a ring).
pub fn inside_obstacle(params: &Params, x: f64, y: f64) -> bool {
    let Some(obstacles) = &params.world.obstacles else {
        return false;
    };
    let w = params.world.width;
    for o in obstacles {
        if y < o.y || y >= o.y + o.height {
            continue;
        }
        let mut dx = x - o.x;
        if params.world.periodic {
            dx = ((dx % w) + w) % w;
        }
        if dx >= 0.0 && dx < o.width {
            return true;
        }
    }
    false
}

/// Sheds every branch whose tip lies inside an obstacle. Returns metamers removed.
pub fn clear_obstacles(tree: &mut Tree, params: &Params, carry: &mut [&mut Vec<f64>]) -> f64 {
    match &params.world.obstacles {
        Some(o) if !o.is_empty() => {}
        _ => return 0.0,
    }
    let nm = tree.m.len();
    if nm == 0 {
        return 0.0;
    }
    if inside_obstacle(params, tree.tip_x(0), tree.tip_y(0)) {
        tree.alive = false;
        return 0.0;
    }
    let mut dead = std::mem::take(&mut tree.scratch_u);
    ensure(&mut dead, nm.max(tree.b.len()));
    dead[..nm].fill(0);
    let mut any = false;
    for i in 1..nm {
        let p = tree.m.parent[i] as usize;
        if dead[p] != 0 {
            continue;
        }
        if inside_obstacle(params, tree.tip_x(i), tree.tip_y(i)) {
            dead[i] = 1;
            any = true;
        }
    }
    let removed = if any {
        remove_branches(tree, &mut dead, params, carry)
    } else {
        0.0
    };
    tree.scratch_u = dead;
    removed
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::params::Rect;

    fn ring(obstacles: Option<Vec<Rect>>) -> Params {
        let mut p = crate::testing::params("forest");
        p.world.obstacles = obstacles;
        p
    }

    #[test]
    fn tests_points_against_rectangles_wrapping_x_on_a_ring() {
        let o = Rect {
            x: 205.0,
            y: 10.0,
            width: 10.0,
            height: 5.0,
            shade: 0.0,
        };
        let p = ring(Some(vec![o]));
        assert!(inside_obstacle(&p, 207.0, 12.0));
        assert!(inside_obstacle(&p, 3.0, 12.0)); // wrapped past the seam
        assert!(!inside_obstacle(&p, 6.0, 12.0));
        assert!(!inside_obstacle(&p, 207.0, 15.0)); // the top edge is open
        assert!(!inside_obstacle(&ring(None), 60.0, 10.0)); // none
    }
}
