'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');

const password = 'correct horse battery';

function client(origin, cookie = '') {
  return (route, method = 'GET', body, originHeader = origin) => fetch(origin + route, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method === 'GET' ? {} : {
        Origin: originHeader,
        'X-TowerFlow-Request': '1',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function start(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'towerflow-access-http-'));
  const server = createApp({ directory });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  return { directory, origin: 'http://127.0.0.1:' + server.address().port };
}

async function ownerSession(origin) {
  const response = await client(origin)('/api/auth/setup', 'POST', { username: 'Owner', password });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie').split(';')[0];
}

test('invitation lifecycle and role administration are enforced by HTTP routes', async t => {
  const { directory, origin } = await start(t);
  const anonymous = client(origin);
  const ownerCookie = await ownerSession(origin);
  const owner = client(origin, ownerCookie);

  const direct = await owner('/api/users', 'POST', {
    username: 'ExistingEditor', password, role: 'editor'
  });
  assert.equal(direct.status, 201);
  const editorLogin = await anonymous('/api/auth/login', 'POST', {
    username: 'ExistingEditor', password
  });
  assert.equal(editorLogin.status, 200);
  const editorCookie = editorLogin.headers.get('set-cookie').split(';')[0];
  const editor = client(origin, editorCookie);

  assert.equal((await editor('/api/invitations')).status, 403);
  assert.equal((await editor('/api/invitations', 'POST', { expiresInDays: 7, maxUses: 1 })).status, 403);
  assert.equal((await editor('/api/users', 'GET')).status, 403);

  const created = await owner('/api/invitations', 'POST', { expiresInDays: 7, maxUses: 1 });
  assert.equal(created.status, 201);
  const payload = await created.json();
  assert.match(payload.invitePath, /^\/#invite=[A-Za-z0-9_-]{43}$/);
  const token = new URL(payload.invitePath, origin).hash.slice('#invite='.length);
  assert.equal(payload.invitation.role, 'editor');
  const stored = JSON.parse(fs.readFileSync(path.join(directory, 'accounts.json'), 'utf8'));
  assert.equal(JSON.stringify(stored).includes(token), false);
  const invitationList = await owner('/api/invitations');
  assert.equal(invitationList.status, 200);
  const listed = await invitationList.json();
  assert.equal(JSON.stringify(listed).includes(token), false);
  assert.equal(JSON.stringify(listed).includes('tokenHash'), false);

  const invalidOrigin = await owner('/api/invitations', 'POST', { expiresInDays: 7, maxUses: 1 }, 'http://attacker.example');
  assert.equal(invalidOrigin.status, 403);

  const accepted = await anonymous('/api/invitations/accept', 'POST', {
    token, username: 'InvitedEditor', password
  });
  assert.equal(accepted.status, 201);
  const acceptedPayload = await accepted.json();
  assert.equal(acceptedPayload.user.role, 'editor');
  const invitedCookie = accepted.headers.get('set-cookie').split(';')[0];
  const invited = client(origin, invitedCookie);
  assert.equal((await invited('/api/auth/status')).status, 200);
  const invitedStatus = await (await invited('/api/auth/status')).json();
  assert.equal(invitedStatus.user.username, 'InvitedEditor');
  assert.equal(invitedStatus.user.role, 'editor');

  assert.equal((await invited('/api/users/' + acceptedPayload.user.id + '/role', 'PATCH', { role: 'admin' })).status, 403);
  assert.equal((await owner('/api/users/' + acceptedPayload.user.id + '/role', 'PATCH', { role: 'admin' })).status, 200);
  assert.equal((await (await invited('/api/auth/status')).json()).user.role, 'admin');
  assert.equal((await owner('/api/users/' + acceptedPayload.user.id + '/role', 'PATCH', { role: 'editor' })).status, 200);
  assert.equal((await (await invited('/api/auth/status')).json()).user.role, 'editor');
  assert.equal((await owner('/api/users/' + acceptedPayload.user.id + '/role', 'PATCH', { role: 'admin' }, 'http://attacker.example')).status, 403);
  assert.equal((await owner('/api/users/' + (await (await owner('/api/auth/status')).json()).user.id + '/role', 'PATCH', { role: 'editor' })).status, 403);

  const revoked = await owner('/api/invitations', 'POST', { expiresInDays: 7, maxUses: 2 });
  const revokedPayload = await revoked.json();
  const revokedToken = new URL(revokedPayload.invitePath, origin).hash.slice('#invite='.length);
  const revokedResult = await owner('/api/invitations/' + revokedPayload.invitation.id + '/revoke', 'POST', {});
  assert.equal(revokedResult.status, 200);
  assert.equal((await anonymous('/api/invitations/accept', 'POST', {
    token: revokedToken, username: 'RevokedEditor', password
  })).status, 410);
  assert.equal((await editor('/api/invitations/' + revokedPayload.invitation.id + '/revoke', 'POST', {})).status, 403);

  const ownerStatus = await (await owner('/api/auth/status')).json();
  assert.equal(ownerStatus.user.role, 'admin');
});
