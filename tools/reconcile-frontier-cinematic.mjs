// Preserve-first reconciliation of a locally modified ORIGINAL Frontier module.
// Three-way merge ONLY; no ignore-hash flags, no shell/IDE/server/network edits.
import {readFileSync,writeFileSync,mkdtempSync,rmSync,mkdirSync,copyFileSync,renameSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir,tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {execFileSync,spawnSync} from "node:child_process";
import {createHash,randomUUID} from "node:crypto";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const start="// TF_FRONTIER_LOBBY_V1_BEGIN",end="// TF_FRONTIER_LOBBY_V1_END";
const hash=s=>createHash("sha256").update(s).digest("hex");
const normalized=s=>s.replace(/\r\n/g,"\n");

export function zone(source) {
  if(typeof source!=="string")throw Error("Room source must be text");
  const a=source.indexOf(start),b=source.indexOf(end);
  if(a<0||b<a||source.indexOf(start,a+start.length)!==-1||
    source.indexOf(end,b+end.length)!==-1)throw Error("Unrecognized, partial or duplicate Frontier region");
  return Object.freeze({prefix:source.slice(0,a),module:source.slice(a,b+end.length),
    suffix:source.slice(b+end.length)});
}
export function checkMergedRoom(original,updated) {
  const before=zone(original),after=zone(updated);
  if(before.prefix!==after.prefix||before.suffix!==after.suffix)
    throw Error("Unrelated room source changed — refusing upgrade");
  const markers=["TF_PROJECTOR_MACHINE_V1","TF_FRONTIER_CYBER_AMBIENCE_V1",
    "TF_FRONTIER_CINEMATIC_FIDELITY_V1","TF_FRONTIER_KINETIC_PEDESTALS_V1",
    "TF_FRONTIER_NEON_LIGHTING_V1","TF_FRONTIER_TEAM_CHAT_DOCK_V1",
    "TF_FRONTIER_ENVIRONMENT_AUDIO_V1"];
  for(const marker of markers) {
    // Some markers occur once in module comments and once in an error message;
    // unique strict marker counts are not a reliable identity test.
    if(!after.module.includes(marker))throw Error("Missing reviewed component: "+marker);
  }
  if(after.module.includes("<<<<<<< ")||after.module.includes(">>>>>>> ")||
    after.module.includes("=======\n"))throw Error("Unresolved merge conflict");
  return true;
}
export function mergeThreeWay(local,base,target,executable="git") {
  const temp=mkdtempSync(join(tmpdir(),"tf-frontier-merge-"));
  const paths=["local.js","base.js","target.js"].map(p=>join(temp,p));
  try {
    [local,base,target].forEach((value,i)=>writeFileSync(paths[i],normalized(value).replace(/\n?$/,"\n"),"utf8"));
    const run=spawnSync(executable,["merge-file","-p","--diff3",
      "-L","original-live","-L","reviewed-ancestor","-L","cinematic-release",...paths],
      {encoding:"utf8",maxBuffer:32*1024*1024,timeout:15000,windowsHide:true});
    if(run.error)throw run.error;
    // git merge-file exits with the NUMBER OF CONFLICTS (0..127), not a boolean.
    // A conflict count greater than one is not a Git invocation error.
    // Preserve source whenever conflicts are nonzero; never auto-select ours/theirs.
    if(run.status===null||run.signal||run.status>=128)
      throw Error("Git merge-file execution error (exit "+run.status+"): "+String(run.stderr).slice(0,300));
    return Object.freeze({clean:run.status===0,conflicts:run.status,merged:run.stdout});
  } finally {rmSync(temp,{recursive:true,force:true});}
}
function blob(ref) {
  return execFileSync("git",["-C",root,"show",ref],{encoding:"utf8",timeout:12000,maxBuffer:16*1024*1024,windowsHide:true});
}
function source(file){return readFileSync(join(root,"integrations","frontier",file),"utf8");}
function construct() {
  const lobby=source("frontier-lobby.js");
  const project=source("projector-machine.js");
  const cyber=source("cyber-ambience.js");
  const modules=[
    project,cyber,source("cinematic-fidelity.js"),source("kinetic-pedestals.js"),
    source("neon-lighting.js"),source("team-chat-dock.js"),source("environment-audio.js")
  ];
  if(!lobby.startsWith(start)||!lobby.trimEnd().endsWith(end)||
    lobby.indexOf(start,start.length)!==-1)throw Error("Reviewed lobby markers invalid");
  const next=lobby.replace(start,start+"\n"+modules.join("\n"));
  const baseline=blob("56e5b94e14fff22a23dcec64a735ddb2e839cab8")
    .replace(start,start+"\n"+project);
  const prev=blob("57ee110174d975a4b5fd6a1b01350022418d45ea")
    .replace(start,start+"\n"+blob("b6e3a894af660bbbe58054e3eae86d1f8df05308")+
      "\n"+blob("117760ad9355e29ba010c4a9e58380256c66d285"));
  return {next:next.trim(),ancestors:[{name:"original-projection",text:baseline.trim()},
    {name:"prior-cyber",text:prev.trim()}]};
}
export function reconcile(original,{next,ancestors}) {
  const old=zone(original),target=zone(next).module;
  if(normalized(old.module).trim()===normalized(target).trim())
    return Object.freeze({kind:"already-current",updated:original,ancestor:null});
  const found=new Map(),conflicts=[];
  for(const ancestor of ancestors){
    const base=zone(ancestor.text).module;
    const result=mergeThreeWay(old.module,base,target);
    if(!result.clean)conflicts.push(ancestor.name+": "+result.conflicts+" overlapping hunks");
    if(result.clean){
      // Reconcile line ending convention of original module on Windows.
      let merged=result.merged.trimEnd();
      if(old.module.includes("\r\n"))merged=merged.replace(/\n/g,"\r\n");
      if(merged.startsWith(start)&&merged.endsWith(end)){
        const after=old.prefix+merged+old.suffix;
        try{checkMergedRoom(original,after);
          found.set(hash(after),{after,name:ancestor.name});
        }catch{}
      }
    }
  }
  if(found.size===0)throw Error("No conflict-free reviewed ancestor ("+conflicts.join("; ")+"). Live room unchanged. Source-specific integration is required.");
  if(found.size>1)throw Error("Ambiguous three-way outputs. Keep live code; manual source review required.");
  const selected=[...found.values()][0];
  return Object.freeze({kind:"merged",updated:selected.after,ancestor:selected.name});
}
function checkJS(text){
  const temp=join(tmpdir(),"tf-frontier-syntax-"+randomUUID()+".mjs");
  try{writeFileSync(temp,text,"utf8");
    execFileSync(process.execPath,["--check",temp],{timeout:15000,windowsHide:true});
  }finally{rmSync(temp,{force:true});}
}
function main(){
  const args=process.argv.slice(2);
  if(args.length!==1||!["--dry-run","--apply"].includes(args[0]))
    throw Error("Usage: node tools/reconcile-frontier-cinematic.mjs --dry-run|--apply");
  const apply=args[0]==="--apply";
  const live=join(homedir(),"Desktop","Towerflow_Team02_Private_Invite_Room",
    "Towerflow_Collaboration_Room","public","room.js");
  const before=readFileSync(live,"utf8");
  if(!before.includes("TF_AURA_ROOM_CLIENT_V1_BEGIN")||
    !before.includes("let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side")||
    !before.includes("function activateTFStation(id)"))
    throw Error("Original room preservation anchors absent");
  const result=reconcile(before,construct());
  checkJS(result.updated);
  checkMergedRoom(before,result.updated);
  const changed=result.updated!==before;
  console.log("FRONTIER RECONCILE",result.kind,"ancestor:",result.ancestor??"none");
  console.log("Original SHA256:",hash(before),"candidate SHA256:",hash(result.updated));
  console.log("CODE: parsed | PRESERVATION: outside-Frontier bytes exact | server/OAuth/room state untouched");
  if(!apply){console.log("DRY RUN ONLY: no files changed");return;}
  if(!changed){console.log("ALREADY CURRENT: no write necessary");return;}
  if(readFileSync(live,"utf8")!==before)throw Error("Live source changed during review — no write");
  const home=join(homedir(),"Desktop","Towerflow_Frontier_Backups",
    new Date().toISOString().replace(/[:.]/g,"-")+"-reconcile");
  mkdirSync(home,{recursive:true});
  const backup=join(home,"room.js");
  copyFileSync(live,backup);
  writeFileSync(join(home,"receipt.json"),JSON.stringify({
    originalSHA256:hash(before),expectedSHA256:hash(result.updated),
    selectedAncestor:result.ancestor,originalPath:live,backup},null,2));
  const staged=live+".cinematic-"+randomUUID();
  try {
    writeFileSync(staged,result.updated,"utf8");
    if(readFileSync(live,"utf8")!==before)throw Error("Live room changed before commit");
    renameSync(staged,live);
    const actual=readFileSync(live,"utf8");
    if(actual!==result.updated||!checkMergedRoom(before,actual))
      throw Error("Post-install verification mismatch");
  }catch(error){
    if(hash(readFileSync(live,"utf8"))!==hash(before))copyFileSync(backup,live);
    throw Error("Install aborted; original backup preserved: "+error.message);
  }finally{rmSync(staged,{force:true});}
  console.log("INSTALLED reviewed merge; rollback:",backup);
  console.log("NO RESTART. Refresh original authenticated room and test with team.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  try{main()}catch(e){console.error("FRONTIER RECONCILE BLOCKED:",e.message);process.exitCode=1;}
