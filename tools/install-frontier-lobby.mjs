// Versioned GitHub-first Frontier lobby installer. No server restart, no shell API.
// Usage: node tools/install-frontier-lobby.mjs --dry-run | --apply
import {readFile,writeFile,copyFile,mkdir,rm,rename} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const additionFile=join(root,'integrations','frontier','frontier-lobby.js');
const paths=[
  join(homedir(),'Desktop','Towerflow_Team02_Private_Invite_Room','Towerflow_Collaboration_Room','public','room.js'),
  join(root,'collaboration-room','live-room','public','room.js')
];
const start='// TF_FRONTIER_LOBBY_V1_BEGIN';
const end='// TF_FRONTIER_LOBBY_V1_END';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchRoom(original,addition) {
  for(const required of [
    '// TF_DEV_ROOM_V1',
    '// TF_CONFIG_AGENT_V1_BEGIN',
    '// TF_AURA_ROOM_CLIENT_V1_BEGIN',
    'let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side',
    'function activateTFStation(id)'
  ])if(!original.includes(required))throw Error('Towerflow preservation anchor missing: '+required);
  const addon=addition.trim();
  if(!addon.startsWith(start)||!addon.endsWith(end))throw Error('Frontier module markers invalid');
  const i=original.indexOf(start),j=original.indexOf(end);
  if((i<0)!==(j<0))throw Error('Partial Frontier install detected');
  if(i>=0){
    if(i>j||original.indexOf(start,i+1)>=0)throw Error('Duplicate/damaged Frontier install');
    return original.slice(0,i)+addon+original.slice(j+end.length);
  }
  return original.replace(/\s*$/,'\n\n')+addon+'\n';
}
async function checkSyntax(text) {
  const file=join(tmpdir(),'towerflow-frontier-'+randomUUID()+'.mjs');
  try {
    await writeFile(file,text,'utf8');
    execFileSync(process.execPath,['--check',file],{timeout:15000,stdio:['ignore','pipe','pipe']});
  }finally{await rm(file,{force:true});}
}
async function main() {
  const args=process.argv.slice(2);
  if(args.length!==1||!['--dry-run','--apply'].includes(args[0]))throw Error('Use one --dry-run or --apply');
  const apply=args[0]==='--apply';
  const addition=await readFile(additionFile,'utf8');
  const liveFile=paths[0],workspaceFile=paths[1];
  if(!existsSync(liveFile))throw Error('Authoritative live Towerflow room missing: '+liveFile);
  const before=await readFile(liveFile,'utf8');
  const after=patchRoom(before,addition);
  await checkSyntax(after);
  const plan=[{file:liveFile,before,after}];
  if(existsSync(workspaceFile)){
    const workingCopy=await readFile(workspaceFile,'utf8');
    if(workingCopy===before){
      plan.push({file:workspaceFile,before:workingCopy,after});
      console.log('WORKSPACE ROOM: exact match to live room; staged safely.');
    }else{
      console.log('WORKSPACE ROOM: diverged from authoritative live room; preserved unchanged.');
    }
  }else{
    console.log('WORKSPACE ROOM: missing; skipped without creating or replacing it.');
  }
  console.log('=== FRONTIER PROJECTOR / IN-ROOM IDE: '+(apply?'APPLY':'DRY RUN')+' ===');
  for(const row of plan)console.log((row.before===row.after?'UNCHANGED':'CHANGE')+' '+row.file+' SHA256 '+hash(row.after).slice(0,16));
  console.log('3 SECTIONS: Dashboard / Development / World Studio');
  console.log('SAFETY: Original camera controls preserved, no Node restart, no Git push');
  if(!apply)return;
  const backupRoot=join(homedir(),'Desktop','Towerflow_Frontier_Backups',new Date().toISOString().replace(/[.:]/g,'-'));
  await mkdir(backupRoot,{recursive:true});
  const records=[];
  for(let n=0;n<plan.length;n++){
    const row=plan[n];if(row.before===row.after)continue;
    const backup=join(backupRoot,n+'-room.js');
    await copyFile(row.file,backup);
    records.push({path:row.file,backup,beforeSha:hash(row.before),afterSha:hash(row.after)});
  }
  await writeFile(join(backupRoot,'manifest.json'),JSON.stringify(records,null,2)+'\n');
  const completed=[];
  try {
    for(const row of plan) {
      if(row.before===row.after)continue;
      const staged=row.file+'.frontier-'+randomUUID();
      try{
        await writeFile(staged,row.after,'utf8');
        await rename(staged,row.file);
        completed.push(row.file);
      }finally{await rm(staged,{force:true});}
    }
  }catch(error) {
    for(const item of records.filter(r=>completed.includes(r.path)).reverse()){
      try{await copyFile(item.backup,item.path);}
      catch(e){console.error('ROLLBACK FAILED:',item.path,e.message);}
    }
    throw Error('Frontier install failed; rollback attempted: '+error.message);
  }
  console.log('INSTALLED. Backups: '+backupRoot);
  console.log('Refresh your browser tab to spawn in Frontier. Other connected clients need not reload.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main().catch(e=>{console.error('FRONTIER INSTALL BLOCKED:',e.message);process.exitCode=1;});
