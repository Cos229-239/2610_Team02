// TF_FRONTIER_SOURCE_MATCHED_20261112_V1
// Surgical upgrade for the single reviewed live room upload, NOT a fuzzy merge.
import {readFileSync,writeFileSync,copyFileSync,renameSync,mkdirSync,rmSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
import {createHash,randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
const repo=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const expected="a494702ce2b940df904a99116a05cb8bfc983d34c63f07327b68122f6ee77cc2";
const start="// TF_FRONTIER_LOBBY_V1_BEGIN",end="// TF_FRONTIER_LOBBY_V1_END";
const sh=s=>createHash("sha256").update(s).digest("hex");
const read=p=>readFileSync(join(repo,p),"utf8");
const unique=(s,p)=>{if(!p||s.indexOf(p)===-1||s.indexOf(p)!==s.lastIndexOf(p))
  throw Error("Ambiguous/missing reviewed source anchor: "+p.slice(0,85));
  return s.indexOf(p)};
const between=(s,a,b)=>{
  const startAt=unique(s,a),endAt=s.indexOf(b,startAt+a.length);
  if(endAt<0)throw Error("Reviewed end anchor missing: "+b);
  return s.slice(startAt,endAt);
};
const replace=(s,oldValue,newValue)=>{unique(s,oldValue);return s.replace(oldValue,newValue)};
function audioPatches(input){
  const stopOld="let ambience=null,ambientNodes=[];function stopAmbience(){if(ambience){ambientNodes.forEach(n=>{try{n.stop?.()}catch{};try{n.disconnect?.()}catch{}});ambientNodes=[];ambience.close();ambience=null}}";
  const stopNew=[
    "let ambience=null,ambientNodes=[];",
    "function stopAmbience(){",
    "  const active=ambience;ambience=null;",
    "  for(const node of ambientNodes){try{node.stop?.()}catch{};try{node.disconnect?.()}catch{}}",
    "  ambientNodes=[];",
    "  if(active)try{void active.close().catch(()=>{});}catch{}",
    "  // Selectively silence environmental audio; never suspend WebRTC voice.",
    "  window.tfFrontier?.stopEnvironmentAudio?.();",
    "}"
  ].join("\n");
  let s=replace(input,stopOld,stopNew);
  s=replace(s,"function startAmbience(){stopAmbience();ambience=",
    "function startAmbience(){stopAmbience();window.tfFrontier?.resumeEnvironmentAudio?.();ambience=");
  s=replace(s,"noise.start();ambientNodes.push(noise);",
    "noise.start();ambientNodes.push(noise);window.tfFrontier?.trackAmbientAudio?.({gain:gain.gain,context:ctx});");
  s=replace(s,"osc.start();ambientNodes.push(osc)",
    "osc.start();ambientNodes.push(osc);window.tfFrontier?.trackAmbientAudio?.({gain:volume.gain,context:ctx})");
  return s;
}
function construct(input){
  if(sh(Buffer.from(input,"utf8"))!==expected)
    throw Error("Live room differs from uploaded reviewed SHA-256. Refusing to overwrite.");
  const lobby=read("integrations/frontier/frontier-lobby.js");
  const sourceFiles=["cyber-ambience.js","cinematic-fidelity.js","kinetic-pedestals.js",
    "neon-lighting.js","team-chat-dock.js","environment-audio.js"];
  for(const [name,marker] of [
    ["cyber-ambience.js","TF_FRONTIER_CYBER_AMBIENCE_V1"],
    ["cinematic-fidelity.js","TF_FRONTIER_CINEMATIC_FIDELITY_V1"],
    ["kinetic-pedestals.js","TF_FRONTIER_KINETIC_PEDESTALS_V1"],
    ["neon-lighting.js","TF_FRONTIER_NEON_LIGHTING_V1"],
    ["team-chat-dock.js","TF_FRONTIER_TEAM_CHAT_DOCK_V1"],
    ["environment-audio.js","TF_FRONTIER_ENVIRONMENT_AUDIO_V1"]
  ])if(!read("integrations/frontier/"+name).includes(marker))throw Error("Unreviewed module "+name);
  let s=input;
  s=replace(s,start+"\n",start+"\n"+
    sourceFiles.map(name=>read("integrations/frontier/"+name)).join("\n")+"\n");
  const install=between(lobby,"  // Additive photogenic cyber architecture.",
    "  // Physical fixtures from the ORIGINAL room;");
  s=replace(s,"  // Physical fixtures from the ORIGINAL room;",install+"  // Physical fixtures from the ORIGINAL room;");
  const kinetics=between(lobby,"  // Original retractable displays now support",
    "  function setOrbAgent(agent){");
  s=replace(s,"  function setOrbAgent(agent){",kinetics+"  function setOrbAgent(agent){");
  const controls=between(lobby,"  // Every exhibit has its own maintained preset;",
    "  let filePaths=[],chosenFile=null,originalCode=\"\",editingDirty=false;");
  s=replace(s,"  let filePaths=[],chosenFile=null,originalCode=\"\",editingDirty=false;",
    controls+"  let filePaths=[],chosenFile=null,originalCode=\"\",editingDirty=false;");
  const debug=between(lobby,"    // github.dev edits code but cannot run/debug.",
    "    const tool=makeEl(\"div\");");
  s=replace(s,"    links.append(other);top.append(links);",
    "    links.append(other);\n"+debug);
  const inputStart="  // A deliberate wall click is the ONLY way to start or retarget projection.";
  const inputEnd="  // Preserve original Enter handler; do not intercept any Development Room return portal.";
  const interaction=between(lobby,
    "  // Explicit wall engagement: mouse click OR aiming at a wall and pressing E.",
    inputEnd);
  const from=unique(s,inputStart),to=unique(s,inputEnd);
  if(from>to)throw Error("Input region inverted");
  s=s.slice(0,from)+interaction+s.slice(to);
  const telemetry=between(lobby,"  // Passive frame telemetry piggybacks on the existing projector loop.",
    "  function animateProjector(){");
  s=replace(s,"  function animateProjector(){",telemetry+"  function animateProjector(){");
  s=replace(s,"    const now=performance.now();\n    const state=projectorState.tick(now);",
    "    const now=performance.now();\n    if(previousFrame){const dt=now-previousFrame;if(dt>0&&dt<300){frameSamples.push(dt);if(frameSamples.length>240)frameSamples.shift();}}\n    previousFrame=now;\n    cyberAmbience?.update(now);\n    cinematicFidelity?.update(now);\n    const state=projectorState.tick(now);");
  s=replace(s,"      pad.holo.rotation.y=now*.00035;",
    "      if(!kineticPedestals)pad.holo.rotation.y=now*.00035;");
  s=replace(s,"    orbHalo.rotation.y=now*.0006;",
    "    kineticPedestals?.update(now,clearing);\n    neonLighting?.update(now,clearing);\n    orbHalo.rotation.y=now*.0006;");
  const upgradedAPI=lobby.split("\n").find(line=>line.startsWith("  window.tfFrontier=Object.freeze({"));
  if(!upgradedAPI||!upgradedAPI.includes("stopEnvironmentAudio")||!upgradedAPI.includes("setLighting"))
    throw Error("Reviewed Frontier release API missing");
  const oldAPI=/^  window\.tfFrontier=Object\.freeze\(\{[^\r\n]*\}\);/m;
  if((s.match(oldAPI)||[]).length!==1)throw Error("Original API missing or ambiguous");
  s=s.replace(oldAPI,upgradedAPI);
  const outsideBefore=s.slice(0,unique(s,start))+
    s.slice(unique(s,end)+end.length);
  s=audioPatches(s);
  const expectedOutside=audioPatches(outsideBefore);
  const outsideAfter=s.slice(0,unique(s,start))+
    s.slice(unique(s,end)+end.length);
  if(expectedOutside!==outsideAfter)throw Error("Unapproved change outside Frontier");
  for(const marker of ["TF_AURA_ROOM_CLIENT_V1_BEGIN","TF_AURA_LIGHTING_V1_BEGIN",
    "TF_WORLD_EMULATION_V1_BEGIN","TF_FRONTIER_LOBBY_V1_END",
    "TF_FRONTIER_ENVIRONMENT_AUDIO_V1","function openPedestalSettings(index)",
    "function frontierInputReady()","stopEnvironmentAudio"])
    if(!s.includes(marker))throw Error("Required preserved/upgrade marker missing: "+marker);
  return s;
}
function main(){
  const args=process.argv.slice(2);
  if(args.length!==1||!["--dry-run","--apply"].includes(args[0]))
    throw Error("Use --dry-run or --apply");
  const live=join(homedir(),"Desktop","Towerflow_Team02_Private_Invite_Room",
    "Towerflow_Collaboration_Room","public","room.js");
  const original=readFileSync(live,"utf8");
  const next=construct(original);
  const staged=live+".frontier-"+randomUUID()+".mjs";
  try{
    writeFileSync(staged,next,"utf8");
    execFileSync(process.execPath,["--check",staged],{timeout:15000,windowsHide:true});
    console.log("SOURCE MATCH VERIFIED",expected);
    console.log("PATCH PARSED",sh(next),"bytes:",Buffer.byteLength(next));
    console.log("SCOPED: reviewed Frontier, exact Sound Garden stop/restart hooks");
    if(args[0]==="--dry-run")return console.log("DRY RUN ONLY — original untouched");
    if(readFileSync(live,"utf8")!==original)throw Error("Live source changed during validation");
    const backupRoot=join(homedir(),"Desktop","Towerflow_Frontier_Backups",
      new Date().toISOString().replace(/[.:]/g,"-")+"-source-matched");
    mkdirSync(backupRoot,{recursive:true});
    const backup=join(backupRoot,"room.js");
    copyFileSync(live,backup);
    writeFileSync(join(backupRoot,"manifest.json"),JSON.stringify({
      originalSha256:expected,updatedSha256:sh(next),originalPath:live,backup,
      changes:["reviewed Frontier module integrations","Sound Garden stop/restart"]
    },null,2)+"\n");
    const newRoom=live+".frontier-"+randomUUID();
    try{
      writeFileSync(newRoom,next,"utf8");
      if(readFileSync(live,"utf8")!==original)throw Error("Live room changed; refuse commit");
      renameSync(newRoom,live);
      if(sh(readFileSync(live))!==sh(next))throw Error("Written-room SHA verification failed");
    }catch(e){copyFileSync(backup,live);throw e}
    finally{rmSync(newRoom,{force:true});}
    console.log("INSTALLED. Targeted rollback copy:",backup);
    console.log("Refresh original Frontier browser. No server, OAuth or tunnel changes.");
  }finally{rmSync(staged,{force:true});}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  try{main()}catch(e){console.error("SOURCE-MATCHED FRONTIER BLOCKED:",e.message);process.exitCode=1;}
