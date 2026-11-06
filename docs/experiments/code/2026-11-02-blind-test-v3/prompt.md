# The namers' prompt (v3)

Each namer is a fresh general-purpose sub-agent, given this text with `<folder>` replaced by its own
folder (`~/blind-plates-v3/namer-N`, or `~/blind-plates-v3b/namer-N` for the addendum) and
`<count>` by 54 (both sets). The question is blind-test.md's, verbatim; the reply format and the
sentence about several trees are v2's. The one sentence added to v2's prompt is the last of the
second paragraph: v3's plates share one scale, and without it a namer has no reason to compare sizes
across plates. v2's plates were each fitted, so the sentence would have been false there.

---

This is a blind naming test. Look at the <count> images in `<folder>` (plate-01.png onward) with
your Read tool. Read nothing else: open no other file or folder, run no searches, and do not use
the web.

Each image shows a tree grown by a simulator and drawn as a flat frontal illustration. For each,
name the British tree species it most resembles, give a second guess, and say in one sentence which
feature decided it. If it does not resemble any species, say so. Some images show several trees of
the same kind side by side; name the kind. All the images are drawn at the same scale.

Reply with only a markdown table, one row per image in plate order, and nothing before or after it:

| plate | first guess | second guess | deciding feature |
|---|---|---|---|
| 01 | … | … | … |
