# Production validation

## Computational evidence

- Node tests run on Node 22.20.0. All 38 passed. The original 34 cover NOAA parsing, unit conversion, complete years, conventional trend and an independent HAC matrix calculation, known Rips intervals and bottleneck matches, worker parity, chronological forecasts, masked-data isolation, and NASA aggregation. Four added cases cover complete rolling windows and OLS residuals, fixed-baseline anomaly flags, display-method invariance of the HAC t-statistic, and Betti counts at exact filtration boundaries.
- The deterministic detector experiment was rebuilt in memory and matched every archived result. Neither detector crossed its threshold in the Arizona historical replay. For the 48 held-out paths per null family, the model-matched null produced six crossings per method. The AR stress null produced 30 conventional and 31 H1 crossings. These are path-level false-alarm counts under specific simulation models. The seven test families, detection counts, missed paths, post-onset delays and Monte Carlo intervals are documented in the benchmark. Real-event precision and recall need independently dated labels. [Benchmark protocol and outcomes](RESEARCH_BENCHMARK.md)
- The cached computing-cost comparison covers 13 matched windows. On the recorded Windows i5-1155G7 setup, warm median replay time was 0.335 ms for conventional window statistics and 103.186 ms for H1. Peak process RSS was about 43.8 and 59.8 MiB respectively. Timings are descriptive and hardware-specific. [Benchmark protocol and outcomes](RESEARCH_BENCHMARK.md)
- Masked Arizona temperature reconstruction has mixed results. For the six-month spring mask, retrospective MAE went from 1.324 °C for geometry-only ranking to 1.399 °C with H1. Climatology achieved 1.053 °C. For the seed-819 singleton set, the H1 retrospective MAE changed from 2.063 to 2.021 °C. The prespecified trials overlap and support neither a general performance ranking nor a climate forecast claim. [Reconstruction benchmark](BACKTEST_RESULTS.md)
- The statewide NOAA archive has 540 monthly values per state for the bundled variables. Annual fits require twelve valid observations. An independent input test reproduces the 120-month NASA IMERG aggregation with 176 cells per month. The two footprints are studied independently. [Dataset provenance](DATA_PROVENANCE.md)
- Using the default full selection, Arizona mean temperature OLS is approximately +0.320 °C/decade. California precipitation is −22.51 mm/decade with a 95% HAC interval from −70.25 to +25.23 and p = 0.347. The robust annual departure screen flags California’s 2014 temperature departure of +1.681 °C on the default full span. The anomaly screen is descriptive, uses the fixed 1981–2010 annual departure median and scaled MAD, and has no p-value. [Conventional and topology methods](SCIENTIFIC_METHODS.md)

## Browser verification

`npm run build` passed. Source and static build both served the full application locally. The Windows Chrome Playwright journey exercised Earth fallback and the guided start, study selection, filters and charts, mode round trip, CSV and SVG file content, worker execution, linked 3D geometry and Betti curves, search history, benchmark, NASA map, scenarios, forecast availability, the reconstruction alias, and invocation of printing. The dedicated production scripts also passed the method comparison and Outlook, Proof Lab, and research/NASA journeys. Responsive assertions used 1440, 768 and 390 px viewports. One initial Proof Lab resize check failed transiently. The test now waits for font and layout settling after resizing and passed the rerun.

Run from the project root with Playwright and Chromium available. Optional `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` accept absolute paths. Set `TEST_URL` to the printed preview URL, including the trailing slash.

```sh
npm test
npm run build
npm run preview
# In a second terminal, with TEST_URL configured:
node scripts/browser-smoke.mjs
node scripts/comparison-smoke.mjs
node scripts/proof-smoke.mjs
node scripts/research-browser-smoke.mjs
```

## Visualization inventory

| View | Figures and interactions |
| --- | --- |
| Public Explorer | Historical monthly and complete annual chart, OLS/Sen fit, fitted-mean interval, keyboard/pointer inspection, time brush, slope intervals, mapped statewide footprints, calendar-month climatology, monthly heatmaps, early/late distribution boxes, observation coverage, wettest statewide month, fixed-baseline annual departures with flagged values, trailing five-year average, OLS residuals, CSV, historical SVG and print. |
| Scientific Workspace | Interactive delay-coordinate trajectory, raw-observation links, exact Rips persistence diagrams and barcodes, Betti curves, filtration slider, rolling adjacent/reference H1 distances, matched reference and current geometry, Pearson lag diagnostics. |
| Compare methods | Shared observations, slope and fitted-mean interval, dated monthly-anomaly slopes alongside independent H1 distances, geometry comparison, detailed JSON. |
| Benchmark and Proof | Historical detector replay, simulated null/shift quality intervals, performance costs, withheld-value estimates and ablation, linked lag geometry, reconstruction errors. |
| NASA and experiments | NASA cell map and separate monthly/annual rainfall chronology, hypothetical series and H1 timing, annual Outlook replay and gated experimental estimates. |

See the [feature inventory](../FEATURE_INVENTORY.md) and [existing figure register](FIGURE_REGISTER.md) for the original controls and data gates.

## Limits and manual steps

- Interactive H1 distances remain exploratory and have no calibrated structural p-value for arbitrary user selections. OLS and H1 answer different questions and use different time aggregation. The website keeps both outputs in their original units and does not infer one method’s accuracy from displayed precision.
- Monthly statewide aggregates do not identify daily hazards. Daily Tmax, geographically matched soil moisture, and event labels are required for those capabilities. The empirical Outlook gate and separate historical replay remain in effect.
- Further independent climate-site validation, mobile hardware and GPU performance, Safari, screen readers, and printed pagination were outside the verified matrix. The automated test covers the print command, and reduced-motion QA uses the still Earth fallback.
- GitHub publication and hosted verification remain pending. The authenticated connector found no ToppoTerra repository it could access, the Git HTTPS client had no authenticated session, and the browser repository page timed out. The [deployment guide](../DEPLOYMENT.md) describes pushing the local Git bundle and configuring either host.
