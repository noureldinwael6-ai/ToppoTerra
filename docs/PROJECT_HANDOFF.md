# Project handoff

## Project and archived state

Existing application: `D:\ToppoTerra Codex`. Read-only sources: `D:\NASA space apps` and `D:\Topology research`. A pre-recovery ZIP is stored at `.qa/pre-recovery-2026-11-14.zip`. See [Resource manifest](WORKSPACE_RESOURCE_MANIFEST.md), [Source reuse matrix](SOURCE_REUSE_MATRIX.md), and [Failure diagnosis](APP_FAILURE_DIAGNOSIS.md).

## Runtime and routes

| Route | Role and code |
| --- | --- |
| `#home`, `#regions` | Earth opener and geographic setup, `intro.mjs`, `earth.mjs`, `state-paths.mjs`. |
| `#analysis` | Shared settings and Public Explorer, `analysis.mjs`, `public-figures.mjs`, `science.mjs`. |
| `#topology` | Advanced Research Lab. `lab.mjs`, `phase-space.mjs`, `lab-figures.mjs`, exact browser `topology.mjs` and worker. |
| `#benchmark` | Historical and synthetic paired comparisons, `benchmark-view.mjs` and `scripts/research-experiment.mjs`. |
| `#nasa` | Standalone NASA GPM IMERG Nile Delta mission record. Same lazy loader, no geographic merge. |
| `#history`, `#methods` | Local history, Public and Advanced settings restore, and scientific provenance. `app/main.mjs`. |

The native ES module application uses a small Node loopback server. An offscreen worker computes topology and caches requested results by source/version and parameters. Worker jobs use finite windows and bounded caches. Older asynchronous results cannot overwrite the current Lab view. The research bundle is lazy. No package installation or Python backend runs at demonstration time.

```text
NOAA monthly excerpts → prepare-climate.mjs → climate.json → Public and Lab
climate.json + NASA IMERG extract → prepare-research.mjs → research.json → Benchmark and Mission
index.html + app/ + assets/ + browser data → build.mjs → dist/
```

## Maintain and validate

- `npm start` or `Start ToppoTerra.cmd`, using the printed local URL. `npm run build` and `npm run preview` for the portable static build.
- `npm test` runs Node checks. `scripts/browser-smoke.mjs` verifies the complete journey on either version. See [QA report](QA_REPORT.md).
- `node scripts/prepare-climate.mjs` regenerates the NOAA bundle locally. `node scripts/prepare-research.mjs` regenerates the NASA/benchmark bundle and refreshes host-specific timing measurements.
- [Scientific methods](SCIENTIFIC_METHODS.md) describes the interactive Lab. [Research benchmark](RESEARCH_BENCHMARK.md) specifies the independent calibration protocol and negative/inconclusive outcomes. [Data provenance](DATA_PROVENANCE.md) preserves source differences.
- [Figure register](FIGURE_REGISTER.md) tracks coverage and acceptance. Keep [Session state](SESSION_STATE.md) and test evidence current.

## Next work

Daily maximum temperature, spatially matched soil wetness, independently dated structural outcomes and external validation are the high-value requirements. The NASA IMERG notebook is a separate coastal grid footprint with ten annual values. Keep its fit descriptive. Do not treat the Arizona replay's lack of crossings or the synthetic differences as a validated alarm or forecasting result. [Backlog](NEXT_PHASE_BACKLOG.md)


Section 6A partial implementation: app/experiments.mjs and app/reconstruction-engine.mjs. Routes #reconstruction, #scenario and #prediction. See PREDICTIVE_READINESS_AUDIT.md and FIGURE_REGISTER.md for scope and gaps. Chrome verified mask, reconstruct, reveal, scenario recomputation, and forecast availability screen.


## Same-data comparison and annual outcome projection

Open #comparison or #outlook. See STATISTICAL_PROVENANCE_AUDIT.md, METHOD_COMPARISON_RESULTS.md, FOUR_YEAR_WINDOW_EXPLAINER.md and FORECAST_BACKTEST_RESULTS.md. The next defensible forecasting refinement is external archive or additional blocked-origin verification of interval coverage before releasing wider horizons.
