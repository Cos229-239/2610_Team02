'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SESSION_AGE = 12 * 60 * 60;
const PASSWORD_MIN = 12;
const UUID_PATTERN = /^[a-f0-9-]{36}$/;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

class AuthError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function username(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{3,32}$/.test(value.trim())) {
    throw new AuthError('Username must be 3–32 letters, digits, dots, dashes, or underscores.');
  }
  return value.trim();
}

function password(value) {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN || value.length > 256) {
    throw new AuthError('Password must be 12–256 characters.');
  }
  return value;
}

function credential(plain) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password(plain), Buffer.from(salt, 'hex'), 64).toString('hex');
  return { salt, hash };
}

function verify(plain, account) {
  if (typeof plain !== 'string' || plain.length > 256) return false;
  const derived = crypto.scryptSync(plain, Buffer.from(account.salt, 'hex'), 64);
  return crypto.timingSafeEqual(derived, Buffer.from(account.hash, 'hex'));
}

function publicUser(user) { return { id: user.id, username: user.username, role: user.role }; }

function invitationView(invitation) {
  const expired = Date.parse(invitation.expiresAt) <= Date.now();
  const exhausted = invitation.uses >= invitation.maxUses;
  return {
    id: invitation.id,
    role: invitation.role,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    maxUses: invitation.maxUses,
    uses: invitation.uses,
    revokedAt: invitation.revokedAt,
    status: invitation.revokedAt ? 'revoked' : expired ? 'expired' : exhausted ? 'used' : 'active'
  };
}

class Accounts {
  constructor(directory) {
    this.filename = path.join(directory, 'accounts.json');
    const initial = fs.existsSync(this.filename) ? fs.readFileSync(this.filename) : null;
    this.fingerprint = initial ? sha256(initial) : null;
    const stored = initial ? JSON.parse(initial.toString('utf8')) : { version: 2, users: [], invitations: [] };
    const record = stored && typeof stored === 'object' && !Array.isArray(stored);
    this.users = record && Array.isArray(stored.users) ? stored.users : [];
    this.invitations = record && stored.version === 2 && Array.isArray(stored.invitations) ? stored.invitations : [];
    if (!record || ![1, 2].includes(stored.version) || !Array.isArray(stored.users) ||
        (stored.version === 2 && !Array.isArray(stored.invitations)) ||
        this.users.some(u => !u || !UUID_PATTERN.test(u.id) ||
          !['admin', 'editor'].includes(u.role) || username(u.username) !== u.username ||
          !/^[a-f0-9]{32}$/.test(u.salt) || !/^[a-f0-9]{128}$/.test(u.hash))) {
      throw new Error('Account file is invalid. Restore a known good accounts.json before starting.');
    }
    const invitationIds = new Set();
    const tokenHashes = new Set();
    for (const invitation of this.invitations) {
      const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
      const valid = invitation && typeof invitation === 'object' && !Array.isArray(invitation) &&
        UUID_PATTERN.test(invitation.id || '') && UUID_PATTERN.test(invitation.createdBy || '') &&
        /^[a-f0-9]{64}$/.test(invitation.tokenHash || '') && invitation.role === 'editor' &&
        validDate(invitation.createdAt) && validDate(invitation.expiresAt) &&
        Date.parse(invitation.expiresAt) > Date.parse(invitation.createdAt) &&
        Number.isInteger(invitation.maxUses) && invitation.maxUses >= 1 && invitation.maxUses <= 100 &&
        Number.isInteger(invitation.uses) && invitation.uses >= 0 && invitation.uses <= invitation.maxUses &&
        (invitation.revokedAt === null || validDate(invitation.revokedAt));
      if (!valid || invitationIds.has(invitation.id) || tokenHashes.has(invitation.tokenHash)) {
        throw new Error('Account file contains an invalid invitation. Restore a known good accounts.json before starting.');
      }
      invitationIds.add(invitation.id);
      tokenHashes.add(invitation.tokenHash);
    }
    this.sessions = new Map();
    this.attempts = new Map();
  }

  get initialized() { return this.users.length > 0; }

  checkExternal() {
    const current = fs.existsSync(this.filename) ? sha256(fs.readFileSync(this.filename)) : null;
    if (current !== this.fingerprint) throw new AuthError('Accounts changed outside this server. Restart it to reload access.', 409);
  }

  save() {
    this.checkExternal();
    const existing = fs.existsSync(this.filename) ? fs.readFileSync(this.filename) : null;
    const temp = path.join(path.dirname(this.filename), '.accounts-' + crypto.randomUUID() + '.tmp');
    try {
      const fd = fs.openSync(temp, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify({ version: 2, users: this.users, invitations: this.invitations }, null, 2) + '\n');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      if (existing) fs.copyFileSync(this.filename, this.filename + '.bak');
      fs.renameSync(temp, this.filename);
      this.fingerprint = sha256(fs.readFileSync(this.filename));
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }

  setup(name, plain) {
    if (this.initialized) throw new AuthError('Owner setup is already complete.', 409);
    const user = { id: crypto.randomUUID(), username: username(name), role: 'admin', ...credential(plain) };
    this.users.push(user);
    try { this.save(); } catch (error) { this.users.pop(); throw error; }
    return this.startSession(user);
  }

  startSession(user) {
    const token = crypto.randomBytes(32).toString('base64url');
    this.sessions.set(sha256(token), { userId: user.id, expires: Date.now() + SESSION_AGE * 1000 });
    return { token, user: publicUser(user) };
  }

  login(name, plain, address) {
    const key = String(address) + ':' + String(name).toLowerCase();
    const now = Date.now();
    const failures = (this.attempts.get(key) || []).filter(time => now - time < 15 * 60_000);
    if (failures.length >= 8) throw new AuthError('Too many attempts. Try again in 15 minutes.', 429);
    const user = typeof name === 'string' ?
      this.users.find(u => u.username.toLowerCase() === name.trim().toLowerCase()) : null;
    if (!user || !verify(plain, user)) {
      failures.push(now);
      this.attempts.set(key, failures);
      throw new AuthError('Incorrect username or password.', 401);
    }
    this.attempts.delete(key);
    return this.startSession(user);
  }

  session(req) {
    this.checkExternal();
    const cookies = (req.headers.cookie || '').split(';').map(s => s.trim())
      .filter(s => s.startsWith('towerflow_session='));
    if (cookies.length !== 1) return null;
    const token = cookies[0].slice('towerflow_session='.length);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const key = sha256(token);
    const session = this.sessions.get(key);
    if (!session) return null;
    if (session.expires < Date.now()) { this.sessions.delete(key); return null; }
    const user = this.users.find(u => u.id === session.userId);
    if (!user) { this.sessions.delete(key); return null; }
    return { key, user };
  }

  logout(session) { if (session) this.sessions.delete(session.key); }
  clearSessions(userId) {
    for (const [key, session] of this.sessions) if (session.userId === userId) this.sessions.delete(key);
  }

  list() { return this.users.map(publicUser); }

  create(name, plain, role = 'editor') {
    if (this.users.length >= 100) throw new AuthError('Account limit reached.', 409);
    name = username(name);
    if (!['editor', 'admin'].includes(role)) throw new AuthError('Invalid account role.');
    if (this.users.some(u => u.username.toLowerCase() === name.toLowerCase())) {
      throw new AuthError('Username already exists.', 409);
    }
    const user = { id: crypto.randomUUID(), username: name, role, ...credential(plain) };
    this.users.push(user);
    try { this.save(); } catch (error) { this.users.pop(); throw error; }
    return publicUser(user);
  }

  createInvitation(requester, expiresInDays = 7, maxUses = 1) {
    if (!requester || requester.role !== 'admin') throw new AuthError('Owner access is required.', 403);
    if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
      throw new AuthError('Invitation expiry must be between 1 and 30 days.');
    }
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
      throw new AuthError('Invitation use limit must be between 1 and 100.');
    }
    if (this.invitations.length >= 1000) throw new AuthError('Invitation limit reached.', 409);
    const token = crypto.randomBytes(32).toString('base64url');
    const now = Date.now();
    const invitation = {
      id: crypto.randomUUID(),
      tokenHash: sha256(token),
      role: 'editor',
      createdBy: requester.id,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + expiresInDays * 86400000).toISOString(),
      maxUses,
      uses: 0,
      revokedAt: null
    };
    this.invitations.push(invitation);
    try { this.save(); } catch (error) { this.invitations.pop(); throw error; }
    return { token, invitation: invitationView(invitation) };
  }

  listInvitations(requester) {
    if (!requester || requester.role !== 'admin') throw new AuthError('Owner access is required.', 403);
    return this.invitations
      .slice()
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(invitationView);
  }

  revokeInvitation(requester, invitationId) {
    if (!requester || requester.role !== 'admin') throw new AuthError('Owner access is required.', 403);
    const invitation = this.invitations.find(item => item.id === invitationId);
    if (!invitation) throw new AuthError('Invitation not found.', 404);
    if (invitation.revokedAt) return invitationView(invitation);
    const previous = invitation.revokedAt;
    invitation.revokedAt = new Date().toISOString();
    try { this.save(); } catch (error) { invitation.revokedAt = previous; throw error; }
    return invitationView(invitation);
  }

  acceptInvitation(token, name, plain) {
    const validToken = typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
    const tokenHash = validToken ? sha256(token) : null;
    const invitation = tokenHash && this.invitations.find(item => item.tokenHash === tokenHash);
    if (!invitation || invitation.revokedAt || Date.parse(invitation.expiresAt) <= Date.now() ||
        invitation.uses >= invitation.maxUses) {
      throw new AuthError('Invitation is invalid, expired, revoked, or already used.', 410);
    }
    if (this.users.length >= 100) throw new AuthError('Account limit reached.', 409);
    name = username(name);
    if (this.users.some(u => u.username.toLowerCase() === name.toLowerCase())) {
      throw new AuthError('Username already exists.', 409);
    }
    const user = { id: crypto.randomUUID(), username: name, role: 'editor', ...credential(plain) };
    this.users.push(user);
    invitation.uses += 1;
    try { this.save(); } catch (error) {
      this.users.pop();
      invitation.uses -= 1;
      throw error;
    }
    return this.startSession(user);
  }

  setRole(userId, role, requester) {
    if (!requester || requester.role !== 'admin') throw new AuthError('Owner access is required.', 403);
    if (!['editor', 'admin'].includes(role)) throw new AuthError('Invalid account role.');
    if (userId === requester.id) throw new AuthError('You cannot change your own role.', 403);
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new AuthError('Account not found.', 404);
    if (user.role === 'admin' && role === 'editor' &&
        this.users.filter(u => u.role === 'admin').length <= 1) {
      throw new AuthError('Keep at least one owner account.', 409);
    }
    if (user.role === role) return publicUser(user);
    const previous = user.role;
    user.role = role;
    try { this.save(); } catch (error) { user.role = previous; throw error; }
    return publicUser(user);
  }

  reset(userId, plain) {
    const user = this.users.find(u => u.id === userId);
    if (!user) throw new AuthError('Account not found.', 404);
    const previous = { salt: user.salt, hash: user.hash };
    Object.assign(user, credential(plain));
    try { this.save(); } catch (error) { Object.assign(user, previous); throw error; }
    this.clearSessions(userId);
    return publicUser(user);
  }

  change(user, current, next) {
    if (!verify(current, user)) throw new AuthError('Current password is incorrect.', 401);
    return this.reset(user.id, next);
  }

  remove(userId, requester) {
    if (userId === requester.id) throw new AuthError('You cannot remove your own account.');
    const index = this.users.findIndex(u => u.id === userId);
    if (index < 0) throw new AuthError('Account not found.', 404);
    if (this.users[index].role === 'admin' && this.users.filter(u => u.role === 'admin').length === 1) {
      throw new AuthError('Keep at least one owner account.');
    }
    const [removed] = this.users.splice(index, 1);
    try { this.save(); } catch (error) { this.users.splice(index, 0, removed); throw error; }
    this.clearSessions(userId);
    return publicUser(removed);
  }
}

module.exports = { Accounts, AuthError, SESSION_AGE, publicUser };