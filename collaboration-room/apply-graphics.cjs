'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { applyTier4Preview, applyIntegratedGraphics, applyReferenceLook } = require('./graphics-preview.cjs');

const recoveredHash = 'c749c90bbc6de485b4d2a4b823d84e7faccae8aceb2ef2691908cdb4d2295f31';
const publicModule = 'https://dulsky.tail0ef7c0.ts.net/room.js';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function promotedSource(original) {
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
    return Buffer.concat([original, Buffer.from(extension)]);
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
    if (beforeHash !== recoveredHash && beforeHash !== hash(enhanced)) {
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
