// Non-destructive AURA in-world UI installer.
// Not a server patch; cannot expose the model until authenticated backend is wired.
// node tools/install-aura-room-ui.mjs --dry-run OR --apply
import {readFile,writeFile,copyFile,mkdir,rename,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=[
 join(homedir(),'Desktop','Towerflow_Team02_Private_Invite_Room','Towerflow_Collaboration_Room','public','room.js'),
 join(root,'collaboration-room','live-room','public','room.js')
];
const sourcePath=join(root,'integrations','aura','aura-room-client.js');
const begin='// TF_AURA_ROOM_CLIENT_V1_BEGIN';
const end='// TF_AURA_ROOM_CLIENT_V1_END';
export function install(source,client) {
 if(!source.includes('TF_DEV_ROOM_V1')) throw Error('Existing development room missing; refusing to change file');
 if(!source.includes('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side')) throw Error('Confirmed Option A controller missing');
 if(!source.includes('function helpPanel()')) throw Error('AURA help panel not recognized');
 if(!client.includes(begin)||!client.includes(end)) throw Error('Client markers missing');
 const start=source.indexOf(begin),stop=source.indexOf(end);
 if((start<0)!=(stop<0)) throw Error('Partial previous client patch');
 if(start>=0) {
   if(stop<=start || source.indexOf(begin,start+1)>=0) throw Error('Duplicate/broken client patch');
   return source.slice(0,start)+client+source.slice(stop+end.length);
 }
 return source.replace(/\s*$/,'\n\n')+client+'\n';
}
async function check(content) {
 const temp=join(tmpdir(),'towerflow-aura-'+randomUUID()+'.mjs');
 try {
   await writeFile(temp,content,'utf8');
   execFileSync(process.execPath,['--check',temp],{timeout:10000,stdio:['ignore','pipe','pipe']});
 } finally {await rm(temp,{force:true});}
}
async function main() {
 const cmd=process.argv.slice(2);
 if(cmd.length!==1||!['--apply','--dry-run'].includes(cmd[0])) throw Error('Choose exactly --apply or --dry-run');
 const apply=cmd[0]==='--apply';
 const client=await readFile(sourcePath,'utf8');
 const prepared=[];
 for (const file of files) {
   if(!existsSync(file)) throw Error('Missing room copy: '+file);
   const before=await readFile(file,'utf8');
   const after=install(before,client);
   await check(after);
   prepared.push({file,before,after,changed:before!==after});
 }
 console.log('AURA IN-WORLD UI '+(apply?'APPLY':'DRY RUN'));
 for(const p of prepared) console.log((p.changed?'CHANGE ':'SAME   ')+p.file);
 console.log('Node restart: none | Git push: none | AURA backend: NOT INSTALLED');
 if(!apply) return;
 const dir=join(homedir(),'Desktop','Towerflow_AURA_UI_Backups',new Date().toISOString().replace(/[.:]/g,'-'));
 await mkdir(dir,{recursive:true});
 const changed=prepared.filter(p=>p.changed),backups=[];
 for(let i=0;i<changed.length;i++) {
   const backup=join(dir,i+'-room.js');
   await copyFile(changed[i].file,backup);
   backups.push({...changed[i],backup});
 }
 const written=[];
 try{
   for(const item of backups) {
     const tmp=item.file+'.new-'+randomUUID();
     try {
       await writeFile(tmp,item.after,'utf8');
       await rename(tmp,item.file);
       written.push(item);
     } finally {await rm(tmp,{force:true});}
   }
 }catch(e){
   for(const item of written) await copyFile(item.backup,item.file);
   throw Error('Failed; original files restored where possible: '+e.message);
 }
 console.log('INSTALL COMPLETE; backups at '+dir);
 console.log('AURA panel appears when opening AURA station after browser refresh.');
 console.log('Backend status will remain unavailable until the host server is securely integrated.');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 main().catch(e=>{console.error('AURA UI ERROR:',e.message);process.exitCode=1;});
}
