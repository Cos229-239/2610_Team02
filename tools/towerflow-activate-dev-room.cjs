'use strict';
/**
 * Controlled host integration:
 *  - patches ONLY uniquely anchored code blocks;
 *  - preserves current 3D scene byte-for-byte outside inserted code;
 *  - never replaces server.js, changes git branches, restarts processes or calls Cloudflare;
 *  - stages all changes, syntax checks, verifies originals immediately before write,
 *    and rolls back original bytes if any write or verification fails.
 *
 * npm-less Node entry: node tools/towerflow-activate-dev-room.cjs <absolute host room> --plan|--apply
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const sha=buf=>crypto.createHash('sha256').update(buf).digest('hex');
const sourceRoot=path.resolve(__dirname,'..');
const bridgeRoot=path.join(sourceRoot,'collaboration-room','azure-bridge');
const sceneSource=path.join(sourceRoot,'collaboration-room','live-room','public','room.js');
function one(s,needle,label){
 const parts=s.split(needle);
 if(parts.length!==2)throw Error('Cannot safely patch '+label+': expected exactly one anchor, found '+(parts.length-1));
 return parts;
}
function splice(s,needle,after,label){
 const p=one(s,needle,label);
 return p[0]+needle+after+p[1];
}
function block(s,start,end,label){
 const at=one(s,start,label)[1],i=at.indexOf(end);
 if(i<0||at.indexOf(end,i+end.length)>=0)throw Error('Reviewed block '+label+' has no unique end');
 return start+at.slice(0,i)+end;
}
function createScene(current){
 const release=fs.readFileSync(sceneSource,'utf8');
 const sceneMark='// TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN',endMark='// TF_DEV_BUSINESS_PROJECTOR_V1_END';
 const physical=block(release,sceneMark,endMark,'second projector');
 const physicalHook='    if(id==="dev-business-projector"){openDevBusinessStudio();return;}';
 const ideHook='    if(typeof id==="string"&&id.startsWith("dev-ide-")&&window.tfOpenIDEStation?.(id))return;';
 if(current.includes(sceneMark)||current.includes(endMark)||current.includes(physicalHook)||current.includes(ideHook)){
   if(current.includes(sceneMark)&&current.includes(endMark)&&current.includes(physicalHook)&&current.includes(ideHook))
     return current; // already installed; fail later if stale route source differs.
   throw Error('Partial projector/IDE integration detected; inspect original scene before modifying.');
 }
 for(const required of ['const tfRoomX = 62','const projector=new THREE.Group()','const cone=new THREE.Mesh',
   'const originalActivate=activateTFStation;','activateTFStation=function frontierStation(id){',
   'scene.add(cone);','function openPanel(']){
   if(!current.includes(required))throw Error('The running scene differs at '+required+'; no physical-room edits made.');
 }
 let s=splice(current,'  scene.add(cone);','\n\n  '+physical+'\n','physical projector position');
 s=splice(s,'  activateTFStation=function frontierStation(id){','\n'+physicalHook+'\n'+ideHook,
   'physical station handler');
 return s;
}
function editServer(current){
 const latest=fs.readFileSync(path.join(bridgeRoot,'server.cjs'),'utf8');
 if(!current.includes('function mount(app,')||!current.includes('mountAppHub(app,')||
    !current.includes("app.get('/room/team02',")||!current.includes("for (const file of ["))
   throw Error('Installed Azure Bridge server is not a recognized release. Changes blocked.');
 let s=current;
 for(const name of ['azure-ai-connect.js','ide-workstations.js']){
   if(!s.includes("'"+name+"'")){
     // Append the missing script to the known static file allowlist.
     const a="for (const file of [";
     s=splice(s,a,"'"+name+"',",name+' route');
   }
   const tag='<script src="/azure-bridge/'+name+'" defer></script>';
   if(!s.includes(tag)){
     // Inject after existing Contribute/App Hub script, not by rewriting the original room HTML.
     const a='<script src="/azure-bridge/app-hub.js" defer></script>';
     s=splice(s,a,tag,name+' HTML');
   }
 }
 if(!s.includes("'/environment-manifest'")){
   const start="    // Read-only, credential-free environment evidence for external AI handoff.";
   const before="    for (const file of [";
   const releaseBlock=latest.slice(latest.indexOf(start),latest.indexOf(before,latest.indexOf(start)));
   if(!releaseBlock.startsWith(start)||releaseBlock.length<500)
     throw Error('Reviewed environment manifest block missing in release.');
   if(!s.includes("const digest = value => crypto.createHash('sha256')")||!s.includes('publicDir'))
     throw Error('Cannot safely add host evidence route to current server.');
   s=splice(s,'    mountAppHub(app,{auth,ensureMember});','\n'+releaseBlock,
     'environment manifest route');
 }
 return s;
}
function editClient(current){
 if(current.includes('window.tfContributorIDEStatus=')&&current.includes('window.tfLaunchContributorIDE='))
   return current;
 const latest=fs.readFileSync(path.join(bridgeRoot,'companion-client.js'),'utf8');
 const start='    window.tfContributorIDEStatus=';
 const end='    open.onclick=()=>perform(\'open\');';
 const from=latest.indexOf(start),to=latest.indexOf(end,from);
 if(from<0||to<0)throw Error('Reviewed companion IDE adapter missing');
 const insertion=latest.slice(from,to);
 if(current.includes('window.tfContributorIDEStatus=')||current.includes('window.tfLaunchContributorIDE='))
   throw Error('Partial contributor-local IDE adapter already installed.');
 return splice(current,end,'', 'existing client anchor') // anchor uniqueness check
    .replace(end,insertion+end);
}
function editCSS(current){
 const latest=fs.readFileSync(path.join(bridgeRoot,'loadout.css'),'utf8');
 let s=current;
 for(const [start,end] of [
   ['/* AZURE AI BRIDGE B:','/* Actionable in-world IDE workstations:'],
   ['/* Actionable in-world IDE workstations:',null]
 ]){
   if(s.includes(start))continue;
   const from=latest.indexOf(start),to=end?latest.indexOf(end,from):latest.length;
   if(from<0||to<0||to<=from)throw Error('Reviewed CSS block missing: '+start);
   s+='\n'+latest.slice(from,to).trimEnd()+'\n';
 }
 return s;
}
function plan(room){
 if(!path.isAbsolute(room))throw Error('An absolute Windows room path is required.');
 const installed=path.join(room,'azure-bridge');
 const hostServer=path.join(room,'server.js'),hostScene=path.join(room,'public','room.js');
 const originalServer=fs.readFileSync(hostServer,'utf8');
 if(!originalServer.includes("require('./azure-bridge/server.cjs').mount(app"))
   throw Error('Existing host server does not mount Azure Bridge. Refuse to alter it.');
 const changes=[];
 function stage(target,transform,allowNew=false){
   const exists=fs.existsSync(target);
   if(!exists&&!allowNew)throw Error('Missing existing file: '+target);
   const before=exists?fs.readFileSync(target):null;
   const next=Buffer.from(transform(before?.toString('utf8')||''),'utf8');
   if(before&&before.equals(next))return;
   changes.push({target,before,next});
 }
 stage(hostScene,createScene);
 stage(path.join(installed,'server.cjs'),editServer);
 stage(path.join(installed,'companion-client.js'),editClient);
 stage(path.join(installed,'loadout.css'),editCSS);
 for(const file of ['ide-workstations.js','azure-ai-connect.js']){
   const source=fs.readFileSync(path.join(bridgeRoot,file));
   stage(path.join(installed,file),()=>source.toString('utf8'),true);
 }
 // Optional known older 2-choice UI version, otherwise leave custom code in place.
 const two=path.join(installed,'two-mode-contribute.js');
 if(fs.existsSync(two)){
   const bytes=fs.readFileSync(two),actual=sha(bytes);
   if(actual.startsWith('a9c650a496c6fa40')){
     stage(two,()=>fs.readFileSync(path.join(bridgeRoot,'two-mode-contribute.js'),'utf8'));
   }else if(actual!==sha(fs.readFileSync(path.join(bridgeRoot,'two-mode-contribute.js')))){
     console.log('[PRESERVED] Two-choice UI differs from the reviewed release and is not overwritten.');
   }
 }
 return changes;
}
function validate(changes){
 // Stage syntax in temp .mjs/.cjs with auto source inference without changing host.
 for(const {target,next} of changes){
  if(!/\.(?:js|cjs|mjs)$/.test(target))continue;
  const ext=path.extname(target);
  const tmp=path.join(require('node:os').tmpdir(),'.tf-verify-'+crypto.randomUUID()+(ext==='.js'?'.mjs':ext));
  try{
   fs.writeFileSync(tmp,next,{flag:'wx'});
   cp.execFileSync(process.execPath,['--check',tmp],{timeout:15000,windowsHide:true,stdio:'pipe'});
  }finally{fs.rmSync(tmp,{force:true});}
 }
 const scene=changes.find(x=>x.target.endsWith(path.join('public','room.js')));
 if(scene){
  const original=scene.before.toString('utf8'),updated=scene.next.toString('utf8');
  // Assert the base room source survives verbatim once new marker blocks are removed.
  let restored=updated;
  const marker='// TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN',end='// TF_DEV_BUSINESS_PROJECTOR_V1_END';
  const start=restored.indexOf(marker),stop=restored.indexOf(end,start);
  if(start<0||stop<0)throw Error('New projector cannot be found by preservation verification.');
  // Reconstruct the precise original anchor by removing only the injected text.
  restored=restored.replace('\n\n  '+restored.slice(start,stop+end.length)+'\n','');
  restored=restored.replace('\n    if(id==="dev-business-projector"){openDevBusinessStudio();return;}\n    if(typeof id==="string"&&id.startsWith("dev-ide-")&&window.tfOpenIDEStation?.(id))return;','');
  if(restored!==original)throw Error('SCENE PRESERVATION FAILURE: scene differs beyond reviewed injections.');
 }
}
function apply(changes){
 const written=[];
 try{
  // Every original must still match immediately before first write.
  for(const c of changes){
   const current=fs.existsSync(c.target)?fs.readFileSync(c.target):null;
   if((current===null)!==(c.before===null)||current&& !current.equals(c.before))
    throw Error('Host file changed during inspection: '+c.target);
  }
  for(const c of changes){
   const tmp=c.target+'.tf-stage-'+crypto.randomUUID();
   try{
     fs.writeFileSync(tmp,c.next,{flag:'wx'});
     fs.renameSync(tmp,c.target);
     written.push(c);
   }finally{fs.rmSync(tmp,{force:true});}
  }
  for(const c of written){
   if(sha(fs.readFileSync(c.target))!==sha(c.next))throw Error('Post-install checksum mismatch: '+c.target);
  }
 }catch(e){
  for(const c of written.reverse()){
   try{if(c.before===null)fs.rmSync(c.target,{force:true});else fs.writeFileSync(c.target,c.before);}
   catch(error){console.error('ROLLBACK FAILED '+c.target+': '+error.message);}
  }
  throw e;
 }
}
function main(args){
 if(args.length!==2||!['--plan','--apply'].includes(args[1]))
   throw Error('Usage: node tools/towerflow-activate-dev-room.cjs <absolute-room> --plan|--apply');
 const steps=plan(args[0]);validate(steps);
 for(const c of steps)console.log('[REVIEWED] '+c.target+
   ' | original '+(c.before?sha(c.before).slice(0,16):'absent')+
   ' | result '+sha(c.next).slice(0,16));
 if(args[1]==='--apply'){
   apply(steps);
   console.log('APPLIED '+steps.length+' targeted changes. Room server is still running old code until manually restarted.');
 }else console.log('PLAN ONLY: '+steps.length+' targeted changes possible. No files or processes changed.');
}
if(require.main===module)try{main(process.argv.slice(2));}catch(e){console.error('BLOCKED (nothing else changed): '+e.message);process.exitCode=2;}
module.exports={one,splice,block,createScene,editServer,editClient,editCSS,plan,validate,apply};
