# Storytelling and interpretation audit

This increment starts from release 637dfe4. The [feature inventory](../FEATURE_INVENTORY.md), [figure register](FIGURE_REGISTER.md), and [prior verification](PRODUCTION_VALIDATION.md) enumerate the existing routes, figures, calculations, and exports. Keep their current entry points and test them again after the changes.

| Surface | Audit finding | Change |
| --- | --- | --- |
| Public | The verdict repeats rates and p-values. The chart and evidence use different explanations, and Topo-Signal is a separate destination. | Add a data-driven story, a per-decade slope explainer, and an opt-in detail layer around the numerical evidence. Populate the story from the shared topology worker. |
| Method comparison | Annual inference spans the selected record. The H₁ score compares a shorter selected window with a frozen reference. Preprocessing and interval endpoints are different. | Show all three spans, highlight the structural window, and expose monthly anomaly slope computed from its exact same dates. Keep this slope descriptive. |
| Scientific Lab | Raw distances lack their diagram operands and scale near the result. A fixed-reference score and an adjacent score need distinct date labels. | Detail both distances and their units, dates, reference choice, and calibration limits. Link actual geometry, barcodes and intervals with interactive teaching examples. |
| Methods and onboarding | The existing guide introduces controls but lacks an interpretation checkpoint and a restart that preserves selections. | Add an optional route-spanning walkthrough with focused controls, real examples and contextual definitions. |
| Benchmark, Proof, Outlook and NASA | Calibrated experiments, exploratory structural metrics, prediction ranges and descriptive NASA trends can be confused with conventional trend significance. | Preserve all workflows and reinforce evidence labels and interpretation next to the results. |

The observed datasets remain NOAA statewide Arizona and California temperature and precipitation, and the separate NASA IMERG Nile Delta grid. The planned explanation change does not require altering those assets, aggregation, inference or Vietoris–Rips algorithms.

## Interpretation and numerical provenance

- Public Explorer constructs its narrative from valid endpoint observations, complete-year OLS/HAC, and the latest eligible persistence window. Its data status follows the selected period. Theil–Sen remains available as the alternate visible fit. Annual inference still references the OLS estimate even when the alternate fit is on screen.
- The p-value illustration uses the same absolute t-statistic and n−2 degrees of freedom as the numeric test. It draws the Student t shape relative to its peak and crops the plotted extent. Tail probabilities and the interval still come from the existing inference engine. The statistical null is a zero annual linear slope.
- A live topological H₀ feature is a connected component. A live H₁ feature is a loop; interval length is the difference between its death and birth distances. The finite H₁ bottleneck distance minimizes the largest matching cost, with unmatched features sent to the diagonal. Coordinates are standardized and dimensionless. Larger distances mean larger differences under the same representation. No live structural p-value or universal cutoff is displayed.
- For the default Arizona temperature selection, the historical slope uses 45 complete years in 1981–2025, the latest structural window uses January 2022 through December 2025, the frozen diagram uses January 1981 through December 1984, and monthly departure scaling uses 1981–2010. A 6-month stride can produce July–June windows. The matched view computes 120 times the monthly OLS slope on every available departure in the exact chosen dates. Topology uses those same dated anomalies, then standardizes, embeds and samples them and compares the result with the separate frozen diagram. There is no inference attached to this monthly slope or to its topological companion.
- The guide illustrations are synthetic. Redrawing the scatter preserves the original fitted trend by construction. Changing the sample order preserves the same multiset and changes the trailing pairs. In the Rips square, four components merge at ε=1, the H₁ loop is born there, and the loop dies at ε=√2. The diagram demo uses the existing exact solver on two rescaled squares.
- NASA IMERG has its own 120-month, 176-cell grid. The annual fit is descriptive, and the map shows the archived mean monthly depth per cell. The NOAA map highlights supported state footprints. [Data provenance](DATA_PROVENANCE.md)

## Verification

- Node 22.20.0 ran 42 passing tests, including four additions for the narrative’s evidence states and t reference, exact month membership and departure units, topology operand labels, and the educational slope invariant.
- The dependency-free static build passed. Windows Chrome passed the main source and production journeys and the separate production comparison/Outlook, Proof Lab, and research/NASA journeys. Tested 1440, 768 and 390 px viewports.
- Compared the displayed Arizona temperature story with the actual fitted result and checked California precipitation’s inconclusive status in the regression suite. The browser checks also exercised paired states, monthly precipitation departures, selectable structural periods, exact 6-month stride, arrows on the synthetic sliders, mode switching, history, CSV/SVG, print action, and the separate NASA grid. Viewed desktop comparison and mobile story captures in `.qa/storytelling/`.
- The major feature surface and baseline retain the details listed in [Feature inventory](../FEATURE_INVENTORY.md). The source datasets, annual inference engine, persistence solver, and deployment configuration did not require modification.

## Remaining limits

Live distances describe observed structural differences. The benchmark supplies calibration for its own frozen procedure, with assumptions and outcomes specific to the fitted null. The interactive windows have no calibrated structural p-values. State aggregates have no within-state grid, and the NASA grid is a separate data product. Browser checks covered responsive widths on Windows Chrome. Physical mobile devices, assistive technology and hosted verification remain untested.

The workspace has no Git origin. The connected GitHub search did not identify an accessible ToppoTerra repository. The verified branch is packaged in a complete-history Git bundle for publication using the authorized repository. [Deployment instructions](../DEPLOYMENT.md)
