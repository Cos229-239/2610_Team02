'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../lib/decision-model');
const D = 86400, NOW = 1_763_800_000;
const product = (stock=7, minimumStock=5) => ({ id:1,name:'Bolt',category:'Hardware',
  barcode:'BOLT-115',partNumber:115,serialNumber:902701,
  minimumStock,archived:false,stock:[{location:'Main',quantity:stock}] });
const events = () => [
  {type:'receive',productId:1,quantity:30,recordedAt:NOW-24*D},
  {type:'sale',productId:1,quantity:2,recordedAt:NOW-8*D},
  {type:'sale',productId:1,quantity:3,recordedAt:NOW-4*D},
  {type:'sale',productId:1,quantity:4,recordedAt:NOW-D},
  {type:'transfer',productId:1,quantity:900,recordedAt:NOW}
];
const state = (p=product(),movements=events()) => ({version:2,products:[p],movements});
test('coherent model: fixed evidence yields reproducible, explained seven-day planning estimate',()=>{
  const data=state(),before=JSON.stringify(data);
  const one=analyze(data,{now:NOW}),two=analyze(data,{now:NOW});
  assert.deepEqual(one,two);
  assert.equal(JSON.stringify(data),before);
  assert.equal(one.rows[0].status,'PROJECTED_LOW');
  assert.equal(one.rows[0].projectedUnits,4);
  assert.equal(one.rows[0].suggestedOrder,1);
  assert.equal(one.rows[0].evidence.unitsSold,9);
  assert.match(one.rows[0].reason,/9 sales \/ 24 observed days/);
  assert.equal(one.readOnly,true);
});
test('coherent model: missing history never manufactures a prediction',()=>{
  const report=analyze(state(product(),[]),{now:NOW});
  assert.equal(report.rows[0].status,'INSUFFICIENT_DATA');
  assert.equal(report.rows[0].projectedUnits,null);
  assert.equal(report.rows[0].suggestedOrder,null);
});
test('coherent model: three sale days but too little observation triggers abstention',()=>{
  const e=events().map(x=>({...x,recordedAt:NOW-2*D}));
  const report=analyze(state(product(),e),{now:NOW});
  assert.equal(report.rows[0].status,'INSUFFICIENT_DATA');
});
test('coherent model: only sale movements determine demand, not transfers/removals',()=>{
  const base=state();
  const a=analyze(base,{now:NOW});
  base.movements.push({type:'remove',productId:1,quantity:100000,recordedAt:NOW});
  assert.deepEqual(analyze(base,{now:NOW}).rows,a.rows);
});
test('coherent model: currently low outranks projected low and uses explicit calculation',()=>{
  const report=analyze(state(product(2)),{now:NOW});
  assert.equal(report.rows[0].status,'CURRENTLY_LOW');
  assert.equal(report.rows[0].suggestedOrder,6);
});
test('coherent model: stable sufficient-stock case and filter safety',()=>{
  const report=analyze(state(product(100)),{now:NOW,query:'115/902701'});
  assert.equal(report.rows[0].status,'ABOVE_THRESHOLD');
  assert.equal(report.rows[0].suggestedOrder,0);
  assert.equal(analyze(state(),{now:NOW,query:'missing'}).rows.length,0);
});
test('coherent model: invalid inputs rejected without mutation',()=>{
  assert.throws(()=>analyze(null,{now:NOW}),/valid inventory/);
  assert.throws(()=>analyze(state(),{now:NaN}),/Invalid model/);
  assert.throws(()=>analyze(state(),{now:NOW,query:'x'.repeat(161)}),/Invalid model/);
});

test('coherent model: old history from another product cannot qualify a new product',()=>{
  const other={...product(3),id:2,name:'New Part',barcode:'NEW',partNumber:116,serialNumber:902702};
  const history=[
    {type:'receive',productId:1,quantity:20,recordedAt:NOW-100*D},
    {type:'receive',productId:2,quantity:10,recordedAt:NOW-4*D},
    {type:'sale',productId:2,quantity:1,recordedAt:NOW-3*D},
    {type:'sale',productId:2,quantity:1,recordedAt:NOW-2*D},
    {type:'sale',productId:2,quantity:1,recordedAt:NOW-D}
  ];
  const r=analyze({products:[product(7),other],movements:history},{now:NOW,query:'New Part'});
  assert.equal(r.rows[0].status,'INSUFFICIENT_DATA');
  assert.equal(r.rows[0].evidence.observationDays,4);
});
