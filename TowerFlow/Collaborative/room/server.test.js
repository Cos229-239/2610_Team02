"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),http=require("node:http"),fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{WebSocket}=require("ws");

test("room access is enforced by HTTP routes and authenticated WebSockets",async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"towerflow-http-test-"));
 const oldEnv={ROOM_STORE_PATH:process.env.ROOM_STORE_PATH,APP_URL:process.env.APP_URL,PORT:process.env.PORT,GITHUB_CLIENT_ID:process.env.GITHUB_CLIENT_ID,GITHUB_CLIENT_SECRET:process.env.GITHUB_CLIENT_SECRET};
 const oldFetch=global.fetch;
 process.env.ROOM_STORE_PATH=path.join(dir,"rooms.json");
 process.env.APP_URL="http://towerflow.test";
 process.env.PORT="4173";
 process.env.GITHUB_CLIENT_ID="test-client";
 process.env.GITHUB_CLIENT_SECRET="test-secret";

 const owner={id:101,login:"room-owner",name:"Room Owner"};
 const editor={id:202,login:"room-editor",name:"Room Editor"};
 const viewer={id:303,login:"room-viewer",name:"Room Viewer"};
 const outsider={id:404,login:"outsider",name:"Outsider"};
 const repo="Acme/Inventory";
 const repoPermissions={
  "owner-token":{admin:true,push:true,pull:true},
  "editor-token":{push:true,pull:true},
  "viewer-token":{pull:true},
  "outsider-token":{}
 };
 const collaboratorPermissions=new Map([["room-owner","admin"],["room-editor","push"],["room-viewer","pull"]]);
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json"}});
 global.fetch=async(input,options={})=>{
  const url=new URL(typeof input==="string"?input:input.url);
  const token=String(options.headers?.Authorization||"").replace(/^Bearer\s+/i,"");
  if(url.hostname==="github.com"&&url.pathname==="/login/oauth/access_token")return json({access_token:"owner-token"});
  if(url.hostname==="api.github.com"&&url.pathname==="/user")return json(owner);
  if(url.pathname==="/repos/acme/inventory"||url.pathname==="/repos/acme/other"){
   const name=url.pathname.endsWith("/other")?"Acme/Other":repo;
   return json({full_name:name,name:name.split("/")[1],private:true,permissions:repoPermissions[token]||{}});
  }
  const collaborator=url.pathname.match(/^\/repos\/acme\/inventory\/collaborators\/([^/]+)\/permission$/);
  if(collaborator){const permission=collaboratorPermissions.get(decodeURIComponent(collaborator[1]));return permission?json({permission}):json({message:"Not Found"},404);}
  if(url.pathname.endsWith("/issues")&&(!options.method||options.method==="GET"))return json([]);
  if(url.pathname.endsWith("/issues")&&options.method==="POST"){
   const payload=JSON.parse(options.body||"{}");
   return json({number:77,title:payload.title,html_url:"https://github.com/Acme/Inventory/issues/77"},201);
  }
  if(url.pathname.endsWith("/branches"))return json([{name:"main"}]);
  return json({message:"Not Found"},404);
 };

 const runtime=require("./server");
 const {server,store,sessions,wss}=runtime;
 store.ensureRoom(repo,owner,"admin");
 const editorInvite=store.createInvite(repo,owner,"editor",7,10);
 store.acceptInvite(editorInvite.token,editor,"push");
 const viewerInvite=store.createInvite(repo,owner,"viewer",7,10);
 store.acceptInvite(viewerInvite.token,viewer,"pull");
 for(const [id,token,user] of [
  ["owner-session","owner-token",owner],
  ["editor-session","editor-token",editor],
  ["viewer-session","viewer-token",viewer],
  ["outsider-session","outsider-token",outsider]
 ])sessions.set(id,{token,user,expiresAt:Date.now()+60000});

 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve);});
 const port=server.address().port;
 function request(url,options={}){
  return new Promise((resolve,reject)=>{
   const headers={};
   if(options.user!==null)headers.Cookie="tf_session="+(options.user||"owner")+"-session";
   if(options.origin!==null)headers.Origin=options.origin||"http://towerflow.test";
   if(options.body!==undefined)headers["Content-Type"]="application/json";
   Object.assign(headers,options.headers||{});
   const req=http.request({hostname:"127.0.0.1",port,path:url,method:options.method||"GET",headers,agent:false},res=>{
    const chunks=[];res.on("data",chunk=>chunks.push(chunk));res.on("end",()=>{
     const text=Buffer.concat(chunks).toString("utf8");let data=null;try{data=JSON.parse(text);}catch{}
     resolve({status:res.statusCode,headers:res.headers,data,text});
    });
   });
   req.on("error",reject);if(options.body!==undefined)req.write(JSON.stringify(options.body));req.end();
  });
 }
 function nextMessage(socket){
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error("Timed out waiting for WebSocket message.")),3000);
   socket.once("message",data=>{clearTimeout(timer);try{resolve(JSON.parse(data.toString()));}catch(error){reject(error);}});
  });
 }
 function socketClose(socket){return new Promise(resolve=>socket.once("close",code=>resolve(code)));}

 t.after(async()=>{
  for(const socket of wss.clients)socket.terminate();
  if(server.listening)await new Promise(resolve=>{server.close(()=>resolve());server.closeAllConnections?.();});
  global.fetch=oldFetch;
  for(const [key,value] of Object.entries(oldEnv)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  fs.rmSync(dir,{recursive:true,force:true});
 });

 // Owner-only administration, invitation revocation, and CSRF origin enforcement.
 const created=await request("/api/room/acme/inventory/invites",{method:"POST",body:{role:"viewer",expiresInDays:7,maxUses:1}});
 assert.equal(created.status,201);
 const token=new URL(created.data.inviteUrl).searchParams.get("invite");
 assert.match(token,/^[a-f0-9]{64}$/);
 assert.equal((await request("/api/room/acme/inventory/invites",{user:"viewer",method:"POST",body:{role:"editor"}})).status,403);
 assert.equal((await request("/api/room/acme/inventory/invites",{user:"viewer"})).status,403);
 assert.equal((await request("/api/room/acme/inventory/invites/"+created.data.invite.id+"/revoke",{user:"viewer",method:"POST",body:{}})).status,403);
 assert.equal((await request("/api/room/acme/inventory/invites",{method:"POST",origin:"https://attacker.example",body:{role:"viewer"}})).status,403);
 const revoked=await request("/api/room/acme/inventory/invites/"+created.data.invite.id+"/revoke",{method:"POST",body:{}});
 assert.equal(revoked.status,200);
 assert.ok(revoked.data.invite.revokedAt);
 assert.equal((await request("/api/room-invites/accept",{user:"outsider",method:"POST",body:{token}})).status,410);

 // Current GitHub permission caps role assignment; successful changes alter actual route permissions.
 const memberPath="/api/room/acme/inventory/members/room-viewer";
 assert.equal((await request(memberPath,{user:"viewer",method:"PATCH",body:{role:"editor"}})).status,403);
 collaboratorPermissions.set("room-viewer","push");
 repoPermissions["viewer-token"]={push:true,pull:true};
 const promoted=await request(memberPath,{method:"PATCH",body:{role:"editor"}});
 assert.equal(promoted.status,200);
 assert.equal(promoted.data.member.role,"editor");
 assert.equal((await request("/api/project/acme/inventory/issues",{user:"viewer",method:"POST",body:{title:"Promoted",kind:"task",detail:"allowed"}})).status,201);
 assert.equal((await request(memberPath,{method:"PATCH",body:{role:"viewer"}})).status,200);
 assert.equal((await request("/api/project/acme/inventory/issues",{user:"viewer",method:"POST",body:{title:"Demoted",kind:"task",detail:"blocked"}})).status,403);
 assert.equal((await request(memberPath,{user:"viewer",method:"DELETE"})).status,403);

 // Project routes enforce room membership and read/write boundaries.
 assert.equal((await request("/api/room/acme/inventory/members",{user:"viewer"})).status,200);
 assert.equal((await request("/api/room/acme/inventory/members",{user:"outsider"})).status,403);
 assert.equal((await request("/api/project/acme/inventory/issues",{user:"viewer"})).status,200);
 assert.equal((await request("/api/project/acme/inventory/issues",{user:"outsider"})).status,403);
 assert.equal((await request("/api/project/acme/other/issues",{user:"editor"})).status,404);
 assert.equal((await request("/api/project/acme/inventory/issues",{user:"editor",method:"POST",body:{title:"Allowed",kind:"task",detail:"editor"}})).status,201);
 assert.equal((await request("/api/project/acme/inventory/issues",{user:null})).status,401);

 // A removed member's already-authenticated WebSocket is closed immediately.
 const viewerSocket=new WebSocket("ws://127.0.0.1:"+port+"/ws",{headers:{Cookie:"tf_session=viewer-session",Origin:"http://towerflow.test"}});
 await new Promise((resolve,reject)=>{viewerSocket.once("open",resolve);viewerSocket.once("error",reject);});
 const welcomePromise=nextMessage(viewerSocket);
 viewerSocket.send(JSON.stringify({type:"join",room:repo}));
 assert.equal((await welcomePromise).type,"welcome");
 const revokedMessagePromise=nextMessage(viewerSocket);
 const viewerClosePromise=socketClose(viewerSocket);
 assert.equal((await request(memberPath,{method:"DELETE"})).status,200);
 assert.equal((await revokedMessagePromise).type,"access-revoked");
 assert.equal(await viewerClosePromise,1008);

 // A valid room member cannot subscribe to a different repository's room.
 const editorSocket=new WebSocket("ws://127.0.0.1:"+port+"/ws",{headers:{Cookie:"tf_session=editor-session",Origin:"http://towerflow.test"}});
 await new Promise((resolve,reject)=>{editorSocket.once("open",resolve);editorSocket.once("error",reject);});
 const deniedMessagePromise=nextMessage(editorSocket);
 const deniedClosePromise=socketClose(editorSocket);
 editorSocket.send(JSON.stringify({type:"join",room:"Acme/Other"}));
 assert.equal((await deniedMessagePromise).type,"error");
 assert.equal(await deniedClosePromise,1008);

 // OAuth state is one-time and bound to the browser cookie, preventing login-CSRF callback injection.
 const start=await request("/auth/github",{user:null,origin:null});
 assert.equal(start.status,302);
 const state=new URL(start.headers.location).searchParams.get("state");
 const stateCookie=start.headers["set-cookie"].find(value=>value.startsWith("tf_oauth_state=")).split(";")[0];
 assert.match(state,/^[a-f0-9]{48}$/);
 const badCallback=await request("/auth/github/callback?state="+state+"&code=demo",{user:null,origin:null,headers:{Cookie:"tf_oauth_state="+"0".repeat(48)}});
 assert.equal(badCallback.status,400);
 const secondStart=await request("/auth/github",{user:null,origin:null});
 const secondState=new URL(secondStart.headers.location).searchParams.get("state");
 const correctCookie=secondStart.headers["set-cookie"].find(value=>value.startsWith("tf_oauth_state=")).split(";")[0];
 const goodCallback=await request("/auth/github/callback?state="+secondState+"&code=demo",{user:null,origin:null,headers:{Cookie:correctCookie}});
 assert.equal(goodCallback.status,302);
 assert.ok(goodCallback.headers["set-cookie"].some(value=>value.startsWith("tf_session=")));
 assert.ok(stateCookie.includes("HttpOnly"));
});
