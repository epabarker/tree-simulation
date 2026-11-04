"""Pilot v2 (registration v3): how stable the registered weights and clusters are under resampling of the real trees
(the advisor's check before the registration commit; real trees only, nothing simulated; reported, never used).

    uv run --project analysis python -I docs/experiments/code/2026-11-04-level1-pilot-v2/weights_bootstrap.py

BioDiv's 53 trees resampled with replacement (numpy seed SEED, SETS times), each descriptor detrended by its registered
slope, then level1's own rules: the correlation, the thresholded weights at the registered r_crit, the clusters, and
the hold-out draw with the registered seed. Writes docs/experiments/fits/level1-pilot-v2/weights-bootstrap.json.
"""

import json
import warnings

import numpy as np

from treesim import level1 as l1
from treesim.sweep import REPO

SEED = 20261108
SETS = 2000


def main() -> None:
    reg = l1.load("beech")
    names = reg["correlation"]["names"]
    trees = l1.as_sim(l1.real_trees(reg["dataset"], reg["code"]))
    x = l1.detrended_columns(trees, names, reg["real"], reg["size_match"]["dbh"])
    rng = np.random.default_rng(SEED)
    weights, totals, same_clusters, same_held = [], [], 0, 0
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for _ in range(SETS):
            r, _ = l1.correlation(x[rng.integers(0, len(x), len(x))])
            w = l1.location_weights(np.nan_to_num(r), names, reg["weights"]["r_crit"])
            weights.append([w[k] for k in reg["fitted"]])
            totals.append(sum(w[k] for k in reg["fitted"]))
            cl = l1.clusters(np.nan_to_num(r), names)
            same_clusters += cl == reg["clusters"]["list"]
            same_held += l1.cluster_held_out(cl)[0] == reg["held_out"]
    q = np.quantile(np.array(weights), [0.05, 0.5, 0.95], axis=0)
    out = {"seed": SEED, "sets": SETS, "r_crit": reg["weights"]["r_crit"],
           "fitted": {k: {"registered": reg["location_weights"][k], "q05": q[0, i], "q50": q[1, i], "q95": q[2, i]}
                      for i, k in enumerate(reg["fitted"])},
           "fitted_total": {"registered": reg["weights"]["fitted_total"],
                            **dict(zip(("q05", "q50", "q95"), np.quantile(totals, [0.05, 0.5, 0.95]).tolist()))},
           "same_clusters_share": same_clusters / SETS, "same_held_out_share": same_held / SETS}
    path = REPO / "docs" / "experiments" / "fits" / "level1-pilot-v2" / "weights-bootstrap.json"
    path.write_text(json.dumps(out, indent=1, default=float) + "\n")
    print(json.dumps(out, indent=1, default=float))


if __name__ == "__main__":
    main()
