'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {
 createScene,editServer,editClient,editCSS,plan,validate,apply
}=require('./towerflow-activate-dev-room.cjs');
const root=path.resolve(__dirname,'..'),source=path.join(root,'collaboration-room');
const read=p=>fs.readFileSync(path.join(source,p),'utf8');
const currentScene=read('live-room/public/room.js');
function oldScene(){
 let s=currentScene;
 const start=s.indexOf('  // TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN'),end=s.indexOf('// TF_DEV_BUSINESS_PROJECTOR_V1_END',start);
 assert.ok(start>0&&end>start);
 s=s.slice(0,start-2)+s.slice(end+'// TF_DEV_BUSINESS_PROJECTOR_V1_END'.length+1);
 s=s.replace('\n    if(id==="dev-business-projector"){openDevBusinessStudio();return;}\n    if(typeof id==="string"&&id.startsWith("dev-ide-")&&window.tfOpenIDEStation?.(id))return;','');
 return s;
}
function oldServer(){
 let s=read('azure-bridge/server.cjs');
 const from=s.indexOf('    // Read-only, credential-free environment evidence'),to=s.indexOf('    for (const file of [',from);
 assert.ok(from>0&&to>from);
 s=s.slice(0,from)+s.slice(to);
 s=s.replace(/'azure-ai-connect\.js', ?/g,'').replace(/'ide-workstations\.js', ?/g,'');
 s=s.replace(/<script src="\/azure-bridge\/azure-ai-connect\.js" defer><\/script>/g,'');
 s=s.replace(/<script src="\/azure-bridge\/ide-workstations\.js" defer><\/script>/g,'');
 return s;
}
function oldClient(){
 let s=read('azure-bridge/companion-client.js');
 const start=s.indexOf('    window.tfContributorIDEStatus='),end=s.indexOf("    open.onclick=()=>perform('open');",start);
 assert.ok(start>0&&end>start);
 return s.slice(0,start)+s.slice(end);
}
test('surgical projector and workstation insertions preserve the existing room',()=>{
 const old=oldScene(),newScene=createScene(old);
 assert.ok(!old.includes('TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN'));
 assert.ok(newScene.includes('TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN'));
 assert.ok(newScene.includes('window.tfOpenIDEStation?.(id)'));
 assert.equal(createScene(newScene),newScene);
 assert.doesNotThrow(()=>validate([{target:path.join('public','room.js'),before:Buffer.from(old),next:Buffer.from(newScene)}]));
 assert.throws(()=>createScene('const projector=new THREE.Group()'),/running scene differs/);
});
test('bridge route patch preserves other endpoints and is idempotent',()=>{
 const original=oldServer(),updated=editServer(original);
 assert.ok(updated.includes('azure-ai-connect.js'));
 assert.ok(updated.includes('ide-workstations.js'));
 assert.ok(updated.includes("'/environment-manifest'"));
 assert.equal(editServer(updated),updated);
 assert.ok(updated.includes('/towerflow-entry.mjs'));
});
test('paired contributor actions and CSS are injected without replacing custom changes',()=>{
 const sourceClient=oldClient()+'\n// USER CUSTOM FEATURE RETAINED';
 const client=editClient(sourceClient);
 assert.ok(client.includes('USER CUSTOM FEATURE RETAINED'));
 assert.ok(client.includes('window.tfContributorIDEStatus='));
 assert.ok(client.includes('window.tfLaunchContributorIDE='));
 assert.equal(editClient(client),client);
 const style=editCSS('/* user theme retained */\n.custom{opacity:.7}');
 assert.ok(style.includes('.custom{opacity:.7}'));
 assert.ok(style.includes('.tf-dev-ide-station'));
 assert.ok(style.includes('.tf-ai-azure'));
 assert.equal(editCSS(style),style);
});
test('transaction changes only targeted files and supports second idempotent run',()=>{
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),'tf-dev-activation-'));
 const file=(name,text)=>{
  const p=path.join(folder,name);fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,text);return p;
 };
 try{
  file('server.js',"require('./azure-bridge/server.cjs').mount(app,opts);\n");
  file('public/room.js',oldScene());
  file('azure-bridge/server.cjs',oldServer());
  file('azure-bridge/companion-client.js',oldClient());
  file('azure-bridge/loadout.css','/* ORIGINAL CUSTOM CSS */');
  file('azure-bridge/two-mode-contribute.js',read('azure-bridge/two-mode-contribute.js'));
  const oldSceneBytes=fs.readFileSync(path.join(folder,'public/room.js'));
  const originalHost=fs.readFileSync(path.join(folder,'server.js'));
  const actions=plan(folder);assert.ok(actions.length>=6);
  validate(actions);apply(actions);
  assert.deepEqual(fs.readFileSync(path.join(folder,'server.js')),originalHost);
  assert.notDeepEqual(fs.readFileSync(path.join(folder,'public/room.js')),oldSceneBytes);
  const files=fs.readdirSync(path.join(folder,'azure-bridge'));
  assert.ok(files.includes('ide-workstations.js')&&files.includes('azure-ai-connect.js'));
  const second=plan(folder);validate(second);assert.equal(second.length,0,'repeat must make no new changes');
 }finally{fs.rmSync(folder,{force:true,recursive:true});}
});
