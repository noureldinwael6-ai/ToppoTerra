# Recovery figure register

NOAA figures use Arizona and California nClimDiv statewide monthly temperature and precipitation for 1981–2025. NASA mission figures use the separate Nile Delta IMERG footprint. [QA report](QA_REPORT.md) links browser and command evidence.

| ID | Release status | Figure, computation and route |
| --- | --- | --- |
| PUB-01 | Working | `#analysis` historical monthly or complete annual series, time brush and keyboard inspection, OLS/Sen fits and pointwise OLS fitted-mean band. |
| PUB-02 | Working | `#analysis` decadal rates, modeled change and inference status from selected complete years. |
| PUB-03 | Working | `#analysis` Jan–Dec means and optional fixed 1981–2010 anomaly displays. |
| PUB-04 | Working | `#analysis` matched NOAA series and separate OLS/HAC analysis of the paired annual state difference. |
| PUB-05 | Working | `#regions` and Public inset with actual Census boundaries and clickable NOAA state selections. |
| PUB-06 | Working | `#analysis` rate intervals, zero reference, p-values, scope, tested hypothesis and methods. |
| PUB-07 | Working | `#analysis` observed/anomaly month-by-year heatmaps, shared scale across states. |
| PUB-08 | Working | `#analysis` early/late annual distributions, median, quartiles and observed range. |
| PUB-09 | Working | `#analysis` annual totals and annual maximum monthly precipitation. Daily extremes unavailable. |
| PUB-10 | Working | `#analysis` valid-month tracks and observed coverage counts. |
| PUB-11 | Blocked | Statewide daily Tmax needed for historical heatwave events. |
| PUB-12 | Blocked for states | NOAA input is a state aggregate. The separate NASA view includes a spatial precipitation map for its 176 actual cells. |
| ADV-01 | Working | `#topology` true 3D trailing delay vectors, time-ordered path, orbit/pan/zoom and XY projection. |
| ADV-02 | Working | `#topology` three dated coordinates per channel. Inspector, point selection and raw chronology link both ways. Three points checked independently against source NOAA rows. |
| ADV-03 | Working | `#topology` selectable exact Vietoris–Rips H0/H1 persistence diagram, diagonal and essential H0. |
| ADV-04 | Working | `#topology` matching barcode, inspection and filtration-scale selection. Individual loop representatives are outside this implementation. |
| ADV-05 | Working | `#topology` fixed and adjacent H1 bottleneck distances with full-period NOAA anomaly timeline and selected five-year window. |
| ADV-06 | Working | `#benchmark` matched historical and synthetic detector evidence with actual outcomes and limited conclusions. |
| ADV-07 | Working | `#topology` edge-distance sweep, triangle/Betti counts and finite selection. |
| ADV-08 | Working | `#topology` reference and selected XY clouds on shared bounds, with matched H1 diagrams and exact full-embedding H1 distance. |
| ADV-09 | Working in part | `#topology` six-dimensional joint T/P trajectory and both source channels. Soil-wetness channel blocked by geographic/variable coverage. |
| ADV-10 | Working | `#topology` paired temperature and precipitation anomaly correlation across signed calendar-month lags, with matched sample counts. |
| ADV-11 | Working as experiment | `#benchmark` archival Arizona replay compares a rolling statistics detector and H1 at the same pathwise calibration target. No independently dated real event. |
| ADV-12 | Blocked | No matched daily maximum-temperature record or validated local event labels. |
| ADV-13 | Deferred | Calibrated risk model requires daily data and chronological onset/non-event tests. |
| ADV-14 | Working | `#benchmark` measured first/warm timing and peak RSS on matched replay workloads, with hardware/runtime metadata. |
| ADV-15 | Working in part | `#topology` 1-, 3-, 6-month and single/joint sensitivity. Full chronological ablations deferred. |
| Mission record | Working | `#nasa` 176 actual NASA IMERG cells, area-weighted monthly series and descriptive ten-year slope. |


## Section 6A increments

- IMP-01/02 working for a single selected archive month with four estimators and reveal in Chrome. IMP-03–05 benchmark reporting, provenance drill-down and overlay effects pending.
- SCN-01/02 partial. One historical edit, annual chart, slope and H1 timeline recompute. CSV edits and point-motion display pending.
- FRC-01–05 unavailable in the app. Monthly dry-event holdout comparison pending. Daily event inputs absent.


## Statistical comparison and outlook

- Working: shared observations, conventional trend intervals and exact p-value details, and independent H1 window evidence. Same-date rolling anomaly slopes and diagram distances remain on separately labeled scales.
- Working: width and stride controls, shared-scale before/after geometry/H1 diagram and linked Advanced point, barcode and filtration inspection.
- Working: two distinct annual temperature models, historical issue replay/reveal, empirical outcome ranges and paired error metrics. Experimental Arizona 2027/2028 estimates. California is replay-only under the coverage gate.
- Unavailable: independently calibrated interactive topology p-values, topology-assisted no-trend inference, long horizons and hazard forecasts.

## V2 Proof A

- IMP-01/02 verified for singleton and consecutive 3- and 6-month controls. Worker receives a masked archive, with two conventional baselines, a paired H1 ablation and reveal.
- IMP-03/04 implemented for the fixed masked archive benchmark and source-linked local 3D lag inspector with finite H1 summaries. An all-channel experiment and a repaired-series geometry overlay remain pending.
- Proof B, QC-aware inference, and Proof C forecasting remain pending. The existing structural-detector replay is separate.
