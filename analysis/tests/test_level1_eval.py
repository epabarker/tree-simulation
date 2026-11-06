"""Level 1's evaluator (analysis/experiments/level1_eval.ts) against the hashed ones: (a) its reply, less its timing
and its `level1` block, equals cli/fit-eval.ts's on the same request, so stepping the stand ten seasons at a time grows
the trees runStand grows; (b) its dump at season 150 with no assign equals the stand trees of
`node cli/dump-trees.ts --gate-c beech 1`, byte for byte. Runs the WASM core in Node (≈ 1 min); skipped without it.
Not in `npm run check`:  uv run --project analysis --with pytest python -I -m pytest analysis/tests -q"""

import json
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
pytestmark = pytest.mark.skipif(shutil.which("node") is None or not (ROOT / "src/wasm/pkg/core_bg.wasm").exists(),
                                reason="needs Node and the WASM build")
ASSIGN = ROOT / "docs" / "experiments" / "fits" / "level0" / "beech.json"


def ask(script: str, request: dict) -> dict:
    p = subprocess.run(["node", script], cwd=ROOT, input=json.dumps(request) + "\n", capture_output=True, text=True,
                       check=True)
    return json.loads(p.stdout)


def test_reply_and_dump_match_the_hashed_evaluators(tmp_path):
    assign = json.loads(ASSIGN.read_text())["fit"]["assign"]
    request = {"id": 1, "species": "beech", "assign": assign, "seeds": [1], "trials": ["lone", "stand150", "shade"]}
    level1 = {**request, "level1": {"scratch": str(tmp_path / "a"), "key": "t", "dumpSeasons": [70]}}
    dump_req = {"id": 1, "species": "beech", "seeds": [1], "trials": ["stand150"],
                "level1": {"scratch": str(tmp_path / "b"), "key": "t", "dumpSeasons": [150]}}
    gate_c = tmp_path / "gate-c.json"
    with ThreadPoolExecutor(4) as ex:
        ref = ex.submit(ask, "cli/fit-eval.ts", request)
        ours = ex.submit(ask, "analysis/experiments/level1_eval.ts", level1)
        dumped = ex.submit(ask, "analysis/experiments/level1_eval.ts", dump_req)
        hashed = ex.submit(subprocess.run, ["node", "cli/dump-trees.ts", "--gate-c", "beech", "1", str(gate_c)],
                           cwd=ROOT, check=True, capture_output=True)
        ref, ours, dumped = ref.result(), ours.result(), dumped.result()
        hashed.result()
    # (a)
    assert "error" not in ours, ours.get("error")
    block = ours.pop("level1")
    for r in (ref, ours):
        r.pop("ms")
    assert json.dumps(ours) == json.dumps(ref)
    assert [s["season"] for s in block[0]["allometry"]] == list(range(50, 151, 10))
    assert Path(block[0]["dumps"]["70"]).exists()
    # (b)
    path = dumped["level1"][0]["dumps"]["150"]
    ours_trees = json.loads(Path(path).read_text())["trees"]
    theirs = [t for t in json.loads(gate_c.read_text())["trees"] if t["trial"] == "stand"]
    assert len(ours_trees) == len(theirs) == 4
    assert [json.dumps(t) for t in ours_trees] == [json.dumps(t) for t in theirs]
