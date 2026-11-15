# Recovery diagnosis

## Before edits

- Existing project was already present at `D:\ToppoTerra Codex`. Its source, data, assets, scripts, docs and root configuration were backed up in `.qa/pre-recovery-2026-11-14.zip` (43 entries, SHA-256 B2B1DD6CDBE63FDFF9163677E0A470E88D1914550769C148972908977BB1F1C5). Generated dist and old screenshots are reproducible or remain in place.
- Host Node 22.20.0 and npm 10.9.3. `npm.cmd test` passed 14 tests. `node scripts/serve.mjs` served 200 at 127.0.0.1:4173. The existing Chrome smoke passed the old, narrower workflow. No general server failure reproduced there.
- `npm.cmd run preview -- --port invalid` exited 1 with an uncaught ERR_SOCKET_BAD_PORT. The original launcher relied on a fixed port, an already built dist for preview and an open terminal. Directly opening index.html via file:// strands users at the module loader because the source was module-only and did not handle that route. Stale earlier loopback URLs are tied to an active process. No backend or dependency installation is needed.
- Verified functional gaps in the old build: generic navigation, no dedicated Public/Advanced mode chooser, two-coordinate plot with no 3D manipulation/source linkage, no barcode or reference-score timeline, no calibrated paired benchmark, and no use of newly added NASA records.

## Repairs verified

- `scripts/serve.mjs` validates the port, chooses a nearby free port when the default is occupied, prints the actual address, and checks the main browser files before serving. `index.html` gives actionable instructions for file opening and startup import errors. `Start ToppoTerra.cmd` provides a Windows launcher.
- `scripts/build.mjs` validates required browser and data files and bundles the independent research extract. Source and production smoke tests passed against the repaired workflow. The host-specific cause of the original report remains unconfirmed.
- The comparison and Lab now have explicit routes. The 3D projection, exact persistence, and matched benchmark use observed source records or visibly labeled synthetic controls.

## Ranked repair

1. Make launch from the project directory self-diagnosing and resilient to common port/file errors. Validate source and production output separately.
2. Preserve canonical NOAA ingestion, aggregation and HAC analysis. Verify the newly supplied NASA mission assets on their own geography.
3. Add explicit Public and Advanced modes with one shared investigation. Put full trend evidence first.
4. Add real 3D lag navigation and point links, Rips diagram/barcode/filtration, and aligned reference/window comparisons.
5. Add paired replay and controlled detection metrics. Show uncertainty and missing heatwave/soil prerequisites.
6. Exercise representative Windows Chrome journeys, inspect three viewport widths, and record exact passes and limitations.

