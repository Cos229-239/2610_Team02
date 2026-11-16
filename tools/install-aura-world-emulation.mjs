// Preserve Towerflow; install reviewed ceiling-world renderer from Git without restarting Node.
// node tools/install-aura-world-emulation.mjs --dry-run OR --apply
import {readFile,writeFile,copyFile,mkdir,rm,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=join(repoRoot,'integrations','aura','aura-world-emulator.js');
const vault=join(repoRoot,'towerflow-knowledge','object-reference-vault.json');
const rooms=[
  join(homedir(),'Desktop','Towerflow_Team02_Private_Invite_Room','Towerflow_Collaboration_Room','public','room.js'),
  join(repoRoot,'collaboration-room','live-room','public','room.js')
];
const markerStart='// TF_WORLD_EMULATION_V1_BEGIN';
const markerEnd='// TF_WORLD_EMULATION_V1_END';
const hash=x=>createHash('sha256').update(x).digest('hex');
export function patchRoom(old,addition){
  for(const marker of [
    '// TF_DEV_ROOM_V1',
    '// TF_CONFIG_AGENT_V1_BEGIN',
    '// TF_AURA_ROOM_CLIENT_V1_BEGIN',
    'let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side'
  ]) if(!old.includes(marker)) throw Error('Preservation check failed: missing '+marker);
  const addon=addition.trim();
  if(!addon.startsWith(markerStart)||!addon.endsWith(markerEnd))throw Error('World emulator code has invalid markers');
  const start=old.indexOf(markerStart),end=old.indexOf(markerEnd);
  if((start<0)!==(end<0))throw Error('Partial previous world-emulator installation');
  if(start>=0){
    if(start>end||old.indexOf(markerStart,start+1)>=0)throw Error('Duplicate or damaged world emulator');
    return old.slice(0,start)+addon+old.slice(end+markerEnd.length);
  }
  return old.replace(/\s*$/,'\n\n')+addon+'\n';
}
async function checkESM(text){
  const tmp=join(tmpdir(),'towerflow-world-'+randomUUID()+'.mjs');
  try{
    await writeFile(tmp,text,'utf8');
    execFileSync(process.execPath,['--check',tmp],{stdio:['ignore','pipe','pipe'],timeout:15000});
  }finally{await rm(tmp,{force:true});}
}
export function validateVault(v) {
  if(v.schemaVersion!==1||!Array.isArray(v.objects)||v.objects.length!==4)throw Error('Invalid world-object manifest');
  for(const id of ['sunset','solar-system','aurora','ceiling-text'])
    if(!v.objects.some(x=>x.id===id&&typeof x.renderModel==='string'&&Array.isArray(x.sources)))throw Error('Missing world object '+id);
  return true;
}
async function main(){
  const args=process.argv.slice(2);
  if(args.length!==1||!['--dry-run','--apply'].includes(args[0]))throw Error('Use exactly --dry-run or --apply');
  const apply=args[0]==='--apply';
  const [addition,manifest]=await Promise.all([readFile(source,'utf8'),readFile(vault,'utf8')]);
  validateVault(JSON.parse(manifest.replace(/^\uFEFF/,'')));
  if(!existsSync(rooms[0]))throw Error('Missing authoritative live room: '+rooms[0]);
  const old=await readFile(rooms[0],'utf8');
  const next=patchRoom(old,addition);
  await checkESM(next);
  const plan=[{file:rooms[0],old,next}];
  if(existsSync(rooms[1])){
    const workingCopy=await readFile(rooms[1],'utf8');
    if(workingCopy===old){
      plan.push({file:rooms[1],old:workingCopy,next});
      console.log('WORKSPACE ROOM: matched authoritative live room; safely staged.');
    }else{
      console.log('WORKSPACE ROOM: divergent; preserved unchanged.');
    }
  }else console.log('WORKSPACE ROOM: deleted/missing; safely skipped.');
  console.log('=== AURA HIDDEN WORLD / SKY EMULATOR '+(apply?'APPLY':'DRY RUN')+' ===');
  for(const row of plan)console.log((row.old===row.next?'UNCHANGED ':'CHANGE    ')+row.file+' | SHA256 '+hash(row.next).slice(0,16));
  console.log('FOUR OBJECT FAMILIES: sunset, 8-planet solar system, aurora, colored ceiling text');
  console.log('REFERENCE VAULT: validated | SYNTAX: passed | FIRST PERSON CONTROLS: preserved');
  console.log('SERVER RESTART: none | GITHUB PUSH: none | DESKTOP IDE LAUNCH: none');
  if(!apply)return;
  const root=join(homedir(),'Desktop','Towerflow_AURA_World_Backups',new Date().toISOString().replace(/[.:]/g,'-'));
  await mkdir(root,{recursive:true});
  const records=[];
  for(let i=0;i<plan.length;i++){
    const row=plan[i];if(row.old===row.next)continue;
    const backup=join(root,'room-'+i+'.js');
    await copyFile(row.file,backup);
    records.push({path:row.file,backup,previousSha256:hash(row.old),nextSha256:hash(row.next)});
  }
  await writeFile(join(root,'manifest.json'),JSON.stringify(records,null,2)+'\n','utf8');
  const applied=[];
  try{
    for(const row of plan){
      if(row.old===row.next)continue;
      const staged=row.file+'.world-stage-'+randomUUID();
      try{
        await writeFile(staged,row.next,'utf8');
        await rename(staged,row.file);
        applied.push(row.file);
      }finally{await rm(staged,{force:true});}
    }
  }catch(e){
    for(const record of records.filter(r=>applied.includes(r.path)).reverse()){
      try{await copyFile(record.backup,record.path);}
      catch(recoveryError){console.error('ROLLBACK FAILED:',record.path,recoveryError.message);}
    }
    throw Error('Apply failed; rollback attempted: '+e.message);
  }
  console.log('INSTALLED. Backups and manifest: '+root);
  console.log('Refresh only your own Towerflow browser tab. Go to AURA > WORLD EMULATION VAULT.');
  console.log('No default visual changes. Preview explicit sky scenes and approve to persist for this browser.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(err=>{console.error('WORLD INSTALL BLOCKED:',err.message);process.exitCode=1;});
