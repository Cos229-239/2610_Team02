'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {teamRepo} = require('./loadouts.cjs');

function webPath(file) {
    if (typeof file !== 'string' || !file.startsWith('TowerFlow/') || file.startsWith('TowerFlow/TowerFlow.Native/')) return null;
    const name = file.slice('TowerFlow/'.length);
    if (name.split('/').some(s => !s || s === '.' || s === '..' || /[\\:]/.test(s)) || /(^|\/)server\.js$/i.test(name)) return null;
    return /\.(html|css|js|json|png|jpe?g|webp|gif|svg|ico|woff2?|mp3|ogg|wav|mp4|webm)$/i.test(name) ? name : null;
}

// Compare the host's published file to GitHub's git blob ID, including the Git object header.
async function compareWebFiles(files, publicDir, disk) {
    const expected = new Map();
    for (const f of files) {
        const current = webPath(f.filename), old = webPath(f.previous_filename);
        if (old && old !== current) expected.set(old, null);
        if (current) expected.set(current, f.status === 'removed' ? null : f.sha);
    }
    if (!expected.size) return null;
    try {
        for (const [file, sha] of expected) {
            if (sha !== null && !/^[a-f\d]{40}$/.test(sha)) return 'unknown';
            if (!disk.has(file)) disk.set(file, (async () => {
                try {
                    const full = path.join(publicDir, 'towerflow', file);
                    if ((await fs.stat(full)).size > 16 * 1024 * 1024) throw Error('Asset exceeds comparison budget');
                    const bytes = await fs.readFile(full);
                    return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
                } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
            })());
            if (await disk.get(file) !== sha) return 'different';
        }
        return 'match';
    } catch { return 'unknown'; }
}

function makeTeamUpdates(publicDir, read = fetch, clock = Date.now) {
    let cached, expires = 0;
    return async function updates(token) {
        // All authenticated room members can see the same dev history. Only the public team data is cached.
        if (cached && clock() < expires) return cached;
        const signal = AbortSignal.timeout(12000);
        async function get(route) {
            const result = await read('https://api.github.com/repos/'+teamRepo+route, {headers:{Authorization:'Bearer '+token, 'User-Agent':'TowerFlow-Team-Updates'}, signal, redirect:'error'});
            if (!result.ok) throw Error('GitHub history unavailable');
            return result.json();
        }
        const promise = (async () => {
            const recent = await get('/commits?sha=dev&per_page=8');
            const disk = new Map();
            return Promise.all(recent.map(async c => {
                const item = {sha:c.sha, title:c.commit.message.split('\n')[0], author:c.author?.login || c.commit.author.name,
                    at:c.commit.committer.date, native:false, room:false, web:null, complete:false};
                try {
                    const detail = await get('/commits/'+c.sha+'?per_page=100');
                    const files = detail.files;
                    if (!Array.isArray(files) || files.length >= 100) return item;
                    item.web = await compareWebFiles(files, publicDir, disk);
                    item.room = files.some(f => /^collaboration-room\//.test(f.filename));
                    item.native = files.some(f => /\.(?:slnx?|vcxproj|csproj|cs|cpp|hpp|h)$/i.test(f.filename));
                    item.complete = true;
                } catch { /* GitHub's commit is still useful when individual file details are unavailable. */ }
                return item;
            }));
        })();
        cached = promise; expires = clock()+60_000;
        try { return await promise; } catch (error) { if (cached === promise) cached = undefined; throw error; }
    };
}
module.exports = {makeTeamUpdates, compareWebFiles};
