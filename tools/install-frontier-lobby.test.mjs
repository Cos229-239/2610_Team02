import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {patchRoom,assertKnownFrontierInstallation} from './install-frontier-lobby.mjs';
const addon=readFileSync(new URL('../integrations/frontier/frontier-lobby.js',import.meta.url),'utf8');
const room=[
  "import * as THREE from 'three';",
  "// TF_DEV_ROOM_V1",
  "// TF_CONFIG_AGENT_V1_BEGIN",
  "// TF_AURA_ROOM_CLIENT_V1_BEGIN",
  "let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;",
  "function activateTFStation(id) {}"
].join('\n');
test('three-room section controls and projector added without touching navigation',()=>{
 const next=patchRoom(room,addon);
 assert.match(next,/FRONTIER  \/  TOWERFLOW/);
 assert.match(next,/WORLD STUDIO/);
 assert.match(next,/DEVELOPMENT IDE/);
 assert.match(next,/SpotLight/);
 assert.match(next,/github\.dev\/Cos229-239\/2610_Team02/);
 assert.match(next,/api\/files/);
 assert.match(next,/let vx=-Math\.sin\(yaw\)/);
 assert.equal(patchRoom(next,addon),next);
});
test('prevents overwritten unrecognized environment',()=>{
 assert.throws(()=>patchRoom(room.replace('// TF_DEV_ROOM_V1',''),addon),/preservation anchor/);
 assert.throws(()=>patchRoom(room.replace('let vx=-Math.sin(yaw)*fw+Math.cos(yaw)*side;',''),addon),/preservation anchor/);
 assert.throws(()=>patchRoom(room+'// TF_FRONTIER_LOBBY_V1_BEGIN',addon),/Partial/);
});
test('source editor uses read APIs and explicit save confirmation',()=>{
 assert.match(addon,/api\/file\?path/);
 assert.match(addon,/confirm\("Save/);
 assert.match(addon,/server\.content!==originalCode/);
 assert.doesNotMatch(addon,/child_process|execSync|eval\(|new Function\(/);
});

test('wall-only projector flow cannot open a separate tab or activate from proximity',()=>{
 assert.match(addon,/startWallProjection/);
 assert.match(addon,/wallLayout/);
 assert.match(addon,/projectorState\.tick/);
 assert.match(addon,/projectorState\.activate/);
 assert.match(addon,/projectorState\.powerOff/);
 assert.match(addon,/state\.portalEnabled/);
 assert.match(addon,/screen\.visible=state\.portalEnabled/);
 assert.match(addon,/tfRegister\(left,"frontier-world"\)/);
 assert.match(addon,/tfRegister\(right,"frontier-ide"\)/);
 assert.doesNotMatch(addon,/popup\.target="_blank"/);
 assert.doesNotMatch(addon,/stations\.push\(\{id:"frontier-towerflow-/);
 const patched=patchRoom(room,addon);
 assert.match(patched,/let vx=-Math\.sin\(yaw\)/);
});
test('original fixtures and separate AURA orb preserve their identity',()=>{
 assert.match(addon,/originalFixtures=scene\.children\.filter/);
 assert.match(addon,/f\.mesh\.position\.y=f\.y-clearing\*7\.3/);
 assert.match(addon,/pad\.group\.position\.y=pad\.baseY-clearing\*4\.6/);
 assert.match(addon,/row\.station\.x=clearing/);
 assert.match(addon,/orb\.position\.set\(16\.9,3\.1,12\.4\)/);
 assert.match(addon,/projector\.position\.y=12\.1-descended\*8\.5/);
 assert.match(addon,/color:0x9adfff,metalness:\.96/);
});

test('Rocky greeting is audio only: no official video player, floating video control, or embed',()=>{
 assert.match(addon,/tfRockyGreeting/);
 assert.match(addon,/document\.createElement\("audio"\)/);
 assert.doesNotMatch(addon,/TF_ROCKY_OFFICIAL_VIDEO_V1|tfRockyOfficial|tfOfficialRockyVideo|youtube-nocookie|showOfficialRockyVideo/);
});

test('cyber layer is optional, tied to original world scene and not a new dashboard',()=>{
 assert.match(addon,/TowerflowCyberAmbience\?\.install/);
 assert.match(addon,/cyberAmbience\?\.update\(now\)/);
 assert.match(addon,/TowerflowCinematicFidelity\?\.install/);
 assert.match(addon,/cinematicFidelity\?\.update\(now\)/);
 assert.match(addon,/mountReviewedGLB/);
 assert.match(addon,/TowerflowKineticPedestals\?\.install/);
 assert.match(addon,/TowerflowNeonLighting\?\.install/);
 assert.match(addon,/TowerflowTeamChatDock\?\.install/);
 assert.match(addon,/pedestalPick\(raycaster\)/);
 assert.match(addon,/bindTeamChatTransport/);
 assert.match(addon,/socket\?\.addEventListener\?\.\("message",onExistingChat\)/);
 assert.match(addon,/send\(\{type:"chat",text:outbound\}\)/);
 assert.match(addon,/setCyberAtmosphere/);
 assert.match(addon,/Optional Frontier cyber ambience failed/);
 assert.doesNotMatch(addon,/window\.open\(['"]\/photo-studio/);
});
test('installer preserves local unreviewed edits rather than overwriting existing Frontier',()=>{
 const start='// TF_FRONTIER_LOBBY_V1_BEGIN';
 const end='// TF_FRONTIER_LOBBY_V1_END';
 const next=start+'\nNEW CODE\n'+end;
 const old=start+'\nAPPROVED BASELINE\n'+end;
 assert.equal(assertKnownFrontierInstallation(room,next,old),true);
 assert.equal(assertKnownFrontierInstallation(room+'\n'+old,next,old),true);
 assert.equal(assertKnownFrontierInstallation(room+'\n'+next,next,old),true);
 assert.equal(assertKnownFrontierInstallation(room+'\n'+old,next,[old]),true);
 assert.throws(()=>assertKnownFrontierInstallation(room+'\n'+start+'\nLOCAL EDIT\n'+end,next,old),/unreviewed local changes/);
});
