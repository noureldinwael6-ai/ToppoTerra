# Recovery verification

## Startup and build

- Old Windows source launcher returned HTTP 200 and the narrower pre-recovery Chrome smoke passed. An invalid port reproduced an uncaught exception. Direct local HTML lacked a usable startup path. See [failure diagnosis](APP_FAILURE_DIAGNOSIS.md).
- Repaired launcher correctly exits 1 with a readable invalid-port message, serves HTTP 200 on an OS-assigned port, and chose 4174 automatically when 4173 was occupied. Browser checks verified direct HTML instructions. Production build and preview ran successfully.
- A temporary integration defect in the new Lab lazy loader referenced a job key outside its callback. Its correction was verified through the full source and production browser journeys.

## Verification evidence

| Check | Outcome |
| --- | --- |
| `npm test` | 27 tests passed covering data ingestion, trend inference, Public figure calculations, source-month 3D mappings, exact Rips/filtration, matched replay, NASA aggregation and launcher regressions. |
| `npm run build` | Passed. Static files in `dist/`. |
| `npm run preview -- --port 4181` | Production served HTTP 200. |
| `node scripts/browser-smoke.mjs` | Passed source at `http://127.0.0.1:4174/` and static preview at `http://127.0.0.1:4181/`. |
| Public targeted browser checks | Passed both states, range brushing and reset, significance comparison, heatmaps, coverage, early/late distribution, wettest month, keyboard tooltip and print callback. |
| Advanced targeted browser checks | Passed 3D rotation, three exact date/raw/anomaly/z mappings, reverse source selection, XY fallback, linked diagram/barcode and true filtration, score-window selection, anomaly chronology alignment, lag association and matched pair counts, work offloaded to worker, joint provenance and history restoration. |
| NASA and benchmark | Passed actual 176-cell coverage and historical data, real/synthetic conclusion text, keyboard chart inspection and methods expansion. |
| Earth WebGL | Windows Chromium with software WebGL verified orbit controls and keyboard rotation. Forcing context loss switched to the poster. Reduced motion showed the poster. |
| Responsive | Chrome checked six routes at 1440, 768 and 390 CSS px. No horizontal page overflow or browser exceptions in the completed run. Screenshots reviewed with focused Public, Lab and mission updates. |

Representative screenshots are in [QA captures](qa/), including [Public Explorer at 768 px](qa/public-768.jpg), [Advanced Lab at 1440 px](qa/recovery-lab-1440.jpg), [Benchmark](qa/recovery-benchmark-desktop.jpg), and [NASA mission on mobile width](qa/recovery-nasa-390.jpg).

## Reproduce locally

Run from the project root. The smoke script accepts `TEST_URL`, along with `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` absolute paths when using a bundled browser driver. With Playwright and Chromium available by default, no override is needed. Set `QA_SCREENSHOTS=docs/qa` to capture the selected views. App startup requires neither Playwright nor Python.

Chrome on Windows was exercised. macOS, Linux, Safari, physical mobile devices, real hardware WebGL performance and screen-reader workflows remain unverified. The print test verifies the app invokes printing. It does not guarantee pagination across printer configurations. See the [figure register](FIGURE_REGISTER.md) for data-gated and deferred items.


## V2 Blindfold verification

- Production build passed. All 30 Node tests passed, including observation isolation, future perturbation invariance, H1 ablation and calendar rollover.
- Windows Chrome production preview on port 4181 passed both browser scripts. Proof smoke covered region-linked Public entry, a three-month prospective mask, withheld truth, topology toggle, source-linked point inspector, reveal, paired benchmark and reset. Reviewed 1440, 768 and 390 px captures inside docs/qa. No outer page overflow. Comparison tables scroll horizontally on compact screens.

## Statistical comparison and annual outlook

- 34 Node tests passed. New checks confirm native H1 provenance, no duplicate inference, exact overlap/stride/gap dates, historical origin invariance to future replacements, and the horizon release gate.
- Production Chrome comparison and existing regression scripts passed. Checked shared conventional p-value when topology is switched off, precision, six-month stride, Advanced navigation, Arizona 2027/2028, withheld replay, California coverage gate, and 1440/768/390 widths.
