'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EDITORS,matchArea,planRequest,githubSourceProof,mount}=require('../collaboration-room/azure-bridge/azure-workspace-harness.cjs');
test('Azure classifies bounded plain-English tasks to explicit source areas, preserves original prompt',()=>{
 for(const [input,target] of [
  ['Show me the dashboard source','dashboard'],
  ['Change the portfolio totals','portfolio'],
  ['Debug the 3D room scene','roomscene'],
  ['Inspect the backend server endpoint','backend'],
  ['Fix the trading buy action','trading'],
  ['Open the watchlist code','watchlist'],
  ['Make the charts better','charts'],
  ['Show the project settings','settings']
 ]){
  const x=planRequest({prompt:input,editor:'vscode'});
  assert.equal(x.target,target,input);assert.equal(x.originalPrompt,input);
  assert.equal(x.permissions.aiModel,'NOT_YET_CONNECTED');
  assert.equal(x.permissions.repositoryWrite,'NOT_YET_VERIFIED');
  assert.match(x.intentSha256,/^[a-f0-9]{64}$/);
 }
});
test('Ambiguous or unknown requirements are not guessed, unknown editors and huge prompts are rejected',()=>{
 const unknown=planRequest({prompt:'Build something spectacular',editor:'cursor'});
 assert.equal(unknown.target,null);
 assert.equal(unknown.state,'NEEDS_TARGET_SELECTION');
 const ambiguous=planRequest({prompt:'Update charts and settings',editor:'antigravity'});
 assert.equal(ambiguous.target,null);assert.ok(ambiguous.choices.length>=2);
 assert.throws(()=>planRequest({prompt:'Hello',editor:'malware'}),/supported desktop IDE/);
 assert.throws(()=>planRequest({prompt:'x'.repeat(1801),editor:'vscode'}),/1800/);
 assert.equal(EDITORS.cursor.station,'dev-ide-cursor');
 assert.equal(EDITORS.antigravity.station,'dev-ide-antigravity');
});
test('Proof reads only expected Team 02 dev file through member GitHub credentials',async()=>{
 const task=planRequest({prompt:'Open Dashboard',editor:'vscode'});
 let called;
 const proof=await githubSourceProof(task,'PRIVATE_SERVER_TOKEN',{
  request:async route=>{called=route;return {path:'TowerFlow/index.html',
    type:'file',sha:'f'.repeat(40)};}
 });
 assert.equal(proof.status,'SOURCE_READ_VERIFIED');
 assert.equal(proof.station,'dev-ide-code');
 assert.equal(called,'/contents/TowerFlow/index.html?ref=dev');
 assert.equal(JSON.stringify(proof).includes('PRIVATE_SERVER_TOKEN'),false);
 await assert.rejects(()=>githubSourceProof(task,'token',{request:async()=>({
  type:'file',sha:'f'.repeat(40),path:'TowerFlow/fake.html'
 })}),/missing or does not match/);
});
test('The authenticated endpoint does not claim AI work or machine debugging; uses origin and signed-in session',async()=>{
 const routes=new Map();
 const app={get:(route,...handlers)=>routes.set('GET '+route,handlers),
  post:(route,...handlers)=>routes.set('POST '+route,handlers)};
 const mid=()=>{};
 mount(app,{auth:mid,ensureMember:mid,sameOrigin:mid,
  verify:async(plan,token)=>{assert.equal(token,'signed-in-session-token');return {
   status:'SOURCE_READ_VERIFIED',path:plan.source.path};}});
 const res={code:200,headers:{},set(k,v){this.headers[k]=v;return this},
  status(n){this.code=n;return this},json(payload){this.body=payload;return this}};
 const handlers=routes.get('POST /api/azure-bridge/azure-harness/plan');
 assert.equal(handlers.length,4,'Must require auth + member + same origin');
 await handlers.at(-1)({body:{prompt:'Open the dashboard source',editor:'cursor'},
  session:{token:'signed-in-session-token'}},res);
 assert.equal(res.body.target,'dashboard');
 assert.equal(res.body.state,'SOURCE_VERIFIED_READY_FOR_EDITOR');
 assert.equal(res.body.permissions.repositoryRead,'VERIFIED');
 assert.equal(res.body.permissions.repositoryWrite,'NOT_YET_VERIFIED');
 assert.equal(res.body.permissions.aiModel,'NOT_YET_CONNECTED');
 assert.equal(res.body.permissions.debugger,'NOT_YET_ATTACHED');
 assert.equal(res.headers['Cache-Control'],'no-store');
});
