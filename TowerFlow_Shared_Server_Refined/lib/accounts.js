'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SESSION_AGE = 12 * 60 * 60;
const PASSWORD_MIN = 12;

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

class Accounts {
  constructor(directory) {
    this.filename = path.join(directory, 'accounts.json');
    const initial = fs.existsSync(this.filename) ? fs.readFileSync(this.filename) : null;
    this.fingerprint = initial ? crypto.createHash('sha256').update(initial).digest('hex') : null;
    const stored = initial ? JSON.parse(initial.toString('utf8')) : { version: 1, users: [] };
    this.users = stored.users;
    if (stored.version !== 1 || !Array.isArray(this.users) || this.users.some(u => !u || !/^[a-f0-9-]{36}$/.test(u.id) ||
        !['admin', 'editor'].includes(u.role) || username(u.username) !== u.username ||
        !/^[a-f0-9]{32}$/.test(u.salt) || !/^[a-f0-9]{128}$/.test(u.hash))) {
      throw new Error('Account file is invalid. Restore a known good accounts.json before starting.');
    }
    this.sessions = new Map();
    this.attempts = new Map();
  }

  get initialized() { return this.users.length > 0; }

  checkExternal() {
    const current = fs.existsSync(this.filename) ?
      crypto.createHash('sha256').update(fs.readFileSync(this.filename)).digest('hex') : null;
    if (current !== this.fingerprint) throw new AuthError('Accounts changed outside this server. Restart it to reload access.', 409);
  }

  save() {
    this.checkExternal();
    const existing = fs.existsSync(this.filename) ? fs.readFileSync(this.filename) : null;
    const temp = path.join(path.dirname(this.filename), `.accounts-${crypto.randomUUID()}.tmp`);
    try {
      const fd = fs.openSync(temp, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify({ version: 1, users: this.users }, null, 2) + '\n');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      if (existing) fs.copyFileSync(this.filename, this.filename + '.bak');
      fs.renameSync(temp, this.filename);
      this.fingerprint = crypto.createHash('sha256').update(fs.readFileSync(this.filename)).digest('hex');
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
    this.sessions.set(crypto.createHash('sha256').update(token).digest('hex'),
      { userId: user.id, expires: Date.now() + SESSION_AGE * 1000 });
    return { token, user: publicUser(user) };
  }

  login(name, plain, address) {
    const key = `${address}:${String(name).toLowerCase()}`;
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
    const key = crypto.createHash('sha256').update(token).digest('hex');
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
    if (this.users.length >= 100) throw new AuthError('Account limit reached.');
    name = username(name);
    if (!['editor', 'admin'].includes(role)) throw new AuthError('Invalid account role.');
    if (this.users.some(u => u.username.toLowerCase() === name.toLowerCase())) {
      throw new AuthError('Username already exists.');
    }
    const user = { id: crypto.randomUUID(), username: name, role, ...credential(plain) };
    this.users.push(user);
    try { this.save(); } catch (error) { this.users.pop(); throw error; }
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
