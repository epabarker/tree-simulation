"""N3's original thickest-path kink metric, recovered from night2 oakan.py.
Root0 then maximum-radius child, first child wins ties; strict >20 degrees.
Head vectors are not renormalised, preserving the original instrument.
"""
from collections import defaultdict
import math

def stem_kinks(tree, threshold=20.0):
    m=tree['m']; kids=defaultdict(list)
    for i,p in enumerate(m['parent']):
        if p is not None and p>=0: kids[p].append(i)
    i=0; path=[0]
    while kids.get(i):
        i=max(kids[i],key=lambda j:m['radius'][j] or 0.0);path.append(i)
    count=0
    for a,b in zip(path,path[1:]):
        dot=sum(m[k][a]*m[k][b] for k in ('hx','hy','hz'))
        count+=math.degrees(math.acos(max(-1.0,min(1.0,dot))))>threshold
    return count,len(path)
