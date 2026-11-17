'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

function mount(app, { auth, ensureMember, publicOrigin, publicDir, now = Date.now }) {
    const permissions = { writer: 30 * 60_000, reader: 5 * 60_000 };
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
    app.get('/azure-bridge/desk.js', (req, res) => res.sendFile(path.join(__dirname, 'desk.js')));
    app.get('/room/team02', async (req, res, next) => {
        try {
            const html = await fs.readFile(path.join(publicDir, 'index.html'), 'utf8');
            if (!/<\/body\s*>/i.test(html)) return next();
            res.set('Cache-Control', 'no-cache').type('html').send(
                html.replace(/<\/body\s*>/i, '<script src="/azure-bridge/desk.js" defer></script>$&')
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
