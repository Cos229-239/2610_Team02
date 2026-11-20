'use strict';
// The hub indexes real GitHub pull requests; it never claims to deploy or merge them.
const REPO='Cos229-239/2610_Team02';
const CATALOG=Object.freeze({
  dashboard:{label:'Dashboard',path:'TowerFlow/index.html',description:'Overview, account metrics and dashboard layout.',kind:'web'},
  market:{label:'Markets & Watchlist',path:'TowerFlow/app.js',description:'Market clock, watchlist and market information. Currently shares app.js with other modules.',kind:'web'},
  portfolio:{label:'Portfolio & Trades',path:'TowerFlow/app.js',description:'Holdings, transaction history and import/export. Currently shares app.js.',kind:'web'},
  analytics:{label:'Analytics & Projection',path:'TowerFlow/app.js',description:'Charts, performance calculations and what-if projections.',kind:'web'},
  app:{label:'Shared Web App',path:'TowerFlow/index.html',description:'Changes that span multiple dashboard or market areas.',kind:'web'},
  room:{label:'Collaboration Room',path:'collaboration-room/azure-bridge/desk.js',description:'Room, workstations, visuals, interaction and developer integrations.',kind:'room'},
  native:{label:'Native & Desktop',path:'TowerFlow/TowerFlow.Native',description:'C++, C#, Visual Studio and desktop applications; demonstrated separately.',kind:'native'},
  other:{label:'Other & Unassigned',path:'README.md',description:'Documentation, tools or contributions that have not been assigned to an app area.',kind:'other'}
});
const AREAS=Object.keys(CATALOG);
function parseArea(body) {
  if(typeof body!=='string') return null;
  const matches=[...body.matchAll(/(?:^|\n)TowerFlow-Area:\s*([a-z]+)\s*(?=\n|$)/gi)];
  return matches.length===1 && Object.hasOwn(CATALOG,matches[0][1].toLowerCase())
    ? matches[0][1].toLowerCase():null;
}
function classifyFiles(files) {
  const paths=(files||[]).map(f=>f.filename).filter(p=>typeof p==='string');
  if(paths.some(p=>/^TowerFlow\/TowerFlow\.Native\/|^Towerflow_OW\/|^TowerFlow Files\/|^TowerFlowWindow\//i.test(p)))return 'native';
  if(paths.some(p=>/^collaboration-room\//.test(p)))return 'room';
  if(paths.some(p=>/^TowerFlow\/(?!TowerFlow\.Native\/)/.test(p)))return 'app';
  return 'other';
}
function moduleFor(pr,files) {
  const tagged=parseArea(pr.body);
  const inferred=classifyFiles(files);
  // A PR tag is a contributor's declared intent, not proof of an integrated runtime.
  // Reject incompatible declarations for native/room-only changes.
  if (tagged && inferred && CATALOG[tagged].kind !== CATALOG[inferred].kind) return inferred;
  return tagged||inferred||'other';
}
function createIndex(read=fetch,clock=Date.now) {
  let cached,until=0;
  return async function readIndex(token) {
    if (cached && clock()<until) return cached;
    const promise=(async()=>{
      const headers={Authorization:'Bearer '+token,'User-Agent':'TowerFlow-App-Hub',Accept:'application/vnd.github+json'};
      const get=async(route)=>{
        const res=await read('https://api.github.com/repos/'+REPO+route,
          {headers,redirect:'error',signal:AbortSignal.timeout(12000)});
        if(!res.ok) throw Error('GitHub integration data unavailable');
        return res.json();
      };
      const prs=await get('/pulls?state=all&base=dev&sort=updated&direction=desc&per_page=18');
      if(!Array.isArray(prs))throw Error('Invalid GitHub pull request response');
      const entries=[];
      // Bound remote work and avoid exposing private account data beyond authenticated members.
      for(const batchStart of [0,4,8,12,16]){
        const batch=prs.slice(batchStart,batchStart+4);
        const rows=await Promise.all(batch.map(async p=>{
          if(!Number.isSafeInteger(p.number)||p.number<1)return null;
          let files=null;
          try {
            const found=await get('/pulls/'+p.number+'/files?per_page=100');
            if(Array.isArray(found))files=found;
          }catch{ /* A PR remains visible, but its classification is unverified. */ }
          const area=files?moduleFor(p,files):parseArea(p.body)||'other';
          return {number:p.number,title:String(p.title||'Contribution').slice(0,160),
            area,areaVerified:Boolean(files),author:String(p.user?.login||'unknown').slice(0,64),
            state:p.merged_at?'merged':p.state==='open'?(p.draft?'draft':'review'):'closed',
            head:String(p.head?.ref||'').slice(0,160),sha:/^[a-f\d]{40}$/i.test(p.head?.sha)?p.head.sha:null,
            updatedAt:p.updated_at, changedFiles:Array.isArray(files)?files.length:null};
        }));
        entries.push(...rows.filter(Boolean));
      }
      return {areas:CATALOG,prs:entries,checkedAt:new Date(clock()).toISOString(),limitedTo:18};
    })();
    cached=promise;until=clock()+45_000;
    try{return await promise;}catch(e){if(cached===promise){cached=null;until=0;}throw e;}
  };
}
function mount(app,{auth,ensureMember,index=createIndex()}){
  app.get('/api/azure-bridge/app-hub',auth,ensureMember,async(req,res)=>{
    res.set('Cache-Control','no-store');
    try{res.json(await index(req.session.token));}
    catch{res.status(502).json({error:'Unable to read Team 02 pull requests right now.'});}
  });
}
module.exports={CATALOG,AREAS,parseArea,classifyFiles,moduleFor,createIndex,mount};
