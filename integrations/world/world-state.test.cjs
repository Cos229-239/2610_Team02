"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os"),path=require("node:path");
const {createWorldStore,createWorldHandler,validateScene}=require("./world-state.cjs");
test("only known scenes and safe ceiling messages are accepted",()=>{
 assert.deepEqual(validateScene({mode:"sunset",evil:"javascript:alert(1)"}),{mode:"sunset"});
 assert.deepEqual(validateScene({mode:"ceiling-text",text:"  TEAM02 ",color:"CYAN"}),{mode:"ceiling-text",text:"TEAM02",color:"cyan"});
 assert.throws(()=>validateScene({mode:"execute-shell"}),/Unsupported/);
 assert.throws(()=>validateScene({mode:"ceiling-text",text:"A\nB"}),/Invalid/);
});
test("approved scene persists and revision conflicts preserve previous state",async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),"tf-world-test-"));
 try{
  const file=path.join(folder,"state.json");
  const s=createWorldStore({file,now:()=>"2026-11-10T00:00:00Z"});
  assert.equal((await s.read()).revision,0);
  const p=await s.update({baseRevision:0,scene:{mode:"aurora"},approvedBy:"host",reason:"Reviewed accessible aurora preview"});
  assert.equal(p.revision,1);
  assert.equal((await s.read()).scene.mode,"aurora");
  await assert.rejects(s.update({baseRevision:0,scene:{mode:"sunset"},approvedBy:"host",reason:"Stale change"}),{status:409});
  const done=await s.update({baseRevision:1,scene:null,approvedBy:"host",reason:"Restore original lighting"});
  assert.equal(done.revision,2);assert.equal(done.scene,null);
  assert.equal(done.history.length,2);
 }finally{await fs.rm(folder,{recursive:true,force:true});}
});
test("concurrent same-revision writes serialize, only one succeeds",async()=>{
 const folder=await fs.mkdtemp(path.join(os.tmpdir(),"tf-world-test-"));
 try{
  const s=createWorldStore({file:path.join(folder,"scene.json")});
  const results=await Promise.allSettled([
   s.update({baseRevision:0,scene:{mode:"sunset"},approvedBy:"host",reason:"Approved one"}),
   s.update({baseRevision:0,scene:{mode:"aurora"},approvedBy:"host",reason:"Approved two"})
  ]);
  assert.equal(results.filter(x=>x.status==="fulfilled").length,1);
  assert.equal(results.filter(x=>x.status==="rejected"&&x.reason.status===409).length,1);
 }finally{await fs.rm(folder,{recursive:true,force:true});}
});
test("anonymous and non-maintainer cannot approve scene modifications",async()=>{
 let writes=0;
 const store={read:async()=>({revision:1,scene:null}),update:async()=>{writes++;return {};}};
 const h=createWorldHandler({origin:"https://towerflow.example",store,authorize:async(req,operation)=>req.auth?{userId:req.auth,role:req.role||"contributor"}:null});
 function mock(auth,role,origin){
  const res={statusCode:200,json(x){this.payload=x;return this;},status(n){this.statusCode=n;return this;},set(){return this;}};
  return {req:{method:"POST",body:{baseRevision:1,scene:{mode:"sunset"},reason:"Approved visual"},auth,role,get:()=>origin},res};
 }
 for(const params of [[null,null,"https://towerflow.example"],["guest","contributor","https://towerflow.example"],["host","maintainer","https://evil.example"]]){
  const {req,res}=mock(...params);await h(req,res);assert.equal(res.statusCode,403);
 }
 assert.equal(writes,0);
 const {req,res}=mock("host","maintainer","https://towerflow.example");
 await h(req,res);assert.equal(res.statusCode,200);assert.equal(writes,1);
});
