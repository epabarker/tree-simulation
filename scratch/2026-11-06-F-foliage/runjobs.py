"""runjobs.py JOBS.txt [N=4]: run each line as a shell command, N at a time, in this folder."""
import os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
lines = [l.strip() for l in open(sys.argv[1]) if l.strip() and not l.startswith("#")]
n = int(sys.argv[2]) if len(sys.argv) > 2 else 4


def run(cmd):
    t = time.time()
    r = subprocess.run(cmd, shell=True, cwd=HERE, capture_output=True, text=True)
    print(f"{time.time() - t:6.0f}s rc={r.returncode} {cmd} {r.stdout[-300:]}{r.stderr[-300:]}", flush=True)


print(time.ctime(), flush=True)
with ThreadPoolExecutor(n) as ex:
    list(ex.map(run, lines))
print(time.ctime(), "done", flush=True)
