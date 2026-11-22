'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server');

test('forecast uses existing authenticated guide route, abstains without sales and never writes inventory', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'towerflow-ai-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const server = createApp({ directory });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (route,body,cookie='') => fetch(origin+route,{
    method:'POST',headers:{Origin:origin,'X-TowerFlow-Request':'1',
      'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},
    body:JSON.stringify(body)
  });
  assert.equal((await post('/api/azure-guide',{command:'forecast'})).status,401);
  const setup = await post('/api/auth/setup',{
    username:'Owner',password:'correct horse battery'
  });
  assert.equal(setup.status,201);
  const cookie=setup.headers.get('set-cookie').split(';')[0];
  const before=await (await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).json();
  const response=await post('/api/azure-guide',{command:'forecast'},cookie);
  assert.equal(response.status,200);
  const result=await response.json();
  assert.match(result.message,/NOT a trained AI\/LLM/);
  assert.deepEqual(result.modelRows,[]);
  assert.equal(result.previewId,null);
  const after=await (await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).json();
  assert.deepEqual(after,before);
  assert.equal(fs.existsSync(path.join(directory,'inventory.json')),false);
  const invalid=await post('/api/azure-guide',{command:'forecast '+'x'.repeat(161)},cookie);
  assert.equal(invalid.status,400);
  assert.match((await invalid.json()).error,/160 characters/);
});
