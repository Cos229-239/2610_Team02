'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {mountDemo} = require('./debug-demo.cjs');
const {mountPreview} = require('./merged-preview.cjs');
const {makeTeamUpdates} = require('./team-updates.cjs');
const {makeLoadouts, publishedBranches} = require('./loadouts.cjs');
const {quietEntry, memberEntry} = require('./quiet-entry.cjs');

function mount(app, { auth, ensureMember, publicOrigin, publicDir, now = Date.now, preview }) {
    const permissions = { writer: 30 * 60_000, reader: 5 * 60_000 };
    const load = makeLoadouts();
    const updates = makeTeamUpdates(publicDir);
    const grants = new Map();
    const records = new Map();
    const digest = value => crypto.createHash('sha256').update(value).digest('hex');
    const prefix = '/api/azure-bridge';
    const owned = req => req.session.user.login;
    const noCache = (req, res, next) => {
        res.set('Cache-Control', 'no-store');
        res.set('Referrer-Policy', 'no-referrer');
        next();
    };
    const sameOrigin = (req, res, next) => {
        if (req.get('Origin') !== publicOrigin) return res.sendStatus(403);
        next();
    };
    app.use(prefix, noCache);
    mountDemo(app,{auth,ensureMember,sameOrigin,now});
    mountPreview(app,{auth,ensureMember,publicOrigin},preview);
    for (const file of ['studio.js','desk.js', 'loadout.js', 'loadout.css']) {
        app.get('/azure-bridge/' + file, (req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(__dirname, file)));
    }
    // Reuse the host's OAuth state and callback. Only change the official authorization redirect.
    app.get('/auth/github', (req, res, next) => {
        const redirect = res.redirect;
        res.redirect = function (...args) {
            const i = args.length - 1;
            if (typeof args[i] === 'string' && args[i].startsWith('https://github.com/login/oauth/authorize?')) {
                const url = new URL(args[i]);
                url.searchParams.set('prompt', 'select_account');
                args[i] = url.href;
            }
            return redirect.apply(this, args);
        };
        next();
    });
    app.get(prefix + '/loadout', auth, ensureMember, async (req, res, next) => {
        try { res.json(await load(owned(req), req.session.token)); } catch (error) { next(error); }
    });
    app.get(prefix + '/team-updates', auth, ensureMember, async (req, res) => {
        try { res.json(await updates(req.session.token)); } catch { res.sendStatus(502); }
    });
    app.get(prefix + '/branches', auth, ensureMember, async (req, res) => {
        try { res.json(await publishedBranches(owned(req), req.session.token)); } catch { res.sendStatus(502); }
    });
    app.get(prefix + '/history', auth, ensureMember, async (req, res) => {
        const {ref, repo} = req.query;
        if (typeof ref !== 'string' || !ref || ref.length > 255 || typeof repo !== 'string') return res.sendStatus(400);
        try {
            if (repo !== 'Cos229-239/2610_Team02') {
                const {work} = await load(owned(req), req.session.token);
                if (work?.type !== 'pull' || work.repo !== repo || work.ref !== ref) return res.sendStatus(403);
            }
            const params = new URLSearchParams({sha:ref, per_page:12});
            const response = await fetch('https://api.github.com/repos/' + repo + '/commits?' + params, {
                headers: {Authorization:'Bearer ' + req.session.token, 'User-Agent':'TowerFlow-Azure-Desk'},
                redirect:'error', signal:AbortSignal.timeout(8000)
            });
            if (!response.ok) return res.sendStatus(response.status === 404 ? 404 : 502);
            const commits = await response.json();
            res.json(commits.map(c => ({sha:c.sha, title:c.commit.message.split('\n')[0],
                author:c.author?.login || c.commit.author.name})));
        } catch { res.sendStatus(502); }
    });
    // Keep relative module imports at the same directory depth as the original /room.js.
    app.get('/towerflow-entry.mjs', async (req, res, next) => {
        try {
            const source = await fs.readFile(path.join(publicDir, 'room.js'), 'utf8');
            res.set('Cache-Control', 'no-cache').type('application/javascript').send(memberEntry(quietEntry(source)));
        } catch (error) { next(error); }
    });
    app.get('/room/team02', async (req, res, next) => {
        try {
            const html = await fs.readFile(path.join(publicDir, 'index.html'), 'utf8');
            if (!/<\/body\s*>/i.test(html)) return next();
            res.set('Cache-Control', 'no-cache').type('html').send(
                html.replace(/(\bsrc=["'])\/room\.js(?=[?"'])/, '$1/towerflow-entry.mjs')
                    .replace(/<script\b[^>]*\bsrc=["']\/azure-bridge\/(?:desk|loadout|studio)\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script\s*>/gi, '')
                    .replace(/<link\b[^>]*\bhref=["']\/azure-bridge\/loadout\.css(?:\?[^"']*)?["'][^>]*>/gi, '')
                    .replace(/<\/head\s*>/i, '<link rel="stylesheet" href="/azure-bridge/loadout.css">$&')
                    .replace(/<\/body\s*>/i, '<script src="/azure-bridge/studio.js" defer></script><script src="/azure-bridge/loadout.js" defer></script><script src="/azure-bridge/desk.js" defer></script>$&')
            );
        } catch (error) { next(error); }
    });

    app.post(prefix + '/pair', auth, ensureMember, sameOrigin, (req, res) => {
        const { scope, receipt } = req.body ?? {};
        if (!Object.hasOwn(permissions, scope)) return res.sendStatus(400);
        const owner = owned(req);
        const record = records.get(owner);
        if (scope === 'reader' && (!record || record.receipt !== receipt)) return res.sendStatus(404);
        for (const [key, grant] of grants) {
            if (grant.until <= now() || (grant.owner === owner && grant.scope === scope)) grants.delete(key);
        }
        if (grants.size >= 256) return res.sendStatus(503);
        const token = crypto.randomBytes(32).toString('base64url');
        const until = now() + permissions[scope];
        grants.set(digest(token), { scope, owner, until, ...(scope === 'reader' ? { record } : {}) });
        res.json({ token, expiresAt: new Date(until).toISOString() });
    });

    function authorize(scope) {
        return (req, res, next) => {
            const token = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.get('Authorization') ?? '')?.[1];
            const key = token && digest(token);
            const grant = key && grants.get(key);
            if (!grant || grant.scope !== scope || grant.until <= now()) return res.sendStatus(401);
            req.azureGrant = grant;
            if (scope === 'reader') grants.delete(key);
            next();
        };
    }

    app.post(prefix + '/checks', authorize('writer'), (req, res) => {
        const { revision, fileSha256, exitCode, durationMs } = req.body ?? {};
        if (typeof revision !== 'string' || !/^[a-f0-9]{40}$/.test(revision) ||
            typeof fileSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(fileSha256) ||
            !Number.isInteger(exitCode) || exitCode < 0 || exitCode > 255 ||
            !Number.isSafeInteger(durationMs) || durationMs < 0 || durationMs > 300_000) {
            return res.sendStatus(400);
        }
        const owner = req.azureGrant.owner;
        const record = Object.freeze({
            receipt: crypto.randomUUID(), owner, revision, fileSha256, check: 'node --check TowerFlow/app.js',
            reportedBy: 'paired VS Code session', exitCode, durationMs,
            receivedAt: new Date(now()).toISOString()
        });
        records.delete(owner);
        records.set(owner, record);
        if (records.size > 128) records.delete(records.keys().next().value);
        res.status(201).json(record);
    });

    app.get(prefix + '/mine', auth, ensureMember, (req, res) => {
        const record = records.get(owned(req));
        res.json(record ?? null);
    });
    app.head(prefix + '/read', (req, res) => res.sendStatus(405));
    app.get(prefix + '/read', authorize('reader'), (req, res) => res.json(req.azureGrant.record));
}

module.exports = { mount };
