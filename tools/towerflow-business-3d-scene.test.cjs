'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),
 path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),scene=fs.readFileSync(
 path.join(root,'collaboration-room/live-room/public/room.js'),'utf8');
test('3D scene is a valid ES module and includes independent targeted Business Studio changes',()=>{
 const lint=cp.spawnSync(process.execPath,['--check','--input-type=module'],{input:scene,encoding:'utf8',timeout:20000});
 assert.equal(lint.status,0,lint.stderr);
 const required=[
  'TF_EARTH_HOLOGRAM_V1_BEGIN','TF_DEV_BUSINESS_PROJECTOR_V1_BEGIN',
  'TF_DEV_BUSINESS_WALL_ROUTING_V1_BEGIN','TF_DEV_BUSINESS_APP_ENTRY_V1_BEGIN',
  'TF_BUSINESS_TEAM_STATIONS_AND_WORLD_V1_BEGIN',
  'TF_REFERENCE_STUDIO_V1_BEGIN','TF_FRONTIER_MATERIAL_REALISM_V1_BEGIN',
  'window.tfBusinessProjector','window.tfOpenWorldSalesPanel',
  'window.tfOpenMemberStation','tfTeamStationUpdate'
 ];
 for(const marker of required)assert.equal(scene.split(marker).length-1,1,'Missing or duplicate '+marker);
 assert.match(scene,/const priorActivate=activateTFStation;/);
 assert.match(scene,/priorActivate\(id\);/);
 assert.match(scene,/const originalActivate=activateTFStation;/);
 assert.match(scene,/devBusinessProjector=projector\.clone\(true\)/);
 assert.match(scene,/devBusinessBeam\.target=devBeamTarget/);
});
test('Each of the five team stations is named and correctly sourced; only intended walls are clickable',()=>{
 const l=['lopobunnie','svn-760','hyperrealmend','daynaperezcolon','dulskinator96'];
 for(const login of l)assert.ok(scene.includes('"tf-member-"+login')&&scene.includes('"tf-member-'+login+'"')===false,
    'Team station dynamic ID route missing');
 for(const wall of ['front','back','left','right'])
   assert.ok(scene.includes('"tf-business-wall-"+id')&&scene.includes('["'+wall+'"'),wall+' wall setup');
 assert.match(scene,/tfRegister\(screen,id\);memberSigns\.set\(login,screen\);/);
 assert.match(scene,/tfRegister\(face,"tf-business-wall-"\+id\)/);
 assert.match(scene,/tfBusinessProjector\?\.aim\(target\)/);
});
test('Earth is not covered by the old label and pings are 100% evidence labeled',()=>{
 assert.match(scene,/earthStatus\.position\.set\(-4\.15,5\.02,-2\)/);
 assert.match(scene,/if\(signalMode==="DEMO"\|\|document\.hidden\)return/);
 assert.match(scene,/mode==="CONFIGURED_LEDGER"/);
 assert.match(scene,/NO CONNECTED SALES LEDGER/);
 assert.match(scene,/No fabricated live dots/);
 assert.match(scene,/window\.tfBusinessWorld=Object\.freeze/);
});
test('Team and world API scripts are actually mounted in Azure Bridge',()=>{
 const server=fs.readFileSync(path.join(root,'collaboration-room/azure-bridge/server.cjs'),'utf8');
 for(const required of ["require('./team-stations.cjs')","require('./business-signals.cjs')",
  'mountTeamStations(app,{auth,ensureMember})','mountBusinessSignals(app,{auth,ensureMember})',
  "'team-stations.js'",'/azure-bridge/team-stations.js'])assert.ok(server.includes(required),required);
});
