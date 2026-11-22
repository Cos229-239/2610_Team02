'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyInventory } = require('../lib/inventory');
const { insight, market, parseCsv } = require('../lib/azure-insights');

test('one-click inventory reflects real data without mutation', () => {
  const state = emptyInventory();
  const previous = JSON.stringify(state);
  const result = insight(state, 1764000000);
  assert.equal(result.inventory.products, 0);
  assert.equal(result.inventory.lowStock, 0);
  assert.deepEqual(result.attention, []);
  assert.equal(JSON.stringify(state), previous);
});
test('market CSV requires fresh valid closing prices', () => {
  const today = new Date('2026-11-22T12:00:00Z');
  assert.deepEqual(parseCsv('Date,Open,High,Low,Close,Volume\n2026-11-20,100,104,99,102.5,200\n', today),
    { asOf: '2026-11-20', close: 102.5 });
  assert.equal(parseCsv('GET AN API KEY', today), null);
  assert.equal(parseCsv('<html>challenge</html>', today), null);
  assert.equal(parseCsv('Date,Open,High,Low,Close,Volume\n2020-01-01,10,12,9,11,10', today), null);
});
test('market refuses failed feeds instead of inventing quotes', async () => {
  const result = await market({
    now: Date.parse('2026-11-22T12:00:00Z'), force: true,
    fetchImpl: async () => ({ ok: true, text: async () => '<html>verification needed</html>' })
  });
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(result.quotes, []);
  assert.match(result.message, /unavailable/);
});
