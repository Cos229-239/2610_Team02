'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {makeBridge,workspace,projectEntry,acceptableOrigin,folderRef,openIDE,installedIDEs,IDE_NAMES}=require('./towerflow-companion.cjs');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('origin and path validation rejects unsafe inputs',()=>{
    assert.equal(acceptableOrigin('https://team.example'),true);
    assert.equal(acceptableOrigin('https://team.example/room'),false);
    assert.equal(acceptableOrigin('http://untrusted.example'),false);
    assert.throws(()=>workspace('../other','shared'),/Invalid contributor/);
    assert.throws(()=>workspace('Contributor','../../etc'),/Invalid contributor/);
    assert.equal(folderRef('Contributor','shared'),'work/contributor/shared');
    assert.equal(projectEntry('integration'),'.');
    assert.throws(()=>makeBridge({origin:'https://team.example'}),/GitHub username/);
});
async function fixture(){
    const origin='https://team.example';
    const calls=[];
    const bridge=makeBridge({origin,allowedLogin:'tester',token:'testing-secret',
        prepareWorkspace:async(login,project)=>{calls.push(['prepare',login,project]);return {dir:'/local/test',entry:'/local/test/index.html'};},
        getStatus:async(login,project)=>{calls.push(['status',login,project]);return {ready:true,changeCount:2,branch:'work/tester/integration'};},
        getDiff:async(login,project)=>{calls.push(['diff',login,project]);return {patch:'diff --git a/source.js b/source.js',truncated:false};},
        launch:async(project)=>{calls.push(['open',project]);return {editor:'VS Code',launched:true,verifiedDebugSession:false};},
        openTarget:async(login,area)=>{calls.push(['target',login,area]);return {file:'TowerFlow/app.js',line:62,editor:'VS Code',launched:true};},
        listIDEs:()=>({vscode:{available:true},cursor:{available:false}}),
        launchIDE:async(login,ide,area)=>{calls.push(['launch-ide',login,ide,area]);return {id:ide,launched:true,debuggerVerified:false};}
    });
    const server=http.createServer(bridge.handler);
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port;
    return {base,calls,close:()=>new Promise(resolve=>server.close(resolve))};
}
async function request(base,route,{origin='https://team.example',token='testing-secret',body,method='POST'}={}){
    return fetch(base+route,{method,headers:{Origin:origin,Authorization:'Bearer '+token,
        'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}
test('unauthorized or cross-origin access cannot invoke local actions',async()=>{
    const f=await fixture();
    try {
        let r=await request(f.base,'/open',{origin:'https://attacker.example',body:{login:'tester',project:'integration'}});
        assert.equal(r.status,403);
        r=await request(f.base,'/open',{token:'wrong',body:{login:'tester',project:'integration'}});
        assert.equal(r.status,401);
        r=await request(f.base,'/open',{body:{login:'someone-else',project:'integration'}});
        assert.equal(r.status,403);
        r=await request(f.base,'/open',{body:{login:'tester',project:'../../etc'}});
        assert.equal(r.status,422);
        r=await request(f.base,'/launch-ide',{body:{login:'intruder',project:'integration',ide:'vscode',area:'ui'}});
        assert.equal(r.status,403);
        r=await request(f.base,'/launch-ide',{body:{login:'tester',project:'../../',ide:'vscode',area:'ui'}});
        assert.equal(r.status,422);
        r=await request(f.base,'/shell',{body:{login:'tester',project:'integration',command:'cmd.exe'}});
        assert.equal(r.status,404);
        assert.equal(f.calls.length,0);
    } finally {await f.close();}
});
test('paired session provides real status and explicitly launches allowlisted project',async()=>{
    const f=await fixture();
    try {
        let r=await request(f.base,'/health',{method:'GET'});
        assert.equal(r.status,200);
        assert.deepEqual((await r.json()).capabilities,['prepare','open','status','diff','open-target','ide-capabilities','launch-ide']);
        r=await request(f.base,'/status',{body:{login:'tester',project:'integration'}});
        assert.equal((await r.json()).workspace.changeCount,2);
        r=await request(f.base,'/open',{body:{login:'tester',project:'integration'}});
        const result=await r.json();
        assert.equal(result.opened.editor,'VS Code');
        assert.equal(result.opened.verifiedDebugSession,false);
        r=await request(f.base,'/diff',{body:{login:'tester',project:'integration'}});
        assert.match((await r.json()).review.patch,/source\.js/);
        r=await request(f.base,'/open-target',{body:{login:'tester',project:'integration',area:'markets'}});
        assert.equal((await r.json()).target.line,62);
        r=await request(f.base,'/ide-capabilities',{method:'GET'});
        assert.equal((await r.json()).ides.vscode.available,true);
        r=await request(f.base,'/launch-ide',{body:{login:'tester',project:'integration',ide:'cursor',area:'markets'}});
        assert.equal((await r.json()).ide.debuggerVerified,false);
        assert.deepEqual(f.calls.map(v=>v[0]),['status','prepare','open','status','diff','target','launch-ide']);
    } finally {await f.close();}
});
test('preflight request limit and content type',async()=>{
    const f=await fixture();
    try{
        let r=await fetch(f.base+'/status',{method:'POST',headers:{Origin:'https://team.example',Authorization:'Bearer testing-secret','Content-Type':'text/plain'},body:'{}'});
        assert.equal(r.status,415);
        r=await request(f.base,'/status',{body:{login:'tester',project:'integration',extra:'x'.repeat(10000)}});
        assert.equal(r.status,413);
    }finally{await f.close();}
});

test('IDE capability map is explicit and tested independently of installed applications',()=>{
 assert.deepEqual(IDE_NAMES,['vscode','vscommunity','cursor','antigravity']);
 const info=installedIDEs({
    vscode:['C:/Program Files/Code.exe'],vscommunity:['C:/VS/vswhere.exe'],
    cursor:['C:/Cursor/Cursor.exe'],antigravity:['C:/Antigravity.exe']
 },x=>x.endsWith('Code.exe')||x.endsWith('Cursor.exe'));
 assert.equal(info.vscode.available,true);
 assert.equal(info.cursor.available,true);
 assert.equal(info.vscommunity.available,false);
 assert.equal(info.antigravity.available,false);
 for(const entry of Object.values(info))assert.match(entry.status,/not.*verified|verified separately/i);
});
test('VS Code and Cursor open audited source only in selected contributor checkout',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tf-ide-'));
 try{
  fs.mkdirSync(path.join(dir,'TowerFlow'),{recursive:true});
  fs.writeFileSync(path.join(dir,'TowerFlow','app.js'),'// header\nfunction marketTick(){}\n');
  const history=[];
  const paths={
   vscode:['C:/VSCode/Code.exe'],cursor:['C:/Cursor/Cursor.exe'],
   vscommunity:['C:/VS/Installer/vswhere.exe'],antigravity:['C:/Antigravity/Antigravity.exe']
  };
  const options={
   platform:'win32',paths,exists:()=>true,
   prepareWorkspace:async(login,project)=>{
     history.push(['prepare',login,project]);
     return {dir,entry:path.join(dir,'TowerFlow','app.js'),branch:'work/tester/integration'};
   },
   launcher:async(binary,args)=>{history.push(['launch',binary,args]);return 3456;},
   execNative:async()=>({stdout:'C:/VS/Common7/IDE/devenv.exe'})
  };
  const vscode=await openIDE('tester','vscode','markets',options);
  assert.equal(vscode.source,'TowerFlow/app.js');
  assert.equal(vscode.line,2);
  assert.equal(vscode.debuggerVerified,false);
  assert.equal(history[1][1],'C:/VSCode/Code.exe');
  assert.deepEqual(history[1][2],[dir]);
  const cursor=await openIDE('tester','cursor','markets',options);
  assert.equal(cursor.id,'cursor');
  assert.ok(history.at(-1)[2].includes('--classic'));
  await assert.rejects(()=>openIDE('tester','powershell','markets',options),/Unknown IDE/);
  await assert.rejects(()=>openIDE('tester','vscode','../../etc',options),/Unknown source area/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
