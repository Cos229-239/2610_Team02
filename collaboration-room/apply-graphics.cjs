'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { applyTier4Preview, applyIntegratedGraphics, applyReferenceLook } = require('./graphics-preview.cjs');

const recoveredHash = 'c749c90bbc6de485b4d2a4b823d84e7faccae8aceb2ef2691908cdb4d2295f31';
const publicModule = 'https://dulsky.tail0ef7c0.ts.net/room.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function applyReferenceSurfacePass({ THREE, scene }) {
    const interior = scene.getObjectByName('TF_REFERENCE_INTERIOR');
    const floor = scene.getObjectByName('TF_FLOW_RESIN_FLOOR');
    if (!interior || !floor) throw Error('Reference floor and wall baseline is missing.');

    const canvas = document.createElement('canvas');
    canvas.width = 1536;
    canvas.height = 1152;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw Error('Resin texture canvas is unavailable.');

    let state = 213905;
    const random = () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
    };
    ctx.fillStyle = '#040713';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const roots = [
        [[-70, 720], [280, 465], [205, 294], [455, 150], [611, -45]],
        [[18, 1150], [273, 898], [509, 820], [661, 582], [1000, 575], [1590, 152]],
        [[559, 1210], [677, 867], [914, 820], [1150, 943], [1450, 780], [1600, 486]],
        [[1137, -70], [947, 171], [1087, 309], [1271, 400], [1460, 344], [1598, 442]]
    ];
    const vein = (points, hue, weight) => {
        const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
        const steps = 170;
        const nodes = curve.getPoints(steps);
        ctx.lineCap = 'round';
        for (const [layer, opacity] of [[18, .045], [10, .085], [4.5, .16], [1.45, .52], [.43, .78]]) {
            for (let i = 1; i < nodes.length; i += 3) {
                const t = i / steps;
                const width = Math.max(.28, .64 + Math.sin(t * 18 + hue) * .27 + Math.sin(t * 52) * .13);
                ctx.strokeStyle = `hsla(${hue + 21 * Math.sin(19 * t)}, 92%, ${layer < 1 ? 76 : 53}%, ${opacity})`;
                ctx.lineWidth = weight * width * layer;
                ctx.beginPath();
                ctx.moveTo(nodes[i - 1].x, nodes[i - 1].y);
                for (let j = i; j <= Math.min(i + 2, steps); j++) ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.stroke();
            }
        }
        for (let i = 0; i < steps * 3; i++) {
            const point = nodes[Math.floor(random() * nodes.length)];
            const spread = weight * (random() + random());
            const size = .4 + random() * 2;
            ctx.fillStyle = `rgba(255, ${Math.round(154 + 57 * random())}, 92, ${.12 + random() * .48})`;
            ctx.fillRect(point.x + (random() - .5) * spread * 5, point.y + (random() - .5) * spread * 4, size, size);
        }
    };
    roots.forEach((root, index) => {
        const hue = [216, 228, 268, 202][index];
        vein(root, hue, [5, 8.5, 6, 5.5][index]);
        for (let k = 1; k < root.length - 1; k++) {
            const [x, y] = root[k];
            const sign = k % 2 ? -1 : 1;
            vein([[x, y], [x + sign * 61, y - 26], [x + sign * 113, y - 95],
                [x + sign * (158 + 31 * random()), y - 68 - 68 * random()]], hue + 13, 2.2);
        }
    });

    const resin = new THREE.CanvasTexture(canvas);
    resin.colorSpace = THREE.SRGBColorSpace;
    const oldResin = floor.material.map;
    const reflections = scene.getObjectByName('TF_TIER4_STUDIO_ARCHITECTURE')?.getObjectByName('steel')
        ?.material.envMap;
    floor.material.map = resin;
    floor.material.emissiveMap = resin;
    floor.material.color.set(0xbac9e1);
    floor.material.emissive.set(0xafc7ff);
    floor.material.emissiveIntensity = 0.43;
    floor.material.roughness = 0.24;
    floor.material.metalness = 0.16;
    if (reflections) {
        floor.material.envMap = reflections;
        floor.material.envMapIntensity = 0.6;
    }
    floor.material.needsUpdate = true;
    oldResin?.dispose();

    const shell = new THREE.Group();
    shell.name = 'TF_CURVED_ATRIUM_PANELS';
    const body = new THREE.MeshStandardMaterial({
        color: 0x202b40, roughness: 0.31, metalness: 0.34, envMap: reflections ?? null,
        envMapIntensity: 0.72, side: THREE.DoubleSide
    });
    const infill = new THREE.MeshStandardMaterial({
        color: 0x152134, roughness: 0.68, metalness: 0.12, side: THREE.DoubleSide
    });
    const rail = new THREE.MeshBasicMaterial({ color: 0x91b0da });
    const wallSpans = [
        [0, -15.66, 0, 39.6], [0, 15.66, Math.PI, 39.6],
        [-20.66, 0, Math.PI / 2, 29.4], [20.66, 0, -Math.PI / 2, 29.4]
    ];
    function wallMesh(geometry, material, parent) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.raycast = () => {};
        parent.add(mesh);
        return mesh;
    }
    for (const [x, z, rotation, width] of wallSpans) {
        const face = new THREE.Group();
        face.position.set(x, 0, z);
        face.rotation.y = rotation;
        shell.add(face);
        const n = 5;
        const span = width / n;
        // Curved sections and trim stay behind the existing projector screen and targets.
        for (let i = 0; i < n; i++) {
            const center = -width / 2 + span * (i + 0.5);
            const geometry = new THREE.PlaneGeometry(span - .085, 10.25, 12, 16);
            const points = geometry.attributes.position;
            for (let j = 0; j < points.count; j++) {
                const u = points.getX(j) / (span / 2);
                const v = points.getY(j) / 5.125;
                points.setZ(j, .016 + .044 * (1 - u * u) * (.35 + .65 * Math.abs(v) ** 3));
            }
            geometry.computeVertexNormals();
            wallMesh(geometry, i % 2 ? infill : body, face).position.set(center, 5.28, 0);
        }
        for (const y of [0.45, 10.34]) {
            const curve = new THREE.CatmullRomCurve3([-0.5, -0.3, 0, .3, .5].map(t =>
                new THREE.Vector3(width * t, y + .18 * Math.cos(t * Math.PI * 2), .046)));
            wallMesh(new THREE.TubeGeometry(curve, 36, .012, 5, false), rail, face);
        }
    }
    scene.add(shell);

    // Refine the display frame under the same reflective material without altering the interaction target.
    for (const desk of interior.children.filter(mesh => mesh.name.startsWith('TF_REFERENCE_DESK_'))) {
        const bezel = desk.children.find(mesh => mesh.geometry?.parameters?.width === 2.73);
        if (!bezel) continue;
        bezel.material = bezel.material.clone();
        bezel.material.roughness = .37;
        bezel.material.metalness = .48;
        bezel.material.envMap = reflections ?? null;
        bezel.material.envMapIntensity = .55;
        bezel.material.needsUpdate = true;
    }
    console.info('TowerFlow surface pass applied', { walls: wallSpans.length, veins: roots.length });
}

function promotedSource(original, legacy = false) {
    const preview = fs.readFileSync(require.resolve('./graphics-preview.cjs'), 'utf8');
    let integrated = applyIntegratedGraphics.toString();
    for (const [name, route] of [['earth', 'earth.jpg'], ['clouds', 'clouds.jpg']]) {
        const asset = new RegExp(name + ": Buffer\\.from\\('([A-Za-z0-9+/=]+)', 'base64'\\)").exec(preview);
        if (!asset || !integrated.includes("'/graphics/" + route + "'")) {
            throw Error('Could not locate the checked-in ' + name + ' texture.');
        }
        integrated = integrated.replace("'/graphics/" + route + "'", "'data:image/jpeg;base64," + asset[1] + "'");
    }
    const extension = [
        '',
        '// TF_LIVE_REFERENCE_GRAPHICS_BEGIN',
        'try {',
        '  const studio = (' + applyTier4Preview.toString() + ')({ THREE, scene, earthStatus, textTexture });',
        '  if (studio) (' + integrated + ')({ THREE, scene, renderer, sphere, earthStatus, studio });',
        '} catch (error) { console.warn("TowerFlow graphics setup failed", error); }',
        'try {',
        '  const applied = (' + applyReferenceLook.toString() + ')({ THREE, scene, stations });',
        '  console.info("TowerFlow reference graphics applied", applied);',
        '} catch (error) { console.error("TowerFlow reference interior failed to load", error); }',
        '// TF_LIVE_REFERENCE_GRAPHICS_END',
        ''
    ].join('\n');
    const prior = Buffer.concat([original, Buffer.from(extension)]);
    if (legacy) return prior;
    const surfacePass = '\n// TF_LIVE_REFERENCE_SURFACES_BEGIN\ntry { (' +
        applyReferenceSurfacePass.toString() + ')({ THREE, scene }); }' +
        ' catch (error) { console.error("TowerFlow surface pass failed", error); }' +
        '\n// TF_LIVE_REFERENCE_SURFACES_END\n';
    return Buffer.concat([prior, Buffer.from(surfacePass)]);
}

function install(room, rollback = false) {
    const live = path.join(room, 'public', 'room.js');
    const before = fs.readFileSync(live);
    const backup = path.join(room, 'room.before-reference-graphics.js');
    const existing = fs.existsSync(backup) ? fs.readFileSync(backup) : null;
    const baseline = hash(before) === recoveredHash ? before : existing;
    if (!baseline || hash(baseline) !== recoveredHash || (existing && hash(existing) !== recoveredHash)) {
        throw Error('Live source or rollback copy differs from the recovered baseline. Current SHA256: ' + hash(before));
    }
    const enhanced = promotedSource(baseline);
    const beforeHash = hash(before);
    // Git attributes and Windows checkout settings can only affect serialized addon functions.
    const sameGraphics = candidate =>
        before.subarray(0, baseline.length).equals(baseline) &&
        before.subarray(baseline.length).toString('utf8').replace(/\r\n/g, '\n') ===
        candidate.subarray(baseline.length).toString('utf8').replace(/\r\n/g, '\n');
    if (beforeHash !== recoveredHash && !sameGraphics(enhanced) &&
        !sameGraphics(promotedSource(baseline, true))) {
        throw Error('Live room has other edits. Current SHA256: ' + beforeHash);
    }

    const desired = rollback ? baseline : enhanced;
    const desiredHash = hash(desired);
    if (beforeHash === desiredHash) return { changed: false, sha256: desiredHash };

    const staged = path.join(room, '.towerflow-graphics-' + randomUUID() + '.mjs');
    try {
        fs.writeFileSync(staged, desired, { flag: 'wx' });
        execFileSync(process.execPath, ['--check', staged], { windowsHide: true });
        if (!existing) fs.writeFileSync(backup, baseline, { flag: 'wx' });
        if (hash(fs.readFileSync(live)) !== beforeHash) throw Error('Live room changed during staging.');
        fs.renameSync(staged, live);
        return { changed: true, sha256: desiredHash };
    } finally {
        fs.rmSync(staged, { force: true });
    }
}

async function main() {
    const args = process.argv.slice(2);
    const rollback = args.includes('--rollback');
    const room = args.find(arg => arg !== '--rollback');
    if (!room) throw Error('Pass the Windows live-room directory as the first argument.');
    const result = install(path.resolve(room), rollback);
    console.log((result.changed ? (rollback ? 'Restored' : 'Applied') : 'Already at requested version') +
        '. Local SHA256: ' + result.sha256);
    try {
        const response = await fetch(publicModule + '?check=' + Date.now(), { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw Error('HTTP ' + response.status);
        const servedHash = hash(Buffer.from(await response.arrayBuffer()));
        if (servedHash !== result.sha256) throw Error('Public room.js still serves a different SHA256: ' + servedHash);
        console.log('Public room.js matched. Open TowerFlow and hard refresh once.');
    } catch (error) {
        console.error('Public verification failed: ' + error.message);
        process.exitCode = 2;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('TowerFlow graphics: ' + error.message);
        process.exitCode = 1;
    });
}
module.exports = { install, promotedSource };
