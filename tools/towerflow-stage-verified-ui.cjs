'use strict';
// Controlled UI/AI/IDE module updater: ONLY reviewed hashes, NEVER room.js.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),os=require('node:os');
const SOURCE=path.resolve(__dirname,'..','collaboration-room','azure-bridge');
const MODULES=Object.freeze([
  'two-mode-contribute.js','app-hub.js','azure-ai-connect.js',
  'ide-workstations.js','direct-integration.cjs','source-navigation.cjs',
  'loadout.css','server.cjs','ai-contribution-proof.cjs'
]);
const KNOWN=Object.freeze({
  'two-mode-contribute.js':['24763e8c94e2735e41b20de2fcb613f9b0fb02a1','83e588d59f0bae9e9ded519830667dcee29817b0'],
  'app-hub.js':['5f5cb046df9e5fb75248b4dc9e4987074a1867db','2b6dbde623d43c6e9f0cb342721eb03b4358679b'],
  'azure-ai-connect.js':['678066974e4cececb039771e826a2e0473b547e3','646e2a88457f85ef447a50996b012479e1f4eff1','1dc2b7334d46f2fa80a282120870b8cf78675230'],
  'ide-workstations.js':['fd4bcef91774a5b517aacfbc0ea83cc93c1cc355'],
  'direct-integration.cjs':['b7277d93da2a6e385fb25497b23abff08c60a65d','f86d73f12751c67edfb19b376e75b124f4427ee7'],
  'source-navigation.cjs':['c5ad3d898b4f2bc1fa496e11fde772a10a1ff052'],
  'loadout.css':['470687412f83fef5bb9d6ad36215bfa65cd0077a','548c3e4db58cd86c388fcb982aa8ed25cadff6e6','87c6d461c85dfee70e90d0ea9f4c54ed2ad2d331'],
  'server.cjs':['88d1444a65785d4a5fa3cc7b297a8879af231e88','3595037c88935cb727f2448dd3c0e9e9623a03d8','d6c685c4eba47229ba63cd90080b623b9efe33de'],
  'ai-contribution-proof.cjs':['3dc96839fd6cf6cb03670c6aa16751e3f404a635']
});
const mayCreate=new Set(['ide-workstations.js','azure-ai-connect.js','ai-contribution-proof.cjs']);
function blobHash(bytes){return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
function sha(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function plan(root,{known=KNOWN,source=SOURCE}={}){
 if(!path.isAbsolute(root)||!fs.existsSync(path.join(root,'server.js'))||
    !fs.existsSync(path.join(root,'public','room.js')))
  throw Error('This is not the expected live room path. No changes made.');
 const targetDir=path.join(root,'azure-bridge');
 if(!fs.existsSync(targetDir))throw Error('Installed Azure Bridge is absent. No changes made.');
 const result=[];
 const blocked=[];
 for(const name of MODULES){
   const release=fs.readFileSync(path.join(source,name));
   const target=path.join(targetDir,name);
   const before=fs.existsSync(target)?fs.readFileSync(target):null;
   if(before&&before.equals(release))continue;
   if(!before&&!mayCreate.has(name)){
     blocked.push(name+': missing required module');continue;
   }
   if(before&&!known[name]?.includes(blobHash(before))){
     blocked.push(name+': customized or unknown version '+blobHash(before)+' (preserved)');continue;
   }
   result.push({name,target,before,after:release});
 }
 const hostScene=fs.readFileSync(path.join(root,'public','room.js'));
 const roomBridge=fs.readFileSync(path.join(root,'server.js')).toString('utf8');
 if(!roomBridge.includes("require('./azure-bridge/server.cjs').mount(app"))
   blocked.push('server.js: no recognized Azure Bridge mount (no server.js change attempted)');
 const sourceCode=fs.readFileSync(path.join(source,'server.cjs'),'utf8');
 if(!sourceCode.includes("mountAIProof(app,{auth,ensureMember});")||
    !sourceCode.includes("'ide-workstations.js'")||
    !sourceCode.includes("'azure-ai-connect.js'"))
   blocked.push('release server.cjs: missing required AI and IDE endpoint registrations');
 return {changes:result,blocked,sceneHash:sha(hostScene),
   sceneHasIDE:hostScene.includes('window.tfOpenIDEStation?.(id)'),
   sceneHasBusinessProjector:hostScene.includes('TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN')};
}
function verify(changes){
 for(const c of changes){
   if(!/\.(?:js|cjs)$/.test(c.name))continue;
   const tmp=path.join(os.tmpdir(),'.towerflow-verify-'+crypto.randomUUID()+
     (c.name.endsWith('.cjs')?'.cjs':'.js'));
   try{
     fs.writeFileSync(tmp,c.after,{flag:'wx'});
     cp.execFileSync(process.execPath,['--check',tmp],{timeout:15000,stdio:'pipe'});
   }finally{fs.rmSync(tmp,{force:true});}
 }
}
function apply(changes){
 for(const c of changes){
   const present=fs.existsSync(c.target)?fs.readFileSync(c.target):null;
   if((present===null)!==(c.before===null)||present&& !present.equals(c.before))
     throw Error('Host changed after plan; refused: '+c.name);
 }
 const done=[];
 try{
   for(const c of changes){
     const temp=c.target+'.tf-write-'+crypto.randomUUID();
     try{
       fs.writeFileSync(temp,c.after,{flag:'wx'});
       fs.renameSync(temp,c.target);
     }finally{fs.rmSync(temp,{force:true});}
     done.push(c);
   }
   for(const c of done)if(!fs.readFileSync(c.target).equals(c.after))
     throw Error('Post-write bytes mismatch: '+c.name);
 }catch(e){
   const failures=[];
   for(const c of done.reverse())try{
     if(c.before===null)fs.rmSync(c.target,{force:true});
     else fs.writeFileSync(c.target,c.before);
   }catch(error){failures.push(c.name+': '+error.message);}
   throw Error(e.message+(failures.length?'; rollback incomplete: '+failures.join('; '):'; applied paths rolled back'));
 }
}
function main(args){
 if(args.length!==2||!['--plan','--apply'].includes(args[1]))
   throw Error('Usage: node tools/towerflow-stage-verified-ui.cjs <absolute host room> --plan|--apply');
 const result=plan(args[0]);
 console.log('SCENE (untouched) SHA256: '+result.sceneHash);
 console.log('3D IDE dispatch: '+(result.sceneHasIDE?'present':'NOT INSTALLED; physical stations not ready'));
 console.log('Business Studio projector: '+(result.sceneHasBusinessProjector?'present':'NOT INSTALLED'));
 for(const c of result.changes)console.log('[STAGE] '+c.name+' '+(c.before?blobHash(c.before):'absent')+
   ' -> '+blobHash(c.after));
 for(const reason of result.blocked)console.log('[BLOCK] '+reason);
 if(result.blocked.length)throw Error('Unknown host differences detected. No changes made; reconcile these files before deployment.');
 verify(result.changes);
 if(args[1]==='--apply'){
   apply(result.changes);
   console.log('APPLIED '+result.changes.length+' UI/AI/IDE files; server restart required for .cjs changes.');
 }else console.log('PLAN PASS: '+result.changes.length+' reviewed module changes possible; no host files modified.');
}
if(require.main===module)try{main(process.argv.slice(2));}
catch(e){console.error('STAGING BLOCKED: '+e.message);process.exitCode=2;}
module.exports={MODULES,KNOWN,blobHash,sha,plan,verify,apply};
