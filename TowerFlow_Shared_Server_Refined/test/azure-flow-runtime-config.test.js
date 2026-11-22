'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {runtimeConfig}=require('../lib/azure-flow-runtime-config');

test('Azure Flow core is independent of optional SEC identity and status leaks no secrets',()=>{
  const offline=runtimeConfig({isOwner:false,secIdentity:''});
  assert.equal(offline.core.enabled,true);
  assert.equal(offline.research.defaultMode,'adaptive');
  assert.equal(offline.research.modes.find(x=>x.id==='official-sec').enabled,false);
  assert.ok(offline.capabilities.some(x=>x.id==='workspace.inventory'));
  assert.ok(!offline.capabilities.some(x=>x.id==='knowledge.findings'));
  assert.ok(!offline.capabilities.some(x=>x.id==='research.sec'));
  const token='Sample Operator example@domain.test';
  const configured=runtimeConfig({isOwner:true,secIdentity:token});
  assert.equal(configured.research.modes.find(x=>x.id==='official-sec').enabled,true);
  assert.ok(configured.capabilities.some(x=>x.id==='knowledge.findings'));
  assert.ok(!JSON.stringify(configured).includes(token));
  assert.ok(!JSON.stringify(configured).includes('example@domain.test'));
});
test('Azure Flow button has separate visual hierarchy and reads backend configuration',()=>{
  const root=path.join(__dirname,'..','public');
  const css=fs.readFileSync(path.join(root,'azure-flow.css'),'utf8');
  const js=fs.readFileSync(path.join(root,'azure-flow.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(css,/Azure Flow controls v2/);
  assert.match(css,/#azureFlow #afSourceMode/);
  assert.match(css,/#azureFlow #afCheckRoute/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(html,/id="afCheckRoute"/);
  assert.match(js,/fetch\('\/api\/azure-flow\/config'/);
  assert.match(js,/config\.core\?\.researchEndpoint/);
  assert.match(js,/opt\.disabled=!sec\?\.enabled/);
});
