#%%
import json
import os

#%%
with open("./data/people2desks.json", "r") as p2d:
    d = json.loads(p2d.read())

#%%
niceFormat = []
for k in d:
    name = k
    data = d[k]
    niceFormat.append(
        {
            "FirstName": name.split(" ")[0],
            "LastName": " ".join(name.split(" ")[1:]),
            "Studio": "Sydney",
            "x": "0",
            "y": "0",
            "placed": False,
            "onMap": True,
            "team": "kabaddi",
            "HumanPlacement": data["human"],
            "ArbitraryPlacement": data["random"],
        }
    )


#%%
print(niceFormat[0])
#%%
with open("./data/peopleData.json", "w") as nf:
    json.dump(niceFormat, nf, indent=2)

#%%
