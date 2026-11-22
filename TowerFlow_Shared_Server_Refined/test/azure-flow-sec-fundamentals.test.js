'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {chooseAnnual,extract,factsUrl,researchFacts}=require('../lib/azure-flow-sec-fundamentals');
const {execute}=require('../lib/azure-flow-capabilities');
const time=Date.parse('2026-11-22T19:00:00Z');
function annual(value,overrides={}){
  return {form:'10-K',fp:'FY',fy:2025,accn:'0000789019-26-000001',
    start:'2025-07-01',end:'2026-06-30',filed:'2026-08-30',val:value,...overrides};
}
function filings(value){return {cik:789019,entityName:'Example Corporation',
  facts:{'us-gaap':{RevenueFromContractWithCustomerExcludingAssessedTax:{
    units:{USD:value}}}}};}
test('official SEC companyfacts exposes numeric annual issuer facts with explicit provenance',()=>{
  const result=extract(filings([annual(12345678)]),{cik:789019,now:time});
  assert.equal(result.status,'REPORTED_FACTS_FOUND');
  assert.equal(result.hits.length,1);
  assert.equal(result.hits[0].value,12345678);
  assert.equal(result.hits[0].unit,'USD');
  assert.equal(result.hits[0].periodEnd,'2026-06-30');
  assert.equal(result.hits[0].tag,'RevenueFromContractWithCustomerExcludingAssessedTax');
  assert.ok(result.hits[0].sha256.length===64);
  assert.ok(result.hits[0].url.startsWith('https://data.sec.gov/api/xbrl/companyfacts/'));
  assert.match(result.hits[0].limitations,/No independent audit/);
});
test('CIK mismatch and absent official taxonomy reject evidence',()=>{
  assert.equal(extract(filings([annual(1)]),{cik:100,now:time}).status,'INVALID_OFFICIAL_PAYLOAD');
  assert.equal(extract({cik:789019,facts:{}},{cik:789019,now:time}).hits.length,0);
  assert.throws(()=>factsUrl('789019'));
});
test('future-filed reports, quarterly periods, and invalid units cannot pass as annual financials',()=>{
  const rows=[
    annual(123,{filed:'2027-01-02'}),
    annual(44,{start:'2026-04-01'}),
    annual(8,{form:'10-Q'}),
    annual(2,{start:'2026-06-30'}),
    annual(3,{accn:'untrusted'}),
    annual(NaN),
    annual(5.5)
  ];
  assert.equal(extract(filings(rows),{cik:789019,now:time}).status,'NO_US_GAAP_ANNUAL_FACTS');
});
test('latest comparable period chosen; restated annual filing supersedes older statement',()=>{
  const old=annual(100,{start:'2024-07-01',end:'2025-06-30',filed:'2025-08-30',accn:'0000789019-25-000001'});
  const base=annual(200,{filed:'2026-08-30'});
  const restated=annual(230,{filed:'2026-09-30',accn:'0000789019-26-000002'});
  const selected=chooseAnnual({units:{USD:[old,base,restated]}},{now:time});
  assert.equal(selected.val,230);
});
test('point-in-time assets cannot be fabricated from duration rows',()=>{
  const facts={cik:789019,facts:{'us-gaap':{Assets:{units:{USD:[
    annual(800,{start:undefined}),
    annual(900,{start:'2025-07-01'})
  ]}}}}};
  const result=extract(facts,{cik:789019,now:time});
  assert.equal(result.hits.length,1);
  assert.equal(result.hits[0].value,800);
});
test('no operator contact means no SEC network call, even on a valid CIK',async()=>{
  let calls=0;
  const result=await researchFacts(789019,{agent:'',requester:async()=>{calls++;}});
  assert.equal(result.status,'OPERATOR_IDENTITY_REQUIRED');
  assert.equal(calls,0);
});
test('issuer-reported XBRL fetch uses the official CIK-bound SEC endpoint',async()=>{
  const seen=[];
  const result=await researchFacts(789019,{
    agent:'TowerFlow Research owner@example.org',now:time,
    requester:async(url,opts)=>{seen.push({url,opts});return filings([annual(123)])}
  });
  assert.equal(result.status,'REPORTED_FACTS_FOUND');
  assert.equal(seen.length,1);
  assert.equal(seen[0].url,'https://data.sec.gov/api/xbrl/companyfacts/CIK0000789019.json');
});
test('integrated SEC harness retrieves real-number evidence from a mocked issuer and XBRL provider',async()=>{
  const report=await execute('research.sec',{question:'Analyze Example Corporation public issuer',
    allowPublic:true,now:time,
    secImpl:async()=>({status:'SOURCES_FOUND',issuer:{cik:789019,name:'Example Corporation'},
      hits:[{sourceId:'filing-1',sha256:'a'.repeat(64),kind:'official_filing_metadata',
        source:'SEC',excerpt:'Locator for SEC filing'}]}),
    financialImpl:async()=>extract(filings([annual(123)]),{cik:789019,now:time})
  });
  assert.equal(report.status,'REPORTED_FACTS_FOUND');
  assert.equal(report.evidence.length,2);
  assert.equal(report.evidence[0].value,123);
  await assert.rejects(()=>execute('research.sec',{question:'Microsoft',allowPublic:false}),
    /not authorized/);
});
test('a failed primary-fact provider never becomes a manufactured financial number',async()=>{
  const r=await execute('research.sec',{question:'Example Corp',allowPublic:true,now:time,
    secImpl:async()=>({status:'SOURCES_FOUND',issuer:{cik:789019,name:'Example'},
      hits:[],note:'Metadata only'}),
    financialImpl:async()=>({status:'XBRL_UNAVAILABLE',hits:[],
      note:'Primary financial provider blocked'})});
  assert.equal(r.evidence.length,0);
  assert.equal(r.financialStatus,'XBRL_UNAVAILABLE');
  assert.equal(r.status,'SOURCES_FOUND'); // Metadata status alone != XBRL success.
});
