# TowerFlow // Photo-Grounded 3D Reconstruction Studio
Status: candidate implementation on a feature branch. Not deployed or photo-matched.

## Transcription: preserved user intent
Make Frontier, rooms and furniture as convincingly real as feasible for the lowest practical cost. Treat real-world photography as the *source of evidence* for geometry, material appearance, lighting, scale, lens, and composition, rather than using decorative 3D shapes and assuming they look real. Pinterest is the reference/discovery board, not an automatic asset license. Infer unseen details conservatively, record uncertainty, and never describe a single-photo estimate as an exact scan. Preserve working TowerFlow, collaborator rights, data, navigation, AURA, FLOW, existing world movement and release controls.

## Translation: photo-to-world computation
```
Pinterest Pin/board discovery + original creator/licensing check
  -> local licensed image(s) / directly permitted references
  -> immutable source metadata + optional photo hash
  -> camera model (intrinsics: FOV, sensor/aspect; extrinsics: pose)
  -> image observations (contact points, perspective/parallel lines, visible dimensions)
  -> metric anchors (measured door/sofa width; units = meters)
  -> visible geometry from reference; unknown surfaces explicitly inferred
  -> mesh with real parts (cushions, seams, frames, hinges) OR imported GLB
  -> photo-derived PBR (base color, normal, roughness, metal) + HDR light
  -> ACES tone-mapped realtime scene, calibrated exposure and shadows
  -> screenshot A/B comparison / quality gate / measured performance
  -> sandbox preview -> authorized pull request -> reviewed deployment
```

## Four contracts
### SPECS
- Intake Pinterest URL as *provenance link only*; do not scrape pins, download Pinterest images, or call restricted APIs.
- User independently obtains rights-cleared photo and uploads it locally. Block unknown rights. Do not upload private images to a server. Store only reference name/dimensions/hash and measurements in a downloadable manifest.
- Ground-contact points are observed in image coordinates. Their 3D intersection depends on the stated camera model. Camera calibration parameters are user inputs / provisional, NOT automatically solved.
- Treat widths labeled measured/estimated as estimates unless externally calibrated. Tag hidden surfaces with "inferred"; do not fabricate confidence percentages.
- Support local `.glb` import and optional licensed `.hdr` environment + albedo/normal/roughness maps. GLB must embed required resources for this proof of concept.
- Maintain one physically based, meter-scale scene. The default mesh demonstrates structure but is NOT a faithful reconstruction of an unspecified image.
- No server writes, production state mutations, GitHub permissions changes, or model inference in this preview.

### DESIGN
- Split-screen evidence workspace: photo and measured contact point left; interactive mesh preview right.
- Graphite architectural palette, polished but readable controls; physical shadows, PBR, studio default fallback; photographic HDR whenever rights-cleared data is available.
- Calibrate camera height/distance/pitch/FOV; click ground contact; place candidate mesh at the computed world-plane intersection.
- On-screen explicitly distinguish OBSERVED photo, USER ASSUMPTION and INFERRED geometry; show triangles/draw calls/observed frame rate.

### PRESERVATION
- Additive path `collaboration-room/photo-studio/` only; do not alter the existing live team room, business app, OAuth, player input, sockets, data, theme, or teammate files.
- Source photos remain in-browser memory and are never pushed to Git. Keep manifests small and free of image bytes.
- No automatic web scraping, remote inference calls, AI training, or asset copying from Pinterest.
- Imported asset licensing and provenance must be checked outside this prototype.

### API / validation
- `calibration.mjs` owns pure validation/projection metadata; UI and Three.js scene are consumers.
- Reject invalid Pinterest links, negative/zero dimensions, invalid rights, missing image, photo clicks outside displayed image, and camera rays that do not intersect the floor in front of camera.
- Export versioned JSON manifest with observed/inferred fields and explicit "unverified" result.
- Node unit tests: no network or GPU requirements; browser/WebGL visual acceptance separately required.
- Promote only after CODE, PATTERN and PRESERVATION each pass with receipts. Target >=80% demonstrated reliability on representative *independent* tasks; do not turn a single example into a confidence score.

## Realism/accuracy ladder: cheapest first
1. **$0 reference/camera**: Pinterest boards for inspiration; licensed image intake, perspective lines, measured reference dimensions, fSpy or Blender Perspective Match. Single images cannot determine concealed surfaces or unique depth.
2. **$0 materials/lighting**: Poly Haven CC0 PBR materials, HDRIs, authentic GLB models. Prioritize 1K–2K textures and 1K–2K HDRI on 8 GB VRAM; increase only after frame measurements.
3. **$0 geometry**: Existing licensed mesh first; otherwise Blender model from camera-matched photos, author physical cushions, seams and hardware; export glTF 2.0. Retopologize and UV as needed.
4. **$0 multi-view when permitted**: If photographing own object/room, capture overlapping distinct viewpoints and reconstruct with AliceVision/Meshroom. This improves visible geometry but still cannot reveal unobserved areas.
5. **Only if needed**: local monocular depth / image-to-mesh model as *prior*, never as a ground-truth scan; compare predicted views against held-out imagery. On 8 GB VRAM prefer smaller tasks and offline processing.
6. **Runtime budget**: adaptive DPR, limited shadow resolution, reusable materials and geometry, GLB compression/LOD when practical; measure the room in the target browser.

## Evidence gate (not yet passed)
- CODE: static syntax, unit tests, valid glTF import, error handling.
- PATTERN: matched photo-view silhouette, camera viewpoint, materials, contact/shadow placement; visual approval with A/B screenshots and measured landmark error.
- PRESERVATION: unchanged movement, auth, chat, projector, finance, inventory, contributor data; no production changes without review.
- SECURITY/RIGHTS: no Pinterest scraping; local files only, rights recorded; input limits, no server writes.
- PERFORMANCE: verify p50/p95 frame times on the actual Windows 11 RTX 2060 SUPER machine with target load; measure before setting budget claims.

## Acceptance criteria for a future photo-matched object
- Record source image and license proof, physical measurement, camera model, and observed landmarks.
- Use at least one *held-out* view not used for modeling. For a single photo, label back/depth unknown.
- Measure silhouette Intersection-over-Union (IoU), reprojection error in pixels, dimension error in percent, triangle budget, p95 render time; choose thresholds after baseline.
- Meet 60 FPS target on Balanced only if measured; do not assert until validated. Exceeding texture memory or interactivity requirements fails.
- Reviewer confirms the reconstructed object and room visually; functional regression suite passes independently.

## External authoritative references
- Pinterest copyright: https://help.pinterest.com/en/article/copyright
- Pinterest terms: https://policy.pinterest.com/en/terms-of-service
- Pinterest developer terms (AI/data restrictions): https://developers.pinterest.com/terms/
- Khronos glTF PBR: https://www.khronos.org/gltf/pbr/
- Three.js GLTFLoader: https://threejs.org/docs/pages/GLTFLoader.html
- Poly Haven CC0 license: https://polyhaven.com/license
- AliceVision photogrammetry: https://alicevision.org/
- Blender Perspective Match extension: https://extensions.blender.org/add-ons/perspective-match/

## Exact scope of this branch
Photo rights/camera/ground-plane inference/local mesh/HDR/GLB prototype plus tests. **No automatic image-to-3D reconstruction or photorealistic equivalence is claimed.** Full room integration, automatic camera matching, photo segmentation, inverse rendering, texture baking, multiplayer and release verification are subsequent independently-gated tasks.

## Integration audit against existing Team 02 Markdown (2026-11-12)
Repository inspected at `dev` commit `529260800f003016bf4e4a3f88c6b483d91c590a`; this is repository evidence, not proof of any remote/local runtime.

| Existing authoritative team document | Established constraint | Integration in this PR | Remaining |
|---|---|---|---|
| `README.md` | Team-owned project and shared source control | Additive feature branch, draft PR for review | Team reviewer acceptance |
| `Documents/PMP3_TowerFlow_Phased_Development.md` | Keep C++ CLI as working portfolio core; API/service before web/cloud business changes | Photo lab is visual-engineering preview only. **No** portfolio/service writes or API claims | Verify CLI persistence independently; implement portfolio API in separate guarded release |
| `TowerFlow/TowerFlow.Native/README.md` | CLI persists locally in `towerflow.dat`, no proven shared WebView backend | Did not alter C++ or portfolio persistence | Future service handoff after CLI smoke test |
| `Documents/CLIvsIDE.md` | CLI/test/build are reproducible independent of an IDE | Plain Node `--test` and syntax checks run without package installation | CI + browser functional and visual checks |
| `Documents/GIT_03_Merging_to_Dev.md` | Author feature work, test, review, and integrate with team consent | Opened **draft PR #14** targeting `dev`, with no automatic merge | Team review and approval |
| `collaboration-room/FOUNDRY.md` | Current checked-in Foundry is a movement **preview**; external live collaboration-room source has not been imported; repo-first changes | Adds isolated `photo-studio` route and a navigation link to the **existing preview**, not authenticated room | Import canonical live room before actual portal/scene integration |

### Critical movement-source mismatch
The uploaded engineering blueprint describes **camera-relative FPS WASD as the approved live configuration**, but `collaboration-room/FOUNDRY.md` demonstrates **world-locked movement** and says that preview is not integrated into the live room. This branch does **not** choose between them, touch any movement logic, or infer a new live baseline. Before live integration, inspect and freeze the actual running room's movement behavior with a teammate-approved acceptance recording.

### Code Correlation mappings for photographic engineering
| User code phrase | Deterministic pattern / algorithm | Preservation contract |
|---|---|---|
| "Realistic photography" | Pin-hole camera model, perspective projection, filmic tonemapping, PBR materials, evidenced illumination | Match source lens/lighting as known; no invented precision |
| "Whole object from image" | Visible geometry + measured reference scale + ray-plane anchors + multiple angles if available | Hidden areas remain explicitly inferred, never claimed as recovered |
| "Hyper-real 3D room" | Physically meaningful room meshes, asset-level GLB and UV, HDR lighting, contact shadows, screenshot comparison | World interaction, navigation, UI, team permissions stay independent |
| "Cheapest optimal" | Reuse permitted photorealistic assets, staged offline authoring, texture resolution budget, measured LOD/runtime | Avoid paid APIs or replacing working code without validated benefit |
| "Pinterest references" | Discover design pins, record URLs, identify actual creator/license, require authorized local source | No unauthorized scraping, copying or model training |

### Manifest as proposed integration API
`photo-studio/calibration.mjs` exports a versioned, human-readable candidate schema. A future integration mediator may **read and validate** it (not execute it). The manifest contains photo metadata, per-view rights provenance and hashes, manual camera assumptions, an observed pixel anchor, estimated dimensions, inferred geometry labels, candidate placement, and independent verification statuses.

No main-room script currently imports it. Future mediator contract:
```
POST /api/v1/world/assets/candidates
  [authorized user + CSRF protection + tenant context]
  body: validated manifest + separately uploaded licensed GLB
  response: candidate_id + server-produced validation report
PATCH /api/v1/world/assets/candidates/:id
  [reviewer authorization + expected_revision]
  body: staged transform / material changes
  result: sandbox preview revision only, NEVER direct production mutation
POST /api/v1/world/releases
  [maintainer review + CODE/PATTERN/PRESERVATION receipts]
  body: approved versioned candidate revision
  result: audited immutable release
```
All three routes are **proposed**, not deployed or implemented.

### Current execution ledger
- **EXECUTED:** Additive prototype code, photo license gate, manual camera-to-floor prediction, GLB/HDR/PBR import, evidence export and repository preview link, PR creation.
- **TESTED (automation):** Syntax + Node calibration/security unit checks via GitHub Actions (check current PR status).
- **UNKNOWN:** Visually correct perspective against licensed photographs, realistic human perception, full screen browser interaction, image-to-object accuracy, RTX 2060 SUPER frame rate, site-wide regressions on the external live room.
- **NOT EXECUTED:** Live-room deployment, OAuth changes, multiplayer scene state updates, C++ API integration, photo-derived full geometry reconstruction, Pinterest downloads.
