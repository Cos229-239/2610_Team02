'use strict';
const REPO='Cos229-239/2610_Team02';
const STATIONS=Object.freeze({
 lopobunnie:{label:'Lopobunnie ~ 💜',branch:'WilliamPersonal',project:'Windows Forms / CLI',
   files:['TowerFlowWindow/TowerFlowWinForm/Form1.cs','TowerFlow.cpp']},
 'svn-760':{label:'Malik',branch:'MalikPersonal',project:'Inventory / Operations',
   files:['TowerFlow Files/TowerFlow (Malik modified)/TowerFlowGUI.cpp']},
 hyperrealmend:{label:'Omarion',branch:'OmarionPersonal',project:'Reporting / Inventory',
   files:['Towerflow_OW/TowerFlow.slnx']},
 daynaperezcolon:{label:'Dayna',branch:'DaynaPersonal',project:'Interface / Components',
   files:['DisplayHelper.h']},
 dulskinator96:{label:'Dan',branch:'DanielPersonal',project:'Integration / 3D Room',
   files:['collaboration-room/azure-bridge/desk.js']}
});
const gitUrl=(ref,file)=>'https://github.com/'+REPO+'/blob/'+encodeURIComponent(ref)+'/'+file.split('/').map(encodeURIComponent).join('/');
async function readStation(login,token,{request,now=Date.now}={}){
 const key=String(login||'').toLowerCase(),config=STATIONS[key];
 if(!config)throw Error('Unknown team station');
 const get=request||(async route=>{
   const resp=await fetch('https://api.github.com/repos/'+REPO+route,{
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28','User-Agent':'TowerFlow-Member-Station'},
    redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!resp.ok)throw Error('GitHub HTTP '+resp.status);
   return resp.json();
 });
 const branch=config.branch;
 const [latest,...proof]=await Promise.allSettled([
   get('/commits?sha='+encodeURIComponent(branch)+'&per_page=1'),
   ...config.files.map(f=>get('/contents/'+f.split('/').map(encodeURIComponent).join('/')+'?ref='+encodeURIComponent(branch)))
 ]);
 if(latest.status!=='fulfilled'||!Array.isArray(latest.value)||!latest.value[0]?.sha)
   throw Error('Personal branch is inaccessible using the current GitHub session.');
 const commit=latest.value[0],sha=String(commit.sha);
 if(!/^[a-f0-9]{40}$/i.test(sha))throw Error('Invalid commit revision');
 const shaSafe=encodeURIComponent(sha);
 let recentFiles=[];
 try{
   const detail=await get('/commits/'+shaSafe);
   if(Array.isArray(detail?.files)){
     recentFiles=detail.files.slice(0,30).filter(item=>{
       const file=item?.filename;
       return typeof file==='string'&&file.length<260&&!file.startsWith('/')&&
         !file.includes('..')&&!file.includes('\\')&&
         ['added','modified','removed','renamed'].includes(item.status);
     }).map(item=>({path:item.filename,status:item.status,
       url:gitUrl(branch,item.filename)}));
   }
 }catch{/* A missing commit detail is not a reason to invent changed filenames. */}
 const files=config.files.map((f,i)=>{
   const item=proof[i]?.status==='fulfilled'?proof[i].value:null;
   const available=Boolean(item?.type==='file'&&/^[a-f0-9]{40}$/i.test(item.sha||''));
   return {path:f,available,sha:available?item.sha:null,url:gitUrl(branch,f)};
 });
 return {member:key,label:config.label,project:config.project,branch,
  updatedAt:new Date(now()).toISOString(),commit:{
   sha,title:String(commit.commit?.message||'').split('\n')[0].slice(0,150),
   date:commit.commit?.author?.date||null,author:commit.author?.login||commit.commit?.author?.name||'Unverified',
   url:'https://github.com/'+REPO+'/commit/'+sha
  },files,recentFiles,note:'Shows the actual remote GitHub branch. GitHub Desktop commits appear only after Push origin, and are not automatically merged to dev.'};
}
function mount(app,{auth,ensureMember,load=readStation}={}){
 if(typeof auth!=='function'||typeof ensureMember!=='function')throw Error('Member middleware required');
 app.get('/api/azure-bridge/team-stations',auth,ensureMember,(_req,res)=>{
  res.set('Cache-Control','no-store').json({schema:'towerflow-team-stations/v1',
   members:Object.entries(STATIONS).map(([login,v])=>({login,label:v.label,project:v.project,branch:v.branch}))});
 });
 app.get('/api/azure-bridge/team-stations/:login',auth,ensureMember,async(req,res)=>{
  res.set('Cache-Control','no-store').set('Referrer-Policy','no-referrer');
  const login=String(req.params.login||'').toLowerCase();
  if(!Object.hasOwn(STATIONS,login))return res.status(404).json({error:'Unknown station'});
  if(!req.session?.token)return res.status(401).json({error:'GitHub login required'});
  try{return res.json(await load(login,req.session.token));}
  catch{return res.status(502).json({error:'Remote branch or source unavailable; no invented changes displayed.'});}
 });
}
module.exports={STATIONS,readStation,mount};
