// Git-first Towerflow AURA visual-action installer. No server restart.
// Usage: node tools/install-aura-lighting.mjs --dry-run | --apply
import {readFile,writeFile,copyFile,rename,rm,mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const paths=[
  join(homedir(),'Desktop','Towerflow_Team02_Private_Invite_Room','Towerflow_Collaboration_Room','public','room.js'),
  join(root,'collaboration-room','live-room','public','room.js')
];
const feature=join(root,'integrations','aura','aura-lighting-actions.js');
const begin='// TF_AURA_LIGHTING_V1_BEGIN';
const end='// TF_AURA_LIGHTING_V1_END';
const oldControls='let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patch(source,featureCode) {
  if(!source.includes('// TF_DEV_ROOM_V1')) throw Error('Development room not installed');
  if(!source.includes('// TF_CONFIG_AGENT_V1_BEGIN')) throw Error('IDE configuration not installed');
  if(!source.includes('// TF_AURA_ROOM_CLIENT_V1_BEGIN')) throw Error('AURA chat interface not installed');
  if(!source.includes(oldControls)) throw Error('Verified camera-relative controls absent');
  if(!source.includes('function helpPanel()')) throw Error('AURA help interaction missing');
  const body=featureCode.trim();
  if(!body.startsWith(begin)||!body.endsWith(end)) throw Error('AURA lighting source markers invalid');
  const start=source.indexOf(begin),stop=source.indexOf(end);
  if((start>=0)!==(stop>=0)) throw Error('Partial lighting patch; refusing modifications');
  if(start>=0) {
    if(stop<start||source.indexOf(begin,start+1)>=0)throw Error('Duplicate lighting patch');
    return source.slice(0,start)+body+source.slice(stop+end.length);
  }
  return source.replace(/\s*$/,'\n\n')+body+'\n';
}
async function check(source) {
  const file=join(tmpdir(),'towerflow-lighting-'+randomUUID()+'.mjs');
  try {
    await writeFile(file,source,'utf8');
    execFileSync(process.execPath,['--check',file],{timeout:10000,stdio:['ignore','pipe','pipe']});
  } finally {await rm(file,{force:true});}
}
async function main() {
  const args=process.argv.slice(2);
  if(args.length!==1||!['--dry-run','--apply'].includes(args[0]))throw Error('Use exactly --dry-run or --apply');
  const apply=args[0]==='--apply';
  const code=await readFile(feature,'utf8');
  const plan=[];
  for(const file of paths) {
    if(!existsSync(file)) throw Error('Missing room copy: '+file);
    const before=await readFile(file,'utf8');
    const after=patch(before,code);
    await check(after);
    plan.push({file,before,after});
  }
  if(plan[0].after!==plan[1].after) throw Error('Live and workspace copies differ; refusing update');
  console.log('=== AURA ROOM DESIGN: '+(apply?'APPLY':'DRY RUN')+' ===');
  for(const p of plan) console.log((p.before===p.after?'UNCHANGED ':'CHANGE    ')+p.file+' | SHA256 '+hash(p.after).slice(0,16));
  console.log('PRESERVATION: syntax valid, camera-relative controls intact, no server restart.');
  if(!apply)return;
  const backups=join(homedir(),'Desktop','Towerflow_AURA_Lighting_Backups',new Date().toISOString().replace(/[.:]/g,'-'));
  await mkdir(backups,{recursive:true});
  const written=[],record=[];
  for(let i=0;i<plan.length;i++){
    const p=plan[i];if(p.before===p.after)continue;
    const backup=join(backups,i+'-room.js');
    await copyFile(p.file,backup);
    record.push({file:p.file,backup,oldSha256:hash(p.before),newSha256:hash(p.after)});
  }
  await writeFile(join(backups,'manifest.json'),JSON.stringify(record,null,2));
  try {
    for(const p of plan) {
      if(p.before===p.after)continue;
      const tmp=p.file+'.tf-light-'+randomUUID();
      try{await writeFile(tmp,p.after,'utf8');await rename(tmp,p.file);}
      finally{await rm(tmp,{force:true});}
      written.push(p.file);
    }
  }catch(e){
    for(const r of record.filter(x=>written.includes(x.file)).reverse()) {
      try{await copyFile(r.backup,r.file);}catch(rollbackError){console.error('ROLLBACK FAILURE:',r.file,rollbackError.message);}
    }
    throw Error('Apply failed; attempted rollback: '+e.message);
  }
  console.log('INSTALLED. Backup manifest: '+join(backups,'manifest.json'));
  console.log('Refresh YOUR room browser tab only. AURA design controls can preview/apply/revert lighting.');
  console.log('The chosen preset is browser-local and not synchronized to other teammates.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(e=>{console.error('LIGHTING INSTALL BLOCKED:',e.message);process.exitCode=1;});
}
