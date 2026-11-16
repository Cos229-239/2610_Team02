#!/usr/bin/env node
/**
 * Towerflow Configuration Agent v1.
 * Deterministic, reviewed, local-only room integration. NO network, shell, AI
 * execution, credential access, Git push, or desktop process launches.
 *
 * Run: node tools/towerflow-config-agent.mjs --dry-run
 *      node tools/towerflow-config-agent.mjs --apply
 */
import { readFile, writeFile, copyFile, rename, unlink, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultRoom = join(homedir(), 'Desktop', 'Towerflow_Team02_Private_Invite_Room', 'Towerflow_Collaboration_Room', 'public', 'room.js');
const defaultWorkspace = join(repoRoot, 'collaboration-room', 'live-room', 'public', 'room.js');
const configPath = join(repoRoot, 'tools', 'towerflow-config.json');
const beginMarker = '// TF_CONFIG_AGENT_V1_BEGIN';
const endMarker = '// TF_CONFIG_AGENT_V1_END';
const targetFunction = 'function activateTFStation(id)';

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(label + ' must be an object');
}
function validateConfig(config) {
  assertObject(config, 'config');
  if (config.version !== 1) throw new Error('Unsupported configuration version');
  if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(config.repositoryUrl)) {
    throw new Error('repositoryUrl must be a GitHub HTTPS repository URL');
  }
  if (!Array.isArray(config.stations) || config.stations.length !== 4) throw new Error('Expected four IDE stations');
  const expected = ['dev-ide-vs', 'dev-ide-code', 'dev-ide-cursor', 'dev-ide-antigravity'];
  for (let i = 0; i < expected.length; i++) {
    const s = config.stations[i];
    assertObject(s, 'station');
    if (s.id !== expected[i]) throw new Error('Unexpected station id/order: ' + s.id);
    for (const key of ['title','description','mode']) {
      if (typeof s[key] !== 'string' || s[key].length > 140 || !s[key].trim()) throw new Error('Invalid station ' + key);
    }
    if (!['browser-editor','desktop-bridge-pending'].includes(s.mode)) throw new Error('Unknown station mode');
  }
  return config;
}
function safeJSON(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}
export function generateBlock(config) {
  validateConfig(config);
  const data = safeJSON({ repositoryUrl: config.repositoryUrl, stations: config.stations });
  return `${beginMarker}
(function(){
  'use strict';
  // This catalog is a verified capability map, NOT a remote desktop or IDE bridge.
  const tfConfig = ${data};
  window.tfConfigAgent = Object.freeze({
    version: 1,
    stationIds: Object.freeze(tfConfig.stations.map(s => s.id))
  });
  window.tfShowIDEIntegration = function(stationId){
    const station = tfConfig.stations.find(s => s.id === stationId);
    if (!station) return;
    const content = document.getElementById('panelContent');
    if (!content) return;
    const wrap = document.createElement('section');
    wrap.className = 'callout';
    wrap.setAttribute('aria-label', 'Towerflow IDE integration configuration');
    const heading = document.createElement('h3');
    heading.textContent = station.title + ' — Integration status';
    const description = document.createElement('p');
    description.textContent = station.description;
    const status = document.createElement('p');
    status.textContent = station.mode === 'browser-editor'
      ? 'Browser repository editor available. This is not the desktop IDE.'
      : 'Desktop IDE bridge not configured. No remote terminal or IDE exposed.';
    const link = document.createElement('a');
    link.href = tfConfig.repositoryUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open shared GitHub repository ↗';
    wrap.append(heading, description, status, link);
    content.prepend(wrap);
  };
}());
${endMarker}`;
}
function findMatchingBrace(source, open) {
  let depth = 0, mode = 'code', templateDepth = 0;
  for (let i = open; i < source.length; i++) {
    const c = source[i], n = source[i + 1], prev = source[i - 1];
    if (mode === 'line') { if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { i++; mode = 'code'; } continue; }
    if (mode === 'single' || mode === 'double' || mode === 'template') {
      if (c === '\\') { i++; continue; }
      if ((mode === 'single' && c === "'") || (mode === 'double' && c === '"')) mode = 'code';
      else if (mode === 'template' && c === '`') mode = 'code';
      // This parser is deliberately conservative: nested template expressions
      // are not supported, but the insertion anchor precedes the template string.
      continue;
    }
    if (c === '/' && n === '/') { mode = 'line'; i++; continue; }
    if (c === '/' && n === '*') { mode = 'block'; i++; continue; }
    if (c === "'") { mode = 'single'; continue; }
    if (c === '"') { mode = 'double'; continue; }
    if (c === '`') { mode = 'template'; continue; }
    if (c === '{') depth++;
    if (c === '}' && --depth === 0) return i;
  }
  throw new Error('Could not identify station-handler bounds; no files modified.');
}
export function patchRoom(source, config) {
  if (!source.includes('// TF_DEV_ROOM_V1')) throw new Error('Expected development room version not found');
  if (!source.includes('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side')) throw new Error('Working Option A movement formula missing');
  const block = generateBlock(config);
  const hasBegin = source.includes(beginMarker), hasEnd = source.includes(endMarker);
  if (hasBegin !== hasEnd) throw new Error('Incomplete agent block; refusing to modify');
  let changed = source;
  if (hasBegin) {
    const start = changed.indexOf(beginMarker), end = changed.indexOf(endMarker) + endMarker.length;
    if (changed.indexOf(beginMarker, start + 1) !== -1) throw new Error('Duplicate agent blocks');
    changed = changed.slice(0, start) + block + changed.slice(end);
  } else {
    const anchor = changed.indexOf(targetFunction);
    if (anchor < 0) throw new Error('Missing IDE station-handler function');
    changed = changed.slice(0, anchor) + block + '\n\n' + changed.slice(anchor);
  }
  const funcStart = changed.indexOf(targetFunction);
  const opening = changed.indexOf('{', funcStart);
  const ending = findMatchingBrace(changed, opening);
  const functionText = changed.slice(funcStart, ending + 1);
  const target = "if (id.startsWith('dev-ide-')) {";
  if (!functionText.includes(target)) throw new Error('Expected IDE branch missing; no files modified');
  if (!functionText.includes('window.tfShowIDEIntegration(id);')) {
    // Inject before the existing return in the IDE branch, without replacing
    // the existing editor, auth guards, or other workstation behavior.
    const branchStart = functionText.indexOf(target);
    const branchReturn = functionText.indexOf('return;', branchStart);
    if (branchReturn < 0) throw new Error('Cannot find IDE return anchor');
    const modified = functionText.slice(0, branchReturn) +
      'window.tfShowIDEIntegration(id);\n        ' +
      functionText.slice(branchReturn);
    changed = changed.slice(0, funcStart) + modified + changed.slice(ending + 1);
  }
  return changed;
}
function sha(content) { return createHash('sha256').update(content).digest('hex'); }
async function checkSyntax(content) {
  // The room uses ES modules (import * as THREE ...). A .js file piped to
  // node --check is treated as CommonJS on some Node versions and fails
  // even when the actual browser module is valid. Use a temporary .mjs.
  const tmp = join(tmpdir(), 'towerflow-config-agent-' + randomUUID() + '.mjs');
  try {
    await writeFile(tmp, content, 'utf8');
    execFileSync(process.execPath, ['--check', tmp], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10000
    });
  } catch (err) {
    throw new Error('JavaScript syntax check failed: ' +
      String(err.stderr || err.message).slice(0, 400));
  } finally {
    if (existsSync(tmp)) await unlink(tmp);
  }
}
async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply'), dry = args.includes('--dry-run');
  if (apply === dry || args.some(a => !['--apply','--dry-run'].includes(a))) {
    throw new Error('Use exactly one: --dry-run OR --apply');
  }
  const config = validateConfig(JSON.parse(await readFile(configPath, 'utf8')));
  const files = [...new Set([defaultRoom, defaultWorkspace])];
  const prepared = [];
  for (const file of files) {
    if (!existsSync(file)) throw new Error('Missing room file: ' + file);
    const before = await readFile(file, 'utf8');
    const after = patchRoom(before, config);
    await checkSyntax(after);
    prepared.push({ file, before, after, changed: before !== after });
  }
  console.log('TOWERFLOW CONFIGURATION AGENT v1 — ' + (apply ? 'APPLY' : 'DRY RUN'));
  for (const p of prepared) console.log((p.changed ? 'CHANGE' : 'UNCHANGED') + ': ' + p.file + ' | SHA256 ' + sha(p.after).slice(0, 16));
  console.log('IDE stations: 4 | Node server restart: NOT REQUESTED | Git push: NONE');
  if (!apply) return;
  // Back up ALL originals first. No secrets are read or copied.
  const backups = [];
  const stamp = new Date().toISOString().replace(/[.:]/g, '-');
  const backupDir = join(homedir(), 'Desktop', 'Towerflow_Configuration_Backups', stamp);
  await mkdir(backupDir, { recursive: true });
  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i];
    if (!p.changed) continue;
    const backup = join(backupDir, i + '-room.js');
    await copyFile(p.file, backup);
    backups.push({ file: p.file, backup });
  }
  const written = [];
  try {
    for (const p of prepared) {
      if (!p.changed) continue;
      const tmp = p.file + '.tf-stage-' + randomUUID();
      try { await writeFile(tmp, p.after, 'utf8'); await rename(tmp, p.file); }
      finally { if (existsSync(tmp)) await unlink(tmp); }
      written.push(p.file);
    }
  } catch (err) {
    for (const b of backups) if (written.includes(b.file)) await copyFile(b.backup, b.file);
    throw new Error('Write failure; attempted rollback: ' + err.message);
  }
  console.log('APPLIED. Backups: ' + backupDir);
  console.log('Refresh only the affected browser tab to load the updated UI.');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch(e => { console.error('CONFIG AGENT ERROR: ' + e.message); process.exitCode = 1; });
}
