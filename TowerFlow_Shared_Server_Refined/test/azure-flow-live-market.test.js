'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {liveSnapshot,validateTicker}=require('../lib/azure-flow-live-market');
const {createApp}=require('../server');
const NOW=Date.parse('2026-11-22T22:00:00.000Z');
function payload(override={}){
 return {price:'40000.25',bid:'40000.20',ask:'40000.30',
   time:'2026-11-22T21:59:50.000Z',...override};
}
test('fresh exchange payload results in sourced numeric observation from actual provider response shape',async()=>{
 const calls=[];
 const response=await liveSnapshot({now:NOW,pairs:['BTC-USD'],fetchImpl:async(url,options)=>{
   calls.push({url,options});
   return {ok:true,arrayBuffer:async()=>Buffer.from(JSON.stringify(payload()))};
 }});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.exchange.coinbase.com/products/BTC-USD/ticker');
 assert.equal(calls[0].options.method,'GET');
 assert.equal(response.verifiedCount,1);
 assert.equal(response.market,'CRYPTO_SPOT_ONLY');
 assert.equal(response.results[0].price,40000.25);
 assert.equal(response.results[0].ageMs,10000);
 assert.match(response.results[0].source,/api\.exchange\.coinbase\.com/);
});
test('stale, malformed, missing and unsupported price requests fail closed',async()=>{
 assert.throws(()=>validateTicker(payload({time:'2026-11-22T21:45:00Z'}),'BTC-USD',NOW));
 assert.throws(()=>validateTicker(payload({price:'NaN'}),'BTC-USD',NOW));
 assert.throws(()=>validateTicker(payload({bid:'50000.00'}),'BTC-USD',NOW));
 await assert.rejects(()=>liveSnapshot({pairs:['X-USD']}),/INVALID_PAIRS/);
 const failed=await liveSnapshot({now:NOW,pairs:['ETH-USD'],fetchImpl:async()=>({ok:false,status:429})});
 assert.equal(failed.verifiedCount,0);
 assert.equal(failed.results[0].status,'UNAVAILABLE');
 assert.equal(failed.results[0].price,undefined);
});
test('signed-in real HTTP endpoint gates consent and never writes inventory',async t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'af-live-market-'));
 let calls=0;
 const app=createApp({directory,liveMarketImpl:async()=>{calls++;
  return {schema:'azure-flow.live-market/v1',market:'CRYPTO_SPOT_ONLY',
    results:[],verifiedCount:0,retrievedAt:'2026-11-22T22:00:00Z'};
 }});
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 t.after(async()=>{await new Promise(resolve=>app.close(resolve));
   fs.rmSync(directory,{recursive:true,force:true})});
 const origin='http://127.0.0.1:'+app.address().port;
 async function post(route,body,cookie=''){
  return fetch(origin+route,{method:'POST',headers:{Origin:origin,
    'X-TowerFlow-Request':'1','Content-Type':'application/json',
    ...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 }
 const denied=await post('/api/azure-flow/live-market',{allowPublic:true});
 assert.equal(denied.status,401);assert.equal(calls,0);
 const created=await post('/api/auth/setup',{username:'marketowner',password:'TestPassword!2026-ABC'});
 assert.equal(created.status,201);
 const cookie=created.headers.get('set-cookie').split(';')[0];
 assert.equal((await post('/api/azure-flow/live-market',{allowPublic:false},cookie)).status,400);
 assert.equal(calls,0);
 const allowed=await post('/api/azure-flow/live-market',{allowPublic:true},cookie);
 assert.equal(allowed.status,200);assert.equal(calls,1);
 assert.equal((await allowed.json()).market,'CRYPTO_SPOT_ONLY');
 assert.equal(fs.existsSync(path.join(directory,'inventory.json')),false);
});
test('visible feed is wired to consent-gated backend and never calls trading endpoints',()=>{
 const js=fs.readFileSync(path.join(__dirname,'..','public','azure-flow.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'..','public','index.html'),'utf8');
 assert.match(html,/id="afLiveToggle"/);
 assert.match(html,/id="afLiveGrid"/);
 assert.match(js,/fetch\('\/api\/azure-flow\/live-market'/);
 assert.match(js,/body:JSON\.stringify\(\{allowPublic:true\}\)/);
 assert.match(js,/stopLiveFeed/);
 assert.match(js,/setTimeout\(refreshLiveFeed,20000\)/);
 assert.doesNotMatch(js,/\/api\/trade|\/api\/orders\/place/);
});
