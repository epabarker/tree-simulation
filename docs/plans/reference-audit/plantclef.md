# PlantCLEF / Pl@ntNet, and iNaturalist via GBIF (audit, 2026-11-03)

- **PlantCLEF 2014** (imageclef.org/2014/lifeclef/plant): resolves; public tars at lab.plantnet.org; "Creative
  Commons" (version not stated); 60k images, 7 view types; "Entire" 6,356 + 2,983 (page). Size not documented.
- **PlantCLEF 2015** (imageclef.org/node/185): 113,205 images; "Entire" 16,235 + 6,113 (**unverified** paraphrase).
  No metadata-only file for 2014/2015 (XML inside the image tars): per-species "Entire" counts **unverifiable**.
- **Pl@ntNet-300K v2** (https://zenodo.org/records/10419064, CC-BY 4.0): images 41.8 GB; `plantnet300K_metadata.csv`
  27.7 MB has an `organ` field, not a view type; whether "habit"/"entire" is an organ value: **unverified**.
- **GBIF counts** (run here; GB, with a still image): `api.gbif.org/v1/occurrence/search?datasetKey=<key>&mediaType=StillImage&country=GB&taxonKey=<k>&limit=0`, k from `/v1/species/match?name=…&strict=true`:

| species | Pl@ntNet obs. (7a3679ef…) | iNaturalist research-grade (50c9509d…) |
|---|---|---|
| Betula pendula | 188 | 2,613 |
| Fagus sylvatica | 856 | 11,533 |
| Quercus robur / petraea | 323 / 197 | 8,272 / 1,277 |
| Carpinus betulus | 357 | 4,563 |
| Acer campestre | 393 | 8,679 |
| Acer pseudoplatanus | 272 | 16,888 |
| Salix caprea | 251 | 2,339 |
| Sorbus aucuparia | 681 | 9,107 |
| Ilex aquifolium | 666 | 16,485 |
| Pinus sylvestris / Abies alba | 237 / 6 | 1,946 / 11 |

Datasets CC-BY 4.0; **per-image licences vary** (iNaturalist includes CC-BY-NC, all rights reserved). No view
tag: whole-tree shots need the document's CLIP filter; their share is unknown (likely a minority).
