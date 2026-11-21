# TowerFlow NYC Photographic Environment — AI Transcription → Translation → Implementation Contract (V3)

**Input 1:** user's live screenshot on 2026-11-20, 2048×837 pixels, showing close blue cylindrical legacy towers, large plain dark rectangular buildings apparently suspended behind them, no connected ground/street and daylight sky.

**Input 2:** location-verified photographic exemplars of Midtown Manhattan:
-  [Bryant Park street canyon / Art Deco Midtown](https://streeteasy.com/building/the-bryant/phn): central pale limestone tower with setbacks and crown; dark glass slab to one side; roofs and roads visible below.
- [Andaz Fifth Avenue skyline photograph](https://www.hyatt.com/andaz/en-US/nycam-andaz-5th-avenue/gallery): New York Public Library foreground with substantial rooftop profile, glass commercial skyline behind, cool twilight with warm office windows.
- [Bryant Park and Manhattan aerial skyline](https://www.costar.com/article/533560839/near-and-long-term-outlook-for-new-york-office-sector-is-bearish-poll-finds): glass and masonry high-rises frame a real tree-lined park and street network; strong near/mid/far perspective.
- [Manhattan Midtown canyon](https://thebrokerlist.com/properties/4-west-43rd-street-new-york-ny-10036-151905): individual brick and stone façades, repetitive but non-identical apertures, genuine intersection of skyline and street perspective.
These are **observation references**, not shipped image textures. Photos are not claimed to be free to redistribute.

## AI transcription — what exists, not what we wish existed

| Signal | Screenshot observation | Technical hypothesis / confirmed code relation | Correction |
| --- | --- | --- | --- |
| Repeated giant blue round towers | Foreground towers visually dominate, very similar façade rhythm and outlines | Likely existing custom TowerFlow skyline (source not in reviewed NYC module; live `room.js` is ~947 KB, not same as GitHub's smaller file) | **Do not delete blindly**. Inventory exact live scene meshes before selective replacement. V3 only modifies its own NYC subgroup. |
| Dark rectangular blocks seem to hover | Background towers terminate abruptly with no visible street, plinth, or connected ground | V2 uses extruded geo polygons at y=0 but has no corresponding ground/street visual | Add bounded **horizontal street-level ground and park**, grounded plinth silhouettes, explicit y=0 geometry origin. |
| NYC doesn't look like actual Midtown | Predominantly blue cylinders and dark untextured boxes, little limestone, detail, street grid, or park | V2 has only 4 blue-gray materials and one transparent rectangle type for glazing | Reconstruct categories from photographic façade palette, glass frames, varied windows, rooftop/antenna mechanics, urban context. |
| Little atmospheric depth | Near and far towers not clearly distinguishable; original bright sky still present | V1 rectangular shader produced a black-card seam; V2 removed it, not yet a photographic haze system | **Never add another opaque background rectangle**. Three tonal distance bands, weather-conditioned lighting, no global sky/fog mutation. |
| Real NYC dataset unavailable | Prior user screenshot explicitly said `SIMULATED (NYC data unavailable)` | Socrata fetch failed for an unverified reason; browser may block CORS/rate-limit or reject query | Try NYC official Socrata then official ArcGIS REST GeoJSON, show true provenance and error. Treat fallback as simulation, never as real footprints. |
| Scale mismatch / clipping | Existing renderer has its own perspective; new group at (62, 0, −83), camera far=130 in reviewed repo | User's private camera angle/world scale unobserved; possible clipping and misalignment | Preserve camera; gather live camera/mesh depth diagnostics before final alignment. |

## AI translation into native engine concepts

**City coordinate frame:** local (x,z) from geodetic coordinates around 40.7536° N / −73.9832° W. Coordinate-system conversion in `meshProfile()` uses ~111,320 m/degree and a cosine correction for longitude, then scales to Three.js world units. `ExtrudeGeometry` starts at **ground y=0**, rotates its extrusion axis into world +Y; every building base shares that datum. Horizontal roads and park tiles remain near y≈−0.2, **not hanging inside the air**.

**Architectural classes:** glazed modernism, limestone/Art Deco, charcoal masonry, precast concrete. The visual shader palette and deterministic window selection are **photo-inspired styles**, not satellite-verified materials for each actual parcel. Geometric shapes remain the source dataset polygon where available; setbacks and roofing equipment are simplified procedural additions and **not measured**.

**Atmospheric translation:** dark foreground framing, softer/less saturated mid-rise layers, blue-gray distant skyline toward horizon. Day/night and cloud cover influence only the new NYC group and must not assert perfect match to independently controlled host sky until the host lighting system is explicitly reconciled.

**Performance:** at most ~110 geometry records, ≤2,600 window instances per surface batch, a few hundred ground/street primitives, one single asynchronous weather refresh every 10 minutes. Rebuild disposes **nested Three.js geometries** and all created materials to prevent GPU leaks. No paid APIs and no model/photography assets embedded.

**Ground plane:** physically separate horizontal surface beneath extruded footprints and photo-inspired approximated Manhattan street grid with bounded Bryant Park lawn and tree canopy. Current streets and park placement are illustrative, **not survey-accurate**; true road geometries are a follow-on data import.

## Approval gates

1. **Preservation**: no changes to original live `public/room.js`, OAuth, workstations, input handling, audio, market flows; no automatic merge into `dev` or `main`.
2. **Source**: existing local NYC V1/V2 module must exactly match reviewed source; abort on custom local changes. An audited one-file updater installs V3 after `node --check`.
3. **Code**: no full-screen sky card; building bases y=0; horizontal ground and park beneath, actual footprint edge windows; 4 material families, 3 distance bands. Existing original towers remain untouched unless separate mesh ownership proven.
4. **Rendering**: require user screenshot before claiming perfection. Zero apparent floating buildings, no cropped skyscraper bases or black background plane. Recognizable park/street organization and architectural variety are visual targets not yet verified.
5. **Connectivity**: browser diagnostics indicate `NYC OPEN DATA`, `NYC ARCGIS`, or clearly `SIMULATED`. Correctness of real building footprints and real-time weather requires direct runtime evidence.
6. **Performance**: compare measured FPS and draw calls to baseline from the **same private renderer** before acceptance. No invented 60 FPS success claim.

## Acceptance target / next measurement

The V3 code implements the first grounded city + façade replacement **within its own optional module**, but cannot safely delete or remap private 947 KB host legacy towers without an inspected scene inventory. Full photographic fidelity, camera alignment and correctly registered street network remain unverified. The existing `NYC: ON/OFF` A/B comparison is retained. Any misleading floating asset is a blocking visual defect until reviewed.

**Installation:** `tools/update-nyc-atmosphere-v3.ps1`; after `NYC PHOTO RECONSTRUCTION V3 — INSTALLED`, hard-refresh the browser (**Ctrl+Shift+R**) and use the comparison switch. A static .mjs change does not need restarting Node on a normal static-file host.
