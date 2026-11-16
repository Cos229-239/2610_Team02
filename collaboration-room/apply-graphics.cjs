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

function applyCityInterior({ THREE, scene, core, earthStatus, stations }) {
    const cityRoom = new THREE.Group();
    cityRoom.name = 'TF_NIGHT_CITY_INTERIOR';
    const material = (color, roughness = .55, metalness = 0) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const dark = material(0x121924, .42, .45);
    const wallPaint = material(0x313746, .78);
    const deskPaint = material(0xcad1da, .35, .08);
    const chrome = material(0x8295ab, .23, .78);
    const cyan = new THREE.MeshBasicMaterial({ color: 0x85e6ff, toneMapped: false });
    const rose = new THREE.MeshBasicMaterial({ color: 0xf889e7, toneMapped: false });
    const amber = new THREE.MeshBasicMaterial({ color: 0xffc482, toneMapped: false });
    const block = new THREE.BoxGeometry(1, 1, 1);
    function mesh(geometry, finish, x, y, z, parent = cityRoom) {
        const object = new THREE.Mesh(geometry, finish);
        object.position.set(x, y, z);
        object.raycast = () => {};
        parent.add(object);
        return object;
    }
    function box(finish, x, y, z, w, h, d, parent = cityRoom) {
        const object = mesh(block, finish, x, y, z, parent);
        object.scale.set(w, h, d);
        return object;
    }
    const atrium = scene.getObjectByName('TF_REFERENCE_ATRIUM_V2');
    const interior = scene.getObjectByName('TF_REFERENCE_INTERIOR');
    const walls = scene.children.filter(object => {
        const p = object.geometry?.parameters;
        return Math.abs(object.position.x) <= 21 && object.position.y === 5.5 && p?.height === 11 &&
            (p.width === 42 || p.width === .6);
    });
    const glassWall = walls.find(object => object.position.x === -21);
    const ship = scene.children.find(object => object.isGroup && object.position.x === 0 &&
        object.position.z === -1.5 && object.children.some(child =>
            child.geometry?.parameters?.width === 1.65 && child.geometry.parameters.height === .58));
    if (!atrium || !interior || !glassWall || !ship || walls.length !== 4) {
        throw Error('Could not identify the atrium, window wall, and projector.');
    }

    // An actual sightline through the wall, with several depths of 3D towers.
    const skyline = new THREE.Group();
    skyline.name = 'TF_CITY_SKYLINE';
    cityRoom.add(skyline);
    const sky = new THREE.MeshBasicMaterial({ color: 0x101b39, fog: false });
    box(sky, -96, 7, 0, .05, 93, 155, skyline);
    const towers = [0x11192d, 0x1a2236, 0x20263d, 0x182744].map(color =>
        new THREE.MeshBasicMaterial({ color, fog: false }));
    const lamps = [];
    let state = 5203;
    function random() {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    }
    for (let row = 0; row < 3; row++) {
        for (let column = -5; column <= 5; column++) {
            const width = 2.9 + random() * 3.1;
            const height = 9 + random() * 26;
            const x = -(35 + row * 15 + random() * 6);
            const z = column * (7.9 + row * 2.5) + (random() - .5) * 3.9;
            const bottom = -15 - row * 2;
            const depth = 2.8 + random() * 3;
            box(towers[column < 0 ? -column % 4 : (row + column) % 4], x, bottom + height / 2, z,
                depth, height, width, skyline);
            if (height > 27) box(towers[1], x, bottom + height + .6, z, depth * .68, 1.2, width * .52, skyline);
            for (let y = bottom + .75; y < bottom + height - .5; y += .85) {
                for (let offset = -width / 2 + .36; offset < width / 2 - .2; offset += .66) {
                    lamps.push([x + depth / 2 + .012, y, z + offset, random()]);
                }
            }
        }
    }
    const windowPane = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2);
    const pixels = new THREE.InstancedMesh(windowPane, new THREE.MeshBasicMaterial({ fog: false }), lamps.length);
    pixels.name = 'TF_CITY_OCCUPANCY_WINDOWS';
    pixels.raycast = () => {};
    const pose = new THREE.Object3D();
    const lightColors = [0xffc584, 0xf4e3c4, 0x8bc7f7, 0x79a4cb].map(color => new THREE.Color(color));
    const off = new THREE.Color(0x0a1223);
    lamps.forEach(([x, y, z, seed], i) => {
        pose.position.set(x, y, z);
        pose.scale.set(1, .30, .33);
        pose.updateMatrix();
        pixels.setMatrixAt(i, pose.matrix);
        pixels.setColorAt(i, seed < .57 ? lightColors[i % 4] : off);
    });
    pixels.instanceColor.setUsage(THREE.DynamicDrawUsage);
    skyline.add(pixels);
    const airplane = new THREE.Group();
    airplane.name = 'TF_CITY_AIRCRAFT';
    skyline.add(airplane);
    const aircraftMetal = new THREE.MeshBasicMaterial({ color: 0xced7ea, fog: false });
    box(aircraftMetal, 0, 0, 0, .18, .14, 1.5, airplane);
    box(aircraftMetal, 0, -.03, .12, 1.65, .05, .24, airplane);
    const beacon = new THREE.MeshBasicMaterial({ color: 0xff5357, fog: false });
    box(beacon, -.81, 0, .12, .10, .085, .10, airplane);
    box(new THREE.MeshBasicMaterial({ color: 0x72ffd6, fog: false }), .81, 0, .12, .10, .085, .10, airplane);
    box(new THREE.MeshBasicMaterial({ color: 0xfff4dc, fog: false }), 0, 0, .75, .12, .09, .12, airplane);
    let next = 0;
    pixels.onBeforeRender = () => {
        const now = performance.now();
        const flight = ((now / 1000 + 12) % 65);
        airplane.visible = flight < 29;
        airplane.position.set(-53 - .18 * flight, 17 + .09 * flight, -57 + flight * 4);
        if (now < next) return;
        next = now + 850;
        for (let n = 0; n < 14; n++) {
            const i = Math.floor(random() * lamps.length);
            pixels.setColorAt(i, random() < .56 ? lightColors[i % 4] : off);
        }
        pixels.instanceColor.needsUpdate = true;
    };

    const glazing = new THREE.MeshBasicMaterial({
        color: 0x6e99cc, opacity: .105, transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
    box(glazing, -20.69, 5.5, 0, .035, 10.6, 31.55);
    for (let z = -15.55; z <= 15.6; z += 3.11) box(dark, -20.52, 5.5, z, .28, 10.46, .105);
    for (const y of [.42, 10.67]) {
        box(dark, -20.50, y, 0, .42, .22, 31.65);
        box(cyan, -20.26, y, 0, .035, .025, 31.48);
    }

    // Recessed perimeter strips and localized spill keep the wall finish visible.
    for (const [z, finish] of [[-15.39, cyan], [15.39, rose]]) {
        box(dark, 0, 10.48, z, 40.8, .17, .14);
        box(finish, 0, 10.43, z * .995, 40.65, .032, .04);
    }
    for (const [z, finish] of [[-12.8, cyan], [-12.52, amber], [-12.24, rose]]) {
        box(dark, 20.64, 5.2, z, .14, 8.4, .09);
        box(finish, 20.55, 5.2, z, .026, 8.24, .036);
    }
    for (const [x, color, intensity] of [[-13, 0x8bcaff, 70], [13, 0xe998ed, 53], [17, 0x729dff, 42]]) {
        const spill = new THREE.PointLight(color, intensity, 15, 2);
        spill.position.set(x, 5.3, x === 17 ? 0 : -9);
        cityRoom.add(spill);
    }

    // Reuse the station display textures and locations, replacing only their furniture models.
    const deskReplacements = [];
    const movableDesks = [];
    for (const source of interior.children.filter(object => object.name.startsWith('TF_REFERENCE_DESK_'))) {
        const id = source.name.slice('TF_REFERENCE_DESK_'.length);
        const stand = new THREE.Group();
        stand.name = 'TF_WINDOW_DESK_' + id;
        stand.position.copy(source.position);
        cityRoom.add(stand);
        deskReplacements.push(source);
        const legacyAnchor = scene.children.find(object => {
            const size = object.geometry?.parameters;
            return object.position.x === source.position.x && object.position.z === source.position.z &&
                size?.width === 4.5 && size.height === .16 && size.depth === 1.8;
        });
        if (legacyAnchor) movableDesks.push([stand, legacyAnchor]);
        box(deskPaint, 0, 1.20, 0, 4.45, .21, 1.75, stand);
        box(deskPaint, 0, 1.05, .47, 4.37, .13, .73, stand);
        for (const x of [-1.94, 1.94]) for (const z of [-.61, .62]) {
            box(chrome, x, .55, z, .065, 1.09, .065, stand);
        }
        box(dark, 0, 1.12, .847, 4.03, .013, .011, stand);
        box(chrome, 0, 1.31, -.32, .70, .055, .45, stand);
        const stem = box(chrome, 0, 1.60, -.44, .18, .58, .10, stand);
        stem.rotation.x = -.12;
        box(deskPaint, 0, 2.19, -.49, 2.68, 1.46, .09, stand);
        box(dark, 0, 2.26, -.435, 2.61, 1.28, .024, stand);
        const monitor = source.children.find(object => object.geometry?.parameters?.width === 2.55);
        if (monitor) mesh(monitor.geometry, monitor.material, 0, 2.26, -.417, stand);
        box(chrome, -.18, 1.32, .40, 1.27, .038, .38, stand);
        box(dark, -.18, 1.344, .40, 1.19, .012, .31, stand);
        const mouse = mesh(new THREE.SphereGeometry(.13, 14, 8), deskPaint, .72, 1.33, .40, stand);
        mouse.scale.set(.69, .38, 1.13);
        box(id === 'music' ? rose : cyan, 0, 1.131, .885, 4.02, .021, .016, stand);
    }

    const craft = new THREE.Group();
    craft.name = 'TF_GLOSS_PROJECTOR_CRAFT';
    const reflect = scene.getObjectByName('TF_TIER4_STUDIO_ARCHITECTURE')?.getObjectByName('steel')?.material.envMap;
    const ceramic = new THREE.MeshPhysicalMaterial({
        color: 0xdbe8f3, metalness: .36, roughness: .17, clearcoat: 1,
        clearcoatRoughness: .11, envMap: reflect ?? null, envMapIntensity: 1.1
    });
    const cockpit = new THREE.MeshPhysicalMaterial({
        color: 0x101f34, metalness: .64, roughness: .13, clearcoat: 1,
        envMap: reflect ?? null, envMapIntensity: 1.5
    });
    const form = new THREE.Shape();
    form.moveTo(0, -1.40);
    form.bezierCurveTo(.51, -1.19, .64, -.46, 1.36, -.12);
    form.bezierCurveTo(1.85, .09, 2.02, .57, 1.61, .93);
    form.bezierCurveTo(1.26, 1.06, .76, .55, 0, .85);
    form.bezierCurveTo(-.76, .55, -1.26, 1.06, -1.61, .93);
    form.bezierCurveTo(-2.02, .57, -1.85, .09, -1.36, -.12);
    form.bezierCurveTo(-.64, -.46, -.51, -1.19, 0, -1.40);
    const body = new THREE.ExtrudeGeometry(form, {
        depth: .16, bevelEnabled: true, bevelThickness: .102, bevelSize: .09,
        bevelSegments: 3, curveSegments: 12
    }).rotateX(Math.PI / 2);
    mesh(body, ceramic, 0, .10, 0, craft);
    const canopy = mesh(new THREE.SphereGeometry(1, 30, 16), cockpit, 0, .22, -.27, craft);
    canopy.scale.set(.37, .21, .71);
    for (const side of [-1, 1]) {
        const exhaust = mesh(new THREE.TorusGeometry(.212, .049, 10, 30), chrome, side * 1.26, -.04, .84, craft);
        exhaust.scale.set(1.35, .57, 1);
        const hot = mesh(new THREE.CircleGeometry(.168, 24), amber, side * 1.26, -.04, .851, craft);
        hot.scale.set(1.35, .52, 1);
        const guide = box(cyan, side * .39, .09, -.94, .031, .017, .49, craft);
        guide.rotation.y = side * .23;
    }
    mesh(new THREE.TorusGeometry(.16, .035, 10, 28), cyan, 0, -.07, -1.44, craft).rotation.y = Math.PI;

    // Commit after construction. Preserve the four projector targets and state machine.
    walls.forEach(object => { object.material = wallPaint; });
    glassWall.visible = false;
    const curved = scene.getObjectByName('TF_CURVED_ATRIUM_PANELS');
    if (curved) curved.visible = false;
    for (const name of ['TF_FRONTIER_CYBER_AMBIENCE_V1', 'TF_REFERENCE_STUDIO_V1']) {
        const group = scene.getObjectByName(name);
        if (group) group.visible = false;
    }
    for (const name of ['COMPUTE_RACK_CERAMIC_METAL', 'NETWORK_FIBER_STATUS', 'OPTICAL_TERMINAL_RINGS']) {
        scene.getObjectByName(name)?.layers.disable(0);
    }
    atrium.children.forEach(object => {
        if (object.position.y > 1 && (Math.abs(object.position.x) > 18 || Math.abs(object.position.z) > 14.9)) {
            object.visible = false;
        }
    });
    interior.children.forEach(object => {
        if (object.geometry?.type === 'TubeGeometry') object.visible = false;
    });
    deskReplacements.forEach(object => { object.visible = false; });
    for (const [stand] of movableDesks) {
        for (const object of scene.children) {
            const sizes = object.geometry?.parameters;
            const dx = Math.abs(object.position.x - stand.position.x);
            const dz = Math.abs(object.position.z - stand.position.z);
            if (dx > 1.9 || dz > .84 || object.position.y < .62 || object.position.y > 3.28) continue;
            if ((sizes?.depth !== undefined && [4.5, .13, 4.2, 2.55, 2.37, 2.2, 1.15, .42].includes(sizes.width)) ||
                (sizes?.width === 3.9 && sizes.height === .8)) object.layers.disable(0);
        }
    }
    ship.children.forEach(object => { if (object.isMesh) object.visible = false; });
    ship.add(craft);

    core.position.set(-8.6, 3.15, 1.8);
    earthStatus.position.set(-8.6, 1.79, 1.95);
    const earthStation = stations.find(station => station.label === 'Holographic computer');
    if (earthStation) Object.assign(earthStation, { x: core.position.x, z: core.position.z });
    scene.add(cityRoom);
    function followProjectorFixtures() {
        requestAnimationFrame(followProjectorFixtures);
        for (const [desk, anchor] of movableDesks) desk.position.y = anchor.position.y - 1.25;
    }
    followProjectorFixtures();
    console.info('TowerFlow city interior applied', { buildings: 33, windows: lamps.length, desks: deskReplacements.length });
}

function promotedSource(original, revision = 3) {
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
    if (revision === 1) return prior;
    const surfacePass = '\n// TF_LIVE_REFERENCE_SURFACES_BEGIN\ntry { (' +
        applyReferenceSurfacePass.toString() + ')({ THREE, scene }); }' +
        ' catch (error) { console.error("TowerFlow surface pass failed", error); }' +
        '\n// TF_LIVE_REFERENCE_SURFACES_END\n';
    const surfaces = Buffer.concat([prior, Buffer.from(surfacePass)]);
    if (revision === 2) return surfaces;
    const cityPass = '\n// TF_LIVE_CITY_INTERIOR_BEGIN\ntry { (' +
        applyCityInterior.toString() + ')({ THREE, scene, core, earthStatus, stations }); }' +
        ' catch (error) { console.error("TowerFlow city interior failed", error); }' +
        '\n// TF_LIVE_CITY_INTERIOR_END\n';
    return Buffer.concat([surfaces, Buffer.from(cityPass)]);
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
        !sameGraphics(promotedSource(baseline, 2)) && !sameGraphics(promotedSource(baseline, 1))) {
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
