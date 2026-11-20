'use strict';
// Targeted repair of *one* known desk failure in an already customized host.
// No room.js, server.js, Git checkout, Tailscale, or other Azure module changes.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),
 crypto=require('node:crypto'),cp=require('node:child_process');
const release=path.resolve(__dirname,'..','collaboration-room','azure-bridge','loadout.js');
const markerStart='    // TF_MEMBER_DESK_RECOVERY_V1_BEGIN';
const markerEnd='    // TF_MEMBER_DESK_RECOVERY_V1_END';
const oldFetch=[
 "                const response = await fetch('/api/azure-bridge/loadout', {cache:'no-store'});",
 "                if (!response.ok) throw Error();",
 "                const next = await response.json();"
].join('\n');
const newFetch=[
 "                const response = await fetch('/api/azure-bridge/loadout', {credentials:'same-origin',cache:'no-store'});",
 "                if (!response.ok) throw Error('HTTP '+response.status);",
 "                const next = await response.json();",
 "                if (!next || !safe(next.login) || !next.projects || !next.projects[next.defaultProject])",
 "                    throw Error('Incomplete member workspace response');"
].join('\n');
const oldCatch=[
 "            } catch {",
 "                model = null; chosen = null; pin = null; drafts.clear();",
 "                shortcut.textContent = 'Contribute';",
 "                if (visibleCard) visibleCard.textContent = 'Azure could not load your personal desk. The shared contribution tools are available below.';",
 "            } finally { pending = null; }"
].join('\n');
const newCatch=[
 "            } catch (error) {",
 "                model = null; chosen = null; pin = null; drafts.clear();",
 "                shortcut.textContent = 'Contribute';",
 "                await fallbackDesk(error.message || 'unavailable');",
 "            } finally { pending = null; }"
].join('\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function once(str,needle,label){
 const count=str.split(needle).length-1;
 if(count!==1)throw Error('BLOCKED: ambiguous or missing '+label+' anchor ('+count+')');
}
function transform(current,review=fs.readFileSync(release,'utf8')){
 // Windows Git may check out CRLF; compare LF working copies and restore
 // the host's original newline convention after reversible patch validation.
 const newline=current.includes('\r\n')?'\r\n':'\n';
 const originalBytes=current;
 current=current.replace(/\r\n/g,'\n');
 review=review.replace(/\r\n/g,'\n');
 if(current.includes(markerStart)||current.includes(markerEnd)){
  if(current.includes(markerStart)&&current.includes(markerEnd)&&current.includes(newFetch)&&current.includes(newCatch))
   return originalBytes;
  throw Error('Partial or locally customized desk recovery detected; preserve for manual comparison.');
 }
 once(review,markerStart,'reviewed recovery start');
 once(review,markerEnd,'reviewed recovery end');
 const start=review.indexOf(markerStart),end=review.indexOf(markerEnd,start);
 const addition=review.slice(start,end+markerEnd.length)+'\n';
 once(current,'    async function load() {','member load');
 once(current,oldFetch,'member fetch');
 once(current,oldCatch,'member catch');
 const updated=current.replace('    async function load() {',addition+'    async function load() {')
   .replace(oldFetch,newFetch).replace(oldCatch,newCatch);
 // Reversibility verifies that no unrelated source, assets, or graphics moved.
 const original=updated.replace(addition,'').replace(newFetch,oldFetch).replace(newCatch,oldCatch);
 if(original!==current)throw Error('PRESERVATION BLOCK: source outside reviewed code changed.');
 return newline==='\r\n'?updated.replace(/\n/g,'\r\n'):updated;
}
function plan(root){
 if(!path.isAbsolute(root)||!fs.existsSync(path.join(root,'server.js'))||
   !fs.existsSync(path.join(root,'public','room.js')))
   throw Error('Expected the existing absolute collaboration-room path.');
 const target=path.join(root,'azure-bridge','loadout.js');
 const before=fs.readFileSync(target);const after=Buffer.from(transform(before.toString('utf8')));
 const check=cp.spawnSync(process.execPath,['--check'],{
   input:after.toString('utf8'),encoding:'utf8',timeout:15000});
 if(check.status!==0)throw Error('JavaScript syntax failure: '+check.stderr.slice(0,800));
 return {target,before,after,changed:!before.equals(after)};
}
function apply(change){
 if(!change.changed)return;
 const existing=fs.readFileSync(change.target);
 if(!existing.equals(change.before))throw Error('Host desk changed after planning; refused.');
 const tmp=change.target+'.tf-review-'+crypto.randomUUID();
 try{
  fs.writeFileSync(tmp,change.after,{flag:'wx'});
  fs.renameSync(tmp,change.target);
  if(!fs.readFileSync(change.target).equals(change.after)){
   fs.writeFileSync(change.target,change.before);
   throw Error('Write verification failed; original bytes restored.');
  }
 }finally{fs.rmSync(tmp,{force:true});}
}
function main(args){
 if(args.length!==2||!['--plan','--apply'].includes(args[1]))
   throw Error('Usage: node tools/towerflow-repair-member-desk.cjs <absolute room> --plan|--apply');
 const state=plan(args[0]);
 console.log('TARGET '+state.target);
 console.log('ORIGINAL SHA256 '+sha(state.before));
 console.log('REVIEWED SHA256 '+sha(state.after));
 console.log('ROOM SCENE NOT MODIFIED / OTHER AZURE FILES NOT MODIFIED');
 if(args[1]==='--apply'){apply(state);console.log('MEMBER DESK RECOVERY '+(state.changed?'INSTALLED':'ALREADY INSTALLED')+'; hard-refresh the browser.');}
 else console.log('PLAN '+(state.changed?'PASS: one file can be surgically patched.':'PASS: no changes needed.')+' No host files changed.');
}
if(require.main===module)try{main(process.argv.slice(2))}
catch(error){console.error('DESK REPAIR BLOCKED: '+error.message);process.exitCode=2;}
module.exports={transform,plan,apply,oldFetch,newFetch,oldCatch,newCatch};
