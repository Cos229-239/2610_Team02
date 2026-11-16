"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const {readFileSync}=require("node:fs");
const {join}=require("node:path");
const root=join(__dirname,"../..");
const profiles=JSON.parse(readFileSync(join(__dirname,"environment-profiles.json"),"utf8"));
test("environment registry maps to actual declared VS and devcontainer profiles",()=>{
 const ids=new Set();
 for(const p of profiles.profiles){
  assert.ok(!ids.has(p.id));ids.add(p.id);
  assert.ok(Array.isArray(p.languages)&&p.languages.length);
  assert.ok(["external-consent-required","local-consent-required","not-connected"].includes(p.execution));
  if(p.configuration)assert.doesNotThrow(()=>JSON.parse(readFileSync(join(root,p.configuration),"utf8")));
 }
 assert.ok(ids.has("node-web"));
 assert.ok(ids.has("visual-studio-community"));
});
test("never claim host code execution from profile declarations",()=>{
 assert.ok(profiles.profiles.every(p=>p.execution!=="ready"&&p.execution!=="running"));
 assert.ok(profiles.notes.some(x=>x.includes("No arbitrary command execution")));
});
test("Visual Studio workloads and devcontainer remain opt-in",()=>{
 const vs=JSON.parse(readFileSync(join(root,".vsconfig"),"utf8"));
 const dc=JSON.parse(readFileSync(join(root,".devcontainer/devcontainer.json"),"utf8"));
 assert.ok(vs.components.includes("Microsoft.VisualStudio.Workload.NativeDesktop"));
 assert.ok(vs.components.includes("Microsoft.VisualStudio.Workload.ManagedDesktop"));
 assert.ok(!JSON.stringify(dc).includes("Towerflow_Collaboration_Room"));
 assert.ok(!JSON.stringify(dc).includes("docker.sock"));
});
