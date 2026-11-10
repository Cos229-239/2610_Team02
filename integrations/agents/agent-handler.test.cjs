"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createAgentHandler}=require("./agent-handler.cjs");
function response(){const r={statusCode:200,body:null};r.set=()=>r;r.status=n=>{r.statusCode=n;return r};r.json=v=>{r.body=v;return r};return r;}
const origin="https://towerflow.example";
function req(overrides={}){return {method:"GET",path:"/api/agents/status",session:{user:{login:"authorizedUser"}},permission:"push",headers:{origin,"content-type":"application/json"},...overrides};}
test("agent service publishes documented execution capabilities to members",async()=>{
 const fn=createAgentHandler({origin,agent:{status:()=>({skills:{"inventory.review":{tools:["inventory.analyze"]}},modelAutonomy:false})}});
 const r=response();await fn(req(),r);
 assert.equal(r.body.agent,"FLOW");assert.equal(r.body.modelAutonomy,false);
});
test("agent denies unauthenticated callers and cross-origin task execution",async()=>{
 const fn=createAgentHandler({origin,agent:{status:()=>({}),run:async()=>({ok:true})}});
 let r=response();await fn(req({session:null}),r);assert.equal(r.statusCode,403);
 r=response();await fn(req({method:"POST",path:"/api/agents/run",body:{skill:"inventory.review"},headers:{origin:"https://attacker.example","content-type":"application/json"}}),r);
 assert.equal(r.statusCode,403);
});
test("authenticated reviewed task executes and returns audit evidence",async()=>{
 const fn=createAgentHandler({origin,agent:{status:()=>({}),run:async(task,actor)=>({task,actor,trace:[{tool:"test"}]})}});
 const body={skill:"inventory.review",idempotencyKey:"case-123456",items:[]};
 const r=response();await fn(req({method:"POST",path:"/api/agents/run",body}),r);
 assert.equal(r.statusCode,200);assert.equal(r.body.actor.userId,"github_authorizeduser");
 assert.equal(r.body.trace[0].tool,"test");
});
