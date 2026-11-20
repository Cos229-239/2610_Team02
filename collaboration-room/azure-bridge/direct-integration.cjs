'use strict';
// Controlled natural-language transformation; no arbitrary model-generated code.
const crypto=require('node:crypto');
const {SOURCE_AREAS}=require('./source-navigation.cjs');
const REPO='Cos229-239/2610_Team02', OLD='<h1>Your money. <span>In motion.</span></h1>';
const PREFIX='/api/azure-bridge/direct-preview/';
const COLORS=Object.freeze({blue:'#2563eb',magenta:'#d946ef',purple:'#a855f7',red:'#ef4444',green:'#22c55e',yellow:'#eab308',orange:'#f97316',black:'#080b12',white:'#ffffff',teal:'#0d9488',cyan:'#06b6d4',pink:'#ec4899'});
const DESIGNS=Object.freeze([
 {kind:'headline',area:'dashboard',file:'TowerFlow/index.html',label:'Dashboard headline',
  pattern:/<h1>Your money\. <span>In motion\.<\/span><\/h1>/g,
  output:value=>'<h1>'+escapeHtml(value)+'</h1>',max:75},
 {kind:'subtitle',area:'dashboard',file:'TowerFlow/index.html',label:'Dashboard introduction',
  pattern:/<p>Track holdings, review activity, and model your next move\.<\/p>/g,
  output:value=>'<p>'+escapeHtml(value)+'</p>',max:120},
 {kind:'holdingsTitle',area:'portfolio',file:'TowerFlow/index.html',label:'Holdings section title',
  pattern:/<h2>Holdings<\/h2>/g,output:value=>'<h2>'+escapeHtml(value)+'</h2>',max:55},
 {kind:'accent',area:'ui',file:'TowerFlow/styles.css',label:'Application accent color',
  pattern:/:root\{[^}]*?--accent:#[0-9a-fA-F]{3,8}(?=;)/g,output:(value,before)=>before.replace(/--accent:#[0-9a-fA-F]{3,8}$/, '--accent:'+value),color:true},
 {kind:'background',area:'ui',file:'TowerFlow/styles.css',label:'Application background color',
  pattern:/:root\{[^}]*?--bg:#[0-9a-fA-F]{3,8}(?=;)/g,output:(value,before)=>before.replace(/--bg:#[0-9a-fA-F]{3,8}$/, '--bg:'+value),color:true}
]);
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function parsePrompt(raw){
  if(typeof raw!=='string'||raw.length>240)throw Error('Use a short change request (240 characters maximum).');
  const prompt=raw.trim();
  let kind,value;
  const text=/^(?:please\s+)?(?:change|set|update|replace|rename)\s+(?:the\s+)?(?:dashboard\s+)?(headline|heading|main\s+title|subtitle|introduction|description|holdings\s+(?:section\s+)?title)\s+(?:to|with)\s+(.+?)\s*$/i.exec(prompt);
  const color=/^(?:please\s+)?(?:change|set|update|make)\s+(?:the\s+)?(?:(?:app|application|dashboard|ui|interface|theme)\s+)?(background(?:\s+color)?|accent(?:\s+color)?|highlight(?:\s+color)?)\s+(?:to\s+|with\s+)?(.+?)\s*$/i.exec(prompt);
  if(text){
    kind=/holdings/i.test(text[1])?'holdingsTitle':/subtitle|introduction|description/i.test(text[1])?'subtitle':'headline';
    value=text[2].trim().replace(/^[“"']|[”"']$/g,'').replace(/\.$/,'').trim();
  }else if(color){
    kind=/background/i.test(color[1])?'background':'accent';
    value=color[2].trim().replace(/^[“"']|[”"']$/g,'').replace(/\.$/,'').trim().toLowerCase();
    value=COLORS[value]||value;
    if(!/^#[a-f0-9]{6}$/i.test(value))throw Error('Use a named color (blue, magenta, purple, green, etc.) or a six-digit hex color (#123abc).');
  }else throw Error('Supported: dashboard headline, subtitle, holdings title, app accent color, or app background color. Choose an example below.');
  const design=DESIGNS.find(item=>item.kind===kind);
  if(!value||(!design.color&&value.length>design.max)||/[\x00-\x1f\x7f]/.test(value))throw Error('Invalid text for '+design.label+'.');
  return {kind,value,...(kind==='headline'?{headline:value}:{})};
}
function resolve(idea){const d=DESIGNS.find(x=>x.kind===(idea.kind|| (idea.headline!==undefined?'headline':null)));if(!d)throw Error('Unsupported change.');return d;}
function transform(bytes,idea){
  if(!Buffer.isBuffer(bytes))throw Error('Verified source bytes required.');
  const d=resolve(idea),original=bytes.toString('utf8');
  const matches=[...original.matchAll(d.pattern)];
  if(matches.length!==1)throw Error(d.label+' source anchor changed. No files modified.');
  const value=idea.value??idea.headline;
  if(typeof value!=='string')throw Error('Invalid change data.');
  const after=d.output(value,matches[0][0]);
  if(matches[0][0]===after)throw Error('Requested change is already present.');
  return Buffer.from(original.replace(d.pattern,()=>after),'utf8');
}
function sha(bytes){return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');}
function previewKey(url){const m=/^\/api\/azure-bridge\/preview-files\/([a-f0-9]{48})\/index\.html$/.exec(url);if(!m)throw Error('Unrecognized verified preview URL.');return m[1];}
function makeDirect({preview,now=Date.now,read=fetch,nonce=()=>crypto.randomBytes(24).toString('hex')}){
  if(!preview?.open||!preview?.file)throw Error('Verified preview provider required.');
  const plans=new Map();
  function getPlan(key){
    if(typeof key!=='string'||!/^[a-f0-9]{48}$/.test(key))return null;
    const p=plans.get(key);if(!p)return null;
    if(p.expires<=now()){plans.delete(key);return null;}
    return p;
  }
  async function plan({token,owner,prompt}){
    const idea=parsePrompt(prompt),base=await preview.open(token);
    if(!/^[a-f0-9]{40}$/.test(base.revision))throw Error('Invalid dev revision.');
    const d=resolve(idea),baseKey=previewKey(base.url),name=d.file.replace('TowerFlow/',''),source=preview.file(baseKey,name);
    if(!source?.bytes||!source.sha||sha(source.bytes)!==source.sha)throw Error('Requested source failed Git hash verification.');
    const matches=[...source.bytes.toString('utf8').matchAll(d.pattern)];
    if(matches.length!==1)throw Error(d.label+' source anchor changed.');
    const before=matches[0][0];
    const bytes=transform(source.bytes,idea);
    if(bytes.equals(source.bytes))throw Error('No change generated.');
    const key=nonce();if(!/^[a-f0-9]{48}$/.test(key)||plans.has(key))throw Error('Invalid unique preview ID.');
    for(const [id,p] of plans)if(p.expires<=now())plans.delete(id);
    if(plans.size>=48)plans.delete(plans.keys().next().value);
    plans.set(key,{key,owner,idea,file:d.file,sourceName:name,revision:base.revision,sourceSha:source.sha,bytes,baseKey,
      expires:now()+15*60000,writing:false,submitted:null});
    return {key,revision:base.revision,area:d.area,file:d.file,
      before:d.color?(before.match(/--(?:bg|accent):#[a-f\d]{3,8}$/i)?.[0]||'current theme value'):before.replace(/<[^>]+>/g,''),after:idea.value,
      previewUrl:PREFIX+key+'/index.html',expiresAt:new Date(now()+15*60000).toISOString()};
  }
  async function submit({key,token,owner,login}){
    const p=getPlan(key);
    if(!p||p.owner!==owner)throw Object.assign(Error('Preview expired or belongs to another account.'),{status:403});
    if(p.submitted)return p.submitted;
    if(p.writing)throw Object.assign(Error('Submission in progress.'),{status:409});
    if(typeof login!=='string'||!/^[a-z0-9-]{1,39}$/i.test(login))throw Error('Invalid contributor account.');
    p.writing=true;
    async function gh(route,method='GET',body){
      const response=await read('https://api.github.com/repos/'+REPO+route,{method,
        headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'TowerFlow-Direct-Integration'},
        ...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Object.assign(Error(response.status===403?'GitHub write permission unavailable for this account.':'GitHub HTTP '+response.status+' on '+method+' '+route),{status:response.status===403?403:502});
      return response.json();
    }
    try{
      const ref=await gh('/git/ref/heads/dev');
      if(ref.object?.sha!==p.revision)throw Object.assign(Error('Dev moved since preview. Regenerate your change.'),{status:409});
      const branch='work/'+login.toLowerCase()+'/'+(p.idea.kind||'headline')+'-'+key.slice(0,10);
      await gh('/git/refs','POST',{ref:'refs/heads/'+branch,sha:p.revision});
      await gh('/contents/'+p.file,'PUT',{
        message:'Update '+(p.idea.kind||'headline')+' via TowerFlow reviewed preview',
        content:p.bytes.toString('base64'),sha:p.sourceSha,branch});
      const design=resolve(p.idea);
      const pr=await gh('/pulls','POST',{title:design.label+': '+p.idea.value,head:branch,base:'dev',draft:true,
        body:'TowerFlow-Area: '+design.area+'\n\nRequested change: '+p.idea.value+
          '\nSource: '+p.file+'\nBase SHA: '+p.revision+
          '\n\nReview the diff and run browser checks. Publishing the live app is separate.'});
      p.submitted={number:pr.number,url:pr.html_url,branch,status:'draft',published:false};
      return p.submitted;
    }finally{p.writing=false;}
  }
  function asset(key,name){
    const p=getPlan(key);if(!p||typeof name!=='string'||name.includes('/')||name.includes('\\')||name.includes('..'))return null;
    if(name===p.sourceName)return {bytes:p.bytes,type:name.endsWith('.css')?'text/css':'text/html'};
    const f=preview.file(p.baseKey,name);return f?.bytes?{bytes:f.bytes,type:f.type||'application/octet-stream'}:null;
  }
  return {plan,submit,asset,getPlan};
}
function mount(app,{auth,ensureMember,sameOrigin,publicOrigin,preview,direct=makeDirect({preview})}){
  const owner=req=>String(req.session.user.id||req.session.user.login);
  app.get('/api/azure-bridge/source-navigation',auth,ensureMember,(_req,res)=>{
    res.set('Cache-Control','no-store').json({areas:Object.fromEntries(Object.entries(SOURCE_AREAS)
      .map(([id,v])=>[id,{label:v.label,file:v.file,description:v.description,
        related:v.related||[],debugProfile:v.debugProfile||(id==='roomscene'?'room':'web')}]))});
  });
  app.post('/api/azure-bridge/direct/plan',auth,ensureMember,sameOrigin,async(req,res)=>{
    res.set('Cache-Control','no-store');
    try{res.json(await direct.plan({token:req.session.token,owner:owner(req),prompt:req.body?.prompt}));}
    catch(e){res.status(e.status||422).json({error:e.message});}
  });
  app.post('/api/azure-bridge/direct/submit',auth,ensureMember,sameOrigin,async(req,res)=>{
    res.set('Cache-Control','no-store');
    try{res.json(await direct.submit({key:req.body?.key,token:req.session.token,owner:owner(req),login:req.session.user.login}));}
    catch(e){res.status(e.status||422).json({error:e.message});}
  });
  app.get(PREFIX+':key/*',(req,res)=>{
    const file=direct.asset(req.params.key,req.params[0]);
    if(!file)return res.sendStatus(404);
    const assets=publicOrigin+PREFIX+req.params.key+'/';
    res.set('Content-Security-Policy',[
      'sandbox allow-scripts allow-forms allow-downloads',"default-src 'none'","base-uri 'none'","form-action 'none'","frame-ancestors 'self'",
      'script-src '+assets,"style-src 'unsafe-inline' "+assets,
      'img-src data: blob: '+assets,'font-src '+assets,'media-src '+assets,'connect-src '+assets
    ].join('; '));
    res.set('Access-Control-Allow-Origin','*').set('X-Content-Type-Options','nosniff').type(file.type).send(file.bytes);
  });
}
module.exports={parsePrompt,transform,sha,makeDirect,mount,COLORS,DESIGNS};
