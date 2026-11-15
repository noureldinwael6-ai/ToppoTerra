# Climate data contract

`data/climate.json` is a single-provider snapshot. Logical observation identity is region + date + variable.

| Field | Representation |
| --- | --- |
| `version` | Source version and release date string. |
| `regions` | Region ID `AZ` or `CA`, display name, and NOAA state code label. No station identifiers because the data are statewide. |
| `variables` | Variable IDs `tavg` and `precip`, display labels, descriptions, units, preferred annual aggregation, anomaly keys, source units and NOAA source URLs. |
| `series.<region>[i].date` | Calendar month label `YYYY-MM-01`, in ascending order. |
| `year`, `month`, `days` | Calendar year, month 1–12, and Gregorian number of days. UI can weight monthly temperatures when deriving yearly values. |
| `tavg` | NOAA statewide monthly mean temperature, °C. |
| `precip` | NOAA statewide precipitation amount accumulated over the month, mm. |
| `tavgAnomaly`, `precipAnomaly` | Observations minus the state-specific baseline for that month, in the same units. |
| `baseline` | Inclusive reference years `[1981, 2010]`. |
| `normals.<region>[i]` | Reference `month` with mean `tavg` and mean monthly total `precip`. |
| `provenance` | Shared provider, product, source and attribution; spatial and temporal scope; period and release evidence; archive/store locations; processing steps, dataset-level quality and missingness, and original CSV checksum. Every row inherits this provenance. |

Source snapshot for each variable is `data/source-records/<state name>_<tavg or precip>_1981_2025.txt`. Source text uses a concatenated three-digit NOAA state code, three-digit element code and four-digit year, then twelve monthly values in published units. The app data carry six decimal places for deterministic units conversion. Display precision can be lower.
