import json
json.dump({"world": {"world.faces": [1, 1]}, "*": {"r1.kShed": 3}}, open("pt_f1k3.json", "w"))
six = [2, 3, 6, 9, 10, 12]
L = []
for s in six:
    L.append(f"./fillF.sh R4 f1w09 0.9 0.25 28 28 {s} pt_faces1.json")
    L.append(f"./fillF.sh R4 f1k3 1 0.25 28 28 {s} pt_f1k3.json")
    L.append(f"./fillF.sh R4 f1k2w09 0.9 0.25 28 28 {s} pt_f1k2.json")
    L.append(f"./fillF.sh R4 f1w125 1.25 0.25 28 28 {s} pt_faces1.json")
open("jobs4.txt", "w").write("\n".join(L) + "\n")
print(len(L))
