'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),fs=require('node:fs/promises');
const {SOURCE_AREAS,areaFor,sourceTarget,sourceLine}=require('../collaboration-room/azure-bridge/source-navigation.cjs');
const repo=path.resolve(__dirname,'..');
test('all UI/IDE source cards resolve exact live repository files and unique source lines',async()=>{
 const rows=[];
 for(const [id,entry] of Object.entries(SOURCE_AREAS)){
   const target=await sourceTarget(repo,id);
   const lines=(await fs.readFile(target.fullPath,'utf8')).split(/\r?\n/);
   assert.ok(target.line>=1&&target.line<=lines.length,id+' line must exist');
   assert.ok(lines[target.line-1].includes(entry.anchor),id+' line must contain the promised anchor');
   assert.equal(target.file,entry.file);
   assert.ok(entry.file===path.posix.normalize(entry.file)&&!entry.file.includes('..'),id+' file path');
   for(const other of entry.related||[]){
     const p=path.resolve(repo,other);
     assert.ok(p.startsWith(repo+path.sep),id+' related path must stay in repo');
     await fs.access(p);
   }
   rows.push({id,path:target.file,line:target.line});
 }
 assert.ok(rows.length>=13,'Every supported app/room IDE card must resolve');
 assert.equal(areaFor('dashboard').file,'TowerFlow/index.html');
 assert.deepEqual(areaFor('dashboard').related,['TowerFlow/styles.css','TowerFlow/app.js']);
 assert.equal(areaFor('ui').file,'TowerFlow/styles.css');
 assert.equal(areaFor('roomscene').file,'collaboration-room/live-room/public/room.js');
 assert.equal(areaFor('backend').debugProfile,'node');
 console.log('Verified IDE code destinations: '+JSON.stringify(rows));
});
test('ambiguous, missing or user-selected source anchors refuse navigation',()=>{
 assert.throws(()=>areaFor('fake/../../secret'),/Unknown source area/);
 assert.throws(()=>sourceLine('file with no anchor','dashboard'),/Source anchor missing/);
 const marker=areaFor('dashboard').anchor;
 assert.throws(()=>sourceLine(marker+'\n'+marker,'dashboard'),/Ambiguous source anchor/);
});
test('checked-in VS Code browser and Node debugger profiles are runnable and distinct',async()=>{
 const launch=JSON.parse(await fs.readFile(path.join(repo,'.vscode','launch.json'),'utf8'));
 const tasks=JSON.parse(await fs.readFile(path.join(repo,'.vscode','tasks.json'),'utf8'));
 const configs=launch.configurations, names=configs.map(c=>c.name);
 assert.equal(new Set(names).size,names.length);
 const browser=configs.find(c=>c.type==='pwa-chrome'&&c.request==='launch');
 const server=configs.find(c=>c.type==='pwa-node'&&c.program?.endsWith('/TowerFlow/server.js'));
 assert.ok(browser&&server,'Need both real browser debugger and app Node server');
 assert.match(browser.webRoot,/TowerFlow$/);
 assert.ok(browser.url.endsWith(':4174'));
 const ready=tasks.tasks.find(t=>t.label===browser.preLaunchTask);
 assert.ok(ready&&ready.args.some(a=>a.endsWith('/TowerFlow/server.js')),'F5 must actually start the local test app');
 assert.equal(ready.options.env.PORT,'4174');
 assert.equal(server.env.PORT,'4174');
 assert.ok(configs.every(c=>!c.url?.includes('127.0.0.1:4173')),'Debug actions must not accidentally attach to shared production port');
});

test('every in-room IDE dropdown area points to its actual source at a verified line',async()=>{
 const {openIDE}=require('./towerflow-companion.cjs');
 const launches=[];
 const paths={vscode:['C:/editor/Code.exe'],cursor:['C:/editor/Cursor.exe'],
  vscommunity:['C:/Visual Studio/Installer/vswhere.exe'],antigravity:['C:/editor/Antigravity.exe']};
 const prepareWorkspace=async(login,project)=>{
   assert.equal(login,'tester');
   assert.equal(project,'integration');
   return {dir:repo,branch:'work/tester/integration',entry:path.join(repo,'README.md')};
 };
 for(const id of Object.keys(SOURCE_AREAS)){
   const receipt=await openIDE('tester','vscode',id,{
     platform:'win32',paths,exists:()=>true,prepareWorkspace,
     launcher:async(binary,args)=>{launches.push([binary,args]);return 1337;}
   });
   const target=await sourceTarget(repo,id);
   assert.equal(receipt.area,id);
   assert.equal(receipt.source,target.file);
   assert.equal(receipt.line,target.line);
   assert.match(receipt.sourceSha256,/^[a-f0-9]{64}$/);
   assert.equal(receipt.debuggerVerified,false);
   assert.equal(launches.at(-1)[1].at(-1),target.fullPath+':'+target.line,
    id+' IDE launch must target real, anchored source, not an agent/chat pane');
 }
 assert.equal(launches.length,Object.keys(SOURCE_AREAS).length);
});
