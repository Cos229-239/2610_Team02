"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {grade,aggregate}=require("./code-correlation-eval.cjs");
const {suite,config,infer,run}=require("./run-code-correlation-eval.cjs");
const cases=suite();
test("all 12 cases are unique, have complete pre-registered references",()=>{
 assert.equal(cases.length,12);
 assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
 for(const c of cases)assert.equal(grade(c,{...c.expected}).passed,true);
});
test("three independent gates must each achieve 10/10",()=>{
 const c=cases[0],correct={...c.expected};
 assert.deepEqual(grade(c,correct).scores,{code:10,pattern:10,preservation:10});
 assert.equal(grade(c,{...correct,patterns:[]}).passed,false);
 assert.equal(grade(c,{...correct,preserve:[]}).scores.preservation,0);
 assert.equal(grade(c,{...correct,codes:[]}).scores.code,0);
 assert.equal(grade(c,{...correct,needsClarification:!correct.needsClarification}).passed,false);
});
test("does not award credit for unsupported additional labels",()=>{
 const c=cases[0];
 assert.equal(grade(c,{...c.expected,preserve:[...c.expected.preserve,"music"]}).passed,false);
});
test("offline smoke rejects every incorrect case, not false-positive success",async()=>{
 const result=await run({mode:"smoke",cases});
 assert.equal(result.summary.passed,0);
 assert.equal(result.summary.passRate,0);
 assert.equal(result.summary.gates.preservation.passRate,0);
});
test("model endpoint rejects insecure remote provider",()=>{
 assert.throws(()=>config({TF_EVAL_ENDPOINT:"http://external.example/chat/completions",TF_EVAL_MODEL:"test"}),/Untrusted/);
 assert.throws(()=>config({TF_EVAL_ENDPOINT:"https://u:p@example.com/chat/completions",TF_EVAL_MODEL:"test"}),/Untrusted/);
 assert.equal(config({TF_EVAL_ENDPOINT:"https://example.com/v1/chat/completions",TF_EVAL_MODEL:"test"}).model,"test");
});
test("actual model adapter can evaluate a wire-compatible fake service",async()=>{
 const c=cases[1]; let received=null;
 const settings=config({TF_EVAL_ENDPOINT:"https://example.com/v1/chat/completions",TF_EVAL_MODEL:"test-provider"});
 const fetchFn=async(url,options)=>{received={url,options};
  return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(c.expected)}}]})};};
 const p=await infer(c,settings,{fetchFn});
 assert.deepEqual(p,c.expected);
 assert.equal(received.options.method,"POST");
 assert.ok(!received.options.headers.authorization);
 const result=await run({mode:"model",cases:[c],settings,fetchFn});
 assert.equal(result.summary.passRate,1);
 assert.equal(result.model,"test-provider");
});
test("provider failures are marked FAILED, not counted as capability",async()=>{
 const c=cases[2],settings=config({TF_EVAL_ENDPOINT:"https://example.com/v1/chat/completions",TF_EVAL_MODEL:"test"});
 const result=await run({mode:"model",cases:[c],settings,fetchFn:async()=>({ok:false,status:503})});
 assert.equal(result.summary.passRate,0);
 assert.match(result.results[0].error,/HTTP 503/);
});
test("ambiguous instructions require clarification but not a fabricated decision",()=>{
 const c=cases.find(x=>x.id==="ambiguous-sound");
 assert.equal(grade(c,c.expected).passed,true);
 assert.equal(grade(c,{...c.expected,needsClarification:false}).passed,false);
});
test("aggregate scores are bounded and do not establish physical fidelity",()=>{
 const report=aggregate([grade(cases[0],cases[0].expected)]);
 assert.equal(report.n,1);
 assert.match(report.limitation,/No evidence of rendered fidelity/);
});
