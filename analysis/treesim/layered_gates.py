"""Registered A4/N2 reductions; missing crown measurements remain visible."""
from math import ceil
from statistics import median
BANDS={'beech':(.10,.56),'hornbeam':(.09,.34)}

def crown_gate(runs,species):
    lo,hi=BANDS[species];legacy_n=legacy_pass=height_n=complete_pass=0;missing=0
    records=[]
    for run in runs:
        age={s:[r for r in run['crown'] if r['species']==species and r['season']==s] for s in (100,150)}
        values={s:[r['cbG'] for r in age[s] if r['cbG'] is not None] for s in age}
        med={s:median(v) if v else None for s,v in values.items()}
        height_eligible=all(age.values());measurable=all(values.values())
        gaps=sum(r['cbG'] is None for rs in age.values() for r in rs);missing+=gaps
        inside=measurable and all(lo<=v<=hi for v in med.values())
        legacy_n+=measurable;legacy_pass+=inside
        height_n+=height_eligible;complete_pass+=bool(height_eligible and not gaps and inside)
        records.append({'seed':run['seed'],'height_eligible':height_eligible,'measurable':measurable,'missing_trees':gaps,'median':med,'in_band':inside})
    def verdict(p,n):return {'pass':p,'N':n,'bar':ceil(.75*n),'ok':n>0 and p>=ceil(.75*n)}
    return {'legacy':verdict(legacy_pass,legacy_n),'height_complete':verdict(complete_pass,height_n),
            'missing_tree_snapshots':missing,'per_seed':records}

def birch_poles(rows,planted):
    tall=[r for r in rows if int(r['season'])==100 and int(r['alive'])==1 and r['species']=='birch'
          and int(r['tree'])>=planted and float(r['height'])>=40]
    hd=median(float(r['slenderness']) for r in tall) if tall else None
    return {'tall_recruits':len(tall),'median_hd':hd,'pass':hd is None or hd<=120}
