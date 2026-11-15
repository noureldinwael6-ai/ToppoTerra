# Data provenance

## Included NOAA climate series

The browser loads the bundled `data/climate.json` from **NOAA NCEI nClimDiv**, the U.S. Climate Divisional Database. Arizona is NOAA state 002 and California is 004. Each has 540 consecutive monthly records from January 1981 through December 2025, with paired statewide monthly mean near-surface air temperature (TAVG) and precipitation totals (PCPN). nClimDiv summarizes interpolated surface station observations. Each statewide row represents a spatial aggregate without a station ID. The [NOAA dataset metadata](https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/gov.noaa.ncdc%3AC00005/html) documents the product and interpolation.

The source workspace provides:

| Input | Use |
| --- | --- |
| `NASA_SpaceApps_Climate_Data_Complete_Package.zip` | Four NOAA text transcriptions under `Earth_Trend_Data/source_records/` and their supplied metadata. v1.0.0 release date 2026-11-05 is recorded in the manifest and filenames. Credit NOAA NCEI nClimDiv v1.0.0. |
| `NASA_SpaceApps_AZ_CA_1981_2025_READY.csv` and the `(1)` copy | Both match the package's READY CSV SHA-256 `ac0278a00a71fa561e9304a587a17463e71f27646f9a2a6bb2ee772a12f0c37f`. Used as a cross-check, including converted values and baseline columns. |
| `file new.csv` and `GHCND_USC00020060_2010-1-1-merged.pdf` | Station/county normals reference. The `2010` key is a reference label, and some keys recur. Daily precipitation column entries can be probabilities while monthly/seasonal entries can be totals. Kept outside the analysis. |
| `NASA_SpaceApps_NASA_Storm_Weather_Addon.zip` | Duplicated NOAA series, scripts for NASA POWER hourly/GEOS-FP retrieval, and `README_NO_NASA_VALUES_YET.txt`. No NASA observations or forecasts bundled. |
| `Earth_Trend_Data/optional_fetch_nasa_power_point.py` in the climate package | Proposed sample grid-point retrieval for Phoenix and Sacramento. No sample values bundled. |

The source filename family is `climdiv-tmpcst-v1.0.0-20261105` and `climdiv-pcpnst-v1.0.0-20261105`. NOAA maintains a rolling [release directory](https://www.ncei.noaa.gov/monitoring-content/data/us/climdiv/monthly/current/). The exact release files were unavailable to the web tool during this build. Traceability rests on the supplied source excerpts and manifest cross-check.

## Rebuild

From the **ToppoTerra Codex** root, run `node scripts/prepare-climate.mjs`. It uses four bundled NOAA text excerpts totaling approximately 14 KB. No source workspace, remote download, Python, or packages are needed. Optionally pass the absolute path of the supplied READY CSV as the only argument to verify its fingerprint and compare all 1,080 rows. Run `node --test tests/data.test.mjs` to validate units, state mapping, calendar and cached output.

The script checks state and variable codes, consecutive years, 12 fields per year and finite plausible values. Input errors stop generation. It converts °F to °C using (°F − 32) × 5/9 and inches to mm using inches × 25.4. Each 1981–2010 state and calendar-month normal averages the 30 records for that month and state. Monthly anomaly equals the observation minus that normal. Output rounding occurs after processing. Zero precipitation is valid. No gaps or missing values occur in the selected record and no interpolation, station-level pooling or cross-product joins were needed. Dates are Gregorian monthly labels, with the first day representing the whole month. February uses its correct leap-year length.

## NASA mission record

The newer legacy application under `NASA space apps/New folder` contains acquired NASA values and source extracts. **Nile Delta rainfall** uses its NASA GPM IMERG monthly accumulated precipitation. The 1998–2007 extract contains 120 complete UTC calendar months and 176 fixed 0.1° cells per month. The bounding box covers 30.50°–31.60° N and 30.50°–32.10° E as cell footprints, including coastal land and water. The NASA view and NOAA statewide views use separate geographic scopes, sources and periods.

The archived ERDDAP CSV units header and distributor metadata identify monthly accumulated depth in mm. Use the distribution values directly. NASA’s native monthly HDF field is a precipitation rate; the archive does not specify the distributor’s upstream conversion procedure or exact export revision. For a regular equal-angular grid, cosine latitude weights are proportional to surface area. Recompute weighted monthly depth from all 176 cells and sum complete calendar years. The geographic grid view shows each cell’s long-run mean monthly accumulation rather than an area-wide trend. The ten complete years provide a descriptive fit, below the app’s 20-year conventional inference threshold. [NASA GPM IMERG product](https://gpm.nasa.gov/data/imerg) · [USF ERDDAP accumulation metadata](https://erddap.marine.usf.edu/erddap/griddap/IMERG_monthly_global_precip.html)

Reproduce the product with `node scripts/prepare-research.mjs`. The 84 KB gzip in `data/source-records/` preserves the audited raw CSV bytes with SHA-256 `66f3a19f388bc78201e4e12782096bb79614b538ac0340b4c22367911183ce75`. `data/research.json` is the derived static bundle. See [Research benchmark](RESEARCH_BENCHMARK.md) for source details, comparison of archived equal-cell versus new area-weighted aggregation, and validation boundaries.

The same legacy folder has a NASA POWER MERRA-2 monthly precipitation-rate and 2 m air temperature point query for the Nile Delta (31.2° E, 31.0° N, 2002–2007), and a sparse SeaWiFS chlorophyll-a gridded subset (121 valid months in 1997–2007). These products stay in the audit. The original U.S. weather archive contains retrieval scripts and a previous bounded POWER probe for U.S. regional data failed to connect. State-matched NASA variables, daily Tmax and soil wetness remain unavailable in the supplied records. A defensible future U.S. comparison requires documented grids clipped and area weighted over the state polygons, common months and units, and independent validation of the regional series. [NASA POWER monthly API](https://power.larc.nasa.gov/docs/services/api/temporal/monthly/)
