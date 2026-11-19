'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {locateGemini,validateRequest,makePlanner}=require('./towerflow-ai-planner.cjs');
test('Gemini adapter requires explicitly installed local Node CLI, no shell command injection',()=>{
  const target=path.join(path.parse(process.cwd()).root,'safe','gemini-cli','dist','index.js');
  assert.equal(locateGemini({TF_GEMINI_CLI_PATH:target},p=>p===target),target);
  assert.equal(locateGemini({TF_GEMINI_CLI_PATH:'gemini --yolo'},()=>true),null);
  assert.equal(locateGemini({TF_GEMINI_CLI_PATH:'/tmp/binary.exe'},()=>true),null);
  assert.throws(()=>validateRequest({area:'../../',prompt:'Change the market color'}),/Unknown source/);
  assert.throws(()=>validateRequest({area:'markets',prompt:'hi'}),/8–1200/);
  assert.throws(()=>validateRequest({area:'markets',prompt:'a'.repeat(1201)}),/8–1200/);
});
test('planner reads an audited source target and uses read-only Plan Mode',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tf-ai-plan-'));
  try{
    fs.mkdirSync(path.join(dir,'TowerFlow'));
    fs.writeFileSync(path.join(dir,'TowerFlow','app.js'),'\nfunction marketTick(){return true;}\n');
    const calls=[];
    const planner=makePlanner({
      lookup:()=>'/test/gemini/dist/index.js',
      runner:async(bin,args,opts)=>{
        calls.push({bin,args,opts});
        return {stdout:JSON.stringify({response:'Verified market clock source. Proposed change only.'})};
      }
    });
    const result=await planner.plan({dir,area:'markets',prompt:'Change the market clock display'});
    assert.equal(result.codeModified,false);
    assert.equal(result.line,2);
    assert.equal(result.verifiedSourceTarget,true);
    assert.match(result.plan,/Verified market/);
    assert.equal(calls.length,1);
    assert.equal(calls[0].bin,process.execPath);
    assert.ok(calls[0].args.includes('--approval-mode'));
    assert.equal(calls[0].args[calls[0].args.indexOf('--approval-mode')+1],'plan');
    assert.equal(calls[0].opts.cwd,dir);
    assert.ok(!calls[0].args.includes('--yolo'));
    assert.ok(!calls[0].args.includes('auto_edit'));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('planner fails closed for missing provider or missing source',async()=>{
  const planner=makePlanner({lookup:()=>null});
  await assert.rejects(()=>planner.plan({dir:os.tmpdir(),area:'markets',prompt:'Change the market clock'}),/Gemini CLI unavailable/);
  const runner=makePlanner({lookup:()=>'/fake/gemini.js',runner:async()=>({stdout:'{}'})});
  await assert.rejects(()=>runner.plan({dir:os.tmpdir(),area:'markets',prompt:'Change the market clock'}),/ENOENT|Source/);
});
test('single planning job at a time prevents concurrent resource consumption',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tf-ai-plan-'));
  try{
    fs.mkdirSync(path.join(dir,'TowerFlow'));
    fs.writeFileSync(path.join(dir,'TowerFlow','app.js'),'function marketTick(){}');
    let release;
    const planner=makePlanner({lookup:()=>'/fake/gemini.js',runner:()=>new Promise(resolve=>{release=()=>resolve({stdout:'{"response":"Plan complete"}'});})});
    const first=planner.plan({dir,area:'markets',prompt:'Change the market clock display'});
    await new Promise(resolve=>setImmediate(resolve));
    await assert.rejects(()=>planner.plan({dir,area:'markets',prompt:'Change the market clock display'}),/already running/);
    release();await first;
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
