'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {evaluate,validNumber,mount}=require('../collaboration-room/azure-bridge/ai-contribution-proof.cjs');
const SHA='a'.repeat(40);
const PR={
 user:{login:'William'},base:{ref:'dev',repo:{full_name:'Cos229-239/2610_Team02'}},
 head:{sha:SHA,repo:{full_name:'Cos229-239/2610_Team02'}},
 state:'open',draft:true,title:'Add username greeting',html_url:'https://github.com/Cos229-239/2610_Team02/pull/40'
};
const files=[{filename:'TowerFlow/index.html',status:'modified',additions:4,deletions:1}];
test('AI PR proof requires owned source change targeting dev, never proves model identity',()=>{
 const x=evaluate(PR,files,'william',40);
 assert.equal(x.accepted,true);
 assert.equal(x.providerConnected,false);
 assert.equal(x.aiAuthorVerified,false);
 assert.equal(x.automaticDeployment,false);
 assert.equal(x.pr.files[0].name,'TowerFlow/index.html');
 assert.equal(x.state,'SOURCE_CONTRIBUTION_OBSERVED');
 assert.equal(evaluate({...PR,user:{login:'somebody-else'}},files,'william',40).accepted,false);
 assert.equal(evaluate({...PR,base:{ref:'main',repo:{full_name:'Cos229-239/2610_Team02'}}},files,'william',40).accepted,false);
 assert.equal(evaluate({...PR,head:{sha:SHA,repo:{full_name:'another/repo'}}},files,'william',40).accepted,false);
 assert.equal(evaluate(PR,[],'william',40).accepted,false);
 assert.equal(validNumber(0),false);assert.equal(validNumber(1),true);assert.equal(validNumber(1.5),false);
});
test('authenticated endpoint verifies GitHub PR evidence under member own session, not browser-supplied token',async()=>{
 let handler,events=[];
 const app={get:(route,...chain)=>{assert.match(route,/ai-contribution-proof/);handler=chain.at(-1);}};
 const mid=(req,res,next)=>next();
 mount(app,{auth:mid,ensureMember:mid,readGitHub:async(route,token)=>{
  events.push({route,token});
  return route.includes('/files?')?files:PR;
 }});
 const req={params:{number:'40'},session:{user:{login:'William'},token:'server-session-only'}};
 const res={
  code:200,headers:{},set(k,v){this.headers[k]=v;return this},
  status(n){this.code=n;return this},json(d){this.body=d;return this}
 };
 await handler(req,res);
 assert.equal(res.code,200);assert.equal(res.body.accepted,true);
 assert.equal(events.length,2);assert.equal(events[0].token,'server-session-only');
 assert.equal(JSON.stringify(res.body).includes('server-session-only'),false);
 events=[];
 await handler({...req,session:{user:{login:'Unauthorized'},token:'another-token'}},res);
 assert.equal(res.code,403);assert.equal(events.length,1);
});
