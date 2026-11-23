'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {userAgent,locate,recentFilings,searchFilings}=require('../lib/azure-flow-sec-filings');
const {mountExpress}=require('../lib/azure-flow-express-bridge');
test('SEC official issuer mapping is dataset-driven, no static company aliases',()=>{
  const data={fields:['cik','name','ticker','exchange'],data:[
    [789019,'Microsoft Corporation','MSFT','Nasdaq'],
    [320193,'Apple Inc.','AAPL','Nasdaq'],
    [111,'Microsoft Holdings LP','MSFTX','Other']]};
  assert.equal(locate('Microsoft Corporation',data)[0].ticker,'MSFT');
  assert.equal(locate('MSFT',data)[0].name,'Microsoft Corporation');
  assert.equal(locate('Completely Unknown Brand',data).length,0);
  assert.equal(userAgent(''),null);
  assert.equal(userAgent('TowerFlow Research admin@example.org'),'TowerFlow Research admin@example.org');
});
test('SEC metadata requires official valid accession and primary document',()=>{
  const rec={filings:{recent:{form:['10-K','8-K','10-Q'],
    accessionNumber:['0000789019-26-000010','bad','0000789019-26-000011'],
    filingDate:['2026-10-01','2026-10-02','2026-11-01'],
    primaryDocument:['annual.htm','eight.htm','quarterly.htm']}}};
  const found=recentFilings(rec,789019);
  assert.equal(found.length,2);
  assert.equal(found[0].form,'10-K');
  assert.match(found[0].url,/https:\/\/www.sec.gov\/Archives\/edgar\/data\//);
});
test('SEC will not call a public provider without an identifying real contact',async()=>{
  let calls=0;
  const blocked=await searchFilings('Microsoft',{agent:'',fetchImpl:async()=>{calls++;}});
  assert.equal(blocked.status,'OPERATOR_IDENTITY_REQUIRED');
  assert.equal(calls,0);
});
test('SEC public query returns attributable metadata with mocked official source',async()=>{
  const input={fields:['cik','name','ticker','exchange'],data:[[789019,'Microsoft Corporation','MSFT','Nasdaq']]};
  const filings={filings:{recent:{
    form:['10-K'],accessionNumber:['0000789019-26-000010'],
    primaryDocument:['annual-report.htm'],filingDate:['2026-10-01']
  }}};
  const routes=[];
  const output=await searchFilings('Microsoft',{agent:'TowerFlow research test@example.org',
    now:Date.parse('2026-11-22T16:00:00Z'),
    fetchImpl:async url=>{
      routes.push(url);
      const json=url.includes('company_tickers_exchange')?input:filings;
      return {ok:true,arrayBuffer:async()=>Buffer.from(JSON.stringify(json))};
    }});
  assert.equal(output.status,'SOURCES_FOUND');
  assert.equal(output.issuer.ticker,'MSFT');
  assert.equal(output.hits.length,1);
  assert.match(output.hits[0].limitations,/filing itself must be read/);
  assert.equal(routes.length,2);
  assert.equal(output.hits[0].sha256.length,64);
});
test('optional Express adapter cannot mount without host auth and business readers',async()=>{
  assert.throws(()=>mountExpress({post(){}}),/authenticators/);
  const routes=[];
  const app={post(...args){routes.push(args)}};
  const noop=(req,res,next)=>next();
  const status=mountExpress(app,{authenticate:noop,requireMember:noop,
    loadInventory:async()=>({}),readRevision:async()=>'hash'});
  assert.equal(status.mounted,true);
  assert.equal(status.execution,'READ_ONLY');
  assert.equal(routes.length,1);
  assert.equal(routes[0][0],'/api/azure-flow-bridge/research');
  const handler=routes[0][3];
  const body={question:'Study the company',allowPublic:false};
  let statusCode=200,result=null;
  const response={set(){return this},status(code){statusCode=code;return this},
    json(payload){result=payload;return this}};
  await handler({body,get(name){return name==='origin'?'http://malicious.test':'1'},
    protocol:'http'},response);
  assert.equal(statusCode,403);
  assert.match(result.error,/Same-origin/);
});
