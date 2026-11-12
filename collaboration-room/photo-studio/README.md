# TowerFlow Photo-Grounded 3D Studio

**Candidate, not deployed:** This is a *separate* browser preview. It does not alter the authentic collaboration room or the TowerFlow business application. It is not a trained image-to-3D neural reconstruction system.

## Launch using the existing local Foundry preview server
From the **repository root**:

```powershell
node .\collaboration-room\preview-server.cjs
```

Open **http://127.0.0.1:4174/photo-studio/index.html**.

The first page load needs internet access for the pinned Three.js ES modules (v0.169.0). Source images remain local in your browser; there is no data-posting endpoint. The repo's existing preview server binds to `127.0.0.1`. Do not expose the preview server to the Internet.

## Run tests
```powershell
node --test .\collaboration-room\photo-studio\calibration.test.mjs
node --check .\collaboration-room\photo-studio\studio.js
```

## Use with Pinterest
1. Explore photographic architecture, furniture, interiors, and lighting with **Find photographic references**. Paste a Pin or board link to track your design provenance.
2. Check the **original creator's rights**. Pinterest does not grant a general license to copy or repurpose images found there. Select owner, valid license, or permission, and upload your authorized local photo. The app never fetches the Pin.
3. Provide camera vertical field-of-view, height, distance and downward tilt. These are *manual approximate* parameters until you solve vanishing points, focal length, and physical scale in Blender Perspective Match / fSpy-like tools.
   Optionally load up to **eight additional authorized photos** of the same subject from different angles. This stores file names, dimensions, license assertions and SHA-256 hashes only; no hidden geometry is computed automatically.
4. Click the **visible floor-contact point** of the furniture in the photo. The ray/ground intersection is a *prediction conditional on the camera assumptions*.
5. Enter furniture dimensions (meters) and identify whether physically measured or estimated; choose the procedural structurally modeled sofa or upload a rights-cleared **embedded-resource GLB**.
6. Optionally load CC0 or licensed HDR photographic environment and albedo/normal/roughness material maps. For browser speed start with **1–2K** maps, not 8K. Photo texture alignment/UVs need manual validation.
7. Press **Place from observed contact**, inspect the scene, then **Export evidence manifest**. The exported JSON contains metadata, camera assumptions and an observed pixel anchor; it does **not** contain the source photo.

## What executes now
- Photo license gate, 16MB JPEG/PNG/WebP local intake, up to eight supplementary multi-angle metadata records, and SHA-256 (when browser crypto is available).
- Legal Pinterest *URL capture only*, never Pinterest media fetching or scraping.
- Pinhole camera parameter validation, aspect-correct contact-point projection, physically computed floor intersection.
- A physically modeled sofa with individual cushions, back, arms, piping, metal legs; an architectural floor, walls, table, light fixture and plant are separate mesh elements.
- Three.js PBR materials, physically-based light interactions, local HDR panorama environment support, local photographic PBR map replacement.
- Local imported GLB with internal geometry/texture resources only, byte/triangle bounds.
- Renderer loop FPS, draw calls and triangle counts (not GPU profiler measurements).
- Exported manifest that distinguishes observation, estimated dimensions, inferred hidden geometry, and missing verification evidence.

## What is NOT solved or guaranteed
- No vision inference, object segmentation, monocular depth estimator, photogrammetry reconstruction, Blender automation, texture baking, camera vanishing-point detection, or automatic Pinterest asset download.
- Default sofa and room are physically structured candidate meshes **not photograph-matched reconstructions**.
- A single photo cannot recover real unseen geometry; an optional GLB must be separately authored/scanned.
- HDRI is photographic lighting but is not a replacement for architectural bounce light, soft contact shadow fidelity or path tracing.
- No claim of photorealistic output quality, target 60 FPS, VRAM utilization, end-to-end or multiple-client testing until independently measured on target hardware.
- External Three.js modules require an online connection to the CDN for the initial preview. For production: vendor a pinned, audited local copy.
- The preview server has no user authentication. Keep it loopback-only.

## Recommended production stages
- Stage 1: Collect a short Pinterest reference board, track photographers/licensing and architectural perspective. Select 3 representative rights-cleared test photos and one measured real furniture object.
- Stage 2: Use Blender Perspective Match to solve the photo camera; use physical dimensions as anchors. Generate mesh from *visible* silhouettes and parts; document hypothetical back surfaces.
- Stage 3: Apply verified image-based texture materials or authored photogrammetry/GLB. Use free Poly Haven CC0 HDRI/PBR data to reduce cost without stealing image assets.
- Stage 4: Capture 12–40 overlapping images of your own furniture where possible and run AliceVision/Meshroom; retopologize, bake normal/AO, produce optimized GLB and compare held-out views. Image counts are a capture-plan example, not a guarantee.
- Stage 5: Execute CODE / PATTERN / PRESERVATION evaluation against representative examples. Preserve existing camera movement and projector until a working change is separately reviewed.
- Stage 6: Only merge validated assets and an integrated renderer after browser acceptance, rights review and production data protection checks.

**Open references:** [Pinterest Copyright](https://help.pinterest.com/en/article/copyright), [Pinterest Developer Terms](https://developers.pinterest.com/terms/), [Khronos glTF PBR](https://www.khronos.org/gltf/pbr/), [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html), [Poly Haven CC0](https://polyhaven.com/license), [AliceVision](https://alicevision.org/), [Blender Perspective Match](https://extensions.blender.org/add-ons/perspective-match/).

**Preservation:** Branch work only, additive `collaboration-room/photo-studio`. No modifications of existing `TowerFlow`, collaboration auth, player controls, business data or scene settings.
