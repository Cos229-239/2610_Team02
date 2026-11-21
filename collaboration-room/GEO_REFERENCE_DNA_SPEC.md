# TowerFlow — Geographic Reality DNA / Character Reality DNA (V1)

**Authority:** source-preserving engineering specification; applies to all 51 capitals and opted-in additional cities, with Juneau as first case study. **Status:** architecture + sourced Alaska reference + unit tests; **NOT** evidence of a photogrammetrically accurate city or autonomous character. Existing room renderer, furniture, projector, network state and character motion remain authoritative. No paid dependencies.

## Mandatory multi-pass transcription → translation

For **each source photograph/video**, perform these operations in order:

1. **Preserve raw provenance:** asset URL, author, license, timestamp, camera GPS/heading/altitude if known, image pixels, aspect ratio, crop, weather/season, landmark annotations. Distinguish *captured date* from current forecast/weather; do not pass a 2009 daylight photo off as a current night scene.
2. **Decode geometry:** calibrated camera intrinsic matrix (focal length, principal point, lens distortion) and pose, world datum WGS84 with locally projected meter coordinates, horizon line, vanishing points, terrain slopes, roof planes, facade corners, distances, occlusion graph, shadows, windows, ground/waterline; record source and uncertainty per field.
3. **Near / mid / far field:** split geometry according to projected screen-space error and camera parallax, **not arbitrary distances**. Near is observed through the user's glass from multiple positions; mid permits simplified topology with verified silhouettes; far uses terrain/skyline relief, city-specific panorama or textured impostors. Each level must declare measured distance to the active camera or `unknown` until calibration.
4. **Vertical semantics and stories:** establish geodetic ground elevation (and water datum/tide when appropriate), building foundation or podium, ground level, numbered floor slabs (Level 1, Level 2, etc.), parapet and roof. Store `floorElevationsMeters[]` derived from plans/survey rather than converting stories to fake constant-height cubes; if known only from OSM floor count, label inferred. Record the business room's **viewer eye elevation above local ground** separately from the room's internal floor y-coordinate. A tenth-story camera and ground-level camera **must not** yield identical perspective.
5. **Architecture:** each landmark's surveyed footprint, facade bay spacing, column shape, roof pitch, window type and locations, sill/head elevations, glass thickness/refractive index, masonry/PBR basecolor, metalness/roughness/normal maps, trim, terrain-ground contact and vegetation canopy. Record scanned/measured/inferred/unknown per parameter; do not assert metric precision from a single image.
6. **Atmosphere:** separate **outside** lighting, sun ephemeris using location/time, cloud cover, precip, wind, visibility, snow/water response, horizon haze and aerial scatter from **inside** room lamps, panes, tint and reflections. The original TowerFlow glass physically separates these layers; rain must hit the exterior glass, not the whole player's screen.
7. **Liveness with causes:** real pedestrians on sidewalks/entrances, traffic on mapped roads, parked cars, ferries/boats when geographically relevant, aircraft on plausible distant tracks, window occupancy patterns linked to realistic usage. Do not replace people with random moving lights. No real-time person tracking or invented claims of live human data.
8. **Reconstruct and calibrate:** place georeferenced near geometry, then mid LOD, then far panorama. Capture screenshots at the *same camera position/field of view/time* as references. Compare known silhouettes, vanishing points, major corners, city identity, edge alignment, weather and window frame occlusion.
9. **Prove and refine:** separately gate source correctness, preservation, actual screen output, motion realism, performance and reversibility. A passing test proving a mesh exists is **not** visual fidelity. Require ≥80% reproducible scored performance **plus** no critical failures before promoting.

## Explicit Scene DNA contract (machine translation target)

The evaluator must preserve these fields even if their value is `null`:

```json
{
  "reference": {
    "uri": null, "author": null, "license": null,
    "capturedAtUTC": null, "camera": {
      "latitudeDeg": null, "longitudeDeg": null, "altitudeMeters": null,
      "bearingDegTrue": null, "focalLengthMm": null, "horizontalFOVDeg": null,
      "rollDeg": null, "pitchDeg": null, "yawDeg": null,
      "calibrationErrorPixels": null
    }
  },
  "world": {
    "crs": "WGS84", "localFrame": "ENU_meters",
    "verticalDatum": null, "groundElevationMeters": null,
    "waterElevationMeters": null, "tideEpoch": null,
    "viewerEyeHeightAboveGroundMeters": null
  },
  "depth": {
    "near": {"rangeMeters": null, "screenSpaceErrorPx": null},
    "mid": {"rangeMeters": null, "screenSpaceErrorPx": null},
    "far": {"rangeMeters": null, "screenSpaceErrorPx": null}
  },
  "architecture": {
    "footprintMetersENU": null, "foundationElevationMeters": null,
    "floorElevationsMeters": null, "floorLabels": ["ground", "level 1", "level 2"],
    "roofElevationMeters": null, "roofPitchDeg": null, "facadeBays": null,
    "windows": null, "panes": null, "frames": null, "materialPBR": null,
    "occlusion": null, "uncertainty": null, "evidence": []
  },
  "atmosphere": {
    "sunDirection": null, "cloudCover": null, "precipitation": null,
    "wind": null, "visibilityMeters": null, "horizonLine": null
  },
  "life": {
    "pedestrianRoutes": null, "vehicleRoutes": null, "vesselRoutes": null,
    "aircraftRoutes": null, "provenance": null
  },
  "verification": {
    "matchedViewScreenshot": null, "silhouetteIoU": null,
    "landmarkRecognition": null, "meanPixelReprojectionError": null,
    "fpsP50": null, "fpsP95": null, "drawCalls": null, "gpuMemoryMB": null,
    "restorePass": null
  }
}
```

**Measurement policy:** known measured values are in *meters* (angles in degrees, image errors in pixels) and include exact source, survey date and datum. Photographic visual guesses are `estimated` with bounded error, never silently promoted to true measurements. The original OSM `project()` divides metric distances by four to fit a toy scene, therefore does **not** use one Three.js unit per meter; converting to a metric renderer requires explicit `unitsPerMeter` and a consistent origin before geometry fidelity can be claimed.

## Alaska / Juneau — First reality baseline

The current dropdown **does include Alaska → Juneau**, but selection is **not** a complete geographic integration. If the previous generic `skyline` filename search failed, the photo stage fell through to an OSM call; when Overpass returned HTTP 429 it fell back to a synthetic skyline. The new Juneau route resolves a specific verified Commons photograph instead of fragile fuzzy search:

- Photograph: [Downtown Juneau and Mount Juneau from Gastineau Channel](https://commons.wikimedia.org/wiki/File:Downtown_Juneau_and_Mount_Juneau,_Alaska_from_Gastineau_Channel.jpg); **Wknight94**, captured **2009-08-04**, **CC BY-SA 3.0**. Recorded camera location **58.289373°, −134.400816°**, view direction **315° true**, from source metadata. Camera height, lens/focal length, image distortion and building dimensions are **unknown**; derive/verify before matching. Photo is a reference to waterfront geometry and Mount Juneau, **not** the city as it looks now. Respect attribution, license and ShareAlike conditions for derivative material.
- Geography: the city runs along **Gastineau Channel** below **Mount Juneau and Mount Roberts**; downtown has steep slopes and a mixed-age building fabric, not fields of interchangeable glass office towers. NOAA documents nearby mountains climbing above **1,000 m**; that is **not** a measured peak height to substitute into a mesh.
- State Capitol: **120 Fourth Street**, completed **1931**, **no conventional dome**. Its façade dimensions, window spacing, floor slab elevations and terrain contact must come from drawings/surveys, not arbitrary common-floor heights. The city historical inventory and Capitol visitor brochure are the primary references.
- Terrain evidence: Alaska Division of Geological & Geophysical Surveys publishes **2019 lidar-derived Mount Juneau terrain/elevation**; integrate a licensed terrain DEM with a known vertical datum before constructing exact forested relief.
- Overpass: HTTP 429 means a rate-limited source, **not** that Juneau has no geography. Cache successful responses, avoid repeated calls, honor the server's delay/Retry-After and use the verified photo/terrain when OSM is unavailable. No aggressive parallel requests.

Primary sources:
- https://commons.wikimedia.org/wiki/File:Downtown_Juneau_and_Mount_Juneau,_Alaska_from_Gastineau_Channel.jpg
- https://alaskacapitol.gov/wp-content/uploads/2024/07/Capitol-Brochure.pdf
- https://juneau.org/community-development/hsd-downtown-historic-district
- https://library.oarcloud.noaa.gov/noaa_documents.lib/NESDIS/NGDC/TM/NOAA_TM_NESDIS_NGDC_53.pdf
- https://dggsint.dnr.state.ak.us/pubs/id/30731
- https://dev.overpass-api.de/overpass-doc/en/preface/commons.html

**Alaska next proof:** successful Commons response for the exact file, license source banner, an actual window view containing **Juneau's waterfront and mountain silhouette**, screenshot comparison from a calibrated camera, and accurate city terrain/landmarks. Until then mark `reference_preview`.

## Character identity → 3D (same Reality DNA discipline)

The existing authenticated GitHub users have `avatar_url` which is already mapped onto a basic sphere in the original room. **That is only an image texture**, not an avatar with the icon's actual 3D shape.

For authenticated members, construct an **Identity DNA** separately from the immutable user ID and image:
- **Capture:** original icon's image bytes, actual resolution/alpha, crop, palette, edge/semantic contours, subject/background separation, source rights/consent, version/hash, and optional user-supplied multiple viewpoints.
- **Disambiguate:** human portrait vs logo vs animal vs illustration. Do not falsely reconstruct invisible anatomy. Avatar shape and facial depth from one image have ambiguous solutions. Mark hidden/backside geometry as inferred or unknown.
- **Create:** a measured silhouette/cutout or extruded icon as the first reversible 2.5D stage; for a user-authorized multiview/3D source, reconstruct a topology-consistent 3D mesh with geometry/material/UV maps, hands, feet and rig. Preserve defining icon features/colors, not merely put it onto a silver sphere.
- **Rig:** keep original movement packets/world-axis WASD, collision capsule, turning, peer identity, interactions, name labels and voice unchanged; replace **visual** child mesh only. Maintain default avatar on any asset/load failure.
- **Verify:** identity recognition from multiple camera angles, transparency silhouette overlap, occlusion/scale and skeleton/rig constraints, draw calls, LOD/texture budget, peer synchronization, rollback. No passive biometric identification, facial recognition or face matching.
- **Minimum-cost path:** transparent PNG/SVG icon → contour triangulation/extrusion (free Three.js) → measured perspective validation. For portraits, retain a photo-preserving relief/profile shape until multiview evidence supports an accurate face; do not advertise it as a true 3D scan.

## Boundaries and promotion

1. `CODE`: syntax/unit/browser checks pass; model registry and loadout remain valid.
2. `PRESERVATION`: original custom `room.js`, projector, Business Room, teammates and network controls untouched. Each new module is additive and reversible.
3. `PATTERN`: selected city uniquely matches source-verified landscape, real facade hierarchy, window spacing, roof planes, terrain level and camera pose.
4. `VISUAL`: independently reviewed screenshots from at least two camera positions, day and night, clear and rain; no duplicate panoramas, floating architecture or weather inside the chamber.
5. `PERFORMANCE`: measure on target RTX 2060 SUPER and weaker integrated GPU. Tune by screen-space error, not arbitrary near/far ranges, and report FPS/draw calls/memory against the unchanged baseline.
6. `RELIABILITY`: ≥80% on defined blind evaluations, **zero critical preservation failures**; otherwise label prototype and do not promote.

**Never** claim measurements that aren't in the evidence, manufacture pedestrians as arbitrary lights, silently overwrite avatar assets, or equate a photographic plane with a fully reconstructed capital city.
