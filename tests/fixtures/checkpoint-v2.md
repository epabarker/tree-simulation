# Frozen checkpoint v2 fixture

`checkpoint-v2.bin` was written before the v3 implementation, with the built WASM
writer from merged `3d-port` **8995f73**, after step-2 registration **7c66114**.
It uses `mergeParams(presetParams("skyTree", 1), {r1: {enabled: true, shed: "carbon", kShed: 3}})`
and grows three seasons before `RustWorld.save()`. Version 2 omits deficit history.

- Uncompressed bytes: 16584
- Season: 3
- State hash: `f46fef77`
- SHA-256: `1a46606b00bfbeeb92629bbe4ca738725b2884d0d793dfdca6f35d8ce88f30c3`

Retain these original bytes. Native and WASM tests require v2 loading, zero missing
counters, and migration to v3. The separate garden-0.14.0 fixture covers shipped v1.
