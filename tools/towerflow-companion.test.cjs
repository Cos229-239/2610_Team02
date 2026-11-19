'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {makeBridge,workspace,projectEntry,acceptableOrigin,folderRef}=require('./towerflow-companion.cjs');
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
        launch:async(project)=>{calls.push(['open',project]);return {editor:'VS Code',launched:true,verifiedDebugSession:false};}
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
        assert.deepEqual((await r.json()).capabilities,['prepare','open','status']);
        r=await request(f.base,'/status',{body:{login:'tester',project:'integration'}});
        assert.equal((await r.json()).workspace.changeCount,2);
        r=await request(f.base,'/open',{body:{login:'tester',project:'integration'}});
        const result=await r.json();
        assert.equal(result.opened.editor,'VS Code');
        assert.equal(result.opened.verifiedDebugSession,false);
        assert.deepEqual(f.calls.map(v=>v[0]),['status','prepare','open','status']);
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
