# Same-record comparison

Arizona NOAA NCEI nClimDiv, statewide mean temperature, January 1981–December 2025, 540 available months and 45 complete calendar years. No imputation. Dataset nclimdiv-v1.0.0-20261105, source READY SHA-256 ac0278a00a71fa561e9304a587a17463e71f27646f9a2a6bb2ee772a12f0c37f.

- Conventional annual OLS gives +0.3197141883289685 °C/decade, with a HAC 95% slope interval +0.23424348546117962 to +0.4051848911967574. The no-linear-trend p-value is 2.1188436093206223e-9. Sen gives +0.33686684968492503 °C/decade.
- With a 48-month width, 12-month stride and 3-month lag, the topology pipeline computes 42 complete windows. For January 2022–December 2025, finite H1 bottleneck distance to the January 1981–December 1984 reference is 0.2768321482012628 standardized distance units. The longest finite H1 interval in the selected window is 0.5536642964025256. This is an exploratory structural comparison with no p-value.
- The current matched rolling comparator is the descriptive OLS slope of monthly anomalies over the exact same window, in physical units per decade. There is no numerical subtraction between a physical slope and standardized diagram distance. The paired forecast and reconstruction views compare differences only within their own tasks.

Open #comparison, select Arizona and mean temperature over the full record, and inspect/download the raw JSON. See [forecast backtest](FORECAST_BACKTEST_RESULTS.md) and [reconstruction benchmark](BACKTEST_RESULTS.md) for incremental model evidence.

