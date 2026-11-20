'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {normalize,parseLedger,makeReader,mount}=require('../collaboration-room/azure-bridge/business-signals.cjs');
const NOW=Date.parse('2026-11-20T01:00:00Z');
const event=(id,kind,net,latitude=40.71,longitude=-74.02)=>({
 event_id:id,kind,net_revenue_cents:net,latitude,longitude,occurred_at:new Date(NOW-1000).toISOString(),currency:'USD'
});
test('Green net surplus, yellow exact balance, red return or loss; no invented geographical position',()=>{
 const green=normalize(event('sale-1','sale',12000),NOW);
 const yellow=normalize(event('balance-1','sale',0),NOW);
 const red=normalize(event('return-1','refund',-1500),NOW);
 const loss=normalize(event('loss-1','sale',-100),NOW);
 assert.equal(green.state,'green');assert.equal(yellow.state,'yellow');
 assert.equal(red.state,'red');assert.equal(loss.state,'red');
 assert.equal(green.lat,40.7);assert.equal(green.lon,-74);
 for(const invalid of [
   {...event('bad','sale',20),latitude:null},
   {...event('bad','sale',20),latitude:91},
   {...event('bad','sale',20),longitude:-182},
   {...event('bad','sale',20),kind:'stock_fill'},
   {...event('bad','sale',20),net_revenue_cents:12.5},
   {...event('bad','sale',20),occurred_at:'not a date'},
   {...event('bad','sale',20),event_id:'<script>alert(1)</script>'}
 ]) assert.equal(normalize(invalid,NOW),null);
});
test('Dedupe event IDs, reject corrupted rows and keep only last 80 fresh events',()=>{
 const rows=[
  JSON.stringify(event('unique','sale',120)),
  '{broken json',
  JSON.stringify(event('unique','refund',-120)),
  JSON.stringify(event('old','sale',4)).replace(new Date(NOW-1000).toISOString(),'2010-01-01T00:00:00Z')
 ];
 const data=parseLedger(rows.join('\n'),NOW);
 assert.equal(data.length,1);assert.equal(data[0].state,'red','latest event with same ID takes precedence');
 assert.match(data[0].id,/^[a-f0-9]{20}$/);
 assert.ok(!JSON.stringify(data).includes('unique'));
 assert.ok(!JSON.stringify(data).includes('netRevenueCents'));
 assert.ok(!JSON.stringify(data).includes('12000'));
});
test('Source not configured has zero transactions, no fake live mode',async()=>{
 const reader=makeReader({file:undefined});
 assert.deepEqual((await reader()).events,[]);
 assert.equal((await reader()).mode,'UNCONFIGURED');
});
test('Configured ledger reads real file only; refuses oversized source and clears display',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tf-sales-audit-'));
 const ledger=path.join(tmp,'events.jsonl');
 try{
  fs.writeFileSync(ledger,JSON.stringify(event('real-1','sale',200))+'\n');
  const reader=makeReader({file:ledger,now:()=>NOW});
  assert.equal((await reader()).mode,'CONFIGURED_LEDGER');
  assert.match((await reader()).events[0].id,/^[a-f0-9]{20}$/);
  fs.writeFileSync(ledger,'X'.repeat(1024*1024+1));
  const state=await reader();assert.equal(state.mode,'UNAVAILABLE');assert.equal(state.events.length,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('Authenticated business-signal endpoint reports only normalized data',async()=>{
 let handler;
 const app={get:(route,...params)=>{if(route==='/api/azure-bridge/business-signals')handler=params.at(-1);}};
 mount(app,{auth:()=>{},ensureMember:()=>{},reader:async()=>({mode:'UNCONFIGURED',events:[],reason:'No ledger'})});
 const res={headers:{},set(k,v){this.headers[k]=v;return this},status(n){this.code=n;return this},json(payload){this.body=payload;return this}};
 await handler({},res);
 assert.equal(res.body.mode,'UNCONFIGURED');assert.equal(res.body.events.length,0);
 assert.equal(res.headers['Cache-Control'],'no-store');
});
