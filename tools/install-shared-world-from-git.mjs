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
const live=join(homedir(),"Desktop","Towerflow_Team02_Private_Invite_Room","Towerflow_Collaboration_Room");
const checkout=join(root,"collaboration-room","live-room");
const begin="// TF_SHARED_WORLD_CLIENT_V1_BEGIN",end="// TF_SHARED_WORLD_CLIENT_V1_END";
const backendStart="// TF_SHARED_WORLD_BACKEND_V1_BEGIN",backendEnd="// TF_SHARED_WORLD_BACKEND_V1_END";
const sha=s=>createHash("sha256").update(s).digest("hex");
const backend="// TF_SHARED_WORLD_BACKEND_V1_BEGIN\nconst {createWorldStore,createWorldHandler}=require('./world-state.cjs');\nconst tfWorldStore=createWorldStore({file:path.join(__dirname,'data','towerflow-world-state.json')});\nconst tfWorldHandler=createWorldHandler({store:tfWorldStore,origin:publicOrigin,authorize:async(req)=>{\n  const id=req.session?.user?.login;if(!id||!req.permission)return null;\n  return {userId:String(id).toLowerCase(),role:['admin','maintain'].includes(req.permission)?'maintainer':'contributor'};\n}});\napp.all('/api/world/state',auth,ensureMember,(req,res)=>tfWorldHandler(req,res));\n// TF_SHARED_WORLD_BACKEND_V1_END";
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
   if(wr===existingRoom&&ws===existingServer){
     rows.push({file:workspaceRoom,old:wr,next:rows[0].next});
     rows.push({file:workspaceServer,old:ws,next:rows[1].next});
     console.log("WORKSPACE COPY: MATCHED authoritative live source; safe to stage in both");
   }else{
     console.log("WORKSPACE COPY: DIVERGED; left unchanged. Review/import separately; never overwrite local work.");
     console.log("WORKSPACE SERVER SHA256 "+sha(ws).slice(0,16)+"; LIVE SERVER SHA256 "+sha(existingServer).slice(0,16));
   }
 }else{
   console.log("WORKSPACE COPY: INCOMPLETE; skipped without creating replacement.");
 }
 for(const target of [live,...(rows.length===4?[checkout]:[])]){
   const file=join(target,"world-state.cjs");
   const old=existsSync(file)?await readFile(file,"utf8"):null;
   if(old&&old!==service&&!old.includes("TOWERFLOW_SHARED_WORLD_V1"))
     throw Error("Existing unrelated world-state service; refusing overwrite: "+file);
   rows.push({file,old,next:service});
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
