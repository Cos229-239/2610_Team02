import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {patchRoom,patchServer} from "./install-shared-world-from-git.mjs";
const feature=readFileSync(new URL("../integrations/world/world-sync-client.js",import.meta.url),"utf8");
const emulator=readFileSync(new URL("../integrations/aura/aura-world-emulator.js",import.meta.url),"utf8");
const server=[
  "const publicOrigin = 'https://towerflow.example';",
  "function auth(req,res,next) {}",
  "async function ensureMember(req,res,next) { req.permission=permission; }",
  "// TF_AURA_GIT_SERVER_V1",
  "app.get('/api/health',(req,res)=>res.json({ok:true}));"
].join("\n");
test("server route is injected once after authenticated member middleware",()=>{
 const once=patchServer(server);
 assert.match(once,/app\.all\('\/api\/world\/state',auth,ensureMember/);
 assert.match(once,/world-state\.cjs/);
 assert.equal(patchServer(once),once);
});
test("existing V2 source-matched server is supported without loosening authorization",()=>{
 const v2=server.replace("// TF_AURA_GIT_SERVER_V1",
  ["// TF_AURA_V2_SERVER_BEGIN","app.use('/api/aura',auth,ensureMember,createAuraRouter({}));"].join("\n"));
 const once=patchServer(v2);
 assert.ok(once.includes("app.all('/api/world/state',auth,ensureMember"));
 assert.equal(patchServer(once),once);
 assert.throws(()=>patchServer(v2.replace("req.permission=permission","// no permission assignment")),/req.permission=permission/);
});
test("refuses unknown server or partial backend marker",()=>{
 assert.throws(()=>patchServer("app.get('/api/health',()=>{})"),/Unreviewed/);
 assert.throws(()=>patchServer(server+"\n// TF_SHARED_WORLD_BACKEND_V1_BEGIN"),/Damaged/);
});
const fixture=[
 "// TF_DEV_ROOM_V1",
 "// TF_AURA_ROOM_CLIENT_V1_BEGIN",
 "// TF_WORLD_EMULATION_V1_BEGIN",
 "(function(){ 'use strict'; })();",
 "// TF_WORLD_EMULATION_V1_END",
 "let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;"
].join("\n");
test("restores shared scene client and upgrades existing sky emulator idempotently",()=>{
 const once=patchRoom(fixture,feature,emulator);
 assert.match(once,/applyAuthoritative:/);
 assert.match(once,/TF_SHARED_WORLD_CLIENT_V1_BEGIN/);
 assert.match(once,/let vx=-Math\.sin\(yaw\)/);
 assert.equal(patchRoom(once,feature,emulator),once);
});
test("rejects partial room sync install",()=>{
 assert.throws(()=>patchRoom(fixture+"\n// TF_SHARED_WORLD_CLIENT_V1_BEGIN",feature,emulator),/Partial/);
});
