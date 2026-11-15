# Visual references and assets

Inspected every page of `NASA space apps/TopoSignal_App_Visual_References.pdf` at 720 px, then compared the exposed AI Studio source and the supplied Earth model. Screen identities and numeric findings in the design references vary between frames. They serve as composition references.

| Reference | Adaptation in ToppoTerra |
| --- | --- |
| PDF pp. 1, 8, 9, welcome | Main Earth focal point centered on North America, two launch actions, and prominent title. Typography and a single atmospheric composition replace decorative charts and layered overlays. |
| PDF p. 3, region selection | Large geographic selection surface, clearly distinct control panel, two data-derived state choices and one Analyze action. Geographic boundaries come from U.S. Census files. |
| PDF pp. 2, 4, 5, 7 | Compact history, dates and sources near chart results, clear contrast between conventional evidence and exploratory topology. |
| PDF p. 6 | Future prediction shown in the reference is reserved for a later research phase. |
| AI Studio prototype, `HomePage.tsx`, `ExplorePage.tsx`, `EarthGlobeCanvas.tsx`, `StudyAreaVectorMap.tsx` | Reused the progressive journey, paid attention to the prototype's low-power mode, and moved the globe enhancement off the critical path. Prototype sample-state labels and procedural geography were replaced with actual AZ/CA coverage. |

## Earth

“Earth” by [Akshat](https://sketchfab.com/shooter24994), from [Sketchfab](https://sketchfab.com/3d-models/earth-41fc80d85dfd480281f21b74b2de2faa), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This attribution comes from `asset.extras` in the supplied `earth.glb`. Original is one 5,888-triangle mesh and a 4096 × 2048 JPEG with a legacy specular-glossiness material. Extracted the color texture, flipped it north-up, downsampled to 2048 × 1024, and encoded it as WebP. The 960 × 960 offline poster and WebGL sphere are newly lit orthographic renderings. Decorative orbital lines carry no Earth-observation mission or measurement attribution. Both assets are local. 

## Geography

[U.S. Census Bureau, 2024 Cartographic Boundary Files, 1:20,000,000](https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html). The [state shapefile archive](https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_20m.zip) supplies the reference boundaries. Converted western features to a cropped, rescaled longitude–latitude projection in `app/state-paths.mjs`. Map pins are label anchors inside the state polygons. NOAA statewide monthly series represent their own geographic product definitions.

## Rebuilding the assets

Run from the project root with Python, Pillow and NumPy. Pass either or both input paths. Normal app launch uses the committed WebP files and path module.

```sh
python -B scripts/prepare-visuals.py --earth "/path/to/earth.glb" --boundaries "/path/to/cb_2024_us_state_20m.zip"
```
