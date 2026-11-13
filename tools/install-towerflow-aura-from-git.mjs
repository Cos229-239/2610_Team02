// Safe Git-sourced installer for LIVE Towerflow; no ZIP and no server restart.
// Usage: node tools/install-towerflow-aura-from-git.mjs --dry-run | --apply
import {readFile,writeFile,copyFile,rename,rm,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const liveRoot=join(homedir(),'Desktop','Towerflow_Team02_Private_Invite_Room','Towerflow_Collaboration_Room');
const workspaceRoot=join(repoRoot,'collaboration-room','live-room');
const expectedServer='0e973fd7be3878b5770bc561f9c158821f4e44f400912e3764b6c95adc700743';
const expectedRoom='63a8f1299c23bb0e80adc75d52b9223d89ee0f773aacac7b188d29f0863ba49f';
const serverMarker='// TF_AURA_GIT_SERVER_V1';
const clientStart='// TF_AURA_ROOM_CLIENT_V1_BEGIN';
const clientEnd='// TF_AURA_ROOM_CLIENT_V1_END';
const moveMarker='// TF_DEV_ROOM_MOVE_SYNC_V1';
const sha = s=>createHash('sha256').update(s).digest('hex');
const gitBlob = s=>createHash('sha1').update('blob '+Buffer.byteLength(s,'utf8')+'\\0').update(s,'utf8').digest('hex');
const reviewedPriorAuraBlob='5186450266fc2fb631ebc6e3a291473d3febad38';
function requireUnique(source,anchor) {
  const index=source.indexOf(anchor);
  if(index<0 || source.indexOf(anchor,index+anchor.length)>=0) throw Error('Missing or duplicated patch anchor: '+anchor.slice(0,80));
  return index;
}
export function patchServer(original) {
  if(original.includes('TF_AURA_V2_SERVER_BEGIN')) throw Error('Alternate AURA v2 backend detected; refusing to layer another adapter');
  let output=original;
  if(!output.includes(serverMarker)) {
    const anchor="app.get('/api/health'";
    const pos=requireUnique(output,anchor);
    const injection=String.raw`// TF_AURA_GIT_SERVER_V1: server-side authorization, loopback Ollama, no shell.
const {createAuraHandler}=require('./aura-service.cjs');
const auraHandler=createAuraHandler({
  model:process.env.TOWERFLOW_AURA_MODEL||process.env.TOWERFLOW_AI_MODEL||'dolphin-llama3:8b',
  knowledgeFile:path.join(__dirname,'aura-world.md'),
  publicOrigin,
  authorize:async req=>req.session?.user?.login && req.permission
    ? {userId:'github_'+String(req.session.user.login).toLowerCase()}
    : null
});
app.use('/api/aura',auth,ensureMember,(req,res,next)=>{
  // Express strips the route prefix, while AURA validates complete paths.
  req.url=req.originalUrl;
  Promise.resolve(auraHandler(req,res)).then(handled=>{
    if(!handled && !res.headersSent) next();
  }).catch(next);
});
`;
    output=output.slice(0,pos)+injection+output.slice(pos);
  }
  if(!output.includes(moveMarker)) {
    const old="if(data.type==='move'){self.x=Math.max(-18,Math.min(18,Number(data.x)||0));self.z=Math.max(-13,Math.min(13,Number(data.z)||0));broadcast({type:'move',id,x:self.x,z:self.z},id);}";
    requireUnique(output,old);
    const next=String.raw`if(data.type==='move'){
   // TF_DEV_ROOM_MOVE_SYNC_V1: allow teammates' avatars in development chamber X=42.5..81.5.
   const x=Number(data.x),z=Number(data.z);
   if(!Number.isFinite(x)||!Number.isFinite(z))return;
   self.x=x>=41&&x<=83?Math.max(42.5,Math.min(81.5,x)):Math.max(-19.5,Math.min(19.5,x));
   self.z=Math.max(-14.5,Math.min(14.5,z));
   broadcast({type:'move',id,x:self.x,z:self.z},id);
  }`;
    output=output.replace(old,next);
  }
  return output;
}
export function patchRoom(original,client) {
  if(!original.includes('// TF_DEV_ROOM_V1') || !original.includes('// TF_CONFIG_AGENT_V1_BEGIN'))
    throw Error('Development room/configuration not found');
  if(!original.includes('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side'))
    throw Error('Verified camera-relative movement formula missing');
  if(!original.includes('function helpPanel()')) throw Error('AURA chaperone interaction not found');
  if(!client.includes(clientStart)||!client.includes(clientEnd)) throw Error('Incomplete checked-in AURA client');
  const start=original.indexOf(clientStart),end=original.indexOf(clientEnd);
  if((start>=0)!==(end>=0)) throw Error('Partial in-room AURA client detected');
  if(start>=0) {
    if(start>end || original.indexOf(clientStart,start+1)>=0) throw Error('Duplicated AURA client');
    return original.slice(0,start)+client.trim()+original.slice(end+clientEnd.length);
  }
  if(original.includes('TF_AURA_V2_CLIENT_BEGIN')) throw Error('Alternate AURA v2 browser client detected');
  return original.replace(/\s*$/,'\n\n')+client.trim()+'\n';
}
async function checkSyntax(source,kind) {
  const tmp=join(tmpdir(),'towerflow-git-stage-'+randomUUID()+(kind==='module'?'.mjs':'.cjs'));
  try {
    await writeFile(tmp,source,'utf8');
    execFileSync(process.execPath,['--check',tmp],{timeout:10000,stdio:['ignore','pipe','pipe']});
  }finally{await rm(tmp,{force:true});}
}
function ensureExpected(existing,proposed,expected,file) {
  const digest=sha(existing);
  // Known original reviewed source OR exact already-patched source is allowed.
  // Never overwrite unrelated edits to the live server/room.
  if(digest!==expected && existing!==proposed)
    throw Error('STOP: '+file+' differs from reviewed baseline (SHA256 '+digest.slice(0,16)+'); no live files modified');
}
async function main() {
  const args=process.argv.slice(2);
  if(args.length!==1||!['--dry-run','--apply'].includes(args[0])) throw Error('Use --dry-run or --apply');
  const apply=args[0]==='--apply';
  const client=await readFile(join(repoRoot,'integrations','aura','aura-room-client.js'),'utf8');
  const adapter=(await readFile(join(repoRoot,'integrations','aura','aura-service.cjs'),'utf8'))
    .replaceAll('require("../agents/dual-agent-harness.cjs")','require("./dual-agent-harness.cjs")');
  const harness=await readFile(join(repoRoot,'integrations','agents','dual-agent-harness.cjs'),'utf8');
  const evaluator=await readFile(join(repoRoot,'integrations','agents','frontier-execution-evidence.cjs'),'utf8');
  const kb=await readFile(join(repoRoot,'towerflow-knowledge','WORLD.md'),'utf8');
  const serverFile=join(liveRoot,'server.js'),roomFile=join(liveRoot,'public','room.js');
  const syncFile=join(workspaceRoot,'public','room.js');
  for(const file of [serverFile,roomFile,syncFile]) if(!existsSync(file)) throw Error('Missing expected local file: '+file);
  const originals=await Promise.all([serverFile,roomFile,syncFile].map(f=>readFile(f,'utf8')));
  const newServer=patchServer(originals[0]);
  const newRoom=patchRoom(originals[1],client);
  const syncRoom=patchRoom(originals[2],client);
  ensureExpected(originals[0],newServer,expectedServer,'live server.js');
  ensureExpected(originals[1],newRoom,expectedRoom,'live public/room.js');
  ensureExpected(originals[2],syncRoom,expectedRoom,'workspace public/room.js');
  if(newRoom!==syncRoom) throw Error('Live and workspace room would diverge; refusing update');
  await Promise.all([
    checkSyntax(newServer,'commonjs'),
    checkSyntax(newRoom,'module'),
    checkSyntax(adapter,'commonjs'),
    checkSyntax(harness,'commonjs'),
    checkSyntax(evaluator,'commonjs')
  ]);
  const kbFile=join(liveRoot,'aura-world.md'),adapterFile=join(liveRoot,'aura-service.cjs');
  const harnessFile=join(liveRoot,'dual-agent-harness.cjs'),evidenceFile=join(liveRoot,'frontier-execution-evidence.cjs');
  const plan=[
    {file:serverFile,after:newServer},
    {file:roomFile,after:newRoom},
    {file:syncFile,after:syncRoom},
    {file:kbFile,after:kb},
    {file:adapterFile,after:adapter},
    {file:harnessFile,after:harness},
    {file:evidenceFile,after:evaluator}
  ];
  for(const entry of plan) entry.before=existsSync(entry.file)?await readFile(entry.file,'utf8'):null;
  for(const entry of plan) {
    if(entry.before!==null && entry.before!==entry.after){
      if(entry.file===adapterFile && gitBlob(entry.before)===reviewedPriorAuraBlob)continue;
      if([kbFile,adapterFile,harnessFile,evidenceFile].includes(entry.file))
        throw Error('Existing AURA dependency is not the reviewed baseline; preserved: '+entry.file);
    }
  }
  console.log('=== TOWERFLOW AURA FROM GIT: '+(apply?'APPLY':'DRY RUN')+' ===');
  for(const e of plan)console.log((e.before===e.after?'UNCHANGED':'CHANGE   ')+e.file);
  console.log('Syntax: PASS | Original movement: PRESERVED | Node restart: NONE | IDE launches: NONE');
  if(!apply) return;
  const backups=join(homedir(),'Desktop','Towerflow_AURA_Git_Backups',new Date().toISOString().replace(/[:.]/g,'-'));
  await mkdir(backups,{recursive:true});
  const records=[];
  for(let i=0;i<plan.length;i++){
    const e=plan[i];
    const b=e.before===null?null:join(backups,i+'-'+(e.file.endsWith('.js')?'room-or-server.js':'source.bak'));
    if(b && e.before!==e.after) await copyFile(e.file,b);
    records.push({file:e.file,backup:e.before!==e.after?b:null,originallyExisted:e.before!==null,changed:e.before!==e.after});
  }
  await writeFile(join(backups,'manifest.json'),JSON.stringify(records,null,2),'utf8');
  const written=[];
  try {
    for(const entry of plan){
      if(entry.before===entry.after)continue;
      const tmp=entry.file+'.aura-stage-'+randomUUID();
      try{
        await writeFile(tmp,entry.after,'utf8');
        await rename(tmp,entry.file);
      }finally{await rm(tmp,{force:true});}
      written.push(entry.file);
    }
  }catch(e) {
    for(const r of records.filter(x=>written.includes(x.file)).reverse()){
      try {if(r.backup) await copyFile(r.backup,r.file);else await rm(r.file,{force:true});}
      catch (rollbackError){console.error('ROLLBACK FAILED:',r.file,rollbackError.message);}
    }
    throw Error('Install failed; rollback attempted: '+e.message);
  }
  console.log('APPLIED. Backup manifest: '+join(backups,'manifest.json'));
  console.log('Static browser changes can be loaded by refreshing a tab.');
  console.log('Node server code is STAGED ONLY; backend remains inactive until a planned Node restart.');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main().catch(e=>{console.error('INSTALL BLOCKED:',e.message);process.exitCode=1;});
