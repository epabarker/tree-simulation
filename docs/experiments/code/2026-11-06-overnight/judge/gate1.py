from build_pairs import resolve_cfg, build_set
REJ = [("beech","round2-spindle",range(201,205)),("beech","round3-cone",range(205,209)),("birch","round2-spindle",range(209,213)),
       ("birch","round4-pagoda",range(213,217)),("hornbeam","round3-parasol",range(201,205)),("oak","round3-parasol",range(205,209))]
specs=[]
for sp,name,seeds in REJ:
    pick=resolve_cfg(f"shipped:{sp}"); rej=resolve_cfg(f"gallery:{sp}-{name}")
    for rg in ("lone","stand"):
        for sd in seeds: specs.append(dict(cfg1=pick,cfg2=rej,regime=rg,seed=sd,kind="pick-vs-reject"))
for sp in ("hornbeam","beech","oak","birch"):
    c1=resolve_cfg(f"shipped:{sp}"); c2=resolve_cfg(f"shipped:{sp}",seed_offset=100)
    for rg in ("lone","stand"):
        for sd in range(201,205): specs.append(dict(cfg1=c1,cfg2=c2,regime=rg,seed=sd,kind="self-vs-self"))
print(len(specs))
build_set("gate1",specs,batch=24)
