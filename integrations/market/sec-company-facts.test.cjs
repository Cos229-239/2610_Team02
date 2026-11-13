"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {cik,extractFacts,createCompanyFacts}=require("./sec-company-facts.cjs");
const fixture={cik:320193,entityName:"Apple Inc.",facts:{"us-gaap":{
  Revenues:{units:{USD:[
   {val:600,form:"10-K",filed:"2025-10-31",end:"2025-09-30",fy:2025,fp:"FY"},
   {val:750,form:"10-K",filed:"2026-11-01",end:"2026-09-30",fy:2026,fp:"FY"}
  ]}},
  Assets:{units:{USD:[{val:5000,form:"10-Q",filed:"2026-08-02",end:"2026-06-30"}]}}
}}};
test("CIK is canonical and restricted",()=>{
 assert.equal(cik("320193"),"0000320193");
 assert.throws(()=>cik("../320193"),/Invalid/);
 assert.throws(()=>cik("AAPL"),/Invalid/);
});
test("SEC public filings retain source dates; never label as streaming sales",()=>{
 const result=extractFacts(fixture,"0000320193",{asOf:Date.parse("2026-11-02T00:00:00Z")});
 assert.equal(result.name,"Apple Inc.");
 assert.equal(result.source,"SEC EDGAR Company Facts XBRL");
 assert.equal(result.facts.find(x=>x.tag==="Revenues").value,750);
 assert.equal(result.status,"OFFICIAL_FILING_FACTS");
 assert.match(result.filingUpdateModel,/not live company sales/);
});
test("Future filings and mismatched companies are rejected",()=>{
 assert.equal(extractFacts(fixture,"0000320193",{asOf:Date.parse("2025-11-02T00:00:00Z")}).facts[0].value,600);
 assert.throws(()=>extractFacts(fixture,"0000000001"),/mismatch/);
});
test("Official HTTPS SEC endpoint and user agent, cache, no browser credential",async()=>{
 let requests=0;
 const facts=createCompanyFacts({userAgent:"TowerFlow Dev research-contact@example.org",now:()=>Date.parse("2026-11-12T20:00:00Z"),fetchFn:async(url,opts)=>{
  requests++;
  assert.equal(url,"https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json");
  assert.match(opts.headers["User-Agent"],/research-contact@example.org/);
  return {ok:true,json:async()=>fixture};
 }});
 assert.equal(facts.configured(),true);
 assert.equal((await facts.company("320193")).cache,"MISS");
 assert.equal((await facts.company("320193")).cache,"HIT");
 assert.equal(requests,1);
});
test("Missing declared requester or remote failure does not fabricate company data",async()=>{
 const absent=createCompanyFacts({userAgent:""});
 await assert.rejects(absent.company("320193"),/NOT_CONNECTED/);
 const errors=createCompanyFacts({userAgent:"TowerFlow Dev sec-contact@example.org",fetchFn:async()=>({ok:false})});
 await assert.rejects(errors.company("320193"),/unavailable/);
});
