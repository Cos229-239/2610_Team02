'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { emptyInventory } = require('../lib/inventory');
const { overview, portfolio, run } = require('../lib/azure-flow-harness');
const { createApp } = require('../server');

test('Azure Flow is deterministic, read-only and evidence-backed', () => {
  const state = emptyInventory();
  const previous = JSON.stringify(state);
  const one = overview(state, {now:1763850000,revision:'empty'});
  const two = overview(state, {now:1763850000,revision:'empty'});
  assert.deepEqual(one,two);
  assert.equal(one.inventory.products,0);
  assert.equal(one.operations.recordedSales,0);
  assert.equal(JSON.stringify(state),previous);
  assert.match(one.evidenceHash,/^[a-f0-9]{64}$/);
  assert.throws(()=>run(state,{capability:'arbitrary.shell'}),/Unknown or unauthorized/);
});

test('Azure Flow market accounting uses only user-provided prices and executes no trades', () => {
  const report = portfolio([{symbol:'AAPL',shares:2,costPerShare:150,observedPrice:180,asOf:'2026-11-20'}]);
  assert.equal(report.costCents,30000);
  assert.equal(report.valueCents,36000);
  assert.equal(report.differenceCents,6000);
  assert.equal(report.readOnly,true);
  assert.match(report.notice,/No orders or shares were traded/);
  assert.throws(()=>portfolio([{symbol:'?',shares:1,costPerShare:2,observedPrice:3,asOf:'2026-11-20'}]),/symbol/);
  assert.throws(()=>portfolio([{symbol:'AAPL',shares:-2,costPerShare:2,observedPrice:3,asOf:'2026-11-20'}]),/Invalid share/);
  assert.throws(()=>portfolio(new Array(26).fill({})),/25/);
});

test('Both browser scripts parse before login; Azure Flow markup has isolated navigation',()=>{
  const app = fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
  const flow = fs.readFileSync(path.join(__dirname,'../public/azure-flow.js'),'utf8');
  const html = fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
  assert.doesNotThrow(()=>new vm.Script(app));
  assert.doesNotThrow(()=>new vm.Script(flow));
  assert.match(app,/authForm.*addEventListener\('submit'/);
  assert.match(html,/data-page="azureflow"/);
  assert.match(html,/data-view="azureflow"/);
  assert.match(html,/data-page="azure"/);
});

test('Azure Flow route requires login and never writes inventory', async t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'towerflow-azure-flow-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const server=createApp({directory});
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  t.after(()=>new Promise(ok=>server.close(ok)));
  const origin='http://127.0.0.1:'+server.address().port;
  const post=(route,body,cookie='')=>fetch(origin+route,{
    method:'POST',headers:{Origin:origin,'X-TowerFlow-Request':'1','Content-Type':'application/json',
      ...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)
  });
  assert.equal((await post('/api/azure-flow/evaluate',{capability:'inventory.read'})).status,401);
  const setup=await post('/api/auth/setup',{username:'Owner',password:'correct horse battery'});
  assert.equal(setup.status,201);
  const cookie=setup.headers.get('set-cookie').split(';')[0];
  const prior=await (await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).json();
  const response=await post('/api/azure-flow/evaluate',{capability:'inventory.read'},cookie);
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.readOnly,true);
  assert.equal(body.revision,'empty');
  assert.equal((await post('/api/azure-flow/evaluate',{capability:'execute.shell'},cookie)).status,400);
  const holdings=await post('/api/azure-flow/evaluate',{capability:'portfolio.evaluate-import',portfolioRows:[
    {symbol:'MSFT',shares:1,costPerShare:100,observedPrice:110,asOf:'2026-11-20'}
  ]},cookie);
  assert.equal(holdings.status,200);
  assert.equal((await holdings.json()).differenceCents,1000);
  const after=await (await fetch(origin+'/api/state',{headers:{Cookie:cookie}})).json();
  assert.deepEqual(after,prior);
  assert.equal(fs.existsSync(path.join(directory,'inventory.json')),false);
});

test('review actions account for pending purchase orders and cannot mutate stock',()=>{
  const {createProduct,setStock,createPurchaseOrder}=require('../lib/inventory');
  const state=emptyInventory();
  const part=createProduct(state,{name:'Business adapter',priceCents:1800,minimumStock:10});
  setStock(state,part.id,{location:'Main',quantity:2});
  const prior=JSON.stringify(state);
  const proposed=overviewForReview(state);
  assert.equal(proposed.reviewActions[0].reviewQuantity,9);
  assert.equal(proposed.reviewActions[0].requiresHumanReview,true);
  assert.equal(proposed.reviewActions[0].applied,false);
  assert.equal(JSON.stringify(state),prior);
  createPurchaseOrder(state,{supplier:'Vendor',productId:part.id,quantity:9,unitPriceCents:1000});
  const covered=overviewForReview(state);
  assert.equal(covered.reviewActions[0].reviewQuantity,0);
  assert.equal(covered.reviewActions[0].disposition,'PENDING_ORDER_COVERS_MINIMUM');
  function overviewForReview(source){
    return overview(source,{now:Math.floor(Date.now()/1000),revision:'fixture'});
  }
});
