'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');

async function workspace(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'towerflow-malik-'));
  const server = createApp({ directory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
    const parent = path.resolve(os.tmpdir());
    if (path.dirname(path.resolve(directory)) === parent && path.basename(directory).startsWith('towerflow-malik-')) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  async function send(route, method = 'GET', body, revision) {
    return fetch(origin + route, { method, headers: {
      Cookie: cookie, Origin: origin, 'X-TowerFlow-Request': '1',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(revision === undefined ? {} : { 'X-TowerFlow-Revision': revision })
    }, body: body === undefined ? undefined : JSON.stringify(body) });
  }
  const setup = await send('/api/auth/setup', 'POST', { username: 'MalikTest', password: 'temporary acceptance password' });
  assert.equal(setup.status, 201);
  cookie = setup.headers.get('set-cookie').split(';')[0];
  const state = async () => (await send('/api/state')).json();
  async function change(route, method, body, expected = 200) {
    const before = await state();
    const response = await send(route, method, body, before.revision);
    assert.equal(response.status, expected, await response.text());
    return state();
  }
  await change('/api/products', 'POST', { name: 'Network cable', barcode: 'CABLE42', priceCents: 250, minimumStock: 1 }, 201);
  return { state, change };
}

test('Malik operations use the shared ledger for bulk, jobs, requests, purchases and sales', async t => {
  const { state, change } = await workspace(t);
  await change('/api/products/1/stock/set', 'POST', { location: 'Main', quantity: 10 });
  await change('/api/work-orders', 'POST', { productId: 1, description: 'Plan installation', quantity: 3 }, 201);
  await change('/api/work-orders/1', 'PUT', { productId: 1, description: 'Updated installation', quantity: 4 });
  await change('/api/purchase-orders', 'POST', { productId: 1, supplier: 'Supplier', quantity: 5, unitPriceCents: 125 }, 201);
  assert.equal((await state()).summary.units, '10', 'planning and requests must not consume or receive stock');
  await change('/api/purchase-orders/1/receive', 'POST', { location: 'Main' });
  const received = await state();
  assert.equal(received.summary.units, '15');
  assert.equal(received.purchaseOrders[0].status, 'received');
  await change('/api/purchase-orders/1/receive', 'POST', { location: 'Main' }, 400);
  assert.deepEqual(await state(), received, 'a duplicate receipt must not add stock or history');
  await change('/api/products/1/movements', 'POST', { type: 'purchase', quantity: 2, to: 'Main', unitPriceCents: 125, business: 'Supplier' }, 201);
  await change('/api/products/1/movements', 'POST', { type: 'sale', quantity: 3, from: 'Main', unitPriceCents: 250, business: 'Customer' }, 201);
  assert.equal((await state()).summary.units, '14');
  await change('/api/work-orders/1', 'DELETE');
  await change('/api/products/1/stock/set', 'POST', { location: 'Main', quantity: 0 });
  const cleared = await state();
  assert.equal(cleared.summary.units, '0');
  assert.equal(cleared.products.length, 1, 'clearing keeps the product');
  assert.ok(cleared.movements.some(m => m.type === 'sale'), 'clearing keeps historical sales');
});

test('rejected sales and cancelled supplier requests leave shared stock unchanged', async t => {
  const { state, change } = await workspace(t);
  await change('/api/products/1/stock/set', 'POST', { location: 'Main', quantity: 2 });
  const before = await state();
  await change('/api/products/1/movements', 'POST', { type: 'sale', quantity: 3, from: 'Main', unitPriceCents: 250, business: 'Customer' }, 400);
  assert.deepEqual(await state(), before, 'overselling must not change persisted inventory or revision');
  await change('/api/purchase-orders', 'POST', { productId: 1, supplier: 'Supplier', quantity: 5, unitPriceCents: 125 }, 201);
  await change('/api/purchase-orders/1/cancel', 'POST');
  const cancelled = await state();
  assert.equal(cancelled.summary.units, '2');
  assert.equal(cancelled.purchaseOrders[0].status, 'cancelled');
  await change('/api/purchase-orders/1/receive', 'POST', { location: 'Main' }, 400);
  assert.deepEqual(await state(), cancelled, 'a cancelled request cannot receive stock');
});
