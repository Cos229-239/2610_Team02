#!/usr/bin/env node
"use strict";
// Towerflow experiment runner. Explicit model target, offline smoke available.
// It never executes model-supplied code, saves model content, or touches live Towerflow.
const fs=require("node:fs");
const path=require("node:path");
const {grade,aggregate,parseCandidate,validateCase}=require("./code-correlation-eval.cjs");
const CASES=path.join(__dirname,"code-correlation-cases.json");
const SYSTEM=[
 "Translate the user's request into the pre-registered domain/correlation/preservation taxonomy.",
 "Return ONLY JSON with exact keys: codes, patterns, preserve, needsClarification.",
 "Codes are selected from: visual, sound-studio, transduction, embodied, interaction, situational, logic, deduction, induction, abduction.",
 "The vocabulary below is the allowed contract, not a claim that a real scene was modified.",
 "Pattern IDs: shallow-depth-of-field, natural-skin-lighting, physically-based-materials, plausible-environment-lighting, first-person-readable-focus, direct-to-reverberant-control, proximity-management, reflection-control, physical-stimulus-measurement, raw-signal-separation, body-reference-frame, sensorimotor-coordinate-update, action-perception-feedback, temporal-coupling, perception, comprehension, projection, formal-validity-check, argument-structure, necessary-inference, rule-instantiation, generalization-from-observations, uncertainty-qualification, competing-explanations, best-supported-hypothesis, acoustic-goal-uncertain.",
 "Preservation IDs: identity, pose, framing, camera-controls, station-placement, speech-intelligibility, no-plosive-distortion, raw-stimulus, no-inferred-labels, collision-boundaries, position-consistency, temporal-order, input-feedback-link, meeting-context, observed-vs-predicted, rule-structure, premise-conclusion-distinction, premise-truth-conditions, no-added-permissions, sample-limitation, no-certainty-claim, observed-facts, hypothesis-not-proof, existing-ambience, music.",
 "Never make unsupported assertions; mark needsClarification when core objective is underdefined.",
 "Do not include explanations or Markdown."
].join("\n");
function suite(file=CASES){
 const data=JSON.parse(fs.readFileSync(file,"utf8"));
 if(data.schemaVersion!==1||!Array.isArray(data.cases)||data.cases.length===0||data.cases.length>100)throw Error("Invalid eval suite");
 const seen=new Set();
 for(const c of data.cases){validateCase(c);if(seen.has(c.id))throw Error("Duplicate case ID");seen.add(c.id);}
 return data.cases;
}
function config(env=process.env){
 const endpoint=env.TF_EVAL_ENDPOINT;
 if(!endpoint)throw Error("Set TF_EVAL_ENDPOINT to an explicit OpenAI-compatible /chat/completions HTTPS URL (or loopback HTTP)");
 const u=new URL(endpoint);
 if(u.username||u.password||u.search||u.hash||!u.pathname.endsWith("/chat/completions")||
 !((u.protocol==="https:")||(u.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(u.hostname))))
  throw Error("Untrusted model endpoint");
 const model=env.TF_EVAL_MODEL;
 if(!model||model.length>120)throw Error("TF_EVAL_MODEL required");
 return {url:u.href,model,key:env.TF_EVAL_API_KEY||"",timeoutMs:15000};
}
async function infer(testCase,settings,{fetchFn=fetch}={}){
 const ctrl=new AbortController();
 const timer=setTimeout(()=>ctrl.abort(),settings.timeoutMs);
 try{
  const response=await fetchFn(settings.url,{method:"POST",signal:ctrl.signal,redirect:"error",
   headers:{"content-type":"application/json",...(settings.key?{authorization:"Bearer "+settings.key}:{})},
   body:JSON.stringify({model:settings.model,temperature:0,max_tokens:800,
    messages:[{role:"system",content:SYSTEM},{role:"user",content:testCase.input}]})});
  if(!response.ok)throw Error("Model provider error: HTTP "+response.status);
  const body=await response.json();
  const message=body.choices?.[0]?.message?.content;
  if(typeof message!=="string")throw Error("No text model response");
  return parseCandidate(message);
 }finally{clearTimeout(timer);}
}
async function run({mode="smoke",cases=suite(),settings=null,fetchFn=fetch}={}){
 const outputs=[];
 for(const c of cases){
  try{
   // Smoke mode intentionally produces invalid predictions; it proves the grader
   // rejects failures rather than assuming all candidates pass.
   const candidate=mode==="smoke"
    ?{codes:[],patterns:[],preserve:[],needsClarification:false}
    :await infer(c,settings,{fetchFn});
   outputs.push({id:c.id,graded:grade(c,candidate),error:null});
  }catch(err){
   outputs.push({id:c.id,graded:{id:c.id,passed:false,scores:{code:0,pattern:0,preservation:0}},
    error:String(err.message).slice(0,200)});
  }
 }
 return {mode,model:mode==="model"?settings.model:null,summary:aggregate(outputs.map(x=>x.graded)),
  results:outputs,notice:"Scores assess taxonomy prediction only. No visual/audio render or actual actions are evaluated."};
}
async function main(){
 const flag=process.argv[2]||"--smoke";
 if(!["--smoke","--model"].includes(flag)||process.argv.length>3)throw Error("Use --smoke or --model");
 const result=await run({mode:flag==="--smoke"?"smoke":"model",settings:flag==="--model"?config():null});
 // Emit no prompts, no provider token, no raw model output, and no personal data.
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if(result.summary.passRate!==1)process.exitCode=2;
}
if(require.main===module)main().catch(err=>{process.stderr.write(String(err.message)+"\n");process.exitCode=1;});
module.exports={suite,config,infer,run,SYSTEM};
