# Deploy ToppoTerra

| Setting | Value |
| --- | --- |
| Repository root | Directory containing `package.json` and `index.html` |
| Node | 22.x for build and tests |
| Install | Use the host default. The app declares zero dependencies. |
| Build | `npm run build` |
| Output directory | `dist` |
| Runtime environment variables | None |
| Backend/runtime service | None. The browser computes conventional statistics and runs exact Topo-Signal H0/H1 in a same-origin module worker. |

The hosted package includes the two versioned data bundles, native ES modules, CSS and assets. Publish the entire output folder over HTTPS. Serve `.mjs` as JavaScript. Hash routes such as `/#topology` resolve through `index.html` without route rewrites. Keep the project-local search history in the browser on the same origin.

## Local production check

```sh
npm test
npm run build
npm run preview
```

Open the printed URL. Check Public Explorer, Scientific Workspace, Compare methods, and NASA Mission. Check that a selected NOAA record opens in both modes, persistence loads, and the history, CSV and SVG exports work. Use [production validation](docs/PRODUCTION_VALIDATION.md) for automated browser commands.

## Vercel

Import the verified GitHub repository into a Vercel project. Select the repository root and Node 22.x. The included `vercel.json` sets the build command and output directory. The framework preset is **Other**. Choose the verified branch for the preview, then choose a production branch when ready to publish. [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build) · [Vercel file configuration](https://vercel.com/docs/project-configuration/vercel-json)

## Cloudflare Pages

Create a Pages project with Git integration. Connect the GitHub repository, choose the production branch, use no framework preset, set the build command to `npm run build`, and set the build output directory to `dist`. Set the build variable `NODE_VERSION` to `22` if needed for the build image. The tracked `.node-version` also requests this version. [Cloudflare Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/) · [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Node selection](https://developers.cloudflare.com/pages/configuration/build-image/)

## Publish the verified branch

This workspace began without Git metadata or a configured origin. Its verified release history is shipped as `.qa/ToppoTerra-production.bundle`, with an initial baseline commit and the production upgrade. To transfer it to a normal checkout, run from a directory where you can create a new folder.

```powershell
git clone --branch production-upgrade 'D:\ToppoTerra Codex\.qa\ToppoTerra-production.bundle' ToppoTerra
cd ToppoTerra
```

Authenticate to GitHub and create an empty repository named `ToppoTerra` under the intended owner, or identify the existing repository. For a new empty repository, replace the clone's bundle origin with its GitHub URL and push the verified branch. For an existing repository, fetch its history and reconcile it before pushing an integration branch.

```sh
git remote set-url origin https://github.com/OWNER/ToppoTerra.git
git push -u origin production-upgrade
```

The cloud build remains to be verified on the chosen host after publishing source. Confirm both JSON requests and the topology worker return HTTP 200, then rerun browser smoke against the deployed URL.
