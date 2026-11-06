import json
json.dump({"world": {"world.faces": [1, 1]}, "*": {"o4.m0": 0}}, open("pt_f1m0.json", "w"))
json.dump({"world": {"world.faces": [1, 1]}, "*": {"r1.kShed": 2}}, open("pt_f1k2.json", "w"))
six = [2, 3, 6, 9, 10, 12]
L = []
for s in six:
    L.append(f"./fillF.sh R3 f1w075 0.75 0.25 28 28 {s} pt_faces1.json")
    L.append(f"./fillF.sh R3 f1w05 0.5 0.25 28 28 {s} pt_faces1.json")
    L.append(f"./fillF.sh R3 f1sp21 1 0.25 21 28 {s} pt_faces1.json")
    L.append(f"./fillF.sh R3 f1rec05 1 0.5 28 28 {s} pt_faces1.json")
    L.append(f"./fillF.sh R3 f1m0 1 0.25 28 28 {s} pt_f1m0.json")
    L.append(f"./fillF.sh R3 f1k2 1 0.25 28 28 {s} pt_f1k2.json")
for sp in ("beech", "hornbeam"):
    for s in (2, 3, 6):
        L.append(f"./standF.sh R3 {sp} {s}")
# faces1 on the other 14 of seeds 1-20, for the 20-seed crown-base gate (information)
for s in range(1, 21):
    if s not in six:
        L.append(f"./fillF.sh R3 faces1 1 0.25 28 28 {s} pt_faces1.json")
        L.append(f"./fillF.sh R3 narrow 1 0.25 28 28 {s}")
open("jobs3.txt", "w").write("\n".join(L) + "\n")
print(len(L))
