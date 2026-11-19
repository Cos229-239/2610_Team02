'use strict';
// Read-only TowerFlow host acceptance preflight. Never invokes the installer,
// stops a service, changes Git state, or modifies user files.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const http=require('node:http');
const https=require('node:https');
const EXPECTED=[
 'server.cjs','ide-workstations.js','azure-ai-connect.js','two-mode-contribute.js',
 'companion-client.js','app-hub.js','loadout.css','direct-integration.cjs'
];
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function inspectRoom(room){
 const checks=[],push=(id,ok,details)=>checks.push({id,status:ok?'PASS':'BLOCK',details});
 if(!path.isAbsolute(room))throw Error('Room path must be absolute.');
 const server=path.join(room,'server.js');
 const scene=path.join(room,'public','room.js');
 const local=path.join(room,'azure-bridge');
 const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;
 const serverBody=read(server),sceneBody=read(scene);
 push('host-server-present',!!serverBody,server);
 push('bridge-mounted',!!serverBody&&serverBody.includes("require('./azure-bridge/server.cjs').mount(app"),'Active server.js must mount Azure Bridge before room route.');
 push('source-scene-present',!!sceneBody,scene);
 push('scene-dev-station-routing',!!sceneBody&&sceneBody.includes('window.tfOpenIDEStation?.(id)'),
   'Without this marker, 3D E/click still opens legacy placeholders, even if the bridge scripts exist.');
 push('scene-business-projector',!!sceneBody&&sceneBody.includes('TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN'),
   'Business Studio physical projector must be integrated into the host scene separately from bridge scripts.');
 if(sceneBody)checks.push({id:'observed-scene-sha256',status:'INFO',details:sha(Buffer.from(sceneBody,'utf8'))});
 for(const name of EXPECTED){
   const installed=read(path.join(local,name));
   push('installed-'+name,installed!==null,'Expected '+name+' inside host azure-bridge folder.');
   if(installed!==null&&name.endsWith('.js')){
      const expectedFile=path.join(__dirname,'..','collaboration-room','azure-bridge',name);
      if(fs.existsSync(expectedFile)){
        const expected=fs.readFileSync(expectedFile);
        push('version-'+name,sha(Buffer.from(installed,'utf8'))===sha(expected),
          'Installed SHA256: '+sha(Buffer.from(installed,'utf8')).slice(0,16)+
          ' · Release SHA256: '+sha(expected).slice(0,16));
      }
   }
 }
 return checks;
}
function fetchText(url,{timeout=4000}={}){
 return new Promise((resolve,reject)=>{
  const u=new URL(url);
  if(!['http:','https:'].includes(u.protocol))return reject(Error('HTTP(S) only'));
  const lib=u.protocol==='https:'?https:http;
  const req=lib.get(u,{timeout,headers:{'Cache-Control':'no-cache'}},res=>{
    const chunks=[];let bytes=0;
    res.on('data',chunk=>{bytes+=chunk.length;if(bytes<=2*1024*1024)chunks.push(chunk);else req.destroy(Error('Response exceeds 2 MiB'));});
    res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString('utf8')}));
  });
  req.on('error',reject);req.on('timeout',()=>req.destroy(Error('Timeout')));
 });
}
async function inspectHttp(base='http://127.0.0.1:4173'){
 const checks=[],routes=[
  ['/room/team02','text/html','azure-bridge/ide-workstations.js'],
  ['/azure-bridge/ide-workstations.js','script','window.tfOpenIDEStation=display'],
  ['/azure-bridge/azure-ai-connect.js','script','Connect my AI'],
  ['/towerflow-entry.mjs','script','tfOpenIDEStation']
 ];
 for(const [route,kind,expected] of routes){
   let result;
   try{result=await fetchText(base.replace(/\/$/,'')+route);}
   catch(error){checks.push({id:'http-'+route,status:'BLOCK',details:error.message});continue;}
   // Cloudflare Access / GitHub OAuth may redirect; record that, never claim pass.
   const match=result.status===200&&result.text.includes(expected);
   checks.push({id:'http-'+route,status:match?'PASS':'BLOCK',
      details:'HTTP '+result.status+' · Expected '+kind+' evidence: '+expected});
 }
 return checks;
}
function summarize(results){
 const blocked=results.filter(x=>x.status==='BLOCK');
 for(const row of results)console.log('['+row.status+'] '+row.id+' — '+row.details);
 console.log('\n'+(blocked.length?
   'NOT READY: '+blocked.length+' acceptance checks blocked. No files or processes changed.':
   'PREFLIGHT PASS: expected files and served routes observed. GUI/desktop/debugger still require physical acceptance.'));
 return blocked.length===0;
}
async function main(args=process.argv.slice(2)){
 if(args.length<1||args.length>2)throw Error('Usage: node tools/towerflow-dev-preflight.cjs <absolute-room-path> [http://127.0.0.1:4173]');
 const [room,origin='http://127.0.0.1:4173']=args;
 const u=new URL(origin);
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash)
   throw Error('Use a plain HTTP(S) origin without credentials.');
 const result=[...inspectRoom(room),...await inspectHttp(origin)];
 process.exitCode=summarize(result)?0:2;
}
if(require.main===module)main().catch(e=>{console.error('READ-ONLY PREFLIGHT FAILED: '+e.message);process.exitCode=2;});
module.exports={inspectRoom,inspectHttp,fetchText,summarize};
