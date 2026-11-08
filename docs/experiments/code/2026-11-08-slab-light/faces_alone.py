# Face alone: no foliage inside, stand top H; Q(y,z)=Σw·(τ if the ray exits a z face below H else 1),
# the sky of slab_sweep::sky (K=16, minElev 15°, p=1) averaged over 200 rotated seasons.
import math
G, S = 0.6180339887498949, 0.4142135623730951
def sky(f, a, K=16, me=15, p=1):
    lo = math.sin(math.radians(me)); out=[]
    for i in range(K):
        se = lo + (1-lo)*(i+f)/K; ce = math.sqrt(1-se*se); az = 2*math.pi*((i*G + a) % 1)
        out.append((ce*math.sin(az), se, se**p))
    t = sum(w for *_, w in out); return [(dz, dy, w/t) for dz, dy, w in out]
def q(y, z, H, D=64, tau=0.2, seasons=200):
    acc = 0
    for s in range(seasons):
        for dz, dy, w in sky((0.5+s*G) % 1, (s*S) % 1):
            zt = z + (H - y) * dz / dy
            acc += w * (tau if (zt < 0 or zt >= D) else 1)
    return acc/seasons
H = 116
for y in [1, 30, 60, 90, 110]:
    print(f"y={y:3}", " ".join(f"z{z}:{q(y,z,H):.2f}" for z in [0.5, 4, 8, 16, 32]))
print("fraction of sky (by weight) below 45° elev:", )
