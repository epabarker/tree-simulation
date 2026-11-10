# Frozen checkpoint v3 fixture

`checkpoint-v3.bin` was written before the v4 implementation (issue #125, C5's `kRel` counter),
by the native writer at `spec/111-feature-playbook` **4440e48**. It is `checkpoint.rs`'s test
world `carbon_world()` (the C5 test tree, R1 carbon shedding with `kShed` 3, C5 `Trel` 0, `g` 0)
after two deficit seasons, so its lateral rows carry a deficit streak of 2: `[0, 0, 2, 2]`.
Version 3 has the deficit column and no relative-test (`dark`) counter.

- Uncompressed bytes: 4544
- Season: 6
- State hash: `46bcca53`
- SHA-256: `692c103150319712e4d44f98875886526cac5af4aff07be823e3facd85bb43a1`

Retain these original bytes. The native test requires v3 loading with its deficits kept, the
missing `dark` counters at zero, and migration to v4.
