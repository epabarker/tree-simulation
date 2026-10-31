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
