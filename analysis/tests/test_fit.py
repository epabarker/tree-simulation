"""Unit tests of the fit's derived traits (analysis/treesim/fit.py). Not in `npm run check` (CI has
no Python):  uv run --project analysis --with pytest pytest analysis/tests -q"""

import math

from treesim.fit import NO_SURVIVAL_LIGHT, STARVE_SEASONS, loss, scaled, seed_traits, survival_light, Spec


def shade_reply(lights: dict[str, float], seasons: dict[str, int]) -> dict:
    return {"shade": {r: [s == 30] for r, s in seasons.items()}, "survived": {r: [s] for r, s in seasons.items()},
            "light": lights}


LIGHTS = {"1": 0.30, "1.2": 0.263, "1.5": 0.217, "1.75": 0.185, "2": 0.158, "2.6": 0.109, "3.3": 0.071}


def test_a_clean_step_reads_the_lightest_roof_it_dies_under_not_the_starvation_timer():
    # Round 3's birch: alive under every roof down to 18.5%, dead at the starvation timer below.
    seasons = {r: (30 if LIGHTS[r] >= 0.185 else STARVE_SEASONS) for r in LIGHTS}
    continuous, step = survival_light(shade_reply(LIGHTS, seasons))
    assert step == 0.185
    assert math.isclose(continuous, 0.185, rel_tol=1e-9)


def test_a_late_death_moves_the_reading_toward_that_roof():
    seasons = {r: (30 if LIGHTS[r] >= 0.185 else STARVE_SEASONS) for r in LIGHTS}
    seasons["2"] = STARVE_SEASONS + 13  # half the seasons past the timer under 15.8%
    continuous, _ = survival_light(shade_reply(LIGHTS, seasons))
    assert math.isclose(continuous, math.sqrt(0.185 * 0.158), rel_tol=1e-9)


def test_dying_under_every_roof_reads_the_no_survival_light():
    continuous, step = survival_light(shade_reply(LIGHTS, {r: STARVE_SEASONS for r in LIGHTS}))
    assert math.isclose(continuous, NO_SURVIVAL_LIGHT) and step == NO_SURVIVAL_LIGHT


def test_a_profile_trait_weighs_as_one_and_flattens_from_the_reply():
    t = {"name": "lone.profile", "profile": [1.0] * 10, "band": 0.1, "weight": 0.5, "kind": "described"}
    traits = seed_traits({"lone": [{"profile": [0.9] * 10, "alive": True}]})
    assert traits["lone.profile.3"] == 0.9
    assert all(math.isclose(z, -1.0) for z in scaled(t, traits))
    # Every band one band out costs what one scalar trait one band out does: weight × 1².
    assert math.isclose(loss(Spec("x", [t], []), traits), 0.5)


def test_the_form_rides_on_every_candidate_like_fixed_and_is_never_searched():
    from treesim.fit import decode, load_spec

    spec = load_spec("beech")
    a = decode(spec, [0.5] * len(spec.params))
    assert a["r2.kappa"] == spec.form["r2.kappa"] and a["r1.hydraulic"] == "hyperbolic"
    assert not any(p["path"].startswith("r2.levels") for p in spec.params)
    assert "lone.profile" not in [t["name"] for t in spec.traits]


def test_reports_are_read_at_60_and_100_and_never_scored():
    from treesim.fit import report_names

    r = [{"name": "lone.spread", "target": 0.6, "band": 0.2, "kind": "described"},
         {"name": "lone.profile", "profile": [1.0] * 10, "band": 0.1, "kind": "described"},
         {"name": "stand.crownRatio100", "kind": "measured"}]
    spec = Spec("x", [], [], reports=r)
    names = report_names(spec)
    assert "lone.spread" in names and "lone.spread100" in names and "lone.profile100.9" in names
    assert "stand.crownRatio100" in names and "stand.crownRatio100100" not in names
    # Far off every report, and the loss does not see it.
    assert loss(spec, {"lone.spread": 9.0, "lone.spread100": 9.0}) == 0.0


def test_the_gallery_distance_weighs_the_profile_as_one_and_separates_beyond_the_noise():
    from treesim.gallery import SCALES, distance, noise

    a = {"spread": 0.6, **{f"profile.{k}": 0.5 for k in range(10)}}
    b = {"spread": 0.8, **{f"profile.{k}": 0.6 for k in range(10)}}
    # spread one scale apart (0.2), every band one scale apart (0.1): RMS 1.
    assert math.isclose(distance(a, b, SCALES), 1.0)
    assert distance(a, a, SCALES) == 0.0
    sd = {"spread": 0.2 * math.sqrt(1.5), **{f"profile.{k}": 0.1 * math.sqrt(1.5) for k in range(10)}}
    # Seed sd √1.5 scales on both sides, three seeds: the difference's noise is one scale.
    assert math.isclose(noise(sd, sd, 3, SCALES), 1.0)
