'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { parseLegacy } = require('../lib/import-legacy');
const { emptyInventory, importProducts, createProduct, summary, setStock, createWorkOrder,
  editWorkOrder, deleteWorkOrder, createPurchaseOrder, receivePurchaseOrder,
  cancelPurchaseOrder, validateState, InputError } = require('../lib/inventory');
const { createApp } = require('../server');

const password = 'correct horse battery';
const product = { name: 'Adapter', barcode: 'SKU-1', priceCents: 1200, minimumStock: 2 };
function client(origin, cookie = '') {
  return (route, method = 'GET', body, revision) => fetch(origin + route, {
    method, headers: { ...(cookie ? { Cookie: cookie } : {}), ...(method === 'GET' ? {} : {
      Origin: origin, 'X-TowerFlow-Request': '1',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(revision === undefined ? {} : { 'X-TowerFlow-Revision': revision }) }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
async function start(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'towerflow-shared-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const server = createApp({ directory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return { directory, server, origin: `http://127.0.0.1:${server.address().port}` };
}
async function setup(origin) {
  const response = await client(origin)('/api/auth/setup', 'POST', { username: 'Owner', password });
  assert.equal(response.status, 201);
  return response.headers.get('set-cookie').split(';')[0];
}

test('ports legacy stock and Malik’s work, bulk and supplier-order semantics', () => {
  const state = emptyInventory();
  importProducts(state, parseLegacy('Metal Bar,1,235,134,12\n'));
  const work = createWorkOrder(state, { description: 'Repair rack', productId: 1, quantity: 3 });
  editWorkOrder(state, work.id, { description: 'Repair two racks', productId: 1, quantity: 4 });
  const order = createPurchaseOrder(state, { supplier: 'Supply Co', productId: 1, quantity: 5, unitPriceCents: 250 });
  assert.equal(summary(state).units, '12');
  receivePurchaseOrder(state, order.id, { location: 'Main' });
  assert.equal(summary(state).units, '17');
  assert.equal(state.movements.at(-1).reference, 'PO-1');
  assert.throws(() => receivePurchaseOrder(state, order.id, { location: 'Main' }), InputError);
  setStock(state, 1, { location: 'Main', quantity: 2 });
  assert.equal(summary(state).units, '2');
  const pending = createPurchaseOrder(state, { supplier: 'Supply Co', productId: 1, quantity: 1, unitPriceCents: 100 });
  cancelPurchaseOrder(state, pending.id);
  deleteWorkOrder(state, work.id);
  assert.equal(state.workOrders.length, 0);
  assert.equal(validateState(state).version, 2);
  assert.equal(state.products[0].category, '');
  const old = { version: 1, businessName: 'TowerFlow', nextId: 1, products: [], movements: [], room: { notes: '', messages: [] } };
  assert.equal(validateState(old).room, undefined);
});

test('accounts, protected routes, live update and stale edit rejection', async t => {
  const { origin, directory } = await start(t);
  const anon = client(origin);
  assert.equal((await anon('/api/state')).status, 401);
  assert.equal((await anon('/api/export.json')).status, 401);
  assert.equal((await anon('/api/events')).status, 401);
  assert.equal((await anon('/api/assistant', 'POST', { question: 'What is low on stock?' })).status, 401);
  assert.equal((await (await anon('/api/auth/status')).json()).setupAvailable, true);
  const owner = client(origin, await setup(origin));
  assert.equal((await anon('/api/auth/setup', 'POST', { username: 'Second', password })).status, 409);
  assert.equal((await anon('/api/auth/login', 'POST', { username: 'Owner', password: 'wrong' })).status, 401);
  const made = await (await owner('/api/users', 'POST', { username: 'Editor', password: 'another horse battery' })).json();
  const secondOwner = await (await owner('/api/users', 'POST', { username: 'BackupOwner', password: 'another horse battery', role: 'admin' })).json();
  assert.equal(secondOwner.role, 'admin');
  const login = await anon('/api/auth/login', 'POST', { username: 'Editor', password: 'another horse battery' });
  assert.equal(login.status, 200);
  const editor = client(origin, login.headers.get('set-cookie').split(';')[0]);
  assert.equal((await editor('/api/users')).status, 403);
  assert.equal((await editor('/api/restore/preview', 'POST', emptyInventory())).status, 403);
  const assistantBefore = await (await editor('/api/state')).json();
  const assistantResponse = await editor('/api/assistant', 'POST', { question: 'What is low on stock?' });
  assert.equal(assistantResponse.status, 200);
  assert.match((await assistantResponse.json()).answer, /No active products/);
  assert.equal((await (await editor('/api/state')).json()).revision, assistantBefore.revision);
  const initial = await (await editor('/api/state')).json();
  assert.equal(initial.revision, 'empty');
  const stream = await owner('/api/events');
  const reader = stream.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /"revision":"empty"/);
  assert.equal((await owner('/api/products', 'POST', product, initial.revision)).status, 201);
  assert.match(new TextDecoder().decode((await reader.read()).value), /"revision":"[a-f0-9]{64}"/);
  assert.equal((await editor('/api/products', 'POST', { ...product, barcode: 'SKU-2' }, initial.revision)).status, 409);
  const current = await (await editor('/api/state')).json();
  assert.equal(current.products.length, 1);
  assert.equal((await editor('/api/products/1/stock/set', 'POST', { location: 'Main', quantity: 4 }, current.revision)).status, 200);
  assert.equal((await (await owner('/api/state')).json()).summary.units, '4');
  assert.equal((await owner(`/api/users/${made.id}`, 'DELETE')).status, 200);
  assert.equal((await editor('/api/state')).status, 401);
  assert.equal((await owner('/api/room/events')).status, 404);
  assert.equal((await owner('/api/command')).status, 404);
  assert.equal((await anon('/api/products', 'POST', product, 'empty')).status, 401);
  const cross = await fetch(origin + '/api/products', { method: 'POST', headers: {
    Cookie: (await owner('/api/auth/status')).headers.get('cookie') || '',
    Origin: 'http://attacker.test', 'X-TowerFlow-Request': '1', 'Content-Type': 'application/json',
    'X-TowerFlow-Revision': current.revision }, body: JSON.stringify(product) });
  assert.equal(cross.status, 403);
  await reader.cancel();
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'accounts.json'))).users.length, 2);
});

test('v1 backup becomes v2, accounts persist, sessions expire on restart', async t => {
  const { directory, server, origin } = await start(t);
  const cookie = await setup(origin);
  const owner = client(origin, cookie);
  const old = { version: 1, businessName: 'Legacy', nextId: 1, products: [], movements: [] };
  assert.equal((await owner('/api/restore', 'POST', old, 'empty')).status, 200);
  assert.equal((await (await owner('/api/state')).json()).version, 2);
  await new Promise(resolve => server.close(resolve));
  const restarted = createApp({ directory });
  await new Promise(resolve => restarted.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => restarted.close(resolve)));
  const nextOrigin = `http://127.0.0.1:${restarted.address().port}`;
  assert.equal((await client(nextOrigin, cookie)('/api/state')).status, 401);
  const response = await client(nextOrigin)('/api/auth/login', 'POST', { username: 'Owner', password });
  assert.equal(response.status, 200);
  const state = await (await client(nextOrigin, response.headers.get('set-cookie').split(';')[0])('/api/state')).json();
  assert.equal(state.businessName, 'Legacy');
  assert.deepEqual(state.workOrders, []);
  assert.deepEqual(state.purchaseOrders, []);
});

test('orders and category persist while stale sessions cannot see later changes', async t => {
  const { directory, server, origin } = await start(t);
  const cookie = await setup(origin);
  const owner = client(origin, cookie);
  const initial = await (await owner('/api/state')).json();
  assert.equal((await owner('/api/products', 'POST', { ...product, category: 'Electrical' }, initial.revision)).status, 201);
  let current = await (await owner('/api/state')).json();
  assert.equal((await owner('/api/work-orders', 'POST', { productId: 1, description: 'Install adapter', quantity: 2 }, current.revision)).status, 201);
  current = await (await owner('/api/state')).json();
  assert.equal((await owner('/api/purchase-orders', 'POST', { productId: 1, supplier: 'Supply Co', quantity: 4, unitPriceCents: 300 }, current.revision)).status, 201);
  current = await (await owner('/api/state')).json();
  assert.equal(current.summary.units, '0');
  assert.equal((await owner('/api/purchase-orders/1/receive', 'POST', { location: 'Main' }, current.revision)).status, 200);
  current = await (await owner('/api/state')).json();
  assert.equal(current.summary.units, '4');
  assert.equal(current.products[0].category, 'Electrical');
  await new Promise(resolve => server.close(resolve));
  const restarted = createApp({ directory });
  await new Promise(resolve => restarted.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => restarted.close(resolve)));
  const nextOrigin = `http://127.0.0.1:${restarted.address().port}`;
  assert.equal((await client(nextOrigin, cookie)('/api/state')).status, 401);
  const login = await client(nextOrigin)('/api/auth/login', 'POST', { username: 'Owner', password });
  const restored = await (await client(nextOrigin, login.headers.get('set-cookie').split(';')[0])('/api/state')).json();
  assert.equal(restored.workOrders[0].description, 'Install adapter');
  assert.equal(restored.purchaseOrders[0].status, 'received');
  assert.equal(restored.products[0].category, 'Electrical');
  assert.equal(restored.summary.units, '4');
});
