# Phase 1 validation

## Reproduction and scientific checks

- Regenerated 1,080 NOAA state-month records and matched every supplied READY row across two states and two variables. The no-argument build uses the attributed publication excerpts stored with this project.
- `npm test` passed all 14 tests. These cover parsing, state and element validation, unit conversion, missingness, baseline construction, deterministic cache, calendar aggregation, annual regression and HAC matrix checks, rank methods, known H0/H1 intervals, diagram matching, topology sensitivity, worker fallback and actual NOAA regressions.
- A separate boundary-matrix calculation matched the optimized persistence implementation on 200 deterministic two- and four-dimensional test clouds. The Newey–West covariance and Student t reference also matched independent matrix and numerical calculations.
- Default 1981–2025 OLS temperature rates were +0.320 °C/decade in Arizona and +0.291 °C/decade in California. Arizona precipitation was −23.90 mm/decade. California precipitation was −22.51 mm/decade, with a 95% interval of −70.25 to +25.23 and p = 0.347. These are changes in annual totals for precipitation.
- California precipitation's largest adjacent-window H1 distance at a three-month lag was 0.207 for 2008–2012 versus 2007–2011. The peak shifts at one- and six-month delays. See [Scientific methods](SCIENTIFIC_METHODS.md) for the inferential limits.

## Build and browser checks

- `npm run build` produced a static `dist/`. The development server and the production preview returned HTTP 200. The full Playwright smoke test passed on Windows Chrome against both servers.
- The smoke test covered Earth poster, opening each state, comparison, filters, statistics, chart keyboard inspection, CSV download and content, history after reload, restoration and deletion, module-worker persistence, joint embedding, delay and window controls, the rain case study, and methods. It reported no browser errors.
- Reviewed Home, Regions, Analysis and Topo-Signal at 1440, 768 and 390 px in Chromium. All 12 final captures fit horizontally. Tablet filter labels and secondary figure legibility were corrected. Separately exercised WebGL rotation/pause, keyboard rotation, forced context loss and the still fallback. Optional captures are in `.qa/`.
- To rerun browser checks, use `node scripts/browser-smoke.mjs` against a running demo with Playwright and Chromium available. Optional environment variables `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` accept absolute paths, and `TEST_URL` sets the running app URL. Playwright is QA tooling only.

## Limits

NASA retrieval supplied no observations and the small NASA POWER test request failed to connect. NOAA is the sole climate input. Repeated interactive trend queries are individually assessed. Topology is an exploratory score with no null calibration, external climate validation or forecast benchmark. The chart range is controlled with calendar-year selectors and reset. The export delivers the trend and displayed values as CSV. The verified browser was Chrome on Windows, including emulated widths. macOS, Linux, iOS Safari, Android hardware and screen-reader workflows have not been tested.

