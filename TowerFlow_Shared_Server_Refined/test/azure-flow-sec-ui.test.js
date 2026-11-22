'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');
test('Azure Flow official-research UI requires explicit public consent and source selection',()=>{
  const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
  const browser=fs.readFileSync(path.join(root,'public/azure-flow.js'),'utf8');
  assert.match(html,/id="afAllowPublic"/);
  assert.match(html,/id="afSourceMode"/);
  assert.match(html,/value="official-sec"/);
  assert.match(html,/SEC EDGAR and\/or Wikipedia/);
  assert.match(browser,/sourceMode==='official-sec'&&!get\('afAllowPublic'\)\.checked/);
  assert.match(browser,/body:JSON\.stringify\(\{question,allowPublic:get\('afAllowPublic'\)\.checked,/);
  assert.match(browser,/sourceMode/);
});
test('research server must block an unconsented official SEC mode before any harness starts',()=>{
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  assert.match(server,/sourceMode==='official-sec'&&!body\.allowPublic/);
  assert.match(server,/status:'USER_SELECTED_OFFICIAL_SOURCE'/);
  assert.match(server,/capabilities:\['research\.sec'\]/);
  assert.match(server,/userSelected\?\{planner:/);
});
test('explicit official-source selection must not modify inventory or existing business permissions',()=>{
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  const source=server.slice(server.indexOf("pathname === '/api/azure-flow/research'"),
    server.indexOf("pathname === '/api/azure-flow/feedback'"));
  assert.ok(source.length>350);
  assert.doesNotMatch(source,/saveState|publish\(|writeFileSync|recordMovement|applyStock/);
  assert.match(source,/researchAzure\(/);
});
