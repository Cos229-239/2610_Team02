'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function read(file){return fs.readFileSync(path.join(root,file),'utf8');}
test('Azure AI bridge is loaded through mounted room HTML, never captures secrets',()=>{
 const server=read('collaboration-room/azure-bridge/server.cjs');
 const installer=read('collaboration-room/azure-bridge/install.cjs');
 const bridge=read('collaboration-room/azure-bridge/azure-ai-connect.js');
 assert.match(server,/<script src="\/azure-bridge\/azure-ai-connect\.js" defer><\/script>/);
 assert.match(server,/'azure-ai-connect\.js'/);
 assert.match(installer,/'azure-ai-connect\.js'/);
 assert.match(server,/environment-manifest/);
 assert.match(server,/room:\{route:'\/room\/team02',htmlSha256:digest\(html\),sceneSha256:digest\(js\)/);
 assert.match(bridge,/CURRENT HOST ENVIRONMENT SNAPSHOT/);
 assert.match(bridge,/credentials:'same-origin'/);
 for(const text of ['ChatGPT','Grok','Venice','Another AI','Generate & copy integration prompt','Check my TowerFlow access'])
   assert.ok(bridge.includes(text),text+' absent');
 assert.ok(bridge.includes('README.md') && bridge.includes('Source starting point'), 'AI must request real repository verification');
 assert.ok(bridge.includes('A prompt cannot grant access') || bridge.includes('cannot grant permissions'), 'Handoff must be honest about permissions');
 assert.equal(/(?:localStorage\.setItem|sessionStorage\.setItem|new WebSocket|fetch\(['"]https:\/\/api\.)/.test(bridge),false,
   'Do not save external credentials or call paid AI APIs');
});
test('development-room projector duplicates physical body without touching original controller',()=>{
 const room=read('collaboration-room/live-room/public/room.js');
 const from=room.indexOf('// TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN'),to=room.indexOf('// TF_DEV_BUSINESS_PROJECTOR_V1_END');
 assert.ok(from>0&&to>from, 'Reviewed duplicate markers required');
 const addition=room.slice(from,to);
 for(const fragment of [
  'projector.clone(true)', 'devBusinessProjector.position.set(tfRoomX',
  'devBusinessBeam.target=devBeamTarget', 'tfRegister(devBusinessScreen,"dev-business-projector")',
  'stations.push({id:"dev-business-projector"',
  'function openDevBusinessStudio()',
  'window.tfOpenMemberDesk?.()','window.tfOpenAppIntegrationHub?.()','window.tfOpenAzureAIConnect()'])
  assert.ok(addition.includes(fragment), 'Missing projection or control: '+fragment);
 assert.match(room,/if\(id==="dev-business-projector"\)\{openDevBusinessStudio\(\);return;\}/);
 assert.equal((room.match(/TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN/g)||[]).length,1);
 assert.ok(room.indexOf('const originalActivate=activateTFStation;')<room.indexOf('if(id==="dev-business-projector")'),
   'Must reuse existing station E and click handling');
});
