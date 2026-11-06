# TreeML-Data (Munich street trees), Yazdi et al. 2024 (audit, 2026-11-03)

- **Links:** article via PMC10767077 (Nature's page is a login wall); Figshare records via api.figshare.com.
- **Licence: CC0** (Figshare records), not "check data record" as the document says.
- **Size:** `Dataset_pointcloud.zip` 60.2 GB; `Dataset_QSM.zip` 4.8 GB (cylinder CSVs in `optcsv/`: branchID,
  branchOrder, cylinderID, parentCylID, start, axis, length, radius, addedVirtual); `TreeML_Data_QSM.csv`
  25.7 MB; `231025_TreeML_Dataset.csv` 24.7 MB (downloaded: 3,755 rows × 1,169 columns: DBH, height, crown
  start height, max crown diameter, crown radii at 5° steps and at 2 m height steps).
- **Regime:** **urban street trees** (scanned 9–16 Jan 2023, leaf-off). Pruning and street constraints: not
  documented, so "open-grown" is the document's reading; street trees are crown-lifted and often pruned.
- **Data quality:** 101 of 3,755 trees have DBH > 1.5 m (up to 51.9 m): a unit or segmentation error. Filter.

Garden species (`botanical_name`; the rest is lime, Norway maple, plane, robinia, poplar, horse chestnut):

| species | n | DBH > 150 cm (bad) | H m | crown Ø median / max m |
|---|---|---|---|---|
| Carpinus betulus | 41 | 4 | 6.2–22.0 | 8.0 / 16.1 |
| Acer pseudoplatanus | 33 | 2 | 6.7–21.8 | 10.3 / 16.4 |
| Fagus sylvatica | 14 | 3 | 6.9–25.3 | 12.2 / 19.0 |
| Betula pendula | 12 | 2 | 9.4–20.7 | 9.7 / 13.4 |
| Acer campestre | 6 | 1 | 7.6–18.7 | 7.7 / 15.1 |
| Quercus species | 4 | 0 | 15.1–20.5 | 12.5 / 13.3 |

No rowan (*Sorbus aria* 26 is whitebeam), holly, willow, pine, fir. **The open-grown regime is thin for every
garden species** (≤ 41 trees, pruned street form). The document's step 6 rests on this dataset.
