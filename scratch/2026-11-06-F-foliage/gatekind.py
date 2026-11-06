"""gatekind.py RUNS KIND...: A4's crown-base gate (gate.py, unchanged) on one variant's runs only.
ROWS=limbs_rows_a4orig.py reproduces A4's own filter (recruits counted unless the kind is 'garden');
the default limbs_rows.py counts planted trees only."""
import os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
R = sys.argv[1]
ROWS = os.environ.get("ROWS", "limbs_rows.py")
for kind in sys.argv[2:]:
    g = os.path.join(R, f"gate_{kind}_{ROWS[:-3]}")
    os.makedirs(f"{g}/runs", exist_ok=True)
    for name in os.listdir(f"{R}/runs"):
        if name.split("-")[0] == kind and not os.path.exists(f"{g}/runs/{name}"):
            os.symlink(os.path.abspath(f"{R}/runs/{name}"), f"{g}/runs/{name}")
    shutil.copy(f"{HERE}/{ROWS}", f"{g}/limbs_rows.py")
    r = subprocess.run([sys.executable, "-I", f"{HERE}/gate.py", g], capture_output=True, text=True)
    print(f"== {kind} ({ROWS})\n{r.stdout}{r.stderr[-500:]}")
