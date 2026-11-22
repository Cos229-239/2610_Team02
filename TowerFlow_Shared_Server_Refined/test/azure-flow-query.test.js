'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {emptyInventory,createProduct,setStock}=require('../lib/inventory');
const {resolve,answer}=require('../lib/azure-flow-query');

test('Sony company request resolves to a stock research intent, not a malformed holdings import',async()=>{
  const state=emptyInventory();
  const calls=[];
  const response=await answer('Sony',state,{now:1763850000,marketLookup:async (symbol,opts)=>{
    calls.push({symbol,nowMs:opts.nowMs});
    return {symbol,status:'UNAVAILABLE',source:'Stooq daily CSV',observation:null};
  }});
  assert.equal(response.intent,'market');
  assert.equal(response.symbol,'SONY');
  assert.equal(response.subject,'Sony Group Corporation');
  assert.equal(response.market.observation,null);
  assert.equal(response.actions.length,0);
  assert.deepEqual(calls,[{symbol:'SONY',nowMs:1763850000000}]);
  assert.match(response.explanation,/No verified recent closing price/);
});

test('Azure interprets inventory and sales questions against actual recorded business state',async()=>{
  const state=emptyInventory();
  const item=createProduct(state,{name:'Sony Headphones',barcode:'SONY-BT',priceCents:14000,minimumStock:4});
  setStock(state,item.id,{location:'Main',quantity:1});
  const saved=JSON.stringify(state);
  const questions=['Show my low-stock risks','Review sales trajectory','Analyze my business'];
  const intents=['inventory','sales','inventory'];
  for(let i=0;i<questions.length;i++){
    const result=await answer(questions[i],state,{now:1763850000,revision:'test'});
    assert.equal(result.intent,intents[i]);
    assert.equal(result.report.inventory.products,1);
    assert.equal(result.readOnly,true);
    assert.equal(result.report.reviewActions[0].reviewQuantity,4);
  }
  assert.equal(JSON.stringify(state),saved);
});

test('No invented strategy or company information when sources are missing',async()=>{
  const state=emptyInventory();
  const noProducts=await answer('Analyze my business',state,{now:1763850000});
  assert.match(noProducts.explanation,/no active products/i);
  const unknown=await answer('Evaluate unknown firm',state,{now:1763850000,classifier:async()=>({state:'MODEL_NOT_INSTALLED',intent:'unresolved'})});
  assert.equal(unknown.intent,'unresolved');
  assert.equal(unknown.market,undefined);
  assert.equal(unknown.suggestions.length>0,true);
  for(const request of ['','A','\nSony','x'.repeat(281)]) {
    await assert.rejects(()=>answer(request,state),/2–280/);
  }
});

test('Source labeling survives provider success without inventing an investment recommendation',async()=>{
  const response=await answer('Research Sony',emptyInventory(),{now:1763850000,
    marketLookup:async()=>({status:'OBSERVED',source:'Stooq daily CSV',observation:{date:'2026-11-20',closeUsd:100.5}})});
  assert.equal(response.market.observation.closeUsd,100.5);
  assert.match(response.explanation,/not live/);
});
test('Governed local model routes open questions but cannot supply unsupported facts',async()=>{
  const state=emptyInventory();
  const result=await answer('What should I do next?',state,{now:1763850000,
    classifier:async()=>({state:'MODEL_INTENT_VALIDATED',intent:'inventory',model:'dolphin-llama3:8b'})});
  assert.equal(result.intent,'inventory');
  assert.equal(result.model.state,'MODEL_INTENT_VALIDATED');
  assert.match(result.explanation,/no active products/);
});
