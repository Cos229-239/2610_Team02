// TOWERFLOW_SHARED_WORLD_INSTALL_V1 — stages backend and browser code, no Node restart.
import {readFile,writeFile,copyFile,rename,mkdir,rm} from "node:fs/promises";
import {existsSync} from "node:fs";
import {dirname,join,resolve} from "node:path";
import {homedir,tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {randomUUID,createHash} from "node:crypto";
import {execFileSync} from "node:child_process";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const sourceWorld=join(root,"integrations","world","world-state.cjs");
const sourceClient=join(root,"integrations","world","world-sync-client.js");
const sourceEmulator=join(root,"integrations","aura","aura-world-emulator.js");
const sourceMarket=join(root,"integrations","market");
const live=join(homedir(),"Desktop","Towerflow_Team02_Private_Invite_Room","Towerflow_Collaboration_Room");
const checkout=join(root,"collaboration-room","live-room");
const begin="// TF_SHARED_WORLD_CLIENT_V1_BEGIN",end="// TF_SHARED_WORLD_CLIENT_V1_END";
const backendStart="// TF_SHARED_WORLD_BACKEND_V1_BEGIN",backendEnd="// TF_SHARED_WORLD_BACKEND_V1_END";
const sha=s=>createHash("sha256").update(s).digest("hex");
export function workspaceMatchesLive({liveRoom,liveServer,workspaceRoom,workspaceServer}){
 return liveRoom===workspaceRoom&&liveServer===workspaceServer;
}
const backend="// TF_SHARED_WORLD_BACKEND_V1_BEGIN\nconst {createWorldStore,createWorldHandler}=require('./world-state.cjs');\nconst tfWorldStore=createWorldStore({file:path.join(__dirname,'data','towerflow-world-state.json')});\nconst tfWorldHandler=createWorldHandler({store:tfWorldStore,origin:publicOrigin,authorize:async(req)=>{\n  const id=req.session?.user?.login;if(!id||!req.permission)return null;\n  return {userId:String(id).toLowerCase(),role:['admin','maintain'].includes(req.permission)?'maintainer':'contributor'};\n}});\napp.all('/api/world/state',auth,ensureMember,(req,res)=>tfWorldHandler(req,res));\nconst {createMarketHandler}=require('./market-handler.cjs');\nconst tfMarketHandler=createMarketHandler();\napp.get('/api/market/quote',auth,ensureMember,(req,res)=>tfMarketHandler(req,res));\nconst {createAgentHandler}=require('./agent-handler.cjs');\nconst tfAgentHandler=createAgentHandler({origin:publicOrigin});\napp.all('/api/agents/status',auth,ensureMember,(req,res)=>tfAgentHandler(req,res));\napp.all('/api/agents/run',auth,ensureMember,(req,res)=>tfAgentHandler(req,res));\napp.all('/api/agents/plan',auth,ensureMember,(req,res)=>tfAgentHandler(req,res));\nconst {createContributionHandler}=require('./pr-reader.cjs');\nconst tfContributions=createContributionHandler();\napp.get('/api/contributions',auth,ensureMember,(req,res)=>tfContributions(req,res));\n// TF_SHARED_WORLD_BACKEND_V1_END";
export function patchServer(text){
 // Support either reviewed AURA server integration generation. The actual
 // source-matched live host uses TF_AURA_V2_SERVER_BEGIN; older installations
 // may use TF_AURA_GIT_SERVER_V1. Never waive the authentication anchors.
 const auraMarkers=["// TF_AURA_GIT_SERVER_V1","// TF_AURA_V2_SERVER_BEGIN"];
 if(!auraMarkers.some(marker=>text.includes(marker)))
   throw Error("Unreviewed Express server: supported AURA integration marker absent");
 for(const marker of ["async function ensureMember","const publicOrigin","app.get('/api/health'","function auth(req,res,next)","req.permission=permission"]){
   if(!text.includes(marker))throw Error("Unreviewed Express server: "+marker+" absent");
 }
 if(!text.includes("app.use('/api/aura',auth,ensureMember") && !text.includes("app.use('/api/aura', auth, ensureMember") && !text.includes("// TF_AURA_GIT_SERVER_V1"))
   throw Error("Unreviewed Express server: authenticated AURA route absent");
 const first=text.indexOf(backendStart),last=text.indexOf(backendEnd);
 if((first>=0)!==(last>=0))throw Error("Damaged world-backend markers");
 if(first>=0){
  if(last<first||text.indexOf(backendStart,first+1)>=0)throw Error("Duplicate world backend");
  return text.slice(0,first)+backend+text.slice(last+backendEnd.length);
 }
 return text.replace("app.get('/api/health'",backend+"\napp.get('/api/health'");
}
export function patchRoom(text,feature,emulator){
 if(!text.includes("// TF_AURA_ROOM_CLIENT_V1_BEGIN")||!text.includes("// TF_WORLD_EMULATION_V1_BEGIN")||!text.includes("let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side"))throw Error("Room is missing verified world/controls anchors");
 if(!text.includes("applyAuthoritative:")){
  const pre="// TF_WORLD_EMULATION_V1_BEGIN",post="// TF_WORLD_EMULATION_V1_END";
  const a=text.indexOf(pre),b=text.indexOf(post);
  if(a<0||b<a)throw Error("Invalid installed world emulator markers");
  text=text.slice(0,a)+emulator.trim()+text.slice(b+post.length);
 }
 const code=feature.trim();
 if(!code.startsWith(begin)||!code.endsWith(end))throw Error("Invalid client marker");
 const a=text.indexOf(begin),b=text.indexOf(end);
 if((a>=0)!==(b>=0))throw Error("Partial world client");
 if(a>=0){
  if(b<a||text.indexOf(begin,a+1)>=0)throw Error("Duplicate world client");
  return text.slice(0,a)+code+text.slice(b+end.length);
 }
 return text.replace(/\s*$/,"\n\n")+code+"\n";
}
async function syntax(contents,suffix){
 const file=join(tmpdir(),"tf-syntax-"+randomUUID()+suffix);
 try{
  await writeFile(file,contents);
  execFileSync(process.execPath,["--check",file],{timeout:12000,stdio:"pipe"});
 }finally{await rm(file,{force:true});}
}
async function run(){
 const args=process.argv.slice(2);
 if(args.length!==1||!["--dry-run","--apply"].includes(args[0]))throw Error("Use --dry-run or --apply");
 const apply=args[0]==="--apply";
 const [service,client,emulator]=await Promise.all([readFile(sourceWorld,"utf8"),readFile(sourceClient,"utf8"),readFile(sourceEmulator,"utf8")]);
 // The LIVE host is authoritative. A separately imported checkout may be
 // stale or lack AURA integration. Never overwrite its original with live
 // code, nor let a stale checkout prevent a reviewed live-room deployment.
 const liveRoomFile=join(live,"public","room.js");
 const liveServerFile=join(live,"server.js");
 if(!existsSync(liveRoomFile)||!existsSync(liveServerFile))
   throw Error("Missing authoritative live room/server");
 const existingRoom=await readFile(liveRoomFile,"utf8");
 const existingServer=await readFile(liveServerFile,"utf8");
 const rows=[
   {file:liveRoomFile,old:existingRoom,next:patchRoom(existingRoom,client,emulator)},
   {file:liveServerFile,old:existingServer,next:patchServer(existingServer)}
 ];
 const workspaceRoom=join(checkout,"public","room.js");
 const workspaceServer=join(checkout,"server.js");
 if(existsSync(workspaceRoom)&&existsSync(workspaceServer)){
   const [wr,ws]=await Promise.all([readFile(workspaceRoom,"utf8"),readFile(workspaceServer,"utf8")]);
   // Source-match each file independently. The room.js may be identical
   // even when the repository's server.js is the old unauthenticated copy.
   if(wr===existingRoom){
     rows.push({file:workspaceRoom,old:wr,next:rows[0].next});
     console.log("WORKSPACE ROOM: matched; browser sync patch staged in both rooms.");
   }else{
     console.log("WORKSPACE ROOM: diverged; left unchanged, never force replaced.");
   }
   if(ws===existingServer){
     rows.push({file:workspaceServer,old:ws,next:rows[1].next});
     console.log("WORKSPACE SERVER: matched; backend staged in both.");
   }else{
     console.log("WORKSPACE SERVER: diverged; left unchanged, never force replaced.");
     console.log("WORKSPACE SERVER SHA256 "+sha(ws).slice(0,16)+"; LIVE SERVER SHA256 "+sha(existingServer).slice(0,16));
   }
 }else{
   console.log("WORKSPACE COPY: INCOMPLETE; skipped without creating replacement.");
 }
 for(const target of [live,...(rows.some(r=>r.file===workspaceServer)?[checkout]:[])]){
   const assets=[
     {name:"world-state.cjs",source:sourceWorld,marker:"TOWERFLOW_SHARED_WORLD_V1"},
     {name:"alpha-vantage.cjs",source:join(sourceMarket,"alpha-vantage.cjs"),marker:"Optional authenticated financial market connector"},
     {name:"alpaca-iex.cjs",source:join(sourceMarket,"alpaca-iex.cjs"),marker:"Alpaca IEX live-capable provider"},
     {name:"sec-company-facts.cjs",source:join(sourceMarket,"sec-company-facts.cjs"),marker:"SEC EDGAR public corporate filing facts"},
     {name:"dual-agent-harness.cjs",source:join(root,"integrations","agents","dual-agent-harness.cjs"),marker:"SOURCE-AWARE DUAL AGENT HARNESS"},
     {name:"frontier-execution-evidence.cjs",source:join(root,"integrations","agents","frontier-execution-evidence.cjs"),marker:"FRONTIER_EXECUTION_EVIDENCE_V1"},
     {name:"market-handler.cjs",source:join(sourceMarket,"market-handler.cjs"),marker:"GET-only authenticated market quote handler"},
     {name:"towerflow-agent.cjs",source:join(root,"integrations","agents","towerflow-agent.cjs"),marker:"Bounded TowerFlow agent runner"},
     {name:"agent-handler.cjs",source:join(root,"integrations","agents","agent-handler.cjs"),marker:"Stand-alone authenticated REST handler"},
     {name:"flow-planner.cjs",source:join(root,"integrations","agents","flow-planner.cjs"),marker:"Optional local Ollama planner"},
     {name:"flow-core.cjs",source:join(root,"TowerFlow","flow-core.js"),marker:"TowerFlow FLOW deterministic intelligence"},
     {name:"inventory-core.cjs",source:join(root,"TowerFlow","inventory-core.js"),marker:"TowerFlow Business Inventory v1"},
     {name:"pr-reader.cjs",source:join(root,"integrations","contributions","pr-reader.cjs"),marker:"Member-authenticated, read-only GitHub PR metadata"}
   ];
   for(const asset of assets){
     const file=join(target,asset.name);
     let next=await readFile(asset.source,"utf8");
     if(asset.name==="flow-planner.cjs"){
       next=next.replaceAll('require("../market/alpha-vantage.cjs")','require("./alpha-vantage.cjs")')
         .replaceAll('require("../market/sec-company-facts.cjs")','require("./sec-company-facts.cjs")');
       if(next.includes('require("../market'))throw Error("Planner dependency rewrite incomplete");
     }
     if(asset.name==="towerflow-agent.cjs"){
       next=next.replaceAll('require("../market/alpha-vantage.cjs")','require("./alpha-vantage.cjs")')
         .replaceAll('require("../market/alpaca-iex.cjs")','require("./alpaca-iex.cjs")')
         .replaceAll('require("../market/sec-company-facts.cjs")','require("./sec-company-facts.cjs")')
         .replaceAll('require("../../TowerFlow/flow-core.js")','require("./flow-core.cjs")')
         .replaceAll('require("../../TowerFlow/inventory-core.js")','require("./inventory-core.cjs")');
       if(next.includes('require("../../TowerFlow')||next.includes('require("../market'))
         throw Error("Agent dependency rewrite incomplete");
     }
     const old=existsSync(file)?await readFile(file,"utf8"):null;
     if(old&&old!==next&&!old.includes(asset.marker))
       throw Error("Existing unrelated staged service; refusing overwrite: "+file);
     rows.push({file,old,next});
   }
 }
 for(const row of rows)await syntax(row.next,row.file.endsWith(".cjs")?".cjs":".mjs");
 console.log("=== APPROVED SHARED WORLD "+(apply?"STAGE":"DRY RUN")+" ===");
 for(const row of rows)console.log((row.old===row.next?"UNCHANGED":"CHANGE")+" "+row.file+" SHA256 "+sha(row.next).slice(0,16));
 console.log("Origin / GitHub member auth / maintainer publishing / private disk state / versioned scenes.");
 console.log("NO NODE RESTART: backend route STAGED, will not activate until controlled restart.");
 if(!apply)return;
 const backup=join(homedir(),"Desktop","Towerflow_Shared_World_Backups",new Date().toISOString().replace(/[.:]/g,"-"));
 await mkdir(backup,{recursive:true});
 const records=[];
 for(const row of rows){
  if(row.old===row.next)continue;
  const record={path:row.file,sha256:sha(row.next),previousSha256:row.old===null?null:sha(row.old)};
  if(row.old!==null){record.backup=join(backup,String(records.length)+"-"+row.file.split(/[\\/]/).pop());await writeFile(record.backup,row.old);}
  records.push(record);
 }
 await writeFile(join(backup,"manifest.json"),JSON.stringify(records,null,2)+"\n");
 const applied=[];
 try{
  for(const row of rows){
   if(row.old===row.next)continue;
   const temp=row.file+".staged-"+randomUUID();
   try{await writeFile(temp,row.next);await rename(temp,row.file);applied.push(row.file);}
   finally{await rm(temp,{force:true});}
  }
 }catch(e){
  for(const r of records.filter(x=>applied.includes(x.path)).reverse())try{
   if(r.backup)await copyFile(r.backup,r.path);else await rm(r.path,{force:true});
  }catch(rerr){console.error("ROLLBACK FAILED:",r.path,rerr.message);}
  throw Error("World staging failed; rollback attempted: "+e.message);
 }
 console.log("STAGED. Backups: "+join(backup,"manifest.json"));
 console.log("The running Node process is untouched. World sync will be unavailable until a planned restart.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 run().catch(e=>{console.error("SHARED WORLD STAGING BLOCKED:",e.message);process.exitCode=1;});
