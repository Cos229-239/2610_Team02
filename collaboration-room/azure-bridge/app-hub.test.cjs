'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {CATALOG,parseArea,classifyFiles,moduleFor,createIndex,mount}=require('./app-hub.cjs');

test('areas are deliberate, source-backed, and safe',()=>{
  assert.ok(CATALOG.market.description.includes('shares app.js'));
  assert.equal(parseArea('Summary\nTowerFlow-Area: market\nDetails'),'market');
  assert.equal(parseArea('TowerFlow-Area: ../../../other'),null);
  assert.equal(parseArea('TowerFlow-Area: market\nTowerFlow-Area: native'),null);
  assert.equal(classifyFiles([{filename:'TowerFlow/app.js'}]),'app');
  assert.equal(classifyFiles([{filename:'collaboration-room/azure-bridge/desk.js'}]),'room');
  assert.equal(classifyFiles([{filename:'TowerFlow/TowerFlow.Native/Program.cpp'}]),'native');
});
test('contributor module marker cannot reclassify native or room files as web',()=>{
  assert.equal(moduleFor({body:'TowerFlow-Area: market'},[{filename:'TowerFlow/app.js'}]),'market');
  assert.equal(moduleFor({body:'TowerFlow-Area: market'},[{filename:'TowerFlow/TowerFlow.Native/main.cpp'}]),'native');
  assert.equal(moduleFor({body:'TowerFlow-Area: room'},[{filename:'collaboration-room/azure-bridge/desk.js'}]),'room');
});
test('GitHub index returns observed PR states and protects unknown classification',async()=>{
  const calls=[];
  const prs=[
    {number:10,title:'Watchlist update',body:'TowerFlow-Area: market',merged_at:null,state:'open',draft:false,user:{login:'personA'},head:{ref:'work/personA/market',sha:'a'.repeat(40)},updated_at:'2026-11-18'},
    {number:9,title:'Native',body:'TowerFlow-Area: market',merged_at:'2026-11-18',state:'closed',user:{login:'personB'},head:{ref:'work/personB/native',sha:'b'.repeat(40)},updated_at:'2026-11-18'},
  ];
  const index=createIndex(async(url,request)=>{
    calls.push({url,auth:request.headers.Authorization});
    const result=url.endsWith('/files?per_page=100')?
      url.includes('/10/')?[{filename:'TowerFlow/app.js'}]:[{filename:'TowerFlow/TowerFlow.Native/main.cpp'}]:prs;
    return {ok:true,json:async()=>result};
  },()=>1_000);
  const one=await index('token-A');
  assert.equal(one.prs.length,2);
  assert.deepEqual(one.prs.map(x=>x.state),['review','merged']);
  assert.deepEqual(one.prs.map(x=>x.area),['market','native']);
  assert.equal(one.prs[0].areaVerified,true);
  await index('token-A');
  assert.equal(calls.length,3,'repeat calls use bounded short-lived cache');
  assert.ok(calls.every(x=>x.auth==='Bearer token-A'));
});
test('hub endpoint requires member middleware and fails closed',async()=>{
  const handlers={};
  mount({get(route,...fn){handlers[route]=fn;}},{
    auth(req,res,next){if(!req.session?.user)return res.status(401).json({error:'Unauthorized'});next();},
    ensureMember(req,res,next){if(!req.session.user.member)return res.status(403).json({error:'Not member'});next();},
    index:async()=>({areas:CATALOG,prs:[]})
  });
  const send=async user=>{
    let output;const res={set(){return this;},status(code){this.code=code;return this;},json(v){output=v;return v;}};
    const req={session:{user}};
    const list=handlers['/api/azure-bridge/app-hub'];
    for(let i=0;i<list.length-1;i++){
      let nextCalled=false;list[i](req,res,()=>{nextCalled=true;});if(!nextCalled)return {code:res.code,output};
    }
    await list.at(-1)(req,res);return {code:res.code,output};
  };
  assert.equal((await send(null)).code,401);
  assert.equal((await send({member:false})).code,403);
  assert.deepEqual((await send({member:true})).output.prs,[]);
});
