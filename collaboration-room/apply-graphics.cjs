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

function applyMaterialPolish({ THREE, scene, renderer }) {
    const interior = scene.getObjectByName('TF_NIGHT_CITY_INTERIOR');
    const skyline = scene.getObjectByName('TF_CITY_SKYLINE');
    const floor = scene.getObjectByName('TF_FLOW_RESIN_FLOOR');
    if (!interior || !skyline || !floor) throw Error('City and resin baseline was not initialized.');

    // Preserve the resin texture and its branching pattern. Restrict diffuse fill on black stone.
    floor.material.color.set(0x667185);
    floor.material.emissiveIntensity = 0.34;
    floor.material.roughness = 0.19;
    floor.material.metalness = 0.08;

    const glass = interior.children.find(object => object.position.x === -20.69 && object.material?.transparent);
    if (glass) {
        glass.material.color.set(0x7c8fa7);
        glass.material.opacity = 0.023;
    }
    interior.children.filter(object => object.isPointLight).forEach(light => {
        light.intensity *= light.position.x === 17 ? .57 : .78;
    });

    const sky = skyline.children.find(object => object.position.x === -96);
    if (sky) {
        sky.material = new THREE.ShaderMaterial({
            vertexShader: `
                varying vec2 tfUv;
                void main() {
                    tfUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }`,
            fragmentShader: `
                varying vec2 tfUv;
                void main() {
                    float altitude = clamp(tfUv.y, 0.0, 1.0);
                    float horizon = exp(-pow((altitude - .42) * 4.7, 2.0));
                    float cloud = .5 + .5 * sin(tfUv.x * 15.0 + sin(tfUv.x * 23.0) + altitude * 13.0);
                    float band = exp(-pow((altitude - .57 - .015 * sin(tfUv.x * 22.0)) * 21.0, 2.0));
                    vec3 color = mix(vec3(.012,.020,.035),vec3(.002,.006,.019),altitude);
                    color += horizon * vec3(.058,.044,.066);
                    color += cloud * band * vec3(.017,.019,.033);
                    gl_FragColor = vec4(color, 1.0);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }`
        });
    }
    // Thin, progressively denser atmospheric scatter in the distant tower materials.
    for (const object of skyline.children) {
        const distance = Math.abs(object.position.x);
        if (!object.isMesh || object === sky || distance < 28 || !object.material.color) continue;
        const finish = object.material.clone();
        finish.color.lerp(new THREE.Color(0x33405c), Math.min(.4, Math.max(0, (distance - 30) / 105)));
        object.material = finish;
    }
    const windows = scene.getObjectByName('TF_CITY_OCCUPANCY_WINDOWS');
    if (windows) windows.material.color.set(0xb4b1ae);

    const fixtures = new THREE.Group();
    fixtures.name = 'TF_HOURGLASS_WALL_LIGHTS';
    const metal = new THREE.MeshStandardMaterial({ color: 0x2b323e, metalness: .58, roughness: .38 });
    const diffuser = new THREE.MeshStandardMaterial({
        color: 0xffeee0, emissive: 0xffcf9e, emissiveIntensity: 2.3, roughness: .48,
        side: THREE.DoubleSide
    });
    const shape = new THREE.Shape();
    shape.moveTo(-.28, -1.22);
    shape.bezierCurveTo(-.25, -.61, -.075, -.29, -.075, 0);
    shape.bezierCurveTo(-.075, .31, -.26, .62, -.28, 1.22);
    shape.lineTo(.28, 1.22);
    shape.bezierCurveTo(.26, .62, .075, .31, .075, 0);
    shape.bezierCurveTo(.075, -.29, .25, -.61, .28, -1.22);
    shape.closePath();
    const channel = new THREE.ExtrudeGeometry(shape, {
        depth: .09, bevelThickness: .027, bevelSize: .024, bevelSegments: 2, curveSegments: 16
    });
    const aperture = new THREE.ShapeGeometry(shape, 20);
    const softWash = new THREE.PlaneGeometry(3.2, 5.5);
    const glow = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `
            varying vec2 tfUv;
            void main() {
                tfUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            varying vec2 tfUv;
            void main() {
                vec2 p = tfUv - .5;
                float flare = abs(p.y) * .36 + .045;
                float spread = exp(-pow(p.x / flare, 2.0) * 1.25);
                float edge = pow(max(0.0, 1.0 - abs(p.y) * 2.0), 1.75);
                gl_FragColor = vec4(.92,.48,.22,spread * edge * .20);
            }`
    });
    const placements = [
        [-16.2, -15.62, 0], [16.2, -15.62, 0],
        [-16.2, 15.62, Math.PI], [16.2, 15.62, Math.PI],
        [20.63, -11.95, -Math.PI / 2], [20.63, 11.95, -Math.PI / 2]
    ];
    for (const [x, z, rotation] of placements) {
        const fixture = new THREE.Group();
        fixture.position.set(x, 5.1, z);
        fixture.rotation.y = rotation;
        fixtures.add(fixture);
        const housing = new THREE.Mesh(channel, metal);
        housing.scale.set(1.21, 1.037, 1);
        const lamp = new THREE.Mesh(aperture, diffuser);
        lamp.position.z = .122;
        const wash = new THREE.Mesh(softWash, glow);
        wash.position.z = .008;
        for (const object of [housing, lamp, wash]) {
            object.raycast = () => {};
            fixture.add(object);
        }
    }
    // Only the two front fixtures contribute actual local light. The other sconces use wall wash.
    for (const x of [-16.2, 16.2]) {
        const light = new THREE.PointLight(0xffc99e, 17, 8.2, 2);
        light.position.set(x, 5.1, -15.15);
        fixtures.add(light);
    }
    scene.add(fixtures);

    // Low-resolution planar reflection. Retain the resin material as the fallback.
    const target = new THREE.WebGLRenderTarget(640, 360, { type: THREE.HalfFloatType });
    const mirrorCamera = new THREE.PerspectiveCamera();
    const textureMatrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const up = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const targetPoint = new THREE.Vector3();
    const surfaceNormal = new THREE.Vector3(0, 1, 0);
    const surfacePosition = new THREE.Vector3(0, floor.position.y + .003, 0);
    const plane = new THREE.Plane();
    const clip = new THREE.Vector4();
    const corner = new THREE.Vector4();
    const mirrorMaterial = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { mirrorMap: { value: target.texture }, textureMatrix: { value: textureMatrix },
            active: { value: 0 }, texel: { value: new THREE.Vector2(1 / 640, 1 / 360) } },
        vertexShader: `
            uniform mat4 textureMatrix;
            varying vec4 mirrorUv;
            varying vec3 tfPosition;
            void main() {
                mirrorUv = textureMatrix * vec4(position, 1.0);
                tfPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`,
        fragmentShader: `
            uniform sampler2D mirrorMap;
            uniform vec2 texel;
            uniform float active;
            varying vec4 mirrorUv;
            varying vec3 tfPosition;
            void main() {
                vec2 uv = mirrorUv.xy / mirrorUv.w;
                vec3 reflected = texture2D(mirrorMap, uv).rgb * .60;
                reflected += .10 * texture2D(mirrorMap, uv + vec2(texel.x, 0.0)).rgb;
                reflected += .10 * texture2D(mirrorMap, uv - vec2(texel.x, 0.0)).rgb;
                reflected += .10 * texture2D(mirrorMap, uv + vec2(0.0, texel.y)).rgb;
                reflected += .10 * texture2D(mirrorMap, uv - vec2(0.0, texel.y)).rgb;
                float grazing = pow(1.0 - abs(normalize(cameraPosition - tfPosition).y), 3.0);
                gl_FragColor = vec4(reflected, active * (.095 + .46 * grazing));
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }`
    });
    const mirror = new THREE.Mesh(floor.geometry, mirrorMaterial);
    mirror.name = 'TF_POLISHED_MARBLE_REFLECTION';
    mirror.position.copy(surfacePosition);
    mirror.rotation.copy(floor.rotation);
    mirror.raycast = () => {};
    let last = -Infinity;
    mirror.onBeforeRender = (draw, world, camera) => {
        if (!camera.isPerspectiveCamera || draw.getRenderTarget() || performance.now() - last < 42) return;
        camera.getWorldPosition(position);
        if (position.y <= surfacePosition.y) return;
        camera.getWorldQuaternion(quaternion);
        camera.getWorldDirection(direction).reflect(surfaceNormal);
        up.copy(camera.up).applyQuaternion(quaternion).reflect(surfaceNormal);
        mirrorCamera.position.copy(position);
        mirrorCamera.position.y = 2 * surfacePosition.y - position.y;
        mirrorCamera.up.copy(up);
        targetPoint.copy(mirrorCamera.position).add(direction);
        mirrorCamera.lookAt(targetPoint);
        mirrorCamera.far = camera.far;
        mirrorCamera.layers.mask = camera.layers.mask;
        mirrorCamera.updateMatrixWorld();
        mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);
        textureMatrix.set(.5,0,0,.5, 0,.5,0,.5, 0,0,.5,.5, 0,0,0,1)
            .multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse).multiply(mirror.matrixWorld);

        // Oblique clip plane prevents the inverted camera from drawing objects below the stone.
        plane.setFromNormalAndCoplanarPoint(surfaceNormal, surfacePosition).applyMatrix4(mirrorCamera.matrixWorldInverse);
        clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
        const p = mirrorCamera.projectionMatrix.elements;
        corner.set((Math.sign(clip.x) + p[8]) / p[0], (Math.sign(clip.y) + p[9]) / p[5], -1, (1 + p[10]) / p[14]);
        const divisor = clip.dot(corner);
        if (Math.abs(divisor) < 1e-6) return;
        clip.multiplyScalar(2 / divisor);
        p[2] = clip.x; p[6] = clip.y; p[10] = clip.z + .998; p[14] = clip.w;

        const previousTarget = draw.getRenderTarget();
        const xr = draw.xr.enabled;
        const shadows = draw.shadowMap.autoUpdate;
        try {
            mirror.visible = false;
            draw.xr.enabled = false;
            draw.shadowMap.autoUpdate = false;
            draw.setRenderTarget(target);
            draw.state.buffers.depth.setMask(true);
            draw.clear();
            draw.render(world, mirrorCamera);
            mirrorMaterial.uniforms.active.value = 1;
            last = performance.now();
        } catch (error) {
            mirrorMaterial.uniforms.active.value = 0;
            mirror.removeFromParent();
            console.warn('TowerFlow planar reflection unavailable; using resin finish.', error);
        } finally {
            draw.setRenderTarget(previousTarget);
            draw.shadowMap.autoUpdate = shadows;
            draw.xr.enabled = xr;
            mirror.visible = true;
        }
    };
    scene.add(mirror);
    console.info('TowerFlow polished materials applied', { sconces: placements.length, reflection: '640x360 planar' });
}

function applyDaylightDevelopment({ THREE, scene, core, earthStatus, stations, tfRegister, inDevelopment }) {
    const devX = 62;
    const dev = new THREE.Group();
    dev.name = 'TF_DAYLIGHT_BUSINESS_ROOM';
    const surroundings = new THREE.Group();
    surroundings.name = 'TF_DEVELOPMENT_DAY_CITY';
    dev.add(surroundings);
    const roomMeshes = scene.children.filter(object => {
        const p = object.geometry?.parameters;
        return object.position.x >= 41 && object.position.x <= 83 && p?.height === 11 && [42, .6].includes(p.width);
    });
    const ship = scene.getObjectByName('TF_GLOSS_PROJECTOR_CRAFT');
    if (roomMeshes.length !== 4 || !ship) throw Error('Development shell or projector model was not found.');

    let seed = 15184;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const metal = (color, roughness=.5, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
    const block = new THREE.BoxGeometry(1,1,1);
    const frame = metal(0x354654,.28,.51);
    const plaster = metal(0xa4aab2,.81);
    const wood = metal(0x78634f,.43);
    const graphite = metal(0x222933,.46,.25);
    const trim = metal(0x98a5ad,.32,.5);
    const panelGlass = new THREE.MeshBasicMaterial({
        color:0xa2c9df, transparent:true, opacity:.045, side:THREE.DoubleSide, depthWrite:false
    });
    function mesh(geometry, material, x,y,z,parent=dev) {
        const object = new THREE.Mesh(geometry,material);
        object.position.set(x,y,z);
        object.raycast=()=>{};
        parent.add(object);
        return object;
    }
    function box(material,x,y,z,w,h,d,parent=dev) {
        const object=mesh(block,material,x,y,z,parent);
        object.scale.set(w,h,d);
        return object;
    }
    const sky = new THREE.ShaderMaterial({
        side:THREE.BackSide, depthWrite:false,
        uniforms:{ clock:{value:0} },
        vertexShader:`
            varying vec3 worldDirection;
            void main() {
                worldDirection = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
            }`,
        fragmentShader:`
            uniform float clock;
            varying vec3 worldDirection;
            float hash21(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
            float smoothNoise(vec2 p) {
                vec2 cell=floor(p), f=fract(p); f=f*f*(3.-2.*f);
                return mix(mix(hash21(cell),hash21(cell+vec2(1.,0.)),f.x),
                           mix(hash21(cell+vec2(0.,1.)),hash21(cell+vec2(1.,1.)),f.x),f.y);
            }
            void main() {
                vec3 d=normalize(worldDirection);
                float height=max(0.,d.y);
                vec3 c=mix(vec3(.65,.82,.91),vec3(.06,.38,.73),pow(clamp(height*1.62,0.,1.),.55));
                vec2 p=d.xz/max(.12,d.y+.24)*2.8+vec2(clock*.005,0.);
                float cloud=smoothstep(.44,.72,.56*smoothNoise(p)+.28*smoothNoise(p*2.2)+.16*smoothNoise(p*4.3));
                c=mix(c,mix(vec3(.67,.78,.86),vec3(1.,.98,.93),height+.24),cloud*smoothstep(.02,.22,d.y)*.85);
                float sun=max(0.,dot(d,normalize(vec3(.59,.52,-.61))));
                c+=vec3(1.,.84,.56)*(pow(sun,44.)*.17+pow(sun,650.)*.74);
                if(d.y<0.) c=mix(vec3(.24,.33,.42),c,smoothstep(-.35,0.,d.y));
                gl_FragColor=vec4(c,1.);
                #include <colorspace_fragment>
            }`
    });
    const dome=mesh(new THREE.SphereGeometry(103,36,20),sky,devX,2,0,surroundings);
    dome.renderOrder=-10;
    dome.onBeforeRender=()=>{sky.uniforms.clock.value=performance.now()/1000;};

    const ground=new THREE.MeshBasicMaterial({color:0x627985,fog:false});
    box(ground,devX+14,-31.3,0,146,.2,146,surroundings);
    const road=new THREE.MeshBasicMaterial({color:0x4c5e69,fog:false});
    for(let n=-4;n<=4;n++){
        box(road,devX+n*13,-31.15,0,2.65,.03,135,surroundings);
        box(road,devX+9,-31.14,n*13,130,.03,2.45,surroundings);
    }
    const facade=document.createElement('canvas');
    facade.width=64;facade.height=128;
    const paint=facade.getContext('2d');
    if(!paint) throw Error('Tower facade canvas unavailable.');
    paint.fillStyle='#526d84';paint.fillRect(0,0,64,128);
    for(let y=3;y<125;y+=8) for(let x=3;x<62;x+=8){
        paint.fillStyle=['#253e57','#6592a9','#96aab1','#bdd5dc','#ecdaa4'][Math.floor(random()*5)];
        paint.fillRect(x,y,5,5);
    }
    const map=new THREE.CanvasTexture(facade);
    map.colorSpace=THREE.SRGBColorSpace;
    const finishes=[0xffffff,0xc5dbf0,0x94bad8,0x769ebd].map(color =>
        new THREE.MeshBasicMaterial({color,map,fog:false}));
    const crown=new THREE.MeshBasicMaterial({color:0xa5b8c5,fog:false});
    const windowEvents=[];
    let count=0;
    for(let row=-4;row<=4;row++) for(let col=-2;col<=5;col++){
        const x=devX+col*12.3+(random()-.5)*4;
        const z=row*12.8+(random()-.5)*4;
        if(x>39&&x<86&&Math.abs(z)<20) continue;
        if(x<39&&Math.abs(z)<18) continue;
        if(Math.hypot(x-devX,z)>74) continue;
        const height=12+random()*37, width=4+random()*4, depth=4+random()*4;
        const distance=Math.hypot(x-devX,z);
        const body=finishes[distance>55?3:count%3];
        box(body,x,-31+height/2,z,width,height,depth,surroundings);
        if(height>35){
            box(crown,x,-31+height+.5,z,width*.62,1,depth*.64,surroundings);
            if(count%3===0) box(crown,x,-31+height+2.05,z,.10,3.1,.10,surroundings);
        }
        if(distance<52){
            const face=z<0?z+depth/2+.025:z-depth/2-.025;
            for(let n=0;n<10;n++) windowEvents.push([x+(random()-.5)*width*.68,-27+random()*(height-7),face]);
        }
        count++;
    }
    if(windowEvents.length){
        const occupancy=new THREE.InstancedMesh(block,new THREE.MeshBasicMaterial({fog:false}),windowEvents.length);
        occupancy.name='TF_DAY_CITY_OCCUPANCY';
        occupancy.raycast=()=>{};
        const temp=new THREE.Object3D();
        const bright=new THREE.Color(0xffe0a2), dark=new THREE.Color(0x395e79);
        windowEvents.forEach(([x,y,z],i)=>{
            temp.position.set(x,y,z);temp.scale.set(.28,.36,.027);temp.updateMatrix();
            occupancy.setMatrixAt(i,temp.matrix);occupancy.setColorAt(i,i%3===0?bright:dark);
        });
        let next=0;
        occupancy.onBeforeRender=()=>{
            const now=performance.now();
            if(now<next)return;
            next=now+620;
            for(let n=0;n<5;n++) occupancy.setColorAt(Math.floor(random()*windowEvents.length),random()>.65?bright:dark);
            occupancy.instanceColor.needsUpdate=true;
        };
        surroundings.add(occupancy);
    }
    const traffic=new THREE.Group();
    traffic.name='TF_DAY_CITY_STREET_TRAFFIC';surroundings.add(traffic);
    const trafficMetal=new THREE.MeshBasicMaterial({color:0xd7c1a0,fog:false});
    for(let i=0;i<8;i++) box(trafficMetal,devX+26+(i%2?.6:-.6),-30.83,0,.42,.22,.87,traffic);
    dome.onBeforeRender=()=>{
        const t=performance.now()/1000;
        sky.uniforms.clock.value=t;
        traffic.children.forEach((car,i)=>{car.position.z=(i%2?1:-1)*(((t*2.9+i*16.1)%112)-56);});
    };

    // Keep the shared service wall and replace the three outward walls with glazing.
    for(const wall of roomMeshes){
        if(wall.position.x===41){wall.material=plaster;continue;}
        wall.visible=false;
        const side=wall.position.x===83;
        const x=side?82.67:devX;
        const z=side?0:Math.sign(wall.position.z)*15.68;
        box(panelGlass,x,5.4,z,side?.016:41.5,10.45,side?31.5:.016);
        for(let u=-(side?15:20);u<=(side?15:20);u+=5) {
            box(frame,side?x:x+u,5.43,side?u:z,side?.24:.13,10.65,side?.13:.24);
        }
        for(const y of [.36,10.55]) box(frame,x,y,z,side?.28:41.6,.13,side?31.6:.28);
    }
    const slab=scene.children.find(o=>o.position.x===devX&&o.position.y===-.27&&o.geometry?.parameters.width===42);
    if(slab) slab.material=metal(0x6e7074,.47,.08);
    const ceiling=scene.children.find(o=>o.position.x===devX&&o.position.y===11.4&&o.geometry?.parameters.width===42);
    if(ceiling) ceiling.material=metal(0xb3bac3,.82);
    // Cover only the Development Room ceiling effects with a clean business ceiling liner.
    box(plaster,devX,10.79,0,41.45,.13,31.28);
    const warm=new THREE.MeshBasicMaterial({color:0xffe5c5});
    for (const z of [-15,15]) box(warm,devX,10.676,z,40,.022,.069);
    const daylight=new THREE.DirectionalLight(0xfff2d9,2.0);
    daylight.position.set(93,37,-29);
    daylight.target.position.set(devX,0,0);
    dev.add(daylight,daylight.target);
    const bounce=new THREE.HemisphereLight(0xbbe3ff,0xb0a29b,.7);dev.add(bounce);

    const desks=stations.filter(station=>station.id.startsWith('dev-ide-'));
    for(const station of desks){
        for(const object of scene.children){
            const p=object.geometry?.parameters;
            if(object.isMesh && p?.depth!==undefined && Math.abs(object.position.x-station.x)<2 &&
                Math.abs(object.position.z-station.z)<.86 && object.position.y>=.62 && object.position.y<=2.15 &&
                [4.5,.13,4.2,2.55,2.37,2.2,1.15,.42].includes(p.width))object.visible=false;
        }
        const x=station.x,z=station.z;
        const top=mesh(new THREE.BoxGeometry(5.8,.18,1.95),wood,x,1.29,z);
        top.castShadow=true;
        box(graphite,x,1.18,z,5.58,.10,1.82);
        for(const s of [-1,1])box(graphite,x+s*2.32,.64,z,.10,1.19,1.35);
        box(trim,x,1.42,z+.4,1.3,.04,.32);
        for(let m=-1;m<=1;m++){
            const consoleScreen=new THREE.Group();consoleScreen.position.set(x+m*1.62,2.10,z-.45+Math.abs(m)*.12);
            consoleScreen.rotation.y=-m*.19;dev.add(consoleScreen);
            box(graphite,0,0,0,1.57,.94,.08,consoleScreen);
            box(metal(0x152e45,.49),0,0,.045,1.45,.80,.015,consoleScreen);
            box(trim,0,-.52,-.04,.13,.21,.15,consoleScreen);
            if(m===0){
                const badge=mesh(new THREE.PlaneGeometry(1.42,.28),new THREE.MeshBasicMaterial({
                    map:makeDisplay(station.label),toneMapped:false
                }),0,.075,.059,consoleScreen);
                badge.name='TF_BUSINESS_WORKSTATION_LABEL';
            }
        }
        const seat=mesh(new THREE.SphereGeometry(1,16,10),graphite,x,.82,z+1.35);
        seat.scale.set(.54,.11,.54);
        const back=mesh(new THREE.SphereGeometry(1,16,10),graphite,x,1.22,z+1.74);
        back.scale.set(.47,.51,.11);
        box(trim,x,.41,z+1.35,.08,.75,.08);
    }
    function makeDisplay(name){
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=100;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#142434';ctx.fillRect(0,0,512,100);
        ctx.fillStyle='#e2edf7';ctx.font='24px sans-serif';ctx.textAlign='center';ctx.fillText(name,256,40);
        ctx.fillStyle='#98b6cc';ctx.font='17px sans-serif';ctx.fillText('Press E to open workspace',256,73);
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
    }
    scene.add(dev);
    function visibleInDevelopment(){
        dev.visible=inDevelopment();
        requestAnimationFrame(visibleInDevelopment);
    }
    visibleInDevelopment();

    tfRegister(core.children.find(object=>object.geometry?.type==='SphereGeometry'), 'dev-room');
    tfRegister(earthStatus,'dev-room');
    const earthStation=stations.find(station=>station.label==='Holographic computer');
    if(earthStation){earthStation.id='dev-room';earthStation.label='Enter TowerFlow Development';}

    // Build the rounded pearl projector and sapphire canopy on the existing animated mount.
    const mirror=scene.getObjectByName('TF_TIER4_STUDIO_ARCHITECTURE')?.getObjectByName('steel')?.material.envMap;
    const glossy=new THREE.MeshPhysicalMaterial({color:0xe0e5ec,roughness:.12,metalness:.53,
        clearcoat:1,clearcoatRoughness:.075,envMap:mirror,envMapIntensity:1.35});
    const sapphire=new THREE.MeshPhysicalMaterial({color:0x064985,roughness:.075,metalness:.43,
        clearcoat:1,clearcoatRoughness:.048,envMap:mirror,envMapIntensity:1.8,
        emissive:0x0d3b66,emissiveIntensity:.21});
    const newHousing=new THREE.Group();newHousing.name='TF_SAPPHIRE_PROJECTOR';
    ship.children.forEach(object => { object.visible = false; });
    newHousing.scale.setScalar(1 / ship.parent.scale.x);
    ship.add(newHousing);
    const shellMesh=mesh(new THREE.SphereGeometry(1,64,34),glossy,0,0,0,newHousing);
    const point=shellMesh.geometry.attributes.position;
    for(let i=0;i<point.count;i++){
        const x=point.getX(i),y=point.getY(i),z=point.getZ(i);
        const flare=.95+.32*Math.max(0,z);
        point.setXYZ(i,x*1.6*flare,y*.35,z*1.57);
    }
    shellMesh.geometry.computeVertexNormals();
    for(const [height,depth] of [[.31,.85],[-.24,.61]]){
        const dome=mesh(new THREE.SphereGeometry(1,48,24),sapphire,0,height,-.24,newHousing);
        dome.scale.set(.55,.18,depth);
    }
    const optic=new THREE.MeshBasicMaterial({color:0x7edbff});
    const exhaust=new THREE.MeshBasicMaterial({color:0xffbc69});
    for(const x of [-1,1]){
        const ring=mesh(new THREE.TorusGeometry(.14,.025,12,32),exhaust,x,-.10,1.14,newHousing);
        ring.scale.set(1.32,.58,1);
        const stripe=mesh(new THREE.CapsuleGeometry(.017,.49,6,12),optic,x*.55,-.245,-.61,newHousing);
        stripe.rotation.x=Math.PI/2;
    }
    mesh(new THREE.TorusGeometry(.13,.025,10,32),optic,0,-.073,-1.565,newHousing);
    console.info('TowerFlow daylight development applied', { towers:count, windows:roomMeshes.length-1, desks:desks.length });
}

function applyNightCityDepth({ THREE, scene, inDevelopment }) {
    const city = scene.getObjectByName('TF_CITY_SKYLINE');
    if (!city) throw Error('Night skyline not initialized.');
    const detail = new THREE.Group();
    detail.name = 'TF_NIGHT_CITY_DEPTH';
    const groundY = -32.5;
    const palette = {
        ground: 0x151d2a, roof: 0x202936, road: 0x292733, walk: 0x383743,
        line: 0x8b775d, water: 0x112237, trees: 0x172c2d, lamp: 0xdab487
    };
    const geometry = new THREE.BoxGeometry(1,1,1);
    const rows = Object.fromEntries(Object.keys(palette).map(name=>[name,[]]));
    const cube = (kind,x,y,z,w,h,d)=>rows[kind].push([x,y,z,w,h,d]);
    let seed=23191;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const channels=[-29,-46,-62,-76];
    const alleys=[-44,-30,-16,-3,11,26,42];
    cube('ground',-48,groundY-.32,0,60,.6,132);
    cube('ground',-105,groundY-.32,0,21,.6,150);
    cube('water',-86,groundY-.54,0,19,.1,163);
    cube('walk',-77.7,groundY+.025,0,.4,.16,134);
    cube('walk',-95.8,groundY+.025,0,.42,.16,145);
    for(const x of channels){
        cube('road',x,groundY+.012,0,2.3,.02,126);
        for(const side of [-1,1])cube('walk',x+side*1.4,groundY+.04,0,.39,.065,126);
        for(let z=-60;z<=60;z+=3){
            cube('line',x,groundY+.028,z,.035,.007,.83);
            if(z%6===0)cube('lamp',x+.97,groundY+.085,z,.08,.04,.13);
        }
    }
    for(const z of alleys){
        cube('road',-48,groundY+.017,z,58,.022,1.75);
        for(let x=-73;x<-21;x+=3)cube('line',x,groundY+.030,z,.85,.009,.038);
    }
    for(const z of [-26,22]){
        cube('walk',-86.7,groundY+1.65,z,19,.34,2.36);
        cube('road',-86.7,groundY+1.84,z,19,.08,1.82);
        for(let x=-95;x<-78;x+=1.6)for(const side of [-1,1])
            cube('lamp',x,groundY+2,z+side*1.02,.08,.09,.10);
    }
    // A quiet park and street-level blocks give the eye a scale reference below the glass.
    cube('trees',-25,groundY+.025,5,5,.08,8.7);
    for(let i=0;i<19;i++)cube('trees',-23.4-random()*3.6,groundY+.43,1+random()*8,.36,.78,.4);
    for(let i=0;i<27;i++){
        const x=-26-random()*44,z=(random()-.5)*116;
        if(channels.some(v=>Math.abs(x-v)<2.1)||alleys.some(v=>Math.abs(z-v)<1.6))continue;
        const height=1.2+random()*4.7;
        cube('roof',x,groundY+height*.5,z,1+random()*2.2,height,.9+random()*2.3);
        cube('lamp',x,groundY+.54,z+.53,.25,.12,.045);
    }
    for(let i=0;i<22;i++){
        const x=-98-random()*15,z=(random()-.5)*138, h=1.6+random()*11;
        cube('roof',x,groundY+h*.5,z,2.8+random()*2.7,h,2.2+random()*2.8);
        cube('lamp',x+.27,groundY+h+.07,z,.065,.13,.12);
    }

    const towerFace=document.createElement('canvas');
    towerFace.width=128;towerFace.height=256;
    const ctx=towerFace.getContext('2d');
    if(!ctx)throw Error('Night facade texture canvas unavailable.');
    ctx.fillStyle='#435063';ctx.fillRect(0,0,128,256);
    for(let x=0;x<128;x+=16){
        ctx.fillStyle=x%32===0?'#253044':'#5b6879';ctx.fillRect(x,0,3,256);
        for(let y=0;y<256;y+=10){
            ctx.fillStyle=random()<.16?'#9b7759':random()<.30?'#4a627d':'#29364b';
            ctx.fillRect(x+4,y+2,10,6);
            ctx.fillStyle='#738293';ctx.fillRect(x+4,y+7,10,1);
        }
    }
    for(let y=18;y<256;y+=41){ctx.fillStyle='#202a39';ctx.fillRect(0,y,128,3);}
    const atlas=new THREE.CanvasTexture(towerFace);atlas.colorSpace=THREE.SRGBColorSpace;atlas.anisotropy=4;

    // Local atmospheric shading keeps the atrium, instruments and daylight room untouched.
    function cityMaterial(color, map=null, shaded=false){
        const material=new THREE.MeshBasicMaterial({color,map,fog:false});
        material.onBeforeCompile=shader=>{
            shader.vertexShader='varying vec3 tfCityPoint;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
                #include <project_vertex>
                vec4 tfLocal=vec4(transformed,1.0);
                #ifdef USE_INSTANCING
                    tfLocal=instanceMatrix*tfLocal;
                #endif
                tfCityPoint=(modelMatrix*tfLocal).xyz;`);
            shader.fragmentShader='varying vec3 tfCityPoint;\n'+shader.fragmentShader;
            shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`
                #include <color_fragment>
                float distanceToEye=length(cameraPosition-tfCityPoint);
                float fade=clamp(1.0-exp(-pow(distanceToEye*.014,1.32)),.02,.87);
                float lowHaze=1.0-smoothstep(-32.5,-5.0,tfCityPoint.y);
                ${shaded?`vec3 n=normalize(cross(dFdx(tfCityPoint),dFdy(tfCityPoint)));
                  float face= .56 + .37 * abs(dot(n,normalize(vec3(.64,.61,.44))));
                  diffuseColor.rgb*=face;`:''}
                diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.065,.085,.13)+lowHaze*vec3(.018,.016,.013),fade);`);
        };
        material.customProgramCacheKey=()=>shaded?'towerflow-night-facade-depth-v1':'towerflow-night-depth-v1';
        return material;
    }
    const towerMaterials=[0xb9c3d6,0x8aadc9,0xc5b8a7,0x9895b1].map(color=>cityMaterial(color,atlas,true));
    const originalTowers=city.children.filter(o=>o.isMesh&&o.geometry?.type==='BoxGeometry'&&
        o.position.x< -28&&o.position.x> -90&&o.scale.y>=9&&o.scale.y<=37);
    originalTowers.forEach((tower,i)=>{
        const top=tower.position.y+tower.scale.y/2;
        tower.scale.y=top-groundY;
        tower.position.y=(top+groundY)/2;
        tower.material=towerMaterials[i%4];
        const {x,z}=tower.position,w=tower.scale.x,d=tower.scale.z;
        cube('roof',x,top+.095,z,w*1.03,.19,d*1.03);
        cube('roof',x+.19,top+.4,z-.24,w*.41,.67,d*.38);
        cube('line',x-w*.43,top+.18,z,.036,.14,d*.84);
        if(i%3===0)cube('lamp',x+.22,top+1.06,z-.31,.09,.10,.09);
    });
    const horizon=city.children.find(o=>o.position.x===-96);
    if(horizon){
        horizon.position.x=-119;
        horizon.scale.z=173;
        // A veiled skyline gradient with a warm reflected horizon and drifting cloud bands.
        horizon.material=new THREE.ShaderMaterial({
            vertexShader:`
                varying vec2 uvSky;
                void main(){uvSky=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
            `,
            fragmentShader:`
                varying vec2 uvSky;
                uniform float clock;
                float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
                float noise(vec2 p){
                    vec2 c=floor(p),u=fract(p);u=u*u*(3.-2.*u);
                    return mix(mix(hash(c),hash(c+vec2(1.,0.)),u.x),mix(hash(c+vec2(0.,1.)),hash(c+vec2(1.)),u.x),u.y);
                }
                void main(){
                    float y=uvSky.y;
                    vec3 c=mix(vec3(.085,.098,.16),vec3(.008,.016,.047),smoothstep(.33,.94,y));
                    float bank=exp(-pow((y-.43)*6.5,2.));
                    vec2 cloudPoint=uvSky*vec2(8.,19.)+vec2(clock*.011,0.);
                    float cloud=smoothstep(.40,.72,noise(cloudPoint)*.67+noise(cloudPoint*2.6)*.33);
                    c+=vec3(.07,.052,.025)*bank;
                    c=mix(c,c*.59+vec3(.032,.031,.052),cloud*smoothstep(.42,.67,y)*.72);
                    gl_FragColor=vec4(c,1.);
                    #include <colorspace_fragment>
                }
            `,
            uniforms:{clock:{value:0}}
        });
        horizon.onBeforeRender=()=>{horizon.material.uniforms.clock.value=performance.now()/1000;};
    }

    const transform=new THREE.Object3D();
    for(const [name,items] of Object.entries(rows)){
        if(!items.length)continue;
        const batch=new THREE.InstancedMesh(geometry,cityMaterial(palette[name]),items.length);
        batch.name='TF_NIGHT_CITY_'+name.toUpperCase();
        batch.raycast=()=>{};
        items.forEach(([x,y,z,w,h,d],i)=>{
            transform.position.set(x,y,z);transform.scale.set(w,h,d);transform.updateMatrix();
            batch.setMatrixAt(i,transform.matrix);
        });
        detail.add(batch);
    }
    const traffic=new THREE.InstancedMesh(geometry,cityMaterial(0xf5c080),36);
    traffic.name='TF_NIGHT_CITY_TRAFFIC';
    traffic.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    traffic.frustumCulled=false;
    traffic.raycast=()=>{};
    detail.add(traffic);
    let next=0;
    traffic.onBeforeRender=()=>{
        const now=performance.now();
        if(now<next)return;
        next=now+65;
        for(let i=0;i<traffic.count;i++){
            const direction=i%2?1:-1;
            const x=channels[i%channels.length]+direction*.42;
            const z=direction*(((now*.0024+i*17.87)%122)-61);
            transform.position.set(x,groundY+.13,z);transform.scale.set(.19,.13,.35);transform.updateMatrix();
            traffic.setMatrixAt(i,transform.matrix);
        }
        traffic.instanceMatrix.needsUpdate=true;
    };
    city.add(detail);
    function selectNightExterior(){
        city.visible=!inDevelopment();
        requestAnimationFrame(selectNightExterior);
    }
    selectNightExterior();
    console.info('TowerFlow night city depth applied',{ground:groundY,texturedTowers:originalTowers.length,vehicleCount:traffic.count});
}

function applyPouredStoneFinish({ THREE, scene }) {
    const floor = scene.getObjectByName('TF_FLOW_RESIN_FLOOR');
    if (!floor) throw Error('Resin floor was not initialized.');
    const canvas=document.createElement('canvas');
    const width=1280,height=960;
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Poured stone canvas unavailable.');
    const image=ctx.createImageData(width,height);
    const bands=[
        [0.00,[4,5,9]],[.19,[7,9,15]],[.29,[18,30,37]],[.345,[33,91,107]],
        [.39,[64,166,182]],[.418,[156,225,225]],[.444,[25,79,98]],
        [.487,[7,12,23]],[.55,[14,15,19]],[.595,[92,42,20]],
        [.653,[184,90,36]],[.688,[241,166,79]],[.712,[115,49,35]],
        [.761,[31,20,35]],[.815,[82,65,104]],[.85,[144,127,164]],
        [.89,[25,22,39]],[1,[4,5,9]]
    ];
    const channels = new Uint8Array(256*3);
    let band=0;
    for(let i=0;i<256;i++){
        const p=i/255;
        while(band<bands.length-2&&p>bands[band+1][0])band++;
        const [start,lo]=bands[band], [end,hi]=bands[band+1];
        const t=(p-start)/(end-start);
        for(let c=0;c<3;c++)channels[i*3+c]=lo[c]+(hi[c]-lo[c])*t;
    }
    const sin=Math.sin, exp=Math.exp;
    let seed=904933;
    for(let y=0;y<height;y++){
        const v=y/height;
        for(let x=0;x<width;x++){
            const u=x/width;
            // Curls and shear vary on independent scales, giving unequal ribbons and narrow mineral lines.
            const curve=u+.12*sin(v*12+u*3)+.065*sin(v*27-u*12)+.034*sin(u*35+v*23);
            const lean=curve+.065*sin(curve*25+v*8)+.022*sin(curve*60-v*16);
            const whirl=lean*3.05+.13*sin(lean*18+v*20)+.075*sin(v*34+u*12);
            const f=whirl-Math.floor(whirl);
            const mineral=.58+.42*sin(lean*243+v*54+sin(v*47+u*38)*2.8)**4;
            const pool=.45+.55*(1-exp(-13*Math.abs(sin(f*Math.PI))));
            const idx=Math.min(255,Math.floor(f*255))*3;
            const pixel=(y*width+x)*4;
            seed=(Math.imul(1664525,seed)+1013904223)>>>0;
            const fleck=(seed&511)<(f>.32&&f<.72?11:2)?(.14+((seed>>>14)&127)/140)*106:0;
            const tint=(.76+.24*mineral)*pool;
            image.data[pixel]=channels[idx]*tint+fleck;
            image.data[pixel+1]=channels[idx+1]*tint+fleck*.80;
            image.data[pixel+2]=channels[idx+2]*tint+fleck*.57;
            image.data[pixel+3]=255;
        }
    }
    ctx.putImageData(image,0,0);
    const texture=new THREE.CanvasTexture(canvas);
    texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
    const old=floor.material.map;
    floor.material.map=texture;
    floor.material.emissiveMap=null;
    floor.material.emissive.set(0x000000);
    floor.material.color.set(0xc4c1bb);
    floor.material.roughness=.115;
    floor.material.metalness=.055;
    floor.material.envMapIntensity=.72;
    floor.material.needsUpdate=true;
    old?.dispose();
    const mirror=scene.getObjectByName('TF_POLISHED_MARBLE_REFLECTION');
    if(mirror) {
        mirror.material.fragmentShader=mirror.material.fragmentShader.replace(
            'active * (.095 + .46 * grazing)', 'active * (.16 + .51 * grazing)');
        mirror.material.needsUpdate=true;
    }
    console.info('TowerFlow poured stone applied', { width,height, reflection:!!mirror });
}

function buildWindowRain(context) {
    const rate=24000, seconds=29;
    const buffer=context.createBuffer(2,rate*seconds,rate);
    const left=buffer.getChannelData(0),right=buffer.getChannelData(1);
    let seed=180219;
    const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
    // Discrete, rounded impacts on glass. Every impact decays before the next cluster.
    for(let d=0;d<520;d++){
        const time=random()*seconds, start=Math.floor(time*rate);
        const weight=.19+random()*.81;
        const pan=random()*2-1;
        const center=320+random()*660;
        const tail=.012+random()*.063;
        const samples=Math.floor(tail*rate);
        const l=Math.sqrt(.5-.44*pan),r=Math.sqrt(.5+.44*pan);
        const drift=2*Math.PI*center;
        const over=drift*(1.54+random()*.34);
        for(let i=0;i<samples;i++){
            const t=i/rate,life=i/samples;
            const attack=Math.min(1,t/.0028);
            const decay=(1-life)**3*Math.exp(-65*t);
            const value=weight*attack*decay*(Math.sin(drift*t)+.13*Math.sin(over*t))*.13;
            const j=(start+i)%left.length;
            left[j]+=value*l;right[j]+=value*r;
            // A quiet delayed pane reflection gives the rain separation without a noise bed.
            const echo=(j+Math.round(rate*.013))%left.length;
            left[echo]+=value*r*.16;right[echo]+=value*l*.16;
        }
    }
    let sum=0,peak=0;
    for(let i=0;i<left.length;i++){
        sum+=left[i]**2+right[i]**2;
        peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
    }
    const normal=Math.min(.50/(peak||1),.047/(Math.sqrt(sum/(left.length*2))||1));
    for(let i=0;i<left.length;i++){left[i]*=normal;right[i]*=normal;}
    return buffer;
}

function promotedSource(original, revision = 7) {
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
    const city = Buffer.concat([surfaces, Buffer.from(cityPass)]);
    if (revision === 3) return city;
    const polishPass = '\n// TF_LIVE_MATERIAL_POLISH_BEGIN\ntry { (' +
        applyMaterialPolish.toString() + ')({ THREE, scene, renderer }); }' +
        ' catch (error) { console.error("TowerFlow material polish failed", error); }' +
        '\n// TF_LIVE_MATERIAL_POLISH_END\n';
    const polished = Buffer.concat([city, Buffer.from(polishPass)]);
    if (revision === 4) return polished;
    const business = '\n// TF_LIVE_DAYLIGHT_DEVELOPMENT_BEGIN\ntry { (' +
        applyDaylightDevelopment.toString() + ')({ THREE, scene, core, earthStatus, stations, tfRegister, inDevelopment: () => tfDevRoom }); }' +
        ' catch (error) { console.error("TowerFlow daylight development failed", error); }' +
        '\n// TF_LIVE_DAYLIGHT_DEVELOPMENT_END\n';
    const daylight = Buffer.concat([polished, Buffer.from(business)]);
    if (revision === 5) return daylight;
    const nightDepth = '\n// TF_LIVE_NIGHT_CITY_DEPTH_BEGIN\ntry { (' +
        applyNightCityDepth.toString() + ')({ THREE, scene, inDevelopment: () => tfDevRoom }); }' +
        ' catch (error) { console.error("TowerFlow night depth failed", error); }' +
        '\n// TF_LIVE_NIGHT_CITY_DEPTH_END\n';
    const night = Buffer.concat([daylight, Buffer.from(nightDepth)]);
    if (revision === 6) return night;
    const finish = [
        '',
        '// TF_LIVE_POURED_STONE_AND_RAIN_BEGIN',
        'try { (' + applyPouredStoneFinish.toString() + ')({ THREE, scene }); }',
        'catch (error) { console.error("TowerFlow poured stone unavailable", error); }',
        'const tfBuildWindowRain = ' + buildWindowRain.toString() + ';',
        'let tfRainTrack;',
        'startAmbience = function startWindowRain() {',
        '    stopAmbience();',
        '    const Audio = window.AudioContext || window.webkitAudioContext;',
        '    if (!Audio) { showToast("Audio unavailable in this browser"); return; }',
        '    try {',
        '        const context = new Audio();',
        '        ambience = context;',
        '        tfRainTrack ??= tfBuildWindowRain(context);',
        '        const source = context.createBufferSource();',
        '        source.buffer = tfRainTrack; source.loop = true;',
        '        const filter = context.createBiquadFilter();',
        '        filter.type = "lowpass"; filter.frequency.value = 1800; filter.Q.value = .5;',
        '        const volume = context.createGain(); volume.gain.value = .50;',
        '        source.connect(filter); filter.connect(volume); volume.connect(context.destination);',
        '        ambientNodes.push(source, filter, volume);',
        '        window.tfFrontier?.resumeEnvironmentAudio?.();',
        '        window.tfFrontier?.trackAmbientAudio?.({ gain: volume.gain, context });',
        '        volume.gain.setValueAtTime(0, context.currentTime);',
        '        volume.gain.setTargetAtTime(.50, context.currentTime, .22);',
        '        source.start();',
        '        void context.resume().catch(() => { if (ambience === context) stopAmbience(); });',
        '        showToast("Window rain playing");',
        '    } catch (error) {',
        '        stopAmbience(); console.warn("Window rain unavailable", error); showToast("Window rain unavailable");',
        '    }',
        '};',
        'const tfPreviousMusicPanel = musicPanel;',
        'musicPanel = function showWindowRain() {',
        '    tfPreviousMusicPanel();',
        '    const rain = document.getElementById("rain");',
        '    if (rain) rain.textContent = "Window rain";',
        '};',
        '// TF_LIVE_POURED_STONE_AND_RAIN_END',
        ''
    ].join('\n');
    return Buffer.concat([night, Buffer.from(finish)]);
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
        !sameGraphics(promotedSource(baseline, 6)) &&
        !sameGraphics(promotedSource(baseline, 5)) &&
        !sameGraphics(promotedSource(baseline, 4)) &&
        !sameGraphics(promotedSource(baseline, 3)) &&
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
