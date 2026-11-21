'use strict';
// Read-only dev intake; never evaluates or executes contributed source.
const {teamRepo} = require('./loadouts.cjs');
const origin = 'https://api.github.com/repos/' + teamRepo;
const owners = Object.freeze([
  {login:'SVN-760',name:'Malik',roots:['TowerFlow Files/TowerFlow (Malik modified)/']},
  {login:'HyperRealmEnd',name:'Omarion',roots:['Towerflow_OW/','Towerflow/TowerFlow/']},
  {login:'DaynaPerezColon',name:'Dayna',roots:[],files:/^(?:DisplayHelper|InputVailidation|InputValidation|InventoryStorage|Item|Logger)\.h$/i},
  {login:'Lopobunnie',name:'William',roots:['TowerFlowWindow/']}
]);
const generated = /(^|\/)(?:bin|obj|x64|Debug|Release|node_modules|build|\.vs)\//i;
const native = /\.(?:cpp|cxx|cc|h|hpp|c|cs|csproj|vcxproj|sln|slnx)$/i;
const web = /\.(?:html|css|js|mjs|cjs|json)$/i;
const safeSha = /^[a-f0-9]{40}$/;
function classify(files) {
  const changes = [];
  const members = new Set();
  const languages = new Set();
  const subsystems = new Set();
  let relevant=0;
  for (const f of files) {
    const path = f?.filename;
    if (typeof path !== 'string' || f.status === 'removed' || generated.test(path)) continue;
    relevant++;
    const owner = owners.find(o=>o.roots.some(root=>path.startsWith(root)) || o.files?.test(path));
    if (owner) members.add(owner.login);
    if (/\.(?:cpp|cxx|cc|h|hpp|c)$/i.test(path)) languages.add('C++');
    else if (/\.cs$/i.test(path)) languages.add('C#');
    else if (/\.(?:js|mjs|cjs)$/i.test(path)) languages.add('JavaScript');
    else if (/\.html$/i.test(path)) languages.add('HTML');
    else if (/\.css$/i.test(path)) languages.add('CSS');
    if (path.startsWith('collaboration-room/')) subsystems.add('room');
    if (path.startsWith('TowerFlow/') && !path.startsWith('TowerFlow/TowerFlow.Native/')) subsystems.add('web-business');
    if (native.test(path) || path.endsWith('CMakeLists.txt')) subsystems.add('native');
    if (web.test(path)) subsystems.add('web');
    if (changes.length < 40) changes.push({path,status:f.status || 'modified'});
  }
  return {members:[...members],languages:[...languages],subsystems:[...subsystems],
    files:changes,filesTruncated:relevant>changes.length};
}
function makeIntegrationIntake(read=fetch, clock=Date.now) {
  let cached=null, until=0;
  return async function intake(token) {
    if (cached && clock()<until) return cached;
    const signal=AbortSignal.timeout(12000);
    const get=async route=>{
      const res=await read(origin+route,{headers:{Authorization:'Bearer '+token,
        'User-Agent':'TowerFlow-Integration-Intake',Accept:'application/vnd.github+json'},
        redirect:'error',signal});
      if (!res.ok) throw Error('GitHub dev intake unavailable');
      return res.json();
    };
    const commits=await get('/commits?sha=dev&per_page=12');
    if (!Array.isArray(commits) || !commits.every(c=>safeSha.test(c.sha))) throw Error('Invalid dev history');
    const entries=await Promise.all(commits.map(async commit=>{
      const base={sha:commit.sha,title:String(commit.commit?.message||'').split('\n')[0],
        author:commit.author?.login || commit.commit?.author?.name || 'Unknown',
        at:commit.commit?.committer?.date || null,branch:'dev',
        integration:'unverified',build:'not-run',runtime:'not-deployed'};
      try {
        const detail=await get('/commits/'+commit.sha+'?per_page=100');
        if (!Array.isArray(detail.files) || detail.files.length>=100)
          return {...base,inspection:'incomplete',reason:'File detail exceeds intake evidence limit'};
        return {...base,inspection:'complete',...classify(detail.files),
          reason:'Merged into dev; build, contract, and runtime integration require independent proof'};
      } catch {
        return {...base,inspection:'unavailable',reason:'GitHub file metadata unavailable'};
      }
    }));
    const response={branch:'dev',revision:commits[0]?.sha || null,checkedAt:new Date(clock()).toISOString(),entries};
    cached=response;until=clock()+30000;
    return response;
  };
}
module.exports={owners,classify,makeIntegrationIntake};
