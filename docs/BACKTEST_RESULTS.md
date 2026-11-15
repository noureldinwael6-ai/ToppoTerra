# Reconstruction benchmark

Arizona NOAA nClimDiv monthly mean temperature, targets in 2013–2025. MAE in °C.

| Mask | Retrospective geometry → H1 | Prospective geometry → H1 |
| --- | ---: | ---: |
| Six singletons, seed 193 | 1.528 → 1.680 | 1.774 → 1.803 |
| Six singletons, seed 819 | 2.063 → 2.021 | 1.802 → 1.742 |
| Three-month winter gap | 1.382 → 1.534 | 1.499 → 1.496 |
| Six-month spring gap | 1.324 → 1.399 | 1.497 → 1.494 |
| Three upper extremes | 2.197 → 2.180 | 2.249 → 2.250 |

Both analog arms covered all 24 target instances per mode. Conventional climatology scored 1.053 °C on the six-month retrospective gap, better than either analog variant. Retrospective interpolation covered five of six seed-819 targets. Archive trials overlap and results do not establish general superiority. The app also reports RMSE and coverage. See [structural-change replay](RESEARCH_BENCHMARK.md) for the separate detection task. Environmental forecast validation remains pending.
