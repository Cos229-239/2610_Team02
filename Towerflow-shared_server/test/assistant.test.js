'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyInventory, createProduct, setStock, createWorkOrder,
  createPurchaseOrder, recordMovement, InputError } = require('../lib/inventory');
const { reply } = require('../lib/assistant');

function inventory() {
  const state = emptyInventory();
  createProduct(state, { name: 'Copper Bolt', category: 'Hardware', barcode: 'BOLT-1',
    qrPayload: 'QR-BOLT', priceCents: 250, minimumStock: 5 });
  createProduct(state, { name: 'Fan', barcode: 'FAN-1', priceCents: 1500, minimumStock: 1 });
  setStock(state, 1, { location: 'Shelf A', quantity: 3 });
  setStock(state, 2, { location: 'Main', quantity: 4 });
  createWorkOrder(state, { description: 'Replace hinge', productId: 1, quantity: 2 });
  createPurchaseOrder(state, { supplier: 'Local Supply', productId: 1, quantity: 10, unitPriceCents: 200 });
  recordMovement(state, 2, { type: 'sale', quantity: 1, from: 'Main',
    unitPriceCents: 1800, business: 'Shop A' });
  return state;
}

test('answers stock, location, low-stock and reorder questions from current data', () => {
  const state = inventory();
  assert.match(reply(state, 'Where is QR-BOLT?').answer, /Shelf A: 3/);
  assert.match(reply(state, 'How many Copper Bolt do we have?').answer, /Copper Bolt.*3 units/);
  assert.match(reply(state, 'What is low on stock?').answer, /Copper Bolt/);
  assert.doesNotMatch(reply(state, 'What is low on stock?').answer, /Fan/);
  assert.match(reply(state, 'What should we reorder?').answer, /add 3/);
  assert.match(reply(state, 'How many Copper Bolt should we reorder?').answer, /Suggested amount.*3/);
  assert.match(reply(state, 'What is the inventory value?').answer, /list value/);
});

test('summarizes planned orders and activity without changing inventory', () => {
  const state = inventory();
  const before = JSON.stringify(state);
  assert.match(reply(state, 'Show pending purchase orders').answer, /Local Supply/);
  assert.match(reply(state, 'Show work orders').answer, /Replace hinge/);
  assert.match(reply(state, 'Show recent movements').answer, /sale: 1 × Fan/);
  assert.match(reply(state, 'help').answer, /only read inventory data/);
  assert.match(reply(state, 'run system command').answer, /could not match/);
  assert.equal(JSON.stringify(state), before);
  assert.throws(() => reply(state, 'x'.repeat(501)), InputError);
  assert.throws(() => reply(state, ''), InputError);
});
