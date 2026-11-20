'use strict';
/**
 * Azure Workspace Harness: preserve -> classify -> source proof -> launch.
 * Inspired by reviewed Megan 3.0 bounded proposals, Laura's typed action
 * authority and durable-evidence ideas, and Pixi's capability/evidence gate.
 * Nothing from the private AscendenceAgent007 implementation is bundled.
 */
const crypto=require('node:crypto');
const {SOURCE_AREAS}=require('./source-navigation.cjs');
const {inventory:localInventory,propose:localPropose}=require('./azure-local-reasoner.cjs');
const REPO='Cos229-239/2610_Team02';
const EDITORS=Object.freeze({
 vscode:{station:'dev-ide-code',label:'Visual Studio Code'},
 vscommunity:{station:'dev-ide-vs',label:'Visual Studio Community'},
 cursor:{station:'dev-ide-cursor',label:'Cursor'},
 antigravity:{station:'dev-ide-antigravity',label:'Google Antigravity'}
});
const AREAS=Object.freeze({
 ui:['ui','interface','css','style','styling','layout','visual design'],
 dashboard:['dashboard','home page','overview','headline','home screen'],
 markets:['markets','market','stock prices','ticker'],
 watchlist:['watchlist','watch list'],
 portfolio:['portfolio','positions','assets'],
 holdings:['holdings','holdings table'],
 trading:['trading','trade','buy','sell'],
 analytics:['analytics','projections','forecast'],
 charts:['charts','chart','graph'],
 settings:['settings','preferences','theme'],
 backend:['backend','api','server endpoint','server.js'],
 room:['collaboration','contribute','contribution desk','workspace desk','desk.js'],
 roomscene:['3d room','scene','projector','wall','globe','earth','world sales']
});
const STOP=new Set(['i','a','the','my','want','need','please','could','you','to','in','on','of','and','for','make','have','it','with','we','our','can']);
function tokens(input){
 return input.toLowerCase().replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(Boolean);
}
function matchArea(prompt){
 const normalized=' '+tokens(prompt).join(' ')+' ',words=new Set(tokens(prompt).filter(x=>!STOP.has(x)));
 const score=[];
 for(const [id,phrases] of Object.entries(AREAS)){
   let best=0;
   for(const phrase of phrases){
     const t=tokens(phrase);
     if(t.length>1&&normalized.includes(' '+t.join(' ')+' '))best=Math.max(best,10+t.length);
     else if(t.length===1&&words.has(t[0]))best=Math.max(best,4);
   }
   if(best)score.push({id,score:best});
 }
 score.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 if(!score.length)return {area:null,candidates:[],reason:'NO_SOURCE_AREA'};
 if(score.length>1&&score[0].score===score[1].score)
   return {area:null,candidates:score.filter(x=>x.score===score[0].score).map(x=>x.id),reason:'AMBIGUOUS_TARGET'};
 return {area:score[0].id,candidates:score.map(x=>x.id),reason:null};
}
function planRequest(body,{now=Date.now}={}){
 const prompt=body?.prompt,editor=body?.editor,selectedArea=body?.area;
 if(typeof prompt!=='string'||prompt.trim().length<3||prompt.length>1800)
   throw Object.assign(Error('Describe a task using 3–1800 characters.'),{status:400});
 if(!Object.hasOwn(EDITORS,editor))
   throw Object.assign(Error('Select a supported desktop IDE.'),{status:400});
 if(selectedArea!==undefined&&(!Object.hasOwn(SOURCE_AREAS,selectedArea)||typeof selectedArea!=='string'))
   throw Object.assign(Error('Unknown source target; select a registered component.'),{status:400});
 const matched=selectedArea?{area:selectedArea,candidates:[selectedArea],reason:null}:matchArea(prompt);
 const kind=/\b(open|show|find|locate|navigate|inspect|read|view|debug|breakpoint)\b/i.test(prompt) &&
  !/\b(change|add|implement|build|fix|remove|update|refactor|create|integrate)\b/i.test(prompt)?
  'INSPECT_SOURCE':'PROPOSE_CHANGE';
 const id=crypto.createHash('sha256').update(prompt).digest('hex');
 const confirmed=Boolean(matched.area);
 const source=confirmed?SOURCE_AREAS[matched.area]:null;
 return {
  schema:'towerflow-azure-workspace-plan/v1',
  intentSha256:id,createdAt:new Date(now()).toISOString(),
  originalPrompt:prompt,mode:kind,
  intake:{source:'USER_DIRECT',preserved:crypto.createHash('sha256').update(prompt).digest('hex'),
    framework:{megan:'BOUNDED_PROPOSAL',laura:'PRESERVE_AND_GOVERN',pixi:'CONTEXT_AND_CAPABILITY_GATE'},
    verifications:['Repository source proof','IDE availability','Debugger evidence','Changes preview','Team review']},
  state:confirmed?'READY_FOR_SOURCE_VERIFICATION':'NEEDS_TARGET_SELECTION',
  target:matched.area,choices:matched.candidates,
  editor,station:EDITORS[editor].station,
  source:source?{path:source.file,anchor:source.anchor,related:source.related||[],
   debugProfile:source.debugProfile||'web'}:null,
  permissions:{repositoryRead:'NOT_YET_VERIFIED',repositoryWrite:'NOT_YET_VERIFIED',
   localEditor:'NOT_YET_LAUNCHED',debugger:'NOT_YET_ATTACHED',
   aiModel:'NOT_YET_CONNECTED'},
  next:'Verify the source in the signed-in GitHub account; then open it in the chosen PC IDE. A plan is not an edit.',
  constraints:['Private Laura, Pixi and Megan implementations are not copied into Team 02.',
   'No arbitrary shell, local filesystem write, auto-merge, or model-generated code execution.',
   'Azure is an orchestrator using the authenticated room and member-owned IDE; without a compatible model it cannot invent general-purpose code.',
   'A separate AI web tab has no GitHub permissions from the TowerFlow browser.']
 };
}
async function githubSourceProof(plan,token,{request}={}){
 if(!plan.source)return {status:'TARGET_SELECTION_REQUIRED'};
 if(typeof token!=='string'||token.length<10)throw Error('Authenticated GitHub token unavailable.');
 const get=request|| (async route=>{
  const response=await fetch('https://api.github.com/repos/'+REPO+route,{
   headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
     'X-GitHub-Api-Version':'2022-11-28','User-Agent':'TowerFlow-Azure-Harness'},
   redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error('GitHub HTTP '+response.status);
  return response.json();
 });
 const file=plan.source.path;
 const found=await get('/contents/'+file.split('/').map(encodeURIComponent).join('/')+'?ref=dev');
 if(found?.type!=='file'||!(/^[a-f0-9]{40}$/.test(found.sha||''))||found.path!==file)
   throw Error('Actual dev source is missing or does not match registry');
 let referenceLine=null,contentSha256=null;
 if(typeof found.content==='string'&&found.encoding==='base64'){
   const raw=Buffer.from(found.content.replace(/\s+/g,''),'base64');
   if(raw.length>1024*1024)throw Error('Source content exceeds safe verification bound');
   const code=raw.toString('utf8');
   const anchor=SOURCE_AREAS[plan.target]?.anchor;
   if(!anchor||code.indexOf(anchor)<0||
     code.indexOf(anchor,code.indexOf(anchor)+anchor.length)>=0)
     throw Error('Source anchor missing or ambiguous in actual GitHub file');
   referenceLine=code.slice(0,code.indexOf(anchor)).split('\n').length;
   contentSha256=crypto.createHash('sha256').update(raw).digest('hex');
 }
 return {status:'SOURCE_READ_VERIFIED',repo:REPO,branch:'dev',path:file,
  blobSha:found.sha,referenceLine,contentSha256,editor:plan.editor,station:plan.station,
  note:'Verified GitHub file existence and source revision with member credentials, NOT write permissions or model execution.'};
}
function mount(app,{auth,ensureMember,sameOrigin,verify=githubSourceProof,clock=Date.now,modelInventory=localInventory,modelPropose=localPropose}={}){
 if(![auth,ensureMember,sameOrigin].every(x=>typeof x==='function'))throw Error('Authorization, membership and origin policy required.');
 app.get('/api/azure-bridge/azure-harness/capabilities',auth,ensureMember,async(req,res)=>{
  const model=await modelInventory();
  res.set('Cache-Control','no-store').json({schema:'towerflow-azure-harness-capabilities/v1',
   modes:['INSPECT_SOURCE','PROPOSE_CHANGE'],editors:EDITORS,areas:
    Object.fromEntries(Object.entries(SOURCE_AREAS).map(([id,v])=>[id,{label:v.label,file:v.file}])),
   model:{...model,note:'Local inference is intent classification only. No code edits or IDE execution are granted to the model.'},
   source:'GitHub Team 02 authenticated user session',
   restrictions:['Read-only planning','No remote shell','No automatic code modification','No private repo code import']});
 });
 app.post('/api/azure-bridge/azure-harness/reason',auth,ensureMember,sameOrigin,async(req,res)=>{
  res.set('Cache-Control','no-store');
  const prompt=req.body?.prompt;
  if(typeof prompt!=='string'||prompt.trim().length<3||prompt.length>1800)
    return res.status(400).json({error:'Describe a task in 3–1800 characters.'});
  const answer=await modelPropose(prompt);
  return res.json({schema:'towerflow-azure-local-reason/v1',...answer,
   permissions:{codeWrites:'NOT_GRANTED',gitAccess:'NOT_GRANTED',ideLaunch:'NOT_GRANTED'}});
 });
 app.post('/api/azure-bridge/azure-harness/plan',auth,ensureMember,sameOrigin,async(req,res)=>{
  res.set('Cache-Control','no-store');
  let result;
  try{result=planRequest(req.body,{now:clock});}
  catch(error){return res.status(error.status||400).json({error:error.message});}
  if(!result.source)return res.json(result);
  try{
   result.sourceProof=await verify(result,req.session?.token);
   if(result.sourceProof?.status!=='SOURCE_READ_VERIFIED')throw Error('Unverified source result');
   result.permissions.repositoryRead='VERIFIED';
   result.state='SOURCE_VERIFIED_READY_FOR_EDITOR';
  }catch{
   result.state='GITHUB_SOURCE_NOT_VERIFIED';
   result.sourceProof={status:'UNAVAILABLE'};
  }
  return res.json(result);
 });
}
module.exports={EDITORS,AREAS,matchArea,planRequest,githubSourceProof,mount};
