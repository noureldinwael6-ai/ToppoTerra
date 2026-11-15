# Predictive and reconstruction readiness

The intake audit covers the two source trees and current project. See [Resource manifest](WORKSPACE_RESOURCE_MANIFEST.md) and [Data provenance](DATA_PROVENANCE.md). The named recovery file is 319 lines and ends without §6A. Its updated sibling is 440 lines and contains the new work explicitly requested in the conversation. The two updated copies match at SHA-256 7bab4aad385038770009c47ddd080078cadb7b3d26bb4694622a99c034414756. Preserve the original 27-test baseline and the archived files in `.qa/pre-predictive-2026-11-14.zip`.

| Source and temporal scope | Missingness and alignment | Eligible use |
| --- | --- | --- |
| NOAA nClimDiv Arizona and California, 1981–2025 | 540 consecutive monthly records per state. Mean temperature and precipitation share the same monthly statewide footprint. The app archive supplies both values every month. GA reporting calendar labels the period rather than individual observing timestamps. | Known-value masks with exact held-out truth on artificial singleton/block gaps. Real missing-value validation has no labels in this complete archive. Scenario overlays can preserve fixed climatology and observed inference. Prospective monthly reconstruction is a historical experiment. |
| NOAA statewide nClimDiv precipitation | Monthly depths only. Fixed calendar-month definitions and time-ordered model splits can create a well-defined low-precipitation month target. Final revised archives are available, rather than historical as-issued product vintages. | Exploratory historical one-month hindcasts, with past-only predictors, publication buffer, matched model features and validation-only calibration. Operational risk unavailable. |
| NOAA station reference PDF and `file new.csv` | Station/county climate normals, not a daily year-by-year statewide record. | Daily heatwave and wet-spell labeling blocked. Obtain documented daily Tmax and precipitation arrays on compatible footprints. |
| NASA IMERG Nile Delta | 120 consecutive months, 176 0.1° cells each, 1998–2007. Monthly regional totals and different geography from NOAA. | Descriptive rainfall footprint and trend only in this app. No state join or matched hazard training. |
| NASA POWER and SeaWiFS Nile Delta | POWER point has 72 months of T2M/PRECTOTCORR. SeaWiFS samples sparse marine grid coverage. No matching soil wetness. | Source audit and distinct geography. Heat-dry stress, soil-wetness ablation, drought impacts, floods and storms remain unsupported. |

## Validation order

1. Re-run existing source and production flow. Retain Earth, Regions, Public, Lab, benchmark, trial history and mission records.
2. Support reversible masked trials with isolated inputs, identical targets and information for each comparator, and no hidden observation in scaling, candidate selection or features.
3. Use separately labeled scenario edits with checked source, region, calendar, unit and bounds. Analyze their effects using the same algorithms, on copies and fixed baseline parameters.
4. Evaluate one defined monthly event historically across both available regions with prior-only input, common rows and paired metrics. Disclose forecast applicability and data/validation limitations.
5. Verify all new routes and regressed existing route flows. Update figure and QA records.


Integration resumes from the archived baseline.
