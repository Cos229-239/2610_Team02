'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { Accounts } = require('../lib/accounts');

const password = 'correct horse battery';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'towerflow-accounts-'));
  fs.mkdirSync(directory, { recursive: true });
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const accounts = new Accounts(directory);
  const ownerSession = accounts.setup('Owner', password);
  return { directory, accounts, owner: ownerSession.user, ownerToken: ownerSession.token };
}

function rejectedStatus(fn, status) {
  assert.throws(fn, error => error && error.status === status);
}

test('invitation stores only a SHA-256 token hash and creates an Editor session once', t => {
  const { directory, accounts, owner } = fixture(t);
  const created = accounts.createInvitation(owner, 7, 1);
  assert.match(created.token, /^[A-Za-z0-9_-]{43}$/);
  const stored = JSON.parse(fs.readFileSync(path.join(directory, 'accounts.json'), 'utf8'));
  assert.equal(stored.version, 2);
  assert.equal(JSON.stringify(stored).includes(created.token), false);
  assert.equal(stored.invitations[0].tokenHash,
    crypto.createHash('sha256').update(created.token).digest('hex'));

  const accepted = accounts.acceptInvitation(created.token, 'NewEditor', password);
  assert.equal(accepted.user.role, 'editor');
  const session = accounts.session({ headers: { cookie: 'towerflow_session=' + accepted.token } });
  assert.equal(session.user.username, 'NewEditor');
  assert.equal(accounts.listInvitations(owner)[0].status, 'used');
  rejectedStatus(() => accounts.acceptInvitation(created.token, 'SecondEditor', password), 410);
});

test('only an Owner can create, list, or revoke invitations', t => {
  const { accounts, owner } = fixture(t);
  const editor = accounts.create('Editor', password, 'editor');
  const created = accounts.createInvitation(owner, 7, 2);
  rejectedStatus(() => accounts.createInvitation(editor, 7, 1), 403);
  rejectedStatus(() => accounts.listInvitations(editor), 403);
  rejectedStatus(() => accounts.revokeInvitation(editor, created.invitation.id), 403);
  const revoked = accounts.revokeInvitation(owner, created.invitation.id);
  assert.equal(revoked.status, 'revoked');
  rejectedStatus(() => accounts.acceptInvitation(created.token, 'BlockedEditor', password), 410);
  assert.equal(accounts.revokeInvitation(owner, created.invitation.id).status, 'revoked');
});

test('expiry, malformed tokens, invalid limits, and exhausted uses fail closed', t => {
  const { accounts, owner } = fixture(t);
  rejectedStatus(() => accounts.createInvitation(owner, 0, 1), 400);
  rejectedStatus(() => accounts.createInvitation(owner, 31, 1), 400);
  rejectedStatus(() => accounts.createInvitation(owner, 7, 0), 400);
  rejectedStatus(() => accounts.createInvitation(owner, 7, 101), 400);
  rejectedStatus(() => accounts.acceptInvitation('not-a-token', 'BadToken', password), 410);

  const expired = accounts.createInvitation(owner, 1, 2);
  const record = accounts.invitations.find(item => item.id === expired.invitation.id);
  record.expiresAt = new Date(Date.now() - 1000).toISOString();
  accounts.save();
  rejectedStatus(() => accounts.acceptInvitation(expired.token, 'ExpiredEditor', password), 410);

  const limited = accounts.createInvitation(owner, 7, 2);
  accounts.acceptInvitation(limited.token, 'FirstEditor', password);
  accounts.acceptInvitation(limited.token, 'SecondEditor', password);
  rejectedStatus(() => accounts.acceptInvitation(limited.token, 'ThirdEditor', password), 410);
  assert.equal(accounts.listInvitations(owner).find(item => item.id === limited.invitation.id).status, 'used');
});

test('multi-use redemption is serialized and increments only successful account creation', async t => {
  const { accounts, owner } = fixture(t);
  const created = accounts.createInvitation(owner, 7, 2);
  const results = await Promise.allSettled([
    Promise.resolve().then(() => accounts.acceptInvitation(created.token, 'EditorOne', password)),
    Promise.resolve().then(() => accounts.acceptInvitation(created.token, 'EditorTwo', password)),
    Promise.resolve().then(() => accounts.acceptInvitation(created.token, 'EditorThree', password))
  ]);
  assert.equal(results.filter(item => item.status === 'fulfilled').length, 2);
  assert.equal(results.filter(item => item.status === 'rejected').length, 1);
  assert.equal(accounts.listInvitations(owner)[0].uses, 2);
});

test('version 1 account files migrate to version 2 on the next access write', t => {
  const { directory, accounts, owner } = fixture(t);
  const filename = path.join(directory, 'accounts.json');
  const v1 = JSON.parse(fs.readFileSync(filename, 'utf8'));
  delete v1.invitations;
  v1.version = 1;
  fs.writeFileSync(filename, JSON.stringify(v1, null, 2) + '\n');

  const migrated = new Accounts(directory);
  const created = migrated.createInvitation(owner, 3, 1);
  const current = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const backup = JSON.parse(fs.readFileSync(filename + '.bak', 'utf8'));
  assert.equal(current.version, 2);
  assert.equal(current.invitations.length, 1);
  assert.equal(backup.version, 1);
  assert.equal(migrated.listInvitations(owner)[0].id, created.invitation.id);
});

test('Owner role changes are server-service guarded and cannot change the requesters own role', t => {
  const { accounts, owner } = fixture(t);
  const editor = accounts.create('Editor', password, 'editor');
  rejectedStatus(() => accounts.setRole(editor.id, 'admin', editor), 403);
  rejectedStatus(() => accounts.setRole(owner.id, 'editor', owner), 403);
  assert.equal(accounts.setRole(editor.id, 'admin', owner).role, 'admin');
  assert.equal(accounts.setRole(editor.id, 'editor', owner).role, 'editor');
  rejectedStatus(() => accounts.setRole(editor.id, 'superuser', owner), 400);
  const otherOwner = accounts.create('BackupOwner', password, 'admin');
  assert.equal(accounts.setRole(otherOwner.id, 'editor', owner).role, 'editor');
});

test('invalid invitation records fail closed during account-file load', t => {
  const { directory, accounts, owner } = fixture(t);
  const created = accounts.createInvitation(owner, 7, 1);
  const filename = path.join(directory, 'accounts.json');
  const stored = JSON.parse(fs.readFileSync(filename, 'utf8'));
  stored.invitations[0].uses = stored.invitations[0].maxUses + 1;
  fs.writeFileSync(filename, JSON.stringify(stored));
  assert.throws(() => new Accounts(directory), /invalid invitation/);
  assert.equal(JSON.parse(fs.readFileSync(filename, 'utf8')).invitations[0].uses, 2);
});
