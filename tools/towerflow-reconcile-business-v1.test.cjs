'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {integrateScene,integrateServer,makePlan,validate,apply}=
  require('./towerflow-reconcile-business-v1.cjs');
const ROOT=path.resolve(__dirname,'..'),asset=path.join(ROOT,'collaboration-room','azure-bridge');
const reviewed=fs.readFileSync(path.join(ROOT,'collaboration-room/live-room/public/room.js'),'utf8');
const reviewServer=fs.readFileSync(path.join(asset,'server.cjs'),'utf8');
const get=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start))+end.length);
function oldScene(){
 const segments=[
  {prefix:'  ',start:'// TF_DEV_BUSINESS_WALL_ROUTING_V1_BEGIN',end:'// TF_DEV_BUSINESS_WALL_ROUTING_V1_END'},
  {prefix:'    ',start:'// TF_DEV_BUSINESS_APP_ENTRY_V1_BEGIN',end:'// TF_DEV_BUSINESS_APP_ENTRY_V1_END'},
  {prefix:'\n',start:'// TF_BUSINESS_TEAM_STATIONS_AND_WORLD_V1_BEGIN',end:'// TF_BUSINESS_TEAM_STATIONS_AND_WORLD_V1_END'},
  {prefix:'\n',start:'// TF_AZURE_BUSINESS_BRIDGE_V1_BEGIN',end:'// TF_AZURE_BUSINESS_BRIDGE_V1_END'}
 ];
 let s=reviewed;
 for(const x of segments){
   const code=x.prefix+get(reviewed,x.start,x.end)+'\n';
   assert.ok(s.includes(code),'reviewed insert missing '+x.start);
   s=s.replace(code,'');
 }
 return s+'// CUSTOM SCENE FEATURE: preserved after integration\n';
}
function oldServer(){
 return reviewServer
  .replace("\nconst {mount:mountTeamStations} = require('./team-stations.cjs');\nconst {mount:mountBusinessSignals} = require('./business-signals.cjs');",'')
  .replace("\n    mountTeamStations(app,{auth,ensureMember});\n    mountBusinessSignals(app,{auth,ensureMember});",'')
  .replace("\nconst {mount:mountAzureHarness} = require('./azure-workspace-harness.cjs');",'')
  .replace("\n    mountAzureHarness(app,{auth,ensureMember,sameOrigin});",'')
  .replace(" 'azure-workspace-harness.js',",'')
  .replace('<script src="/azure-bridge/azure-workspace-harness.js" defer></script>','')
  .replace(" 'team-stations.js',",'')
  .replace('<script src="/azure-bridge/team-stations.js" defer></script>','');
}
test('exact reviewed Business Studio scene injection preserves all original customized bytes',()=>{
 const before=oldScene(),after=integrateScene(before,reviewed);
 assert.ok(after.includes('CUSTOM SCENE FEATURE: preserved after integration'));
 assert.match(after,/TF_BUSINESS_TEAM_STATIONS_AND_WORLD_V1_BEGIN/);
 assert.match(after,/TF_AZURE_BUSINESS_BRIDGE_V1_BEGIN/);
 assert.match(after,/TF_DEV_BUSINESS_WALL_ROUTING_V1_BEGIN/);
 assert.match(after,/TF_DEV_BUSINESS_APP_ENTRY_V1_BEGIN/);
 assert.equal(integrateScene(after,reviewed),after,'running twice does not duplicate features');
 assert.throws(()=>integrateScene(before+'\n// TF_DEV_BUSINESS_APP_ENTRY_V1_BEGIN',reviewed),/Partially installed/);
});
test('integration changes only five scoped host files; old Azure UI is never overwritten',()=>{
 const host=fs.mkdtempSync(path.join(os.tmpdir(),'tf-business-live-'));
 try{
  fs.mkdirSync(path.join(host,'public'));
  fs.mkdirSync(path.join(host,'azure-bridge'));
  fs.writeFileSync(path.join(host,'server.js'),"require('./azure-bridge/server.cjs').mount(app,opts)");
  fs.writeFileSync(path.join(host,'public','room.js'),oldScene());
  fs.writeFileSync(path.join(host,'azure-bridge','server.cjs'),oldServer());
  const custom=path.join(host,'azure-bridge','app-hub.js');
  fs.writeFileSync(custom,'// contributor customized this frontend; preserve it');
  const originalCustom=fs.readFileSync(custom);
  const originalServer=fs.readFileSync(path.join(host,'server.js'));
  const changes=makePlan(host);
  assert.equal(changes.length,8);
  assert.deepEqual(changes.map(c=>path.relative(host,c.file)).sort(),[
    'azure-bridge/azure-workspace-harness.cjs','azure-bridge/azure-workspace-harness.js',
    'azure-bridge/azure-local-reasoner.cjs',
    'azure-bridge/business-signals.cjs','azure-bridge/server.cjs',
    'azure-bridge/team-stations.cjs','azure-bridge/team-stations.js','public/room.js'
  ]);
  validate(changes);apply(changes);
  assert.deepEqual(fs.readFileSync(custom),originalCustom);
  assert.deepEqual(fs.readFileSync(path.join(host,'server.js')),originalServer);
  assert.match(fs.readFileSync(path.join(host,'public','room.js'),'utf8'),/CUSTOM SCENE FEATURE: preserved/);
  assert.equal(makePlan(host).length,0,'second run makes no changes');
 }finally{fs.rmSync(host,{recursive:true,force:true});}
});
test('unexpected partial scene and conflicting contributor-authored file both block without writes',()=>{
 const partial=oldScene()+'// TF_DEV_BUSINESS_WALL_ROUTING_V1_BEGIN';
 assert.throws(()=>integrateScene(partial,reviewed),/Partially installed/);
 const host=fs.mkdtempSync(path.join(os.tmpdir(),'tf-business-conflict-'));
 try{
  fs.mkdirSync(path.join(host,'public'));fs.mkdirSync(path.join(host,'azure-bridge'));
  fs.writeFileSync(path.join(host,'server.js'),"require('./azure-bridge/server.cjs').mount(app,opts)");
  fs.writeFileSync(path.join(host,'public','room.js'),oldScene());
  fs.writeFileSync(path.join(host,'azure-bridge','server.cjs'),oldServer());
  fs.writeFileSync(path.join(host,'azure-bridge','team-stations.js'),'// different local user work');
  assert.throws(()=>makePlan(host),/Customized existing team-stations.js/);
  assert.equal(fs.readFileSync(path.join(host,'azure-bridge','team-stations.js'),'utf8'),'// different local user work');
 }finally{fs.rmSync(host,{recursive:true,force:true});}
});
