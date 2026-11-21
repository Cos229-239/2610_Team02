'use strict';
// Read-only file-level contribution coverage; no execution or disk writes.
// "Works" can only be asserted from independently verified test evidence,
// never from a present file, a successful fetch, or a commit alone.
const repo = 'Cos229-239/2610_Team02';
const base = 'https://api.github.com/repos/' + repo;
const targets = Object.freeze({
  'svn-760': {login:'SVN-760',name:'Malik',ref:'dev',roots:['TowerFlow Files/TowerFlow (Malik modified)/'],expected:[
    'TowerFlow Files/TowerFlow (Malik modified)/CMakeLists.txt',
    'TowerFlow Files/TowerFlow (Malik modified)/TowerFlowGUI.cpp',
    'TowerFlow Files/TowerFlow (Malik modified)/TowerFlowGUI.h',
    'TowerFlow Files/TowerFlow (Malik modified)/tests/OperationsTests.cpp']},
  hyperrealmend:{login:'HyperRealmEnd',name:'Omarion',ref:'dev',roots:['Towerflow_OW/'],expected:[
    'Towerflow_OW/TowerFlow.slnx',
    'Towerflow_OW/TowerFlow/Inventory.cpp',
    'Towerflow_OW/TowerFlow/Report.cpp',
    'Towerflow_OW/TowerFlow/UserInterface.cpp']},
  daynaperezcolon:{login:'DaynaPerezColon',name:'Dayna',ref:'dev',files:/^(?:DisplayHelper|InputVailidation|InputValidation|InventoryStorage|Item|Logger)\.h$/i,expected:[
    'DisplayHelper.h','InputVailidation.h','InventoryStorage.h','Logger.h']},
  lopobunnie:{login:'Lopobunnie',name:'William',ref:'WilliamPersonal',roots:['TowerFlowWindow/TowerFlowWinForm/'],expected:[
    'TowerFlowWindow/TowerFlowWinForm/TowerFlowWinForm.slnx',
    'TowerFlowWindow/TowerFlowWinForm/Form1.cs',
    'TowerFlowWindow/TowerFlowWinForm/PartData.cs',
    'TowerFlowWindow/TowerFlowWinForm/TowerFlowWinForm.csproj']}
});
const skip = /(^|\/)(?:bin|obj|x64|Debug|Release|node_modules|build|\.vs)\//i;
const codeFile = /\.(?:c|cc|cpp|cxx|h|hpp|cs|csproj|vcxproj|sln|slnx|js|mjs|cjs)$/i;
function belongs(target,path) {
  return typeof path==='string' && !path.split('/').some(p=>p==='..'||p==='.'||!p) &&
    !/[\\:\x00-\x1f]/.test(path) && !skip.test(path) && codeFile.test(path) &&
    (target.expected.includes(path) || target.roots?.some(root=>path.startsWith(root)) || target.files?.test(path));
}
function summarize(target, devTree, ownTree, evidence) {
  const devPaths=new Set(devTree.map(x=>x.path));
  const personalPaths=new Set(ownTree.map(x=>x.path));
  const all=[...new Set([...target.expected,
    ...devTree.map(f=>f.path).filter(p=>belongs(target,p)),
    ...ownTree.map(f=>f.path).filter(p=>belongs(target,p))])].slice(0,80);
  const files=all.map(path=>{
    const inDev=devPaths.has(path), inPersonal=personalPaths.has(path);
    const association=evidence[path]; // true/false/null; only true confirms GitHub author evidence
    const contribution=inDev ? (association===true?'confirmed':association===false?'unattributed':'unknown') : 'not-on-dev';
    const color=!inDev ? (inPersonal?'amber':'red') : association===true?'green':'amber';
    return {path,expected:target.expected.includes(path),inDev,inPersonal,contribution,color,build:'not-run',runtime:'unverified',
      finding:!inDev?(inPersonal?'Present on personal branch; missing from dev':'Missing from dev and personal branch')
        :association===true?'Contributor commit associated with this file; runtime not verified'
        :'File exists on dev; contributor attribution/functional outcome not verified'};
  });
  return {member:target.login,branch:'dev',personalBranch:target.ref,files,
    counts:{dev:files.filter(x=>x.inDev).length,missing:files.filter(x=>x.expected&&!x.inDev).length,
      red:files.filter(x=>x.color==='red').length},
    verdict:files.some(x=>x.expected&&!x.inDev)?'missing-dev-contributions':'needs-runtime-validation',
    working:[],notWorking:[],
    missing:files.filter(x=>x.expected&&!x.inDev).map(x=>x.path),
    unknown:['No native build/test receipts collected','No verified runtime or adapter contract evidence'],
    caveat:'Green means GitHub source and author history verified, NOT working code. Red means expected file absent from dev and personal branch; author-email mismatch may affect attribution.'};
}
function makeCollaboratorAudit(read=fetch,clock=Date.now) {
  const cache=new Map();
  return async function audit(member,token){
    const target=targets[String(member||'').toLowerCase()];
    if(!target) throw Object.assign(Error('Unknown collaborator'),{status:400});
    const cached=cache.get(target.login);
    if(cached && clock()<cached.until) return cached.result;
    const headers={Authorization:'Bearer '+token,'User-Agent':'TowerFlow-Collaborator-Audit',Accept:'application/vnd.github+json'};
    const get=async route=>{
      const response=await read(base+route,{headers,redirect:'error',signal:AbortSignal.timeout(12000)});
      if(!response.ok) throw Error('GitHub audit request failed');
      return response.json();
    };
    const getTree=async ref=>{
      const commit=await get('/commits/'+encodeURIComponent(ref));
      const sha=commit?.commit?.tree?.sha;
      if(!/^[0-9a-f]{40}$/.test(sha||'')) throw Error('Missing validated tree revision');
      const tree=await get('/git/trees/'+sha+'?recursive=1');
      if(tree.truncated || !Array.isArray(tree.tree)) throw Error('Incomplete repository tree');
      return {revision:commit.sha,files:tree.tree.filter(e=>e.type==='blob'&&typeof e.path==='string'&&!skip.test(e.path))};
    };
    const dev=await getTree('dev');
    const own=target.ref==='dev'?dev:await getTree(target.ref).catch(()=>({revision:null,files:[]}));
    const evidence={};
    // Bounded requests: no cloning or downloading source code into the server.
    await Promise.all(target.expected.filter(p=>dev.files.some(f=>f.path===p)).map(async path=>{
      try {
        const records=await get('/commits?'+new URLSearchParams({sha:'dev',author:target.login,path,per_page:'1'}));
        evidence[path]=Array.isArray(records)?records.length>0:null;
      }catch{evidence[path]=null;}
    }));
    const report={...summarize(target,dev.files,own.files,evidence),
      revision:dev.revision,personalRevision:own.revision,checkedAt:new Date(clock()).toISOString()};
    cache.set(target.login,{result:report,until:clock()+30000});
    return report;
  };
}
// Fetch only explicitly allowlisted contributor source for the authenticated viewer.
function makeCollaboratorSource(read=fetch) {
  return async function source(member, file, ref, token) {
    const target=targets[String(member||'').toLowerCase()];
    if(!target || !belongs(target,file) ||
      (ref!=='dev' && ref!==target.ref)) {
      throw Object.assign(Error('Not an allowlisted source path'),{status:400});
    }
    const encoded=file.split('/').map(encodeURIComponent).join('/');
    const response=await read(base+'/contents/'+encoded+'?'+new URLSearchParams({ref}),{
      headers:{Authorization:'Bearer '+token,'User-Agent':'TowerFlow-Collaborator-Source',
        Accept:'application/vnd.github+json'},
      redirect:'error',signal:AbortSignal.timeout(12000)
    });
    if(response.status===404)throw Object.assign(Error('Source missing on requested branch'),{status:404});
    if(!response.ok)throw Error('GitHub source unavailable');
    const data=await response.json();
    if(data.type!=='file'||data.encoding!=='base64'||!Number.isInteger(data.size)||
      data.size<0||data.size>65536||typeof data.content!=='string')throw Error('Unsupported source file');
    const bytes=Buffer.from(data.content.replace(/\s/g,''),'base64');
    if(bytes.length!==data.size || bytes.includes(0))throw Error('Invalid text source payload');
    return {path:file,ref,size:bytes.length,sha:data.sha,content:bytes.toString('utf8'),
      verification:'Source retrieved only; builds and runtime behavior not tested'};
  };
}
module.exports={targets,summarize,makeCollaboratorAudit,makeCollaboratorSource};
