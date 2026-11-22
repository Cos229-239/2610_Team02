'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Accounts, AuthError, SESSION_AGE, publicUser } = require('./lib/accounts');
const { parseLegacy } = require('./lib/import-legacy');
const { InputError, emptyInventory, label, createProduct, editProduct,
  archiveProduct, deleteProduct, findCode, recordMovement, importProducts, summary,
  validateState, setStock, createWorkOrder, editWorkOrder, deleteWorkOrder,
  createPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder } = require('./lib/inventory');
const { dashboard } = require('./lib/report');
const { interpret: guideInterpret, apply: guideApply } = require('./lib/azure-guide');
const { run: runAzureFlow } = require('./lib/azure-flow-harness');
const { investigate: investigateAzureFlow, diagnoseModel: diagnoseAzureModel } = require('./lib/azure-flow-orchestrator');
const { calibrate: calibrateAzureFlow, snapshot: azureCalibrationStatus } = require('./lib/azure-flow-calibration');
const { getDailyClose: marketClose } = require('./lib/azure-flow-market');
const { answer: answerAzureQuery } = require('./lib/azure-flow-query');
const { investigate: researchAzure } = require('./lib/azure-flow-intelligence');
const { persist: saveAzureRecord } = require('./lib/azure-flow-evidence-record');
const { read: readAzureLearning, append: recordAzureLearning, similar: recallAzureLearning } = require('./lib/azure-flow-learning');

const ROOT = __dirname;
const STATIC = path.join(ROOT, 'public');
const MIME = { '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/azure-flow.js': ['azure-flow.js', 'text/javascript; charset=utf-8'],
  '/azure-flow-motion.js': ['azure-flow-motion.js', 'text/javascript; charset=utf-8'],
  '/azure-flow.css': ['azure-flow.css', 'text/css; charset=utf-8'] };
const UUID = '[a-f0-9-]{36}';
const cookieName = 'towerflow_session';
const hash = data => data === null ? null : crypto.createHash('sha256').update(data).digest('hex');
const revisionOf = fingerprint => fingerprint || 'empty';

function csvCell(value) {
  let cell = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
}
function csv(rows) { return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }
function isLoopback(address) { return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address); }
function sessionCookie(token, secure = false) {
  return `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_AGE}${secure ? '; Secure' : ''}`;
}

function createApp({ directory = path.join(ROOT, 'data'), researchImpl = researchAzure } = {}) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const accounts = new Accounts(directory);
  const storeFile = path.join(directory, 'inventory.json');
  const initial = fs.existsSync(storeFile) ? fs.readFileSync(storeFile) : null;
  let fingerprint = hash(initial);
  let state = initial ? validateState(JSON.parse(initial.toString('utf8'))) : emptyInventory();
  const listeners = new Set();
  // Short-lived, single-use preview IDs; never trust stock quantities supplied by a browser.
  const guidePreviews = new Map();
  // Save only an owner-initiated, source-checked investigation already issued by this server.
  const azureDrafts = new Map();
  const server = http.createServer(handler);

  function publish() {
    const data = `data: ${JSON.stringify({ revision: revisionOf(fingerprint) })}\n\n`;
    for (const entry of listeners) {
      try {
        if (!accounts.session(entry.req)) entry.res.end();
        else entry.res.write(data);
      } catch { entry.res.end(); }
    }
  }
  function requireCurrent(req) {
    if (req.headers['x-towerflow-revision'] !== revisionOf(fingerprint)) {
      const conflict = new InputError('Inventory changed since you opened this form. Refresh and review it before saving.');
      conflict.status = 409;
      throw conflict;
    }
  }
  function save(candidate) {
    validateState(candidate);
    const existing = fs.existsSync(storeFile) ? fs.readFileSync(storeFile) : null;
    if (hash(existing) !== fingerprint) {
      const conflict = new InputError('Another server changed this inventory. Restart this server before editing.');
      conflict.status = 409;
      throw conflict;
    }
    const temp = path.join(directory, `.inventory-${crypto.randomUUID()}.tmp`);
    try {
      const fd = fs.openSync(temp, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(candidate, null, 2) + '\n', 'utf8');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
      if (existing) fs.copyFileSync(storeFile, storeFile + '.bak');
      fs.renameSync(temp, storeFile);
      fingerprint = hash(fs.readFileSync(storeFile));
      state = candidate;
      publish();
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  function commit(req, fn) {
    requireCurrent(req);
    const candidate = structuredClone(state);
    const result = fn(candidate);
    save(candidate);
    return result;
  }
  function respond(res, status, payload, contentType = 'application/json; charset=utf-8', more = {}) {
    const body = contentType.startsWith('application/json') ? JSON.stringify(payload) : payload;
    res.writeHead(status, { 'Content-Type': contentType, 'Content-Length': Buffer.byteLength(body),
      'Cache-Control': 'no-store', ...more });
    res.end(body);
  }
  async function jsonBody(req) {
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw new InputError('Expected JSON.');
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 2_200_000) { const e = new InputError('Request exceeds 2.2 MB.'); e.status = 413; throw e; }
      chunks.push(chunk);
    }
    try {
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('object required');
      return body;
    } catch { throw new InputError('Invalid JSON object.'); }
  }

  async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    const host = req.headers.host || '';
    const match = /^([A-Za-z0-9.-]+):(\d{1,5})$/.exec(host);
    const localAddress = req.socket.localAddress;
    const accepted = match && (match[1] === localAddress ||
      (isLoopback(localAddress) && ['localhost', '127.0.0.1'].includes(match[1])));
    if (!accepted || Number(match[2]) !== server.address()?.port) {
      return respond(res, 403, { error: 'Use this server’s local or private-network IP address.' });
    }
    let pathname;
    try { pathname = new URL(req.url, `http://${host}`).pathname; }
    catch { return respond(res, 400, { error: 'Invalid URL.' }); }
    const method = req.method;
    try {
      if (!['GET', 'HEAD'].includes(method)) {
        if (req.headers.origin !== `http://${host}` || req.headers['x-towerflow-request'] !== '1') {
          return respond(res, 403, { error: 'Request must come from this app.' });
        }
      }
      if (method === 'GET' && MIME[pathname]) {
        const [name, type] = MIME[pathname];
        return respond(res, 200, fs.readFileSync(path.join(STATIC, name)), type, { 'Cache-Control': 'no-cache' });
      }
      const session = accounts.session(req);
      if (method === 'GET' && pathname === '/api/auth/status') {
        return respond(res, 200, { initialized: accounts.initialized,
          setupAvailable: !accounts.initialized && isLoopback(req.socket.remoteAddress),
          user: session ? publicUser(session.user) : null });
      }
      if (method === 'POST' && pathname === '/api/auth/setup') {
        if (!isLoopback(req.socket.remoteAddress)) throw new AuthError('The owner must set up accounts on the server computer.', 403);
        const body = await jsonBody(req);
        const result = accounts.setup(body.username, body.password);
        return respond(res, 201, { user: result.user }, undefined,
          { 'Set-Cookie': sessionCookie(result.token, req.socket.encrypted) });
      }
      if (method === 'POST' && pathname === '/api/auth/login') {
        if (!accounts.initialized) throw new AuthError('The owner must finish setup first.', 403);
        const body = await jsonBody(req);
        const result = accounts.login(body.username, body.password, req.socket.remoteAddress);
        return respond(res, 200, { user: result.user }, undefined,
          { 'Set-Cookie': sessionCookie(result.token, req.socket.encrypted) });
      }
      if (method === 'POST' && pathname === '/api/auth/logout') {
        accounts.logout(session);
        return respond(res, 200, { loggedOut: true }, undefined,
          { 'Set-Cookie': `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
      }
      if (!session) throw new AuthError('Sign in to use this inventory.', 401);
      const user = session.user;
      if (method === 'PUT' && pathname === '/api/auth/password') {
        const body = await jsonBody(req);
        accounts.change(user, body.currentPassword, body.newPassword);
        publish();
        return respond(res, 200, { changed: true }, undefined,
          { 'Set-Cookie': `${cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0` });
      }
      if (pathname.startsWith('/api/users')) {
        if (user.role !== 'admin') throw new AuthError('Owner access is required.', 403);
        if (method === 'GET' && pathname === '/api/users') return respond(res, 200, accounts.list());
        if (method === 'POST' && pathname === '/api/users') {
          const body = await jsonBody(req);
          return respond(res, 201, accounts.create(body.username, body.password, body.role));
        }
        const id = new RegExp(`^/api/users/(${UUID})$`).exec(pathname);
        if (id && method === 'DELETE') {
          const removed = accounts.remove(id[1], user); publish();
          return respond(res, 200, removed);
        }
        const reset = new RegExp(`^/api/users/(${UUID})/password$`).exec(pathname);
        if (reset && method === 'PUT') {
          const body = await jsonBody(req);
          const changed = accounts.reset(reset[1], body.password); publish();
          return respond(res, 200, changed);
        }
      }
      if (method === 'GET' && pathname === '/api/state') {
        return respond(res, 200, { ...state, summary: summary(state), revision: revisionOf(fingerprint) });
      }
      if (method === 'POST' && pathname === '/api/azure-flow/research') {
        const body = await jsonBody(req);
        const sourceMode=body.sourceMode||'adaptive';
        if (!['adaptive','official-sec'].includes(sourceMode) ||
          !['allowPublic,question','allowPublic,question,sourceMode'].includes(Object.keys(body).sort().join(',')) ||
          typeof body.allowPublic !== 'boolean' ||
          (sourceMode==='official-sec'&&!body.allowPublic))
          throw new InputError('Research requires authorized public access for the selected source mode.');
        // Read only same-owner approved precedents; other users do not share episodes.
        const learningDir=path.join(directory,'azure-flow-learning');
        const precedents=recallAzureLearning(body.question,
          readAzureLearning(learningDir,{userId:user.id}));
        // Explicit user source selection is a bounded, user-authorized choice.
        // It never grants mutation rights and does not certify factual correctness.
        const userSelected=sourceMode==='official-sec';
        const output = await researchImpl(body.question,{state,revision:revisionOf(fingerprint),
          allowPublic:body.allowPublic,priorCases:precedents,isOwner:user.role==='admin',
          ...(userSelected?{planner:async question=>({
            status:'USER_SELECTED_OFFICIAL_SOURCE',model:null,question,
            capabilities:['research.sec']
          })}:{}),
          draftDirectory:path.join(directory,'azure-flow-findings',user.id)});
        // Bounded ephemeral draft receipts, not persistent automatic memory writes.
        for(const [key,entry] of azureDrafts){
          if(Date.now()-entry.at>600000)azureDrafts.delete(key);
        }
        if(azureDrafts.size>=40)azureDrafts.delete(azureDrafts.keys().next().value);
        azureDrafts.set(output.provenance.evidenceId,{at:Date.now(),userId:user.id,result:output});
        return respond(res,200,output);
      }
      if (method === 'POST' && pathname === '/api/azure-flow/feedback') {
        if (user.role !== 'admin')throw new AuthError('Owner access required to train routing memory.',403);
        const body=await jsonBody(req);
        if(Object.keys(body).sort().join(',')!=='evidenceId,grade,note')throw new InputError('Feedback requires evidenceId, grade, note.');
        const entry=azureDrafts.get(body.evidenceId);
        if(!entry||entry.userId!==user.id||Date.now()-entry.at>600000)
          throw new InputError('Research receipt expired or belongs to another user.');
        try {
          const recorded=recordAzureLearning(path.join(directory,'azure-flow-learning'),
            entry.result,body,{userId:user.id});
          return respond(res,201,recorded);
        } catch(error) {
          throw new InputError(error.message);
        }
      }
      if (method === 'POST' && pathname === '/api/azure-flow/save-research') {
        if (user.role !== 'admin')throw new AuthError('Owner approval required to save research records.',403);
        const body=await jsonBody(req);
        if(Object.keys(body).join(',')!=='evidenceId'||typeof body.evidenceId!=='string'||
          !/^[0-9a-f]{64}$/.test(body.evidenceId))throw new InputError('Valid evidence receipt required.');
        const entry=azureDrafts.get(body.evidenceId);
        if(!entry||entry.userId!==user.id||Date.now()-entry.at>600000)
          throw new InputError('Research receipt expired; investigate again before saving.');
        // Remove before writing, preventing duplicate saves for the same approved receipt.
        if(entry.saved)throw new InputError('Receipt already saved.');
        const saved=saveAzureRecord(entry.result,{directory:path.join(directory,'azure-flow-findings',user.id)});
        entry.saved=true;
        return respond(res,201,saved);
      }
      if (method === 'POST' && pathname === '/api/azure-flow/query') {
        const body = await jsonBody(req);
        if (Object.keys(body).sort().join(',') !== 'question') throw new InputError('Azure Flow accepts only a question.');
        const output = await answerAzureQuery(body.question,state,{revision:revisionOf(fingerprint)});
        return respond(res, 200, output);
      }
      if (method === 'POST' && pathname === '/api/azure-flow/market-close') {
        const body = await jsonBody(req);
        if (Object.keys(body).sort().join(',') !== 'symbol') throw new InputError('Only a stock symbol is accepted.');
        try { return respond(res, 200, await marketClose(body.symbol)); }
        catch { throw new InputError('Enter a supported U.S. equity symbol.'); }
      }
      if (method === 'GET' && pathname === '/api/azure-flow/model-health') {
        return respond(res, 200, await diagnoseAzureModel());
      }
      if (method === 'GET' && pathname === '/api/azure-flow/model-status') {
        return respond(res, 200, azureCalibrationStatus());
      }
      if (method === 'POST' && pathname === '/api/azure-flow/calibrate') {
        if (user.role !== 'admin') throw new AuthError('Owner access is required to screen local models.', 403);
        const body = await jsonBody(req);
        if (Object.keys(body).length) throw new InputError('Model screening accepts no user-supplied parameters.');
        return respond(res, 200, await calibrateAzureFlow());
      }
      if (method === 'POST' && pathname === '/api/azure-flow/investigate') {
        const body = await jsonBody(req);
        if (Object.keys(body).length) throw new InputError('Azure Flow investigation takes no browser-authored instructions.');
        const output = await investigateAzureFlow(state, {revision:revisionOf(fingerprint)});
        return respond(res, 200, output);
      }
      if (method === 'POST' && pathname === '/api/azure-flow/evaluate') {
        const body = await jsonBody(req);
        const permitted = ['inventory.read','sales.aggregate','portfolio.evaluate-import'];
        if (!permitted.includes(body.capability)) throw new InputError('Unsupported Azure Flow capability.');
        const output = runAzureFlow(state, { capability: body.capability,
          revision: revisionOf(fingerprint), portfolioRows: body.portfolioRows });
        return respond(res, 200, output);
      }
      if (method === 'POST' && pathname === '/api/azure-guide') {
        const body = await jsonBody(req);
        const guide = guideInterpret(state, body.command);
        // Avoid accumulating abandoned previews. 5-minute previews are single-use.
        for (const [id, entry] of guidePreviews) {
          if (entry.expires <= Date.now()) guidePreviews.delete(id);
        }
        if (guidePreviews.size >= 1000) guidePreviews.delete(guidePreviews.keys().next().value);
        const { proposedChange, ...advice } = guide;
        let previewId = null;
        if (proposedChange) {
          previewId = crypto.randomUUID();
          guidePreviews.set(previewId, { userId: user.id, revision: revisionOf(fingerprint),
            change: proposedChange, expires: Date.now() + 5 * 60 * 1000 });
        }
        return respond(res, 200, { ...advice, previewId, revision: revisionOf(fingerprint) });
      }
      if (method === 'POST' && pathname === '/api/azure-guide/apply') {
        const body = await jsonBody(req);
        if (typeof body.previewId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.previewId)) {
          throw new InputError('An Azure Guide preview is required before saving.');
        }
        const pending = guidePreviews.get(body.previewId);
        // Consume before mutation, so previews cannot be replayed even on a failed save.
        guidePreviews.delete(body.previewId);
        if (!pending || pending.userId !== user.id || pending.expires <= Date.now()) {
          const error = new InputError('This guide preview has expired. Run the command again.');
          error.status = 409;
          throw error;
        }
        if (pending.revision !== revisionOf(fingerprint)) {
          const error = new InputError('Inventory changed since the preview. Run the command again.');
          error.status = 409;
          throw error;
        }
        const result = commit(req, candidate => guideApply(candidate, pending.change));
        return respond(res, 200, result);
      }
      if (method === 'GET' && pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        const entry = { req, res };
        listeners.add(entry);
        res.write(`data: ${JSON.stringify({ revision: revisionOf(fingerprint) })}\n\n`);
        const ping = setInterval(() => {
          try {
            if (!accounts.session(req)) res.end();
            else res.write(': keepalive\n\n');
          } catch { res.end(); }
        }, 20_000);
        res.on('close', () => { clearInterval(ping); listeners.delete(entry); });
        return;
      }
      if (method === 'GET' && pathname === '/api/scan') {
        const code = new URL(req.url, `http://${host}`).searchParams.get('code') || '';
        if (code.length > 500) throw new InputError('Code is too long.');
        const found = findCode(state, code);
        return respond(res, found ? 200 : 404, found || { error: 'No product has that exact ID, barcode, or QR payload.' });
      }
      if (method === 'POST' && pathname === '/api/products') {
        const body = await jsonBody(req);
        return respond(res, 201, commit(req, s => createProduct(s, body)));
      }
      const product = /^\/api\/products\/(\d+)$/.exec(pathname);
      if (product && method === 'PUT') {
        const body = await jsonBody(req);
        return respond(res, 200, commit(req, s => editProduct(s, Number(product[1]), body)));
      }
      if (product && method === 'DELETE') {
        return respond(res, 200, commit(req, s => archiveProduct(s, Number(product[1]))));
      }
      const unused = /^\/api\/products\/(\d+)\/permanent$/.exec(pathname);
      if (unused && method === 'DELETE') {
        return respond(res, 200, commit(req, s => deleteProduct(s, Number(unused[1]))));
      }
      const movement = /^\/api\/products\/(\d+)\/movements$/.exec(pathname);
      if (movement && method === 'POST') {
        const body = await jsonBody(req);
        return respond(res, 201, commit(req, s => recordMovement(s, Number(movement[1]), body)));
      }
      const stockSet = /^\/api\/products\/(\d+)\/stock\/set$/.exec(pathname);
      if (stockSet && method === 'POST') {
        const body = await jsonBody(req);
        return respond(res, 200, commit(req, s => setStock(s, Number(stockSet[1]), body)));
      }
      if (method === 'POST' && pathname === '/api/work-orders') {
        const body = await jsonBody(req);
        return respond(res, 201, commit(req, s => createWorkOrder(s, body)));
      }
      const work = /^\/api\/work-orders\/(\d+)$/.exec(pathname);
      if (work && method === 'PUT') {
        const body = await jsonBody(req);
        return respond(res, 200, commit(req, s => editWorkOrder(s, Number(work[1]), body)));
      }
      if (work && method === 'DELETE') {
        return respond(res, 200, commit(req, s => deleteWorkOrder(s, Number(work[1]))));
      }
      if (method === 'POST' && pathname === '/api/purchase-orders') {
        const body = await jsonBody(req);
        return respond(res, 201, commit(req, s => createPurchaseOrder(s, body)));
      }
      const received = /^\/api\/purchase-orders\/(\d+)\/receive$/.exec(pathname);
      if (received && method === 'POST') {
        const body = await jsonBody(req);
        return respond(res, 200, commit(req, s => receivePurchaseOrder(s, Number(received[1]), body)));
      }
      const cancelled = /^\/api\/purchase-orders\/(\d+)\/cancel$/.exec(pathname);
      if (cancelled && method === 'POST') {
        return respond(res, 200, commit(req, s => cancelPurchaseOrder(s, Number(cancelled[1]))));
      }
      if (method === 'PUT' && pathname === '/api/business') {
        const body = await jsonBody(req);
        const businessName = label(body.name, 'Business name');
        return respond(res, 200, commit(req, s => { s.businessName = businessName; return { businessName }; }));
      }
      if (method === 'POST' && (pathname === '/api/import/preview' || pathname === '/api/import')) {
        const body = await jsonBody(req);
        const imported = parseLegacy(body.text);
        if (pathname.endsWith('/preview')) {
          const draft = structuredClone(state);
          const result = importProducts(draft, imported);
          return respond(res, 200, { format: imported.format, ...result });
        }
        const result = commit(req, s => importProducts(s, imported));
        return respond(res, 200, { format: imported.format, ...result });
      }
      if (method === 'POST' && (pathname === '/api/restore' || pathname === '/api/restore/preview')) {
        if (user.role !== 'admin') throw new AuthError('Owner access is required to replace inventory.', 403);
        const body = await jsonBody(req);
        const restored = validateState(body);
        if (pathname === '/api/restore') { requireCurrent(req); save(restored); }
        return respond(res, 200, { products: restored.products.length, movements: restored.movements.length });
      }
      if (method === 'GET' && pathname === '/api/export.json') {
        return respond(res, 200, JSON.stringify(state, null, 2) + '\n', 'application/json; charset=utf-8',
          { 'Content-Disposition': 'attachment; filename="towerflow-backup.json"' });
      }
      if (method === 'GET' && pathname === '/api/dashboard.html') {
        return respond(res, 200, dashboard(state), 'text/html; charset=utf-8',
          { 'Content-Disposition': 'attachment; filename="towerflow-dashboard.html"' });
      }
      if (method === 'GET' && pathname === '/api/products.csv') {
        const rows = [['ID','Name','Category','Part number','Serial number','Revision','Barcode','QR payload','List price cents','Minimum stock','Location','Quantity','Archived']];
        for (const p of state.products) {
          if (!p.stock.length) rows.push([p.id,p.name,p.category,p.partNumber,p.serialNumber,p.revision,p.barcode,p.qrPayload,p.priceCents,p.minimumStock,'',0,p.archived]);
          else for (const x of p.stock) rows.push([p.id,p.name,p.category,p.partNumber,p.serialNumber,p.revision,p.barcode,p.qrPayload,p.priceCents,p.minimumStock,x.location,x.quantity,p.archived]);
        }
        return respond(res, 200, csv(rows), 'text/csv; charset=utf-8',
          { 'Content-Disposition': 'attachment; filename="towerflow-products.csv"' });
      }
      if (method === 'GET' && pathname === '/api/movements.csv') {
        const rows = [['Type','Product ID','Quantity','From','To','Recorded at UTC','Unit price cents','Business','Reference']];
        for (const m of state.movements) rows.push([m.type,m.productId,m.quantity,m.from,m.to,
          new Date(m.recordedAt * 1000).toISOString(),m.unitPriceCents,m.business,m.reference]);
        return respond(res, 200, csv(rows), 'text/csv; charset=utf-8',
          { 'Content-Disposition': 'attachment; filename="towerflow-movements.csv"' });
      }
      return respond(res, 404, { error: 'Route not found.' });
    } catch (error) {
      const status = error instanceof InputError || error instanceof AuthError || (error.status === 400) ? (error.status || 400) : 500;
      if (status === 500) console.error(error);
      if (!res.headersSent) respond(res, status, { error: status === 500 ? 'Could not complete the request; inventory was not changed.' : error.message });
    }
  }
  return server;
}

if (require.main === module) {
  const port = Number(process.env.TOWERFLOW_PORT || 4173);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port from 1024 to 65535.');
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`TowerFlow owner setup: http://127.0.0.1:${port}/`);
    console.log(`Private-network access: http://<this-computer's-private-IP>:${port}/`);
  });
}

module.exports = { createApp };
