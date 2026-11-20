'use strict';
const REPO='Cos229-239/2610_Team02';
const validNumber=n=>Number.isSafeInteger(n)&&n>=1&&n<=1000000;
const validLogin=s=>typeof s==='string'&&/^[a-z\d-]{1,39}$/i.test(s);
function evaluate(pr,files,login,number){
 if(!pr||!Array.isArray(files)||!validNumber(number)||!validLogin(login))throw Error('Bad evidence');
 const owned=String(pr.user?.login||'').toLowerCase()===login.toLowerCase();
 const base=pr.base?.ref==='dev'&&pr.base?.repo?.full_name===REPO;
 const head=pr.head?.repo?.full_name===REPO&&/^[a-f0-9]{40}$/i.test(pr.head?.sha||'');
 const fileCheck=files.length>0&&files.length<101&&files.every(f=>typeof f.filename==='string'&&f.filename.length<300);
 const warnings=[];
 if(!owned)warnings.push('Pull request author does not match signed-in member.');
 if(!base)warnings.push('PR does not target Team 02 dev.');
 if(!head)warnings.push('PR branch/commit is outside the inspected Team 02 repository.');
 if(!fileCheck)warnings.push('Changed file verification incomplete.');
 if(!pr.draft)warnings.push('PR is not a draft; review and deployment are not implied.');
 const accepted=owned&&base&&head&&fileCheck&&pr.state==='open';
 return {schema:'towerflow-ai-contribution-proof/v1',accepted,
  state:accepted?'SOURCE_CONTRIBUTION_OBSERVED':'NOT_VERIFIED',
  providerConnected:false,aiAuthorVerified:false,automaticDeployment:false,
  repository:REPO,pr:{number,title:pr.title,html_url:pr.html_url,
   author:pr.user?.login,draft:pr.draft,headSha:pr.head?.sha,
   files:files.map(f=>({name:f.filename,status:f.status,additions:f.additions,deletions:f.deletions}))},
  warnings,note:'Verifies an authenticated contributor PR, not which AI produced it or whether any AI is currently connected.'};
}
function mount(app,{auth,ensureMember,readGitHub}){
 if(typeof auth!=='function'||typeof ensureMember!=='function')throw Error('Auth required');
 const read=readGitHub|| (async(route,token)=>{
   const response=await fetch('https://api.github.com/repos/'+REPO+route,{
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
     'X-GitHub-Api-Version':'2022-11-28','User-Agent':'TowerFlow-AI-Integration'},
    redirect:'error',signal:AbortSignal.timeout(8000)
   });
   if(!response.ok)throw Error('GitHub HTTP '+response.status);
   return response.json();
 });
 app.get('/api/azure-bridge/ai-contribution-proof/:number',auth,ensureMember,async(req,res)=>{
  res.set('Cache-Control','no-store');res.set('Referrer-Policy','no-referrer');
  const number=Number(req.params.number),member=req.session?.user?.login;
  if(!validNumber(number)||!validLogin(member))return res.status(400).json({error:'Invalid PR or login.'});
  try{
   const pr=await read('/pulls/'+number,req.session.token);
   if(String(pr.user?.login||'').toLowerCase()!==member.toLowerCase())
    return res.status(403).json({error:'Use a PR authored by your own GitHub account.'});
   const files=await read('/pulls/'+number+'/files?per_page=100',req.session.token);
   return res.json(evaluate(pr,files,member,number));
  }catch{
   return res.status(502).json({error:'GitHub proof unavailable. No file changes or AI connection verified.'});
  }
 });
}
module.exports={mount,evaluate,validNumber};
