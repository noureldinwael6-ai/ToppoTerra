# ToppoTerra feature inventory

Baseline: 34 Node tests passed. Existing browser status is recorded in [prior QA](docs/QA_REPORT.md). Current verification is recorded in [production validation](docs/PRODUCTION_VALIDATION.md).

| Area and original location | Baseline behavior | Upgrade and preservation |
| --- | --- | --- |
| Home, `intro.mjs`, `earth.mjs`, `intro.css` | Earth WebGL rotation/playback, fallback poster, reduced motion, brand, guided demo, entry and history | Preserve renderer and entry points. Add About link. |
| Regions, `intro.mjs`, `state-paths.mjs`, `main.mjs` | Census map pins, keyboard region choices, statewide or paired selection, variable and date controls | Preserve. Clarify study setup and mode entry. |
| Public, `analysis.mjs`, `public-figures.mjs`, `charts.mjs` | Live filters, annual/monthly and raw/anomaly modes, brush, latest decade, reset, keyboard and pointer inspection, regional map, trend cards, uncertainty, seasonality, heatmap, period distributions, coverage, wettest months | Preserve. Add evidence navigation, anomaly and residual diagnostics, moving average, chart download, and selected-input provenance. |
| Conventional engine, `science.mjs` | Day-weighted annual temperature, summed precipitation, complete-period rules, OLS/HAC, fitted-mean intervals, Theil–Sen, tie-aware Mann–Kendall, lag sensitivity, paired state difference | Preserve numerical methods. Explain alternatives and expose the computed test statistic. |
| Scientific Lab, `lab.mjs`, `lab-figures.mjs`, `phase-space.mjs`, `topology*.mjs` | Independent Euclidean Rips H0/H1 worker, delay/joint/window/stride controls, rotating 3D delay trajectory, source inspector and reverse selection, diagram, barcode, filtration, reference and adjacent distances, lag diagnostics, sensitivity, rain example, save | Keep existing engine and full controls. Connect mode navigation and retain cached calculations. |
| Same-data comparison, `comparison.mjs` | Separate OLS and H1 outputs, linked date ranges, archive provenance, precision and visibility controls, geometry and window drill-through, JSON export | Preserve. Make analysis state and unavailable topology explicit. |
| Benchmark, `benchmark-view.mjs`, `research-experiment.mjs` | Frozen historical and synthetic paired detector replay, calibration, timing, peak memory, matched support | Preserve. Document measured outcomes and scope. |
| NASA mission, `benchmark-view.mjs`, `prepare-research.mjs` | Separate Nile Delta IMERG spatial footprint and annual descriptive history | Preserve 176 cells and 1998–2007 dates. |
| Proof and reconstruction, `proof-lab.mjs`, `proof-worker.mjs`, `reconstruction-engine.mjs` | Mask single/consecutive observations, conventional baselines, H1 ablation, reveal, benchmarks and source-linked lag geometry. Reconstruction route aliases Proof. | Preserve the alias and worker. |
| Scenario and forecast evidence, `experiments.mjs` | Single historical input perturbation with recomputation. Forecast availability reflects evidence and inputs. | Preserve experimental labels and availability limits. |
| Future Outlook, `comparison.mjs`, `outlook-model.mjs` | Blocked-origin annual temperature replay, withheld outcome, empirical intervals and gated Arizona estimates | Preserve coverage gate and experimental context. |
| History and methods, `main.mjs` | State/config restore, save/remove/clear, metadata, original preprint and disabled future assistant | Preserve storage keys and existing entries. Add metric glossary. |
| Exports and build, `analysis.mjs`, `comparison.mjs`, `scripts/` | Public CSV and print report, comparison and outlook JSON, source launcher and static build, two data build pipelines | Preserve and add publish settings and figure download. |

Historical inputs are four NOAA monthly state extracts, a NASA monthly grid archive, and two generated bundles. Original visual and research source mappings are documented in [source inventory](docs/ASSET_AND_DATA_INVENTORY.md), [reuse matrix](docs/SOURCE_REUSE_MATRIX.md) and [figure register](docs/FIGURE_REGISTER.md). The research desktop software additionally uses a sensor-specific metric and Ripser for higher dimensions. The climate browser pipeline implements the Euclidean H0/H1 specialization and has analytic fixtures.

## Verification after the upgrade

The Node suite and local Chrome journeys for the features listed above are recorded in [production validation](docs/PRODUCTION_VALIDATION.md). Coverage includes 1440, 768 and 390 px viewports. Hardware WebGL, physical mobile devices, screen readers and hosted deployment remain outside this run. The advanced persistence, reconstruction and forecast limitations in the original figure and evidence reports still apply.

## Implementation order

1. Archive the baseline and use a dedicated development branch.
2. Preserve the common study selection while improving navigation and diagnostics around the existing computations.
3. Add reproducible exports and explain diagnostics, provenance, uncertainty and unsupported analyses.
4. Test source and production journeys, record scientific checks, and publish the verified branch if authenticated repository access permits.
