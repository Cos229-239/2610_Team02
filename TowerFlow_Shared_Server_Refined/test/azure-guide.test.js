'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');
const { emptyInventory, createProduct, setStock, editProduct, recordMovement, InputError } = require('../lib/inventory');
const { interpret, apply } = require('../lib/azure-guide');

const part = { name: 'Copper Bolt', category: 'Hardware', partNumber: 115, serialNumber: 902701,
  revision: 1, barcode: 'BOLT-115', priceCents: 250, minimumStock: 5 };
const plain = { name: 'Circuit Board', barcode: 'BOARD-1', priceCents: 2000, minimumStock: 4 };
function inventory() {
  const state = emptyInventory();
  createProduct(state, part);
  createProduct(state, plain);
  setStock(state, 1, { location: 'Main', quantity: 4 });
  setStock(state, 2, { location: 'Shelf A', quantity: 1 });
  return state;
}

test('Daniel Azure guide: deterministic help, low stock, find and sorting', () => {
  const state = inventory();
  const before = JSON.stringify(state);
  assert.match(interpret(state, 'help').message, /confirm/i);
  const low = interpret(state, 'low stock');
  assert.deepEqual(low.displayParts.map(p => p.name), ['Circuit Board', 'Copper Bolt']);
  assert.deepEqual(interpret(state, 'find copper').displayParts.map(p => p.name), ['Copper Bolt']);
  assert.deepEqual(interpret(state, 'find 115/902701').displayParts.map(p => p.name), ['Copper Bolt']);
  assert.deepEqual(interpret(state, 'find BOLT-115').displayParts.map(p => p.name), ['Copper Bolt']);
  assert.deepEqual(interpret(state, 'find hardware').displayParts.map(p => p.name), ['Copper Bolt']);
  assert.deepEqual(interpret(state, 'find BOARD-1').displayParts.map(p => p.name), ['Circuit Board']);
  assert.match(interpret(state, 'find').message, /Enter a name/);
  assert.match(interpret(state, 'summary').message, /2 active product\(s\), 5 total unit\(s\)/);
  const reorder = interpret(state, 'reorder');
  assert.deepEqual(reorder.displayParts.map(p => p.name), ['Circuit Board', 'Copper Bolt']);
  assert.deepEqual(reorder.displayParts.map(p => p.reorderAmount), [4, 2]);
  assert.deepEqual(reorder.displayParts.map(p => p.minimumStock), [4, 5]);
  assert.equal(reorder.displayParts[0].locationCount, 1);
  assert.deepEqual(interpret(state, 'sort name').displayParts.map(p => p.name), ['Circuit Board', 'Copper Bolt']);
  assert.deepEqual(interpret(state, 'sort quantity').displayParts.map(p => p.quantity), [1, 4]);
  assert.match(interpret(state, 'find xyz').message, /0 part/);
  assert.match(interpret(state, 'drop database').message, /not recognized/);
  assert.equal(JSON.stringify(state), before, 'search and preview never modify inventory');
  assert.throws(() => interpret(state, 'x'.repeat(501)), InputError);
});

test('Daniel Azure guide: set/add preview, explicit apply, and regular movement history', () => {
  const state = inventory();
  const advice = interpret(state, 'add 115/902701 by 3');
  assert.deepEqual(advice.previewDetails, { name: 'Copper Bolt', partNumber: 115,
    serialNumber: 902701, location: 'Main', current: 4, next: 7 });
  const proposal = advice.proposedChange;
  assert.equal(proposal.expectedQuantity, 4);
  assert.equal(proposal.newQuantity, 7);
  assert.equal(state.products[0].stock[0].quantity, 4, 'preview must not save');
  const before = state.movements.length;
  const saved = apply(state, proposal);
  assert.equal(saved.quantity, 7);
  assert.equal(state.products[0].stock[0].quantity, 7);
  assert.equal(state.movements.length, before + 1);
  assert.equal(state.movements.at(-1).type, 'receive');
  assert.equal(state.movements.at(-1).quantity, 3);
  const set = interpret(state, 'set 115/902701 to 2').proposedChange;
  apply(state, set);
  assert.equal(state.movements.at(-1).type, 'remove');
  assert.equal(state.movements.at(-1).quantity, 5);
  assert.equal(state.products[0].stock[0].quantity, 2);
  assert.match(interpret(state, 'add 115/902701 by 999999').message, /Unsafe/);
  assert.match(interpret(state, 'set 115/902701 by 1').message, /Use set/);
});

test('Daniel Azure guide: refuses stale stock, identity drift and ambiguous locations', () => {
  const state = inventory();
  const proposal = interpret(state, 'set 115/902701 to 11').proposedChange;
  recordMovement(state, 1, { type: 'receive', quantity: 1, to: 'Main' });
  assert.throws(() => apply(state, proposal), /changed since the preview/);
  const proposal2 = interpret(state, 'add 115/902701 by 1').proposedChange;
  editProduct(state, 1, { ...part, name: 'Copper Bolt v2', revision: 2 });
  assert.throws(() => apply(state, proposal2), /changed since the preview/);
  setStock(state, 1, { location: 'Annex', quantity: 2 });
  assert.match(interpret(state, 'set 115/902701 to 2').message, /multiple locations/);
  assert.match(interpret(state, 'set 115/999999 to 2').message, /not found/);
});

const password = 'correct horse battery';
function client(origin, cookie = '') {
  return (route, method = 'GET', body, revision) => fetch(origin + route, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method === 'GET' ? {} : { Origin: origin, 'X-TowerFlow-Request': '1',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(revision === undefined ? {} : { 'X-TowerFlow-Revision': revision }) })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}
async function start(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'towerflow-azure-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const server = createApp({ directory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('Azure Stock Guide shared-server endpoint: authenticated preview, one-time save and stale rejection', async t => {
  const origin = await start(t);
  const unauthenticated = client(origin);
  assert.equal((await unauthenticated('/api/azure-guide', 'POST', { command: 'low stock' })).status, 401);
  assert.equal((await unauthenticated('/api/azure-guide/apply', 'POST', { previewId: 'a'.repeat(36) })).status, 401);
  const setup = await unauthenticated('/api/auth/setup', 'POST', { username: 'Owner', password });
  assert.equal(setup.status, 201);
  const owner = client(origin, setup.headers.get('set-cookie').split(';')[0]);
  const initial = await (await owner('/api/state')).json();
  assert.equal((await owner('/api/products', 'POST', part, initial.revision)).status, 201);
  let current = await (await owner('/api/state')).json();
  assert.equal((await owner('/api/products/1/stock/set', 'POST', { location: 'Main', quantity: 4 }, current.revision)).status, 200);
  current = await (await owner('/api/state')).json();
  const view = await owner('/api/azure-guide', 'POST', { command: 'low stock' });
  assert.equal(view.status, 200);
  assert.equal((await view.json()).displayParts[0].name, 'Copper Bolt');
  const previewResponse = await owner('/api/azure-guide', 'POST', { command: 'add 115/902701 by 3' });
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.match(preview.message, /Preview only/);
  assert.match(preview.previewId, /^[a-f0-9-]{36}$/);
  assert.equal((await (await owner('/api/state')).json()).products[0].stock[0].quantity, 4);
  assert.equal((await owner('/api/azure-guide/apply', 'POST', { previewId: 'invalid' }, current.revision)).status, 400);
  const confirmed = await owner('/api/azure-guide/apply', 'POST', { previewId: preview.previewId }, current.revision);
  assert.equal(confirmed.status, 200);
  assert.equal((await confirmed.json()).quantity, 7);
  assert.equal((await owner('/api/azure-guide/apply', 'POST', { previewId: preview.previewId }, current.revision)).status, 409);
  current = await (await owner('/api/state')).json();
  assert.equal(current.products[0].stock[0].quantity, 7);
  assert.equal(current.movements.at(-1).type, 'receive');
  assert.equal(current.movements.at(-1).quantity, 3);
  const preview2 = await (await owner('/api/azure-guide', 'POST', { command: 'set 115/902701 to 1' })).json();
  assert.equal((await owner('/api/business', 'PUT', { name: 'Changed' }, current.revision)).status, 200);
  const newest = await (await owner('/api/state')).json();
  assert.equal((await owner('/api/azure-guide/apply', 'POST', { previewId: preview2.previewId }, newest.revision)).status, 409);
  assert.equal((await (await owner('/api/state')).json()).products[0].stock[0].quantity, 7);
  const html = await (await owner('/')).text();
  assert.match(html, /Azure Stock Guide/);
  assert.match(html, /Daniel Dulsky/);
  assert.doesNotMatch(html, /Ask TowerFlow|data-page=\"assistant\"/);
  assert.match(html, /data-azure-command=\"reorder\"/);
  assert.match(html, /id=\"azureDelta\"/);
  const reorderView = await (await owner('/api/azure-guide', 'POST', { command: 'reorder' })).json();
  assert.match(reorderView.message, /No active products are at or below/);
  const summaryView = await (await owner('/api/azure-guide', 'POST', { command: 'summary' })).json();
  assert.match(summaryView.message, /1 active product/);
});
