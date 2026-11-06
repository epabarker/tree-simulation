import json,sys
p=json.load(open(sys.argv[1]))
for sp,b in p["species"].items():
    c1=b.get("c1",{}); c4=b.get("c4",{})
    if "shootLengthSD" in c1 or "betaSD" in c1 or "budBreak" in c1 or "axisSD" in c4:
        c1["shootLengthSD"]=0; c1["betaSD"]=0; c1.pop("budBreak",None); b["c1"]=c1
        c4["axisSD"]=0; b["c4"]=c4
json.dump(p,open(sys.argv[1],"w"))
