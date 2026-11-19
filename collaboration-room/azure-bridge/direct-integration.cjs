'use strict';
// Controlled natural-language transformation; no arbitrary model-generated code.
const crypto=require('node:crypto');
const {SOURCE_AREAS}=require('./source-navigation.cjs');
const REPO='Cos229-239/2610_Team02', OLD='<h1>Your money. <span>In motion.</span></h1>';
const PREFIX='/api/azure-bridge/direct-preview/';
function parsePrompt(raw){
  if(typeof raw!=='string'||raw.length>240)throw Error('Use a short prompt (240 characters maximum).');
  const m=/^(?:please\s+)?(?:change|set|update|replace)\s+(?:the\s+)?(?:dashboard\s+)?(?:headline|heading|main\s+title)\s+(?:to|with)\s+(.+?)\s*$/i.exec(raw.trim());
  if(!m)throw Error('Prototype supports: Change the dashboard headline to TowerFlow Command Center. Other changes require a connected coding agent.');
  const headline=m[1].trim().replace(/^[“"']|[”"']$/g,'').replace(/\.$/,'').trim();
  if(!headline||headline.length>75||/[\x00-\x1f\x7f]/.test(headline))throw Error('Headline must be 1–75 printable characters.');
  return {headline};
}
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function transform(bytes,idea){
  if(!Buffer.isBuffer(bytes))throw Error('Source bytes required.');
  const html=bytes.toString('utf8');
  if(html.split(OLD).length!==2)throw Error('Dashboard headline changed upstream. No source was modified.');
  return Buffer.from(html.replace(OLD,'<h1>'+escapeHtml(idea.headline)+'</h1>'),'utf8');
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
    const baseKey=previewKey(base.url),source=preview.file(baseKey,'index.html');
    if(!source?.bytes||!source.sha||sha(source.bytes)!==source.sha)throw Error('Dashboard source failed Git hash verification.');
    const bytes=transform(source.bytes,idea);
    if(bytes.equals(source.bytes))throw Error('No change generated.');
    const key=nonce();if(!/^[a-f0-9]{48}$/.test(key)||plans.has(key))throw Error('Invalid unique preview ID.');
    for(const [id,p] of plans)if(p.expires<=now())plans.delete(id);
    if(plans.size>=48)plans.delete(plans.keys().next().value);
    plans.set(key,{key,owner,idea,revision:base.revision,sourceSha:source.sha,bytes,baseKey,
      expires:now()+15*60000,writing:false,submitted:null});
    return {key,revision:base.revision,area:'dashboard',file:'TowerFlow/index.html',
      before:'Your money. In motion.',after:idea.headline,
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
      const branch='work/'+login.toLowerCase()+'/dashboard-'+key.slice(0,10);
      await gh('/git/refs','POST',{ref:'refs/heads/'+branch,sha:p.revision});
      await gh('/contents/TowerFlow/index.html','PUT',{
        message:'Update dashboard headline via TowerFlow reviewed preview',
        content:p.bytes.toString('base64'),sha:p.sourceSha,branch});
      const pr=await gh('/pulls','POST',{title:'Dashboard: '+p.idea.headline,head:branch,base:'dev',draft:true,
        body:'TowerFlow-Area: dashboard\n\nRequested headline: '+p.idea.headline+
          '\nSource: TowerFlow/index.html\nBase SHA: '+p.revision+
          '\n\nReview the diff and run browser checks. Publishing the live app is separate.'});
      p.submitted={number:pr.number,url:pr.html_url,branch,status:'draft',published:false};
      return p.submitted;
    }finally{p.writing=false;}
  }
  function asset(key,name){
    const p=getPlan(key);if(!p||typeof name!=='string'||name.includes('/')||name.includes('\\')||name.includes('..'))return null;
    if(name==='index.html')return {bytes:p.bytes,type:'text/html'};
    const f=preview.file(p.baseKey,name);return f?.bytes?{bytes:f.bytes,type:f.type||'application/octet-stream'}:null;
  }
  return {plan,submit,asset,getPlan};
}
function mount(app,{auth,ensureMember,sameOrigin,publicOrigin,preview,direct=makeDirect({preview})}){
  const owner=req=>String(req.session.user.id||req.session.user.login);
  app.get('/api/azure-bridge/source-navigation',auth,ensureMember,(_req,res)=>{
    res.set('Cache-Control','no-store').json({areas:Object.fromEntries(Object.entries(SOURCE_AREAS)
      .map(([id,v])=>[id,{label:v.label,file:v.file,description:v.description}]))});
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
module.exports={parsePrompt,transform,sha,makeDirect,mount};
