'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {run}=require('../tools/azure-flow-sec-proof.cjs');
test('official proof refuses missing operator identity without querying network',async()=>{
  let called=0;
  const out=await run('Unknown',{agent:'',locator:async()=>{called++;}});
  assert.equal(out.verdict,'BLOCKED');
  assert.equal(called,0);
});
test('official proof rejects missing actual financial values despite valid locator',async()=>{
  const logs=[];
  const out=await run('Example',{agent:'TowerFlow verifier owner@example.org',
    locator:async()=>({status:'SOURCES_FOUND',issuer:{cik:789019,name:'Example'},
      hits:[{title:'10-K'}]}),
    facts:async()=>({status:'XBRL_UNAVAILABLE',hits:[]}),logger:x=>logs.push(x)});
  assert.equal(out.verdict,'NOT_VERIFIED');
  assert.match(logs.join(' '),/OFFICIAL_REPORTED_FACTS/);
});
test('official proof qualifies only typed SEC fact observations, not investment advice',async()=>{
  const r=await run('Example',{agent:'TowerFlow verifier owner@example.org',
    locator:async()=>({status:'SOURCES_FOUND',issuer:{cik:789019,name:'Example'},
      hits:[{title:'10-K'}]}),
    facts:async()=>({status:'REPORTED_FACTS_FOUND',hits:[{
      title:'Revenue',value:120,unit:'USD',tag:'Revenues',periodEnd:'2025-12-31',
      filed:'2026-02-22',accession:'0000789019-26-000001',
      url:'https://data.sec.gov/api/xbrl/companyfacts/CIK0000789019.json',
      sha256:'a'.repeat(64)}]}),logger:()=>{}});
  assert.equal(r.verdict,'PRIMARY_SOURCE_SCREEN_PASS');
  assert.equal(r.observations,1);
  assert.match(r.note,/not verified valuation/);
});
