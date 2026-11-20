'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {STATIONS,readStation,mount}=require('../collaboration-room/azure-bridge/team-stations.cjs');
const SHA='a'.repeat(40),FILE='b'.repeat(40);
function response(path){
 if(path.includes('/commits?'))return [{sha:SHA,commit:{message:'Update Windows Forms UI\nDetailed message',
   author:{date:'2026-11-20T00:00:00Z'}},author:{login:'Lopobunnie'}}];
 return {type:'file',sha:FILE};
}
test('Each named member has a verified personal branch and own station',()=>{
 assert.deepEqual(Object.keys(STATIONS).sort(),['daynaperezcolon','dulskinator96','hyperrealmend','lopobunnie','svn-760']);
 assert.equal(STATIONS.lopobunnie.branch,'WilliamPersonal');
 assert.deepEqual(STATIONS.lopobunnie.files,['TowerFlowWindow/TowerFlowWinForm/Form1.cs','TowerFlow.cpp']);
});
test('Windows Forms and C++ links are bound to pushed personal branch, not guessed dev contents',async()=>{
 const paths=[];
 const result=await readStation('Lopobunnie','fake-test-token',{
  request:async route=>{paths.push(route);return response(route)},
  now:()=>Date.parse('2026-11-20T01:00:00Z')
 });
 assert.equal(result.commit.sha,SHA);
 assert.equal(result.files.length,2);
 assert.equal(result.files[0].available,true);
 assert.ok(paths.includes('/contents/TowerFlowWindow/TowerFlowWinForm/Form1.cs?ref=WilliamPersonal'));
 assert.ok(paths.includes('/contents/TowerFlow.cpp?ref=WilliamPersonal'));
 assert.match(result.files[0].url,/WilliamPersonal/);
 assert.match(result.note,/Push origin/);
});
test('Repository missing content stays unavailable, no invented Form1.cs changes',async()=>{
 const result=await readStation('Lopobunnie','fake',{
  request:async route=>{if(route.includes('/contents/'))throw Error('Not found');return response(route)}
 });
 assert.equal(result.files.filter(v=>v.available).length,0);
 assert.equal(result.commit.sha,SHA);
});
test('Authenticated endpoint blocks unknown stations and does not return GitHub tokens',async()=>{
 const handlers=new Map(),app={get:(route,...parts)=>handlers.set(route,parts.at(-1))};
 mount(app,{auth:()=>{},ensureMember:()=>{},load:(login,token)=>{
  assert.equal(token,'session-secret');return readStation(login,token,{request:async route=>response(route)});
 }});
 const res={headers:{},code:200,set(k,v){this.headers[k]=v;return this},
  status(n){this.code=n;return this},json(v){this.body=v;return this}};
 await handlers.get('/api/azure-bridge/team-stations/:login')({
  params:{login:'lopobunnie'},session:{token:'session-secret',user:{login:'dulskinator96'}}
 },res);
 assert.equal(res.body.branch,'WilliamPersonal');
 assert.ok(!JSON.stringify(res.body).includes('session-secret'));
 await handlers.get('/api/azure-bridge/team-stations/:login')({params:{login:'other'},session:{token:'session-secret'}},res);
 assert.equal(res.code,404);
});
