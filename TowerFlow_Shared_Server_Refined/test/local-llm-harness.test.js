'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyInventory } = require('../lib/inventory');
const { ask, validatePrompt, HarnessError } = require('../lib/local-llm-harness');

test('local harness rejects empty, oversized, and non-string prompts', () => {
  for (const p of ['', ' '.repeat(3), 'x'.repeat(1201), 12]) {
    assert.throws(() => validatePrompt(p), HarnessError);
  }
});

test('local harness only sends local summary and no credentials', async () => {
  let called = 0;
  const result = await ask(emptyInventory(), 'How many products?', {
    model: 'dolphin-llama3:8b',
    fetchImpl: async (url, options) => {
      called++;
      assert.equal(url, 'http://127.0.0.1:11434/api/chat');
      const body = JSON.parse(options.body);
      assert.equal(body.stream, false);
      assert.equal(body.messages[2].role, 'user');
      assert.equal(body.messages[2].content, 'How many products?');
      assert.ok(body.messages[1].content.includes('products'));
      assert.ok(!options.headers.Authorization);
      return { ok: true, json: async () => ({ message: { content: 'No products are recorded.' } }) };
    }
  });
  assert.equal(called, 1);
  assert.equal(result.readOnly, true);
  assert.equal(result.answer, 'No products are recorded.');
});

test('local harness fails closed without Ollama', async () => {
  await assert.rejects(
    ask(emptyInventory(), 'Are there products?', { fetchImpl: async () => { throw new Error('offline'); } }),
    /Local Ollama is unavailable/
  );
});
