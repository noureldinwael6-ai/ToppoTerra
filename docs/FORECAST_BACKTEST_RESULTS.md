# Annual temperature Forecast Evaluation

Both state models use NOAA NCEI nClimDiv monthly mean temperature converted to day-weighted complete annual means. Latest actual observation is December 2025. Issue/cutoff denotes the last available archive year, not an as-issued publication vintage. Historical replay uses finalized observations and cannot account for subsequent revisions.

Use horizon-specific ridge regression with common predictors (origin year, recent five-year mean, origin annual mean) and the same penalty (4, except intercept). The enhanced model adds the longest finite exact Rips H1 lifetime from a 22-point, three-coordinate, three-month-lag cloud of monthly values deseasonalized and scaled within the trailing four years at each origin. Train each issue with target years ending at least four years before issue. Fit feature scaling on those training predictors only. Require 12 training pairs. No hyperparameter tuning on the test results. Prior-year level is a persistence control. Each nominal 80% range uses the 80th percentile of that arm’s earlier absolute replay errors whose targets are already observed by issue. Only origins with at least eight earlier errors enter the range-evaluated set. These are empirical outcome ranges, without guaranteed coverage.

| State and horizon | n | Conventional MAE / RMSE °C | +H1 MAE / RMSE °C | Persistence MAE °C | Range coverage conventional / H1 |
| --- | ---: | --- | --- | ---: | --- |
| AZ, 2 years | 13 | .4557 / .5245 | .4662 / .5385 | .5942 | 11/13 · 11/13 |
| AZ, 3 years | 10 | .4862 / .5423 | .4673 / .5181 | .5675 | 9/10 · 8/10 |
| CA, 2 years | 13 | .8365 / .9384 | .8196 / .9319 | .6915 | 6/13 · 6/13 |
| CA, 3 years | 10 | .7291 / .8529 | .7140 / .8392 | .4811 | 6/10 · 6/10 |

Future display gate for this implementation: eight historical scored outcomes, at least eight earlier calibration errors, and conventional empirical coverage at least 70%. This is a usability guardrail, not a formal validation certificate. California remains replay-only. Arizona experimental estimates from 2025: 2027 conventional 16.8338 °C, +H1 16.8382 °C (radii .7441/.7538 °C); 2028 conventional 16.8760 °C, +H1 16.8842 °C (radii .6778/.6384 °C). Horizon widths are learned separately and need not increase monotonically in this small sample. Conventional remains primary. There is no verified overall H1 gain. Longer projections and event hazards are outside this pass.

Run npm test and scripts/comparison-smoke.mjs against a running app. Select historical issue to inspect a prior-only model and reveal the outcome. The workspace shows bias, range coverage, matched-period errors and selected exact estimates.

