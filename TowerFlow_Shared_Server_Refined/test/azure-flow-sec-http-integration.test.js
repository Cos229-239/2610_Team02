'use strict';
// Real localhost HTTP integration against the actual authenticated Node server,
// using an isolated temp account directory and a mock evidence provider.
// Not a browser-visual or live SEC-network certification.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {createApp}=require('../server');
test('authenticated Azure Flow official SEC mode reaches evidence API while disallowing unconsented access',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'towerflow-auth-sec-'));
  let calls=0,last=null;
  const app=createApp({directory:dir,researchImpl:async(question,opts)=>{
    calls++;last={question,opts};
    return {schema:'azure-flow-investigation/v1',answer:'Evidence: reported revenue, not valuation',
      sources:[{sourceId:'official-sec-1',kind:'official_reported_financial_fact',
        title:'Reported revenue',source:'SEC EDGAR',value:331839000000,
        url:'https://data.sec.gov/api/xbrl/companyfacts/CIK0000789019.json',
        sha256:'b'.repeat(64),excerpt:'Annual reported revenue: 331,839,000,000 USD.'}],
      plan:{status:opts.planner?'USER_SELECTED_OFFICIAL_SOURCE':'MODEL_PLAN_VALIDATED',
        capabilities:opts.planner?['research.sec']:['knowledge.markdown']},
      evidenceAudit:{evidenceStatus:'ISSUER_REPORTED_FACTS_PRESENT',sourceCount:1,
        independentOriginsObserved:1,nextEvidenceNeed:'Verify original document.'},
      provenance:{evidenceId:'a'.repeat(64)},unknowns:[],retrievalPasses:1,
      synthesis:{state:'MODEL_SYNTHESIS_UNAVAILABLE'}};
  }});
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  t.after(async()=>{await new Promise(resolve=>app.close(resolve));
    fs.rmSync(dir,{recursive:true,force:true})});
  const base='http://127.0.0.1:'+app.address().port;
  const post=(route,body,cookie='',headers={})=>fetch(base+route,{
    method:'POST',headers:{Origin:base,'X-TowerFlow-Request':'1',
      'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...headers},
    body:JSON.stringify(body)});
  const page=await fetch(base+'/');
  const html=await page.text();
  assert.equal(page.status,200);
  assert.match(html,/id="azureFlow"/);
  assert.match(html,/id="afSourceMode"/);
  const browser=await fetch(base+'/azure-flow.js');
  const script=await browser.text();
  assert.equal(browser.status,200);
  assert.match(script,/sourceMode/);
  const noAuth=await post('/api/azure-flow/research',{
    question:'Microsoft',allowPublic:true,sourceMode:'official-sec'});
  assert.equal(noAuth.status,401);
  assert.equal(calls,0);
  const created=await post('/api/auth/setup',{
    username:'azuretest',password:'LocalTestPassword_2026!'});
  assert.equal(created.status,201);
  const cookie=created.headers.get('set-cookie').split(';')[0];
  const missingConsent=await post('/api/azure-flow/research',{
    question:'Microsoft',allowPublic:false,sourceMode:'official-sec'},cookie);
  assert.equal(missingConsent.status,400);
  assert.equal(calls,0);
  const deniedOrigin=await post('/api/azure-flow/research',{
    question:'Microsoft',allowPublic:true,sourceMode:'official-sec'},
    cookie,{Origin:'http://evil.invalid'});
  assert.equal(deniedOrigin.status,403);
  assert.equal(calls,0);
  const valid=await post('/api/azure-flow/research',{
    question:'Microsoft',allowPublic:true,sourceMode:'official-sec'},cookie);
  assert.equal(valid.status,200);
  const response=await valid.json();
  assert.equal(calls,1);
  assert.equal(last.question,'Microsoft');
  assert.equal(last.opts.allowPublic,true);
  assert.equal(typeof last.opts.planner,'function');
  const selected=await last.opts.planner('Microsoft');
  assert.deepEqual(selected.capabilities,['research.sec']);
  assert.equal(response.sources[0].value,331839000000);
  assert.equal(response.evidenceAudit.evidenceStatus,'ISSUER_REPORTED_FACTS_PRESENT');
  assert.equal(response.plan.status,'USER_SELECTED_OFFICIAL_SOURCE');
  assert.equal(fs.existsSync(path.join(dir,'inventory.json')),false);
  const state=await fetch(base+'/api/state',{headers:{Cookie:cookie}});
  assert.equal(state.status,200);
  const stateObj=await state.json();
  assert.equal(stateObj.products.length,0);
});
