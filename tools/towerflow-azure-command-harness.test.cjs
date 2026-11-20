'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {SOURCE_AREAS}=require('../collaboration-room/azure-bridge/source-navigation.cjs');
const {planRequest,matchArea,githubSourceProof,mount}=require('../collaboration-room/azure-bridge/azure-workspace-harness.cjs');
const SHA='a'.repeat(40);
test('Azure preserves exact original request, excludes guessed models and resolves intended source+IDE',()=>{
 const p='Open the Dashboard source in Visual Studio Code and debug the rendering.';
 const plan=planRequest({prompt:p,editor:'vscode'}, {now:()=>Date.parse('2026-11-20T00:00:00Z')});
 assert.equal(plan.originalPrompt,p);
 assert.equal(plan.intentSha256,crypto.createHash('sha256').update(p).digest('hex'));
 assert.equal(plan.target,'dashboard');
 assert.equal(plan.source.path,'TowerFlow/index.html');
 assert.equal(plan.station,'dev-ide-code');
 assert.equal(plan.state,'READY_FOR_SOURCE_VERIFICATION');
 assert.equal(plan.permissions.aiModel,'NOT_YET_CONNECTED');
 assert.ok(plan.intake.framework.megan&&plan.intake.framework.laura&&plan.intake.framework.pixi);
});
test('Azure never silently guesses an ambiguous target, and explicit picker resolves the exact requested component',()=>{
 const guess=planRequest({prompt:'Update the analytics and charts',editor:'cursor'});
 assert.equal(guess.target,null);
 assert.equal(guess.state,'NEEDS_TARGET_SELECTION');
 const choice=planRequest({prompt:'Update the analytics and charts',editor:'cursor',area:'charts'});
 assert.equal(choice.target,'charts');
 assert.equal(choice.station,'dev-ide-cursor');
 assert.equal(choice.source.file,undefined);
 assert.equal(choice.source.path,'TowerFlow/app.js');
 assert.throws(()=>planRequest({prompt:'update',editor:'cursor',area:'../../foo'}),/Unknown source target/);
 assert.throws(()=>planRequest({prompt:'update dashboard',editor:'remote-shell'}),/Select a supported desktop IDE/);
 assert.throws(()=>planRequest({prompt:'',editor:'vscode'}),/Describe a task/);
});
test('GitHub source evidence validates exact blob and unique anchor from actual repository bytes',async()=>{
 const plan=planRequest({prompt:'Show dashboard',editor:'vscode'});
 const marker=SOURCE_AREAS.dashboard.anchor;
 const content='line1\nline2\n'+marker+'\nline4\n';
 const proof=await githubSourceProof(plan,'valid-github-token',{request:async path=>{
   assert.ok(path.includes('TowerFlow/index.html?ref=dev'));
   return {type:'file',sha:SHA,path:'TowerFlow/index.html',
     encoding:'base64',content:Buffer.from(content).toString('base64')};
 }});
 assert.equal(proof.status,'SOURCE_READ_VERIFIED');
 assert.equal(proof.referenceLine,3);
 assert.equal(proof.contentSha256,crypto.createHash('sha256').update(content).digest('hex'));
 assert.equal(proof.blobSha,SHA);
 await assert.rejects(()=>githubSourceProof(plan,'valid-github-token',{request:async()=>({
  type:'file',sha:SHA,path:'TowerFlow/index.html',encoding:'base64',
  content:Buffer.from(marker+'\n'+marker).toString('base64')
 })}),/ambiguous/);
 await assert.rejects(()=>githubSourceProof(plan,'valid-github-token',{request:async()=>({
  type:'file',sha:SHA,path:'other/path',encoding:'base64',
  content:Buffer.from(content).toString('base64')
 })}),/missing or does not match/);
});
test('Authenticated plan API returns source read status but never model write permission',async()=>{
 const routes=new Map(),middleware=()=>{};
 const app={post:(name,...chain)=>routes.set(name,chain.at(-1)),
           get:(name,...chain)=>routes.set(name,chain.at(-1))};
 mount(app,{auth:middleware,ensureMember:middleware,sameOrigin:middleware,
  modelInventory:async()=>({state:'DISABLED'}),modelPropose:async()=>({state:'DISABLED'}),
  verify:async p=>({status:'SOURCE_READ_VERIFIED',blobSha:SHA,path:p.source.path}),
  clock:()=>Date.parse('2026-11-20T00:00:00Z')
 });
 const req={body:{prompt:'Open dashboard code',editor:'antigravity'},session:{token:'valid-session-token'}};
 const res={statusCode:200,headers:{},set(k,v){this.headers[k]=v;return this},
  status(n){this.statusCode=n;return this},
  json(result){this.body=result;return this}};
 await routes.get('/api/azure-bridge/azure-harness/plan')(req,res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.permissions.repositoryRead,'VERIFIED');
 assert.equal(res.body.permissions.repositoryWrite,'NOT_YET_VERIFIED');
 assert.equal(res.body.permissions.localEditor,'NOT_YET_LAUNCHED');
 assert.equal(res.body.station,'dev-ide-antigravity');
 assert.equal(res.body.state,'SOURCE_VERIFIED_READY_FOR_EDITOR');
});
