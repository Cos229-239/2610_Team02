'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const http = require('http');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { WebSocketServer } = require('ws');
const gitExec = promisify(execFile);
const app = express(), server = http.createServer(app);
const PORT = Number(process.env.PORT || 4173);
const OWNER = process.env.REPO_OWNER || 'Cos229-239';
const REPO = process.env.REPO_NAME || '2610_Team02';
const ROOT = path.resolve(process.env.REPO_PATH || './MISSING_REPO_PATH');
// Fixed external origin prevents Host-header-based OAuth callback manipulation.
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const publicOrigin = new URL(PUBLIC_URL).origin;
const secretsConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET && process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'REPLACE_WITH_A_LONG_RANDOM_SECRET');
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({limit:'2mb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');next();});
const sessions = session({name:'towerflow.sid',secret:process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.TRUST_PROXY === '1',maxAge:12*60*60*1000}});
app.use(sessions);
app.use(express.static(path.join(__dirname,'public')));
const toJson = async response=>{let body = await response.text();try{return JSON.parse(body)}catch{return {message:body}}};
async function github(url, token, method='GET', data) {
  const response = await fetch('https://api.github.com'+url,{method,headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Authorization':'Bearer '+token,'User-Agent':'Towerflow-Collab'},body:data?JSON.stringify(data):undefined});
  const result = await toJson(response);
  if(!response.ok) throw Object.assign(new Error(result.message||`GitHub ${response.status}`),{status:response.status});
  return result;
}
const safeUser = user=>({login:user.login,avatar_url:user.avatar_url,name:user.name||user.login});
async function permitted(token,login){
  const result = await github(`/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/collaborators/${encodeURIComponent(login)}/permission`,token);
  return ['read','triage','write','maintain','admin'].includes(result.permission)?result.permission:null;
}
function auth(req,res,next){if(!req.session?.user)return res.status(401).json({error:'Log in with GitHub.'});next();}
async function ensureMember(req,res,next){
  try {let permission=await permitted(req.session.token,req.session.user.login);if(!permission)return res.status(403).json({error:'You are not a repository collaborator.'});req.permission=permission;next();}
  catch(e){res.status(e.status===404?403:502).json({error:'Repository membership verification failed: '+e.message});}
}
function canWrite(req,res,next){if(!['write','maintain','admin'].includes(req.permission))return res.status(403).json({error:'Repository write role required.'});next();}
function handle(fn){return(req,res,next)=>Promise.resolve(fn(req,res)).catch(next)}
const settings = {owner:OWNER,repo:REPO,branch:'dev'};
app.get('/api/config', (req,res)=>res.json({...settings,configured:secretsConfigured,authenticated:!!req.session?.user,roomUrl:PUBLIC_URL+'/room/team02'}));
app.get('/room/team02',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));
app.get('/auth/github',(req,res)=>{
 if(!secretsConfigured) return res.status(503).send('Configure GitHub OAuth client ID, secret, and SESSION_SECRET in .env first.');
 const state=crypto.randomBytes(24).toString('hex');req.session.oauthState=state;
 req.session.save(()=>res.redirect('https://github.com/login/oauth/authorize?'+new URLSearchParams({client_id:process.env.GITHUB_CLIENT_ID,redirect_uri:`${PUBLIC_URL}/auth/github/callback`,scope:'read:user repo',state}).toString()));
});
app.get('/auth/github/callback',handle(async(req,res)=>{
 if(!req.query.state||req.query.state!==req.session.oauthState||!req.query.code)return res.status(403).send('Invalid OAuth state.');
 delete req.session.oauthState;
 const response = await fetch('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({client_id:process.env.GITHUB_CLIENT_ID,client_secret:process.env.GITHUB_CLIENT_SECRET,code:req.query.code})});
 const tokenData=await toJson(response);if(!tokenData.access_token)throw new Error('GitHub OAuth failed: '+(tokenData.error_description||'No access token'));
 const user=await github('/user',tokenData.access_token);
 const permission=await permitted(tokenData.access_token,user.login);
 if(!permission)return res.status(403).send('GitHub account is not a member of the configured team repository. Ask the repo admin to invite you.');
 req.session.regenerate(err=>{if(err)return res.status(500).send('Could not create session');req.session.user=safeUser(user);req.session.token=tokenData.access_token;req.session.save(()=>res.redirect('/room/team02?loggedin=1'));});
}));
app.post('/auth/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',auth,ensureMember,(req,res)=>res.json({...req.session.user,permission:req.permission,...settings}));
app.get('/api/members',auth,ensureMember,handle(async(req,res)=>{
 const collaborators=await github(`/repos/${OWNER}/${REPO}/collaborators?per_page=100`,req.session.token);
 res.json(collaborators.map(safeUser));
}));
app.post('/api/invite',auth,ensureMember,handle(async(req,res)=>{
 if(req.permission!=='admin')return res.status(403).json({error:'Only repository admins may invite members.'});
 const username=String(req.body.username||'').trim();if(!/^[\w-]{1,39}$/.test(username))return res.status(400).json({error:'Invalid GitHub username.'});
 const result=await github(`/repos/${OWNER}/${REPO}/collaborators/${username}`,req.session.token,'PUT',{permission:'push'});
 res.json({ok:true,status:result?.id?'Invitation sent or pending acceptance.':'User is already a collaborator or invitation processed.'});
}));
async function git(...args){let {stdout}=await gitExec('git',['-C',ROOT,...args],{timeout:15000,maxBuffer:2e6,windowsHide:true});return stdout.trim();}
app.get('/api/git/status',auth,ensureMember,handle(async(req,res)=>{
 const [branch,status,log]=await Promise.all([git('branch','--show-current'),git('status','--short'),git('log','-6','--pretty=format:%h %s (%an)')]);
 res.json({branch,status,log,dev:branch==='dev'});
}));
// No arbitrary shell access; only read-only git commands are supported.
app.post('/api/git/command',auth,ensureMember,handle(async(req,res)=>{
 const command=String(req.body.command||'').trim();const options={'git status':['status','--short','--branch'],'git log':['log','-12','--oneline','--decorate'],'git diff':['diff','--stat'],'git branch':['branch','-a']};
 if(!options[command])return res.status(400).json({error:'Allowed: git status, git log, git diff, git branch'});
 res.json({output:await git(...options[command])});
}));
const forbidden=new Set(['.git','node_modules','.env','.env.local','dist','build']);
function resolveFile(relative){
 if(typeof relative!=='string'||relative.length>300||relative.includes('\\')||relative.includes('\0'))throw Object.assign(new Error('Invalid path'),{status:400});
 const parts=relative.split('/');if(!parts.length||parts.some(part=>!part||part==='.'||part==='..'||forbidden.has(part)))throw Object.assign(new Error('Forbidden path'),{status:400});
 const resolved=path.resolve(ROOT,...parts);if(!resolved.startsWith(ROOT+path.sep))throw Object.assign(new Error('Outside repository'),{status:400});
 return resolved;
}
async function checkedFile(rel){let file=resolveFile(rel),realRoot=await fs.realpath(ROOT),realFile=await fs.realpath(file);if(!realFile.startsWith(realRoot+path.sep))throw Object.assign(new Error('Symlink outside repo'),{status:403});return realFile;}
app.get('/api/files',auth,ensureMember,handle(async(req,res)=>{
 const all=await git('ls-files');res.json(all.split('\n').filter(Boolean).filter(f=>f.split('/').every(p=>!forbidden.has(p))).slice(0,1000));
}));
app.get('/api/file',auth,ensureMember,handle(async(req,res)=>{
 const file=await checkedFile(String(req.query.path||''));const stat=await fs.stat(file);if(stat.size>350000)return res.status(413).json({error:'File exceeds 350 KB editor limit.'});
 res.json({path:req.query.path,content:await fs.readFile(file,'utf8')});
}));
app.put('/api/file',auth,ensureMember,canWrite,handle(async(req,res)=>{
 const rel=req.body.path;const contents=req.body.content;
 if(typeof contents!=='string'||Buffer.byteLength(contents)>350000)return res.status(400).json({error:'Invalid content or exceeds 350 KB.'});
 const file=await checkedFile(rel);await fs.writeFile(file,contents,'utf8');res.json({ok:true,note:'Saved to local working tree only; commit and merge via GitHub Desktop.'});
}));
app.post('/api/ai/propose',auth,ensureMember,canWrite,handle(async(req,res)=>{
 if(!process.env.OPENAI_API_KEY)return res.status(503).json({error:'Set OPENAI_API_KEY in .env to enable proposals.'});
 const rel=String(req.body.path||''),prompt=String(req.body.prompt||'').trim();if(!prompt||prompt.length>3000)return res.status(400).json({error:'Provide a prompt up to 3,000 characters.'});
 const file=await checkedFile(rel),original=await fs.readFile(file,'utf8');if(original.length>18000)return res.status(413).json({error:'Choose a source file under 18K characters.'});
 const body={model:process.env.OPENAI_MODEL||'gpt-4.1-mini',messages:[{role:'system',content:'You edit one source code file. Return ONLY the full replacement source code for that file, no markdown fences or explanation. Do not include secrets. Preserve existing functionality unless the user asks otherwise.'},{role:'user',content:`FILE: ${rel}\nREQUEST: ${prompt}\nCURRENT CODE:\n${original}`}],temperature:0.2};
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await toJson(response);if(!response.ok)throw Object.assign(new Error(data.error?.message||'AI request failed'),{status:502});
 const proposed=String(data.choices?.[0]?.message?.content||'').replace(/^```[^\n]*\n|\n```$/g,'');if(!proposed)return res.status(502).json({error:'No proposal produced.'});
 // Proposal lives only in the browser until the member explicitly clicks Keep.
 res.json({path:rel,original,proposed});
}));
// TF_AURA_GIT_SERVER_V1: server-side authorization, loopback Ollama, no shell.
const {createAuraHandler}=require('./aura-service.cjs');
const auraHandler=createAuraHandler({
  model:process.env.TOWERFLOW_AI_MODEL||'qwen3:8b',
  knowledgeFile:path.join(__dirname,'aura-world.md'),
  publicOrigin,
  authorize:async req=>req.session?.user?.login && req.permission
    ? {userId:'github_'+String(req.session.user.login).toLowerCase()}
    : null
});
app.use('/api/aura',auth,ensureMember,(req,res,next)=>{
  // Express strips the route prefix, while AURA validates complete paths.
  req.url=req.originalUrl;
  Promise.resolve(auraHandler(req,res)).then(handled=>{
    if(!handled && !res.headersSent) next();
  }).catch(next);
});
// TF_SHARED_WORLD_BACKEND_V1_BEGIN
const {createWorldStore,createWorldHandler}=require('./world-state.cjs');
const tfWorldStore=createWorldStore({file:path.join(__dirname,'data','towerflow-world-state.json')});
const tfWorldHandler=createWorldHandler({store:tfWorldStore,origin:publicOrigin,authorize:async(req)=>{
  const id=req.session?.user?.login;if(!id||!req.permission)return null;
  return {userId:String(id).toLowerCase(),role:['admin','maintain'].includes(req.permission)?'maintainer':'contributor'};
}});
app.all('/api/world/state',auth,ensureMember,(req,res)=>tfWorldHandler(req,res));
const {createMarketHandler}=require('./market-handler.cjs');
const tfMarketHandler=createMarketHandler();
app.get('/api/market/quote',auth,ensureMember,(req,res)=>tfMarketHandler(req,res));
const {createAgentHandler}=require('./agent-handler.cjs');
const tfAgentHandler=createAgentHandler({origin:publicOrigin});
app.all('/api/agents/status',auth,ensureMember,(req,res)=>tfAgentHandler(req,res));
app.all('/api/agents/run',auth,ensureMember,(req,res)=>tfAgentHandler(req,res));
app.all('/api/agents/plan',auth,ensureMember,(req,res)=>tfAgentHandler(req,res));
const {createContributionHandler}=require('./pr-reader.cjs');
const tfContributions=createContributionHandler();
app.get('/api/contributions',auth,ensureMember,(req,res)=>tfContributions(req,res));
// TF_SHARED_WORLD_BACKEND_V1_END
app.get('/api/health',(req,res)=>res.json({ok:true,configured:secretsConfigured}));
app.use('/api',(e,req,res,next)=>res.status(e.status||500).json({error:e.message||'Server error'}));
const wss=new WebSocketServer({noServer:true}),peers=new Map();
server.on('upgrade',(request,socket,head)=>{
 if(!request.url.startsWith('/ws'))return socket.destroy();
 const origin=request.headers.origin;
 if(origin!==publicOrigin)return socket.destroy();
 sessions(request,{},()=>{
  if(!request.session?.token||!request.session.user)return socket.destroy();
  permitted(request.session.token,request.session.user.login).then(role=>{
   if(!role)return socket.destroy();wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request));
  }).catch(()=>socket.destroy());
 });
});
function broadcast(obj,exclude){let payload=JSON.stringify(obj);for(const [id,p] of peers)if(id!==exclude&&p.ws.readyState===1)p.ws.send(payload);}
wss.on('connection',(ws,req)=>{
 const user=req.session.user,id=crypto.randomUUID();peers.set(id,{ws,user,x:0,z:0});
 const send=obj=>ws.readyState===1&&ws.send(JSON.stringify(obj));
 send({type:'welcome',id,peers:[...peers].filter(([k])=>k!==id).map(([k,p])=>({id:k,user:p.user,x:p.x,z:p.z}))});
 broadcast({type:'join',id,user,x:0,z:0},id);
 ws.on('message',msg=>{
  if(msg.length>6000)return;let data;try{data=JSON.parse(msg)}catch{return};
  const self=peers.get(id);if(!self)return;
  if(data.type==='move'){
   // TF_DEV_ROOM_MOVE_SYNC_V1: allow teammates' avatars in development chamber X=42.5..81.5.
   const x=Number(data.x),z=Number(data.z);
   if(!Number.isFinite(x)||!Number.isFinite(z))return;
   self.x=x>=41&&x<=83?Math.max(42.5,Math.min(81.5,x)):Math.max(-19.5,Math.min(19.5,x));
   self.z=Math.max(-14.5,Math.min(14.5,z));
   broadcast({type:'move',id,x:self.x,z:self.z},id);
  }
  if(data.type==='chat'){broadcast({type:'chat',id,text:String(data.text||'').slice(0,140)},id);}
  if(['offer','answer','ice'].includes(data.type)&&typeof data.to==='string'&&peers.has(data.to)){
   const target=peers.get(data.to);if(JSON.stringify(data.payload||{}).length<5000&&target.ws.readyState===1)target.ws.send(JSON.stringify({type:data.type,from:id,payload:data.payload}));
  }
 });
 ws.on('close',()=>{peers.delete(id);broadcast({type:'leave',id});});
});
server.listen(PORT,'127.0.0.1',()=>console.log(`Towerflow room: ${PUBLIC_URL}/room/team02\nRepository: ${ROOT}\nGitHub OAuth configured: ${secretsConfigured}`));
