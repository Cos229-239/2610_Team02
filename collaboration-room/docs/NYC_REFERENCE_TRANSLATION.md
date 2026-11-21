# NYC Photographic Reconstruction Contract — TowerFlow

**Status:** Reference-transcribed design specification, initial rendering changes staged; not a claim of photorealistic parity.

## Visual evidence and required scene behavior

| Reference photograph | Architectural cues | Translation into Three.js |
| --- | --- | --- |
| [Bryant Park aerial view — 11 Bryant Park Plaza](https://images.squarespace-cdn.com/content/v1/6a01f27ab1d8c127faac9c7f/9965be0c-e2db-4ea9-8a74-91a42dae9e01/Bryant%2BPark%2BViews.jpg) | Near-frame glass curtain walls, midground stone high rises with setback crowns, trees and open park, far skyline with atmospheric veiling. | Distinct near/mid/far façade material bands, nonuniform massing, setbacks/roof machinery, horizon continuity. Buildings may not occupy the exact same viewport until live camera calibrated. |
| [Midtown street view — 4 Bryant Park listing](https://images1.cityfeet.com/i2/FciMMBpFTJuvE7ZMd6Oj3MgBWdA3A4wUcVnCxTT-7fk/110/4-bryant-park-new-york-photo-9-of-10.jpg) | Rectangular building footprints, long parallel street corridor, varied façade module size, human-scale sidewalks and street fixtures. | Use actual footprint polygon edges for façade windows; ground-plane streets and street-level context remain a pending stage. |
| [Manhattan high-rise vista at dusk — StreetEasy](https://photos.zillowstatic.com/fp/988ab2194461341cf5760a43402cb92d-full.webp) | Interior framing, staggered skyline heights, warm sunset/reflected highlights, far buildings with lower contrast. | Preserve the TowerFlow window frames; avoid replacing the external sky globally; lower contrast by distance, vary windows and rooflines. |

**Image rights:** Reference images guide proportions, shapes, palette, density, and atmosphere. Do not ship third-party photo pixels or textures in TowerFlow without documented rights. Geometry uses public city footprints and procedural façade details.

## Screenshot defect reproduced visually

The user's Nov 20 screenshot showed an angular nearly-black rectangle behind the skyline while bright original daytime sky remained at its edges. **Likely cause (source correlation, not independently browser-verified):** NYC Atmosphere V1 added a large opaque 270×150 plane (`TF_NYC_SKY_BACKGROUND_V1`) with a night-color shader that did not match the underlying host's brighter city sky. This produced a hard rectangular seam rather than depth. It is **not atmospheric scattering**.

V2 **removes this plane entirely**; no `scene.background`, global fog, room illumination, audio, navigation, workstation or authentication settings are modified. Real depth is implemented first by material-level architectural color/contrast bands; full fog integration should be limited to the exterior city and camera-specific depth, not global scene fog.

## Rendering constraints / evidence

- Geographic origin: approximately Midtown/Bryant Park, 40.7536 N, −73.9832 W.
- **Real geometry source:** NYC Open Data BUILDING dataset `5zhs-2jue`; API can fail due to client network, CORS, query, rate limits or data shape. The UI must explicitly label any fallback `SIMULATED` and include the error in diagnostics. A simulated scene is not authentic NYC geometry.
- Architecture variation: masonry / limestone and glass curtain-wall colors, stepped rooftop mechanical blocks, antenna silhouettes, windows oriented to actual polygon edges. Some visual details are stylized, not measured.
- New York time/weather: Open-Meteo; weather and time may differ from host's pre-existing sky until sky systems are reconciled. Don't make contradictory claims that the entire scene is real time.
- Target performance: preserve or improve baseline measured FPS; never assume CI syntax proves rendering performance. Use instancing / bounded source sampling.
- **Required acceptance:** screenshot comparison shows no black geometric sky boundary; skyline has foreground/midground/background tonal separation and varied roofs; no floating window geometry due to axis-aligned approximation; 3D controls/teammate desks/OAuth/audio all retain function. Check V2 module diagnostics and browser errors.
- **Defer:** real street centerlines, Empire State Building signature crown, buildings with measured elevations at multiple roof levels, dynamic façade shaders, weather on window glass, nighttime city illumination and local sky composition. These need a camera-aligned photogrammetry-inspired scene plan and live browser performance evidence.

## Delivery and rollback

Existing live room `public/room.js` is not replaced; the V2 updater changes **only** `public/nyc-atmosphere.mjs` after comparing it to reviewed V1 and checking staged JS. The existing `NYC: ON/OFF` switch supports immediate A/B comparison; `window.tfNYCAtmosphere.dispose()` removes the additive group. Restart is not required for a static JavaScript module; **Ctrl+Shift+R** reloads the updated module. Stop before deploying if the local module was customized independently.
