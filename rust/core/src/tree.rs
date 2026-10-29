//! One tree's state (spec §5; `src/core/tree.ts`, `src/core/soa.ts`): a metamer table and a bud
//! table, structure-of-arrays, rows appended and compacted in order, so `parent[i] < i` and
//! `birth_id` ascends. Topology is a parent plus a slot (main 0, left 1, right 2).
//!
//! Columns are listed in the TypeScript schema's order: the state hash, checkpoints and the
//! bridge to the TypeScript core walk them in that order. Integer columns keep JavaScript's
//! typed-array semantics: a value stored into an `Int32Array` or `Uint8Array` wraps (`store_i32`,
//! `store_u8`).

use crate::math;

/// A column of a table, by element type (the typed arrays the TypeScript core uses).
pub enum Col<'a> {
    F64(&'a [f64]),
    I32(&'a [i32]),
    U8(&'a [u8]),
}

pub enum ColMut<'a> {
    F64(&'a mut Vec<f64>),
    I32(&'a mut Vec<i32>),
    U8(&'a mut Vec<u8>),
}

impl Col<'_> {
    /// The column's raw little-endian bytes, as the typed array's buffer holds them.
    pub fn bytes(&self) -> Vec<u8> {
        match self {
            Col::F64(v) => v.iter().flat_map(|x| x.to_le_bytes()).collect(),
            Col::I32(v) => v.iter().flat_map(|x| x.to_le_bytes()).collect(),
            Col::U8(v) => v.to_vec(),
        }
    }

    pub fn elem_size(&self) -> usize {
        match self {
            Col::F64(_) => 8,
            Col::I32(_) => 4,
            Col::U8(_) => 1,
        }
    }

    pub fn any_nonzero(&self) -> bool {
        match self {
            Col::F64(v) => v.iter().any(|x| *x != 0.0),
            Col::I32(v) => v.iter().any(|x| *x != 0),
            Col::U8(v) => v.iter().any(|x| *x != 0),
        }
    }
}

/// JavaScript's ToInt32 of a number, as an `Int32Array` store does.
pub fn store_i32(x: f64) -> i32 {
    crate::rng::to_int32(x) as i32
}

/// JavaScript's ToUint8, as a `Uint8Array` store does.
pub fn store_u8(x: f64) -> u8 {
    crate::rng::to_int32(x) as u8
}

macro_rules! table {
    ($(#[$m:meta])* $name:ident { $($col:ident : $ty:ident = $js:literal),* $(,)? }) => {
        $(#[$m])*
        #[derive(Clone, Default, Debug)]
        pub struct $name {
            len: usize,
            $(pub $col: Vec<$ty>,)*
        }

        impl $name {
            /// Column names in the TypeScript schema's order.
            pub const NAMES: &'static [&'static str] = &[$($js),*];

            pub fn len(&self) -> usize {
                self.len
            }

            pub fn is_empty(&self) -> bool {
                self.len == 0
            }

            /// Appends a zeroed row and returns its index.
            pub fn add(&mut self) -> usize {
                $(self.$col.push(Default::default());)*
                self.len += 1;
                self.len - 1
            }

            /// Sets the row count, zero-filling new rows (checkpoints, the bridge).
            pub fn set_len(&mut self, n: usize) {
                $(self.$col.resize(n, Default::default());)*
                self.len = n;
            }

            /// Empties the table and frees its memory (`Table.reset`).
            pub fn reset(&mut self) {
                $(self.$col = Vec::new();)*
                self.len = 0;
            }

            /// Removes rows whose `keep` flag is 0, keeping the order of the others. Returns
            /// old index → new index, −1 for removed rows.
            pub fn compact(&mut self, keep: &[u8]) -> Vec<i32> {
                let n = self.len;
                let mut map = vec![0i32; n];
                let mut j = 0usize;
                for i in 0..n {
                    if keep[i] != 0 {
                        map[i] = j as i32;
                        j += 1;
                    } else {
                        map[i] = -1;
                    }
                }
                if j == n {
                    return map;
                }
                $(
                    for i in 0..n {
                        let t = map[i];
                        if t >= 0 {
                            self.$col[t as usize] = self.$col[i];
                        }
                    }
                    self.$col.truncate(j);
                )*
                self.len = j;
                map
            }

            pub fn columns(&self) -> Vec<Col<'_>> {
                vec![$(table!(@col $ty, &self.$col[..self.len])),*]
            }

            pub fn columns_mut(&mut self) -> Vec<ColMut<'_>> {
                vec![$(table!(@colmut $ty, &mut self.$col)),*]
            }
        }
    };
    (@col f64, $e:expr) => { Col::F64($e) };
    (@col i32, $e:expr) => { Col::I32($e) };
    (@col u8, $e:expr) => { Col::U8($e) };
    (@colmut f64, $e:expr) => { ColMut::F64($e) };
    (@colmut i32, $e:expr) => { ColMut::I32($e) };
    (@colmut u8, $e:expr) => { ColMut::U8($e) };
}

table!(
    /// METAMER_SCHEMA (tree.ts).
    Metamers {
        birth_id: i32 = "birthId",
        parent: i32 = "parent",
        slot: u8 = "slot",
        axis: i32 = "axis",
        axis_node: i32 = "axisNode",
        order: u8 = "order",
        base_x: f64 = "baseX",
        base_y: f64 = "baseY",
        angle: f64 = "angle",
        length: f64 = "length",
        radius: f64 = "radius",
        scar_sum_n: f64 = "scarSumN",
        birth_season: i32 = "birthSeason",
        q_sum: f64 = "qSum",
        n_sum: i32 = "nSum",
        v_in: f64 = "vIn",
        stress_wood: f64 = "stressWood",
        moment: f64 = "moment",
        pa_shift: u8 = "paShift",
    }
);

table!(
    /// BUD_SCHEMA (tree.ts).
    Buds {
        birth_id: i32 = "birthId",
        metamer: i32 = "metamer",
        slot: u8 = "slot",
        state: u8 = "state",
        age: i32 = "age",
        order: u8 = "order",
        angle: f64 = "angle",
        q: f64 = "q",
        vx: f64 = "vx",
        vy: f64 = "vy",
        v: f64 = "v",
    }
);

/// Slots at a node.
pub mod slot {
    pub const MAIN: u8 = 0;
    pub const LEFT: u8 = 1;
    pub const RIGHT: u8 = 2;
}

/// Bud fates, stored in tables and snapshots: append, never renumber.
pub mod bud {
    pub const GONE: u8 = 0;
    pub const ACTIVE: u8 = 1;
    pub const DORMANT: u8 = 2;
    pub const TERMINATED: u8 = 3;
    pub const ABORTED: u8 = 4;
    pub const SHORT_SHOOT: u8 = 5;
}

/// The tree's scalar fields in tree.ts's declaration order (checkpoints carry them by name).
pub const SCALARS: &[&str] = &[
    "alive",
    "discarded",
    "sown",
    "species",
    "age",
    "nextMetamerId",
    "nextBudId",
    "qBase",
    "vBase",
    "shedCount",
    "meanBudQ",
    "qTop",
    "production",
    "maintenance",
    "reserve",
    "starved",
    "reproduction",
    "seedPool",
    "seeds",
    "abraded",
    "released",
    "epicormic",
    "aborted",
    "broken",
];

/// The numeric scalars (every SCALARS entry but the three flags and the species).
pub const NUMBERS: &[&str] = &[
    "age",
    "nextMetamerId",
    "nextBudId",
    "qBase",
    "vBase",
    "shedCount",
    "meanBudQ",
    "qTop",
    "production",
    "maintenance",
    "reserve",
    "starved",
    "reproduction",
    "seedPool",
    "seeds",
    "abraded",
    "released",
    "epicormic",
    "aborted",
    "broken",
];

#[derive(Clone, Debug, Default)]
pub struct Tree {
    pub id: usize,
    pub root_x: f64,
    pub alive: bool,
    /// A dead tree whose tables were freed (`World::discard_dead`).
    pub discarded: bool,
    /// Sown by a visitor (a plantTree event).
    pub sown: bool,
    /// Its species, a key of the params' species table; "" for the world's own params.
    pub species: String,
    // Numbers are doubles, as in JavaScript: seasons, counts and ids all are.
    pub age: f64,
    pub next_metamer_id: f64,
    pub next_bud_id: f64,
    pub m: Metamers,
    pub b: Buds,
    /// Per-season scratch by row index, never compacted (except `stress`, with R3 breakage).
    pub q_slot: Vec<f64>,
    pub v_slot: Vec<f64>,
    pub scratch_f: Vec<f64>,
    pub scratch_u: Vec<u8>,
    pub q_base: f64,
    pub v_base: f64,
    pub shed_count: f64,
    pub mean_bud_q: f64,
    pub q_top: f64,
    pub production: f64,
    pub maintenance: f64,
    pub reserve: f64,
    pub starved: f64,
    pub reproduction: f64,
    pub seed_pool: f64,
    pub seeds: f64,
    pub abraded: f64,
    pub p_sum: Vec<f64>,
    pub m_sum: Vec<f64>,
    pub path_len: Vec<f64>,
    pub prev_radius: Vec<f64>,
    pub load_w: Vec<f64>,
    pub load_s: Vec<f64>,
    pub stress: Vec<f64>,
    pub node_shade: Vec<f64>,
    pub released: f64,
    pub epicormic: f64,
    pub aborted: f64,
    pub broken: f64,
    /// Rows that took part in this season's passes (set before growth; C5 sheds among them).
    pub evaluated: usize,
}

/// Grows a scratch array to at least `n` elements (contents beyond the rows a pass writes are
/// never read, so unlike `ensureFloat64` nothing needs discarding).
pub fn ensure<T: Default + Clone>(v: &mut Vec<T>, n: usize) {
    if v.len() < n {
        v.resize(n, T::default());
    }
}

impl Tree {
    pub fn new(id: usize, root_x: f64) -> Tree {
        Tree {
            id,
            root_x,
            alive: true,
            ..Tree::default()
        }
    }

    /// Sizes every per-metamer scratch array for the rows now in the table (`ensureScratch`).
    pub fn ensure_scratch(&mut self) {
        let n = self.m.len();
        ensure(&mut self.q_slot, 3 * n);
        ensure(&mut self.v_slot, 3 * n);
        ensure(&mut self.scratch_f, n);
        ensure(&mut self.scratch_u, n.max(self.b.len()));
        for v in [
            &mut self.p_sum,
            &mut self.m_sum,
            &mut self.path_len,
            &mut self.prev_radius,
            &mut self.load_w,
            &mut self.load_s,
            &mut self.stress,
            &mut self.node_shade,
        ] {
            ensure(v, n);
        }
    }

    /// Frees a dead tree's tables and scratch (`discard`).
    pub fn discard(&mut self) {
        self.m.reset();
        self.b.reset();
        for v in [
            &mut self.q_slot,
            &mut self.v_slot,
            &mut self.scratch_f,
            &mut self.p_sum,
            &mut self.m_sum,
            &mut self.path_len,
            &mut self.prev_radius,
            &mut self.load_w,
            &mut self.load_s,
            &mut self.stress,
            &mut self.node_shade,
        ] {
            *v = Vec::new();
        }
        self.scratch_u = Vec::new();
        self.discarded = true;
    }

    pub fn tip_x(&self, i: usize) -> f64 {
        self.m.base_x[i] + self.m.length[i] * math::cos(self.m.angle[i])
    }

    pub fn tip_y(&self, i: usize) -> f64 {
        self.m.base_y[i] + self.m.length[i] * math::sin(self.m.angle[i])
    }

    /// A numeric scalar by its TypeScript name.
    pub fn number(&self, name: &str) -> f64 {
        match name {
            "age" => self.age,
            "nextMetamerId" => self.next_metamer_id,
            "nextBudId" => self.next_bud_id,
            "qBase" => self.q_base,
            "vBase" => self.v_base,
            "shedCount" => self.shed_count,
            "meanBudQ" => self.mean_bud_q,
            "qTop" => self.q_top,
            "production" => self.production,
            "maintenance" => self.maintenance,
            "reserve" => self.reserve,
            "starved" => self.starved,
            "reproduction" => self.reproduction,
            "seedPool" => self.seed_pool,
            "seeds" => self.seeds,
            "abraded" => self.abraded,
            "released" => self.released,
            "epicormic" => self.epicormic,
            "aborted" => self.aborted,
            "broken" => self.broken,
            _ => f64::NAN,
        }
    }

    pub fn set_number(&mut self, name: &str, x: f64) {
        let slot = match name {
            "age" => &mut self.age,
            "nextMetamerId" => &mut self.next_metamer_id,
            "nextBudId" => &mut self.next_bud_id,
            "qBase" => &mut self.q_base,
            "vBase" => &mut self.v_base,
            "shedCount" => &mut self.shed_count,
            "meanBudQ" => &mut self.mean_bud_q,
            "qTop" => &mut self.q_top,
            "production" => &mut self.production,
            "maintenance" => &mut self.maintenance,
            "reserve" => &mut self.reserve,
            "starved" => &mut self.starved,
            "reproduction" => &mut self.reproduction,
            "seedPool" => &mut self.seed_pool,
            "seeds" => &mut self.seeds,
            "abraded" => &mut self.abraded,
            "released" => &mut self.released,
            "epicormic" => &mut self.epicormic,
            "aborted" => &mut self.aborted,
            "broken" => &mut self.broken,
            _ => return,
        };
        *slot = x;
    }

    /// The per-metamer scratch arrays, by TypeScript name (the bridge carries them across).
    pub fn scratch_mut(&mut self) -> [(&'static str, &mut Vec<f64>); 11] {
        [
            ("qSlot", &mut self.q_slot),
            ("vSlot", &mut self.v_slot),
            ("scratchF", &mut self.scratch_f),
            ("pSum", &mut self.p_sum),
            ("mSum", &mut self.m_sum),
            ("pathLen", &mut self.path_len),
            ("prevRadius", &mut self.prev_radius),
            ("loadW", &mut self.load_w),
            ("loadS", &mut self.load_s),
            ("stress", &mut self.stress),
            ("nodeShade", &mut self.node_shade),
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compact_keeps_order_and_maps_indices() {
        let mut t = Buds::default();
        for i in 0..5 {
            let r = t.add();
            t.birth_id[r] = i;
        }
        let map = t.compact(&[1, 0, 1, 0, 1]);
        assert_eq!(map, vec![0, -1, 1, -1, 2]);
        assert_eq!(t.len(), 3);
        assert_eq!(t.birth_id, vec![0, 2, 4]);
    }

    #[test]
    fn stores_wrap_as_typed_arrays_do() {
        assert_eq!(store_u8(256.0), 0);
        assert_eq!(store_u8(-1.0), 255);
        assert_eq!(store_i32(2147483648.0), i32::MIN);
        assert_eq!(store_i32(3.9), 3);
    }
}
