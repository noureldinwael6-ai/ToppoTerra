# ToppoTerra

ToppoTerra is a NASA Space Apps 2026 climate investigation app for Arizona and California. Public Explorer quantifies historical trends. Advanced Research Lab links topological geometry to the original observations and shows a matched detector experiment. A separate mission record explores NASA IMERG precipitation in the Nile Delta.

## Start locally

Use Node.js 22 or later and a current browser. The demo is self-contained and has no package installation, live data request, API key or separate backend.

**Windows** · Double-click `Start ToppoTerra.cmd` in the project folder, or open PowerShell:

```powershell
cd 'D:\ToppoTerra Codex'
npm.cmd start
```

**macOS or Linux** · Open Terminal in your copy of the project directory:

```sh
cd '/path/to/ToppoTerra Codex'
npm start
```

Open the URL printed in the terminal. The launcher tries `http://127.0.0.1:4173/` first and tries the next local ports if needed. Keep the terminal open while using the app. Press Ctrl+C to stop it. Run `npm start -- --port 0` for an OS-assigned port or `node scripts/serve.mjs` if npm is unavailable. Opening the HTML file directly displays launch instructions.

## Follow the demo

1. Choose **Try the guided demo** or **Start investigation** on the Earth view.
2. Select a state or compare both. Pick a variable and period, then enter **Public Explorer** for the historical series, rate, uncertainty, unusual years, seasonal patterns and coverage.
3. Switch to **Scientific Workspace** to retain the same study and open the Research Lab. Orbit the phase space, inspect a point, and match its coordinates to the dated source observations. Select a persistence feature or move the filtration slider.
4. Choose **Early detection & benchmark** for the historical replay, simulated controls and algorithm costs. Select **Save investigation** in the Lab to preserve its configuration. Public sessions are recorded as explored.
5. Use **Export CSV**, **Download SVG**, or **Print report** in Public Explorer. Open **Explore NASA mission context** to see a separate sourced satellite record for the Nile Delta.

The **Walkthrough** button revisits the guide from the analysis modes. Open the trend and topology explanations for the current values, methods, and limitations. On **Compare methods**, enable **Matched-window view** to inspect both measurements on the same dated monthly departures. See the [storytelling and interpretation audit](docs/STORYTELLING_AUDIT.md).

## Build, verify and deploy

```sh
npm test
npm run build
npm run preview
```

See [deployment](DEPLOYMENT.md) for Vercel, Cloudflare Pages, and the Git bundle. See [feature inventory](FEATURE_INVENTORY.md) and [production validation](docs/PRODUCTION_VALIDATION.md) for coverage and measured limits.

The static files are in `dist/`. Host the entire directory via HTTP. The project uses relative asset URLs and hash navigation. Use `npm run preview -- --port 4181` to choose a specific preview port. Full browser QA lives in `scripts/browser-smoke.mjs` and needs Playwright and Chromium as described in [QA report](docs/QA_REPORT.md).

```sh
node scripts/prepare-climate.mjs
node scripts/prepare-research.mjs
```

Regenerate the NOAA bundle and then the NASA mission and experiment bundle in that order. The bundled source extracts suffice. See [Data provenance](docs/DATA_PROVENANCE.md), [Scientific methods](docs/SCIENTIFIC_METHODS.md), [Figure register](docs/FIGURE_REGISTER.md), and [Project handoff](docs/PROJECT_HANDOFF.md).


## Topo-Signal Proof Lab

Open it from Public Explorer or Advanced Research Lab. Hide a NOAA month or a consecutive block, compare the analog estimates with Topology on and off, then reveal the original measurements. The paired archive benchmark reports coverage and errors for five mask groups. See [measured results](docs/BACKTEST_RESULTS.md).
