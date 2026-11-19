'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const manifest = require('./vscode/package.json');

function installExtension(target = path.join(os.homedir(), '.vscode', 'extensions')) {
    const folder = path.join(target, manifest.publisher + '.' + manifest.name + '-' + manifest.version);
    fs.mkdirSync(folder, { recursive: true });
    for (const name of ['package.json', 'extension.cjs']) {
        fs.copyFileSync(path.join(__dirname, 'vscode', name), path.join(folder, name));
    }
    return folder;
}

function installRoom(room) {
    const server = path.join(room, 'server.js');
    const original = fs.readFileSync(server);
    const source = original.toString('utf8');
    const newline = source.includes('\r\n') ? '\r\n' : '\n';
    const anchor = "app.get('/room/team02',";
    const marker = "// TF_AZURE_BRIDGE_V1";
    const hook = [
        marker,
        "require('./azure-bridge/server.cjs').mount(app, { auth, ensureMember, publicOrigin, publicDir: path.join(__dirname, 'public') });",
        ''
    ].join(newline);
    if (source.includes(marker) && !source.includes(hook)) throw Error('Existing Azure hook differs. Inspect server.js.');
    if (source.split(anchor).length !== 2) throw Error('Could not locate the room route exactly once in server.js.');
    const scripts = ['quiet-entry.cjs', 'team-updates.cjs', 'loadouts.cjs', 'loadout.js', 'desk.js', 'server.cjs'];
    for (const name of scripts) {
        execFileSync(process.execPath, ['--check', path.join(__dirname, name)], { windowsHide: true });
    }
    const target = path.join(room, 'azure-bridge');
    fs.mkdirSync(target, { recursive: true });
    for (const name of [...scripts, 'loadout.css']) {
        fs.copyFileSync(path.join(__dirname, name), path.join(target, name));
    }
    if (source.includes(hook)) return false;

    const staged = path.join(room, '.azure-server-' + crypto.randomUUID() + '.js');
    try {
        const next = Buffer.from(source.replace(anchor, hook + anchor), 'utf8');
        fs.writeFileSync(staged, next, { flag: 'wx' });
        execFileSync(process.execPath, ['--check', staged], { windowsHide: true });
        const backup = path.join(room, 'server.before-azure-bridge.js');
        if (fs.existsSync(backup)) {
            if (!fs.readFileSync(backup).equals(original)) throw Error('Existing server backup differs.');
        } else {
            fs.copyFileSync(server, backup, fs.constants.COPYFILE_EXCL);
        }
        if (!fs.readFileSync(server).equals(original)) throw Error('server.js changed during installation.');
        fs.renameSync(staged, server);
        return true;
    } finally {
        fs.rmSync(staged, { force: true });
    }
}

if (require.main === module) {
    try {
        const args = process.argv.slice(2);
        const room = args.find(arg => !arg.startsWith('--'));
        if (!room && !args.includes('--extension')) throw Error('Pass the room folder or --extension.');
        if (args.includes('--extension')) console.log('VS Code extension installed at ' + installExtension());
        if (room) {
            const changed = installRoom(path.resolve(room));
            console.log(changed ? 'Azure bridge mounted.' : 'Azure bridge already mounted.');
            console.log('Restart TowerFlow to load the bridge.');
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { installRoom, installExtension };
