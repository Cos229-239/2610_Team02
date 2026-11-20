'use strict';
// Surgical, replay-safe deployment for a customized live room.
// Preserves *all* existing room geometry, UI, audio, and code outside three
// audited insertions. Does not touch older locally customized UI modules.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),
 crypto=require('node:crypto'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const SRC_SCENE=path.join(ROOT,'collaboration-room','live-room','public','room.js');
const SRC_BRIDGE=path.join(ROOT,'collaboration-room','azure-bridge');
const EXTRA=['business-signals.cjs','team-stations.cjs','team-stations.js','azure-workspace-harness.cjs','azure-workspace-harness.js','azure-local-reasoner.cjs'];
const SHA=x=>crypto.createHash('sha256').update(x).digest('hex');
const ONE=(source,needle,what)=>{
 const n=source.split(needle).length-1;
 if(n!==1)throw Error('Host compatibility BLOCK: '+what+' anchor count='+n+' (expected one)');
};
function between(s,start,end){
 ONE(s,start,start);ONE(s,end,end);
 const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
 if(b<0)throw Error('Reviewed marker ordering invalid: '+start);
 return s.slice(a,b+end.length);
}
function integrateScene(current,reviewed){
 const addons=[
  {name:'wall projector',start:'// TF_DEV_BUSINESS_WALL_ROUTING_V1_BEGIN',
   end:'// TF_DEV_BUSINESS_WALL_ROUTING_V1_END',
   anchor:'  // TF_DEV_BUSINESS_PROJECTOR_V1_END',insert:'before'},
  {name:'live business app',start:'// TF_DEV_BUSINESS_APP_ENTRY_V1_BEGIN',
   end:'// TF_DEV_BUSINESS_APP_ENTRY_V1_END',
   anchor:'    makeButton("CONTRIBUTE  →"',insert:'before'},
  {name:'member stations + globe',start:'// TF_BUSINESS_TEAM_STATIONS_AND_WORLD_V1_BEGIN',
   end:'// TF_BUSINESS_TEAM_STATIONS_AND_WORLD_V1_END',insert:'append'},
  {name:'Azure authenticated iframe bridge',start:'// TF_AZURE_BUSINESS_BRIDGE_V1_BEGIN',
   end:'// TF_AZURE_BUSINESS_BRIDGE_V1_END',insert:'append'}
 ];
 const installed=addons.filter(a=>current.includes(a.start)||current.includes(a.end));
 if(installed.length===addons.length){
   for(const a of addons){
     const checked=between(reviewed,a.start,a.end);
     if(!current.includes(a.start)||!current.includes(a.end)||!current.includes(checked))
       throw Error('Customized or incomplete '+a.name+' must be reconciled manually.');
   }
   return current;
 }
 if(installed.length)throw Error('Partially installed Business Studio enhancements; preserve existing source and inspect.');

 for(const text of [
  'TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN',
  'devBusinessProjector=projector.clone(true)',
  'function openDevBusinessStudio()',
  'const earthStatus=sign(',
  'const core=new THREE.Group()',
  'function tfRegister(',
  'const originalActivate=activateTFStation;',
  'const tfRoomX = 62;'
 ])if(!current.includes(text))throw Error('Missing required host scene reference: '+text);
 let result=current;
 const inserted=[];
 for(const a of addons){
   let chunk=between(reviewed,a.start,a.end);
   // Newline indentation is preserved; only the unique anchor is inserted before.
   if(a.insert==='append'){
     chunk='\n'+chunk+'\n';
     result+=chunk;inserted.push(chunk);
   }else{
     ONE(result,a.anchor,a.name);
     chunk=(a.name==='wall projector'?'  ':'    ')+chunk+'\n';
     if(a.name==='live business app')chunk=chunk.replace(/^ {4}\/\//,'    //');
     result=result.replace(a.anchor,chunk+a.anchor);
     inserted.push(chunk);
   }
 }
 let reconstructed=result;
 for(const chunk of inserted)reconstructed=reconstructed.replace(chunk,'');
 if(reconstructed!==current)throw Error('PRESERVATION BLOCK: original room bytes would change');
 return result;
}
function integrateServer(current){
 const newline=current.includes('\r\n')?'\r\n':'\n';
 current=current.replace(/\r\n/g,'\n');
 const steps=[];
 const include=(anchor,insert,label)=>{
  if(current.includes(insert))return;
  ONE(current,anchor,label);
  current=current.replace(anchor,anchor+insert);
  steps.push(label);
 };
 include("const {mount:mountAIProof} = require('./ai-contribution-proof.cjs');",
   "\nconst {mount:mountTeamStations} = require('./team-stations.cjs');\nconst {mount:mountBusinessSignals} = require('./business-signals.cjs');",
   'team/business imports');
 include('    mountAIProof(app,{auth,ensureMember});',
   '\n    mountTeamStations(app,{auth,ensureMember});\n    mountBusinessSignals(app,{auth,ensureMember});',
   'team/business authorization mounts');
 include("'ide-workstations.js',"," 'team-stations.js',",
   'new station public script');
 include("const {mount:mountAIProof} = require('./ai-contribution-proof.cjs');",
   "\nconst {mount:mountAzureHarness} = require('./azure-workspace-harness.cjs');",
   'Azure workspace harness import');
 include('    mountAIProof(app,{auth,ensureMember});',
   '\n    mountAzureHarness(app,{auth,ensureMember,sameOrigin});',
   'Azure workspace verified task route');
 include("'ide-workstations.js',",
   " 'azure-workspace-harness.js',",
   'Azure workspace browser script');
 include('<script src="/azure-bridge/ide-workstations.js" defer></script>',
   '<script src="/azure-bridge/azure-workspace-harness.js" defer></script>',
   'Azure workspace html script');
 include('<script src="/azure-bridge/ide-workstations.js" defer></script>',
   '<script src="/azure-bridge/team-stations.js" defer></script>',
   'team public page script');
 return newline==='\r\n'?current.replace(/\n/g,'\r\n'):current;
}
function makePlan(host){
 if(!path.isAbsolute(host)||!fs.existsSync(path.join(host,'server.js'))||
   !fs.existsSync(path.join(host,'public','room.js')))
   throw Error('Expected absolute TowerFlow collaboration room path.');
 const read=p=>fs.readFileSync(p);
 const scenePath=path.join(host,'public','room.js'),bridgePath=path.join(host,'azure-bridge','server.cjs');
 const beforeScene=read(scenePath),beforeBridge=read(bridgePath);
 if(!read(path.join(host,'server.js')).toString('utf8').includes("require('./azure-bridge/server.cjs').mount(app"))
   throw Error('Host Azure Bridge mount missing, no changes attempted.');
 const sceneText=beforeScene.toString('utf8');
 const eol=sceneText.includes('\r\n')?'\r\n':'\n';
 const review=read(SRC_SCENE).toString('utf8').replace(/\r\n/g,'\n').replace(/\n/g,eol);
 const scene=Buffer.from(integrateScene(sceneText,review));
 const bridge=Buffer.from(integrateServer(beforeBridge.toString('utf8')));
 const plans=[{file:scenePath,old:beforeScene,new:scene},{file:bridgePath,old:beforeBridge,new:bridge}];
 for(const name of EXTRA){
   const src=read(path.join(SRC_BRIDGE,name)),file=path.join(host,'azure-bridge',name);
   const old=fs.existsSync(file)?read(file):null;
   if(old&&!old.equals(src))throw Error('Customized existing '+name+' must be reconciled manually.');
   plans.push({file,old,new:src});
 }
 return plans.filter(p=>!p.old||!p.old.equals(p.new));
}
function validate(changes){
 for(const c of changes){
   if(!/\.(?:js|cjs)$/.test(c.file))continue;
   const isModule=c.file.endsWith(path.join('public','room.js'));
   const args=isModule?['--check','--input-type=module']:['--check'];
   const suffix=isModule?'.mjs':'.cjs';
   const check=cp.spawnSync(process.execPath,args,
    {input:c.new.toString('utf8'),encoding:'utf8',timeout:25000,maxBuffer:1024*1024});
   if(check.status!==0)throw Error('Syntax blocked '+c.file+': '+check.stderr.slice(0,1000));
 }
}
function apply(changes){
 // Verify all originals still match immediately before the first write.
 for(const c of changes){
   const current=fs.existsSync(c.file)?fs.readFileSync(c.file):null;
   if((current===null)!==(c.old===null)||current&&!current.equals(c.old))
     throw Error('Host changed during validation: '+c.file);
 }
 const done=[];
 try{
   for(const c of changes){
     const tmp=c.file+'.tf-staged-'+crypto.randomUUID();
     try{fs.writeFileSync(tmp,c.new,{flag:'wx'});fs.renameSync(tmp,c.file);}
     finally{fs.rmSync(tmp,{force:true});}
     done.push(c);
   }
   for(const c of done)if(!fs.readFileSync(c.file).equals(c.new))
     throw Error('Checksum mismatch: '+c.file);
 }catch(e){
   const failures=[];
   for(const c of done.reverse())try{
     if(c.old===null)fs.rmSync(c.file,{force:true});
     else fs.writeFileSync(c.file,c.old);
   }catch(error){failures.push(c.file+': '+error.message);}
   throw Error('Activation failed: '+e.message+(failures.length?'; ROLLBACK INCOMPLETE: '+failures.join(', '):'; targeted changes restored'));
 }
}
function main(args){
 if(args.length!==2||!['--plan','--apply'].includes(args[1]))
   throw Error('Usage: node tools/towerflow-reconcile-business-v1.cjs <absolute room> --plan|--apply');
 const changes=makePlan(args[0]);validate(changes);
 for(const c of changes)console.log('[REVIEWED] '+path.relative(args[0],c.file)+' · before: '+
   (c.old?SHA(c.old):'absent')+' · after: '+SHA(c.new));
 if(args[1]==='--apply'){apply(changes);console.log('STAGED: '+changes.length+' targeted changes. Restart original TowerFlow only after review.');}
 else console.log('PLAN PASS: '+changes.length+' narrow changes; no host files or processes touched.');
}
if(require.main===module)try{main(process.argv.slice(2));}
catch(e){console.error('PRESERVATION BLOCK: '+e.message);process.exitCode=2;}
module.exports={integrateScene,integrateServer,makePlan,validate,apply};
