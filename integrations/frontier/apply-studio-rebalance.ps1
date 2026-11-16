# TowerFlow studio correction: restore digital sculptures; calibrate walls and color.
$ErrorActionPreference='Stop'
$p=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room\public\room.js'
if(!(Test-Path -LiteralPath $p)){throw "Missing live room.js"}
$s=[IO.File]::ReadAllText($p)
if($s.Contains('TF_STUDIO_REBALANCE_V1_BEGIN')){Write-Host 'STUDIO REBALANCE ALREADY INSTALLED';return}
$anchor='// TF_STUDIO_REBALANCE_V1_BEGIN'
$end='// TF_STUDIO_REBALANCE_V1_END'
$module=@'
// TF_STUDIO_REBALANCE_V1_BEGIN
// Keep digital artwork and app interactions; calibrate wall palette and remove visual clutter.
(function(){
 "use strict";
 const wallFinish=new THREE.Color('#24272d');
 const ceilingFinish=new THREE.Color('#111b23');
 const floorFinish=new THREE.Color('#7e898f');
 wall.color.copy(wallFinish);wall.metalness=.04;wall.roughness=.91;wall.needsUpdate=true;
 floor.color.copy(floorFinish);floor.metalness=.12;floor.roughness=.3;floor.needsUpdate=true;
 scene.background.set('#0a121b');
 if(scene.fog){scene.fog.color.set('#101923');scene.fog.density=.007;}
 renderer.toneMappingExposure=1.2;
 // Restore sculpture assemblies that earlier patches hid; preserve their kinetic controls.
 if(typeof core!=='undefined')core.visible=true;
 if(typeof guide!=='undefined')guide.visible=true;
 // Hide only narrow decorative wall slabs on the rear atrium wall; do not touch
 // textured interactive displays, room shell, or the separate development room.
 let hidden=0;
 scene.traverse(obj=>{
   if(!obj.isMesh||!obj.geometry?.parameters||obj.userData?.tfContextualInterface)return;
   if(obj.material?.map)return;
   const p=obj.geometry.parameters, pos=obj.position;
   if(typeof p.width!=='number'||typeof p.height!=='number'||typeof p.depth!=='number')return;
   const rear=Math.abs(pos.z+15.45)<.9;
   const narrow=p.width>=.35&&p.width<=2.2&&p.height>=3.0&&p.height<=9.2&&p.depth<=.6;
   if(rear&&narrow&&Math.abs(pos.x)<19.5&&pos.y>2){obj.visible=false;hidden++;}
 });
 window.tfStudioRebalance=Object.freeze({hiddenWallDecorations:hidden});
 console.info('TowerFlow studio rebalanced; hidden rear wall decorations:',hidden);
}());
// TF_STUDIO_REBALANCE_V1_END
'@
# Restore existing objects in the live original source, not the GitHub reference copy.
$s=$s.Replace('pad.add(holo);scene.add(pad);pad.visible=false;','pad.add(holo);scene.add(pad);')
$s=$s.Replace('core.position.set(0,3.2,-2);scene.add(core);core.visible=false;','core.position.set(0,3.2,-2);scene.add(core);')
$s=$s.Replace('guide.position.set(-17,0,-12);scene.add(guide);guide.visible=false;','guide.position.set(-17,0,-12);scene.add(guide);')
# Insert before renderer animation starts so that initial scene decoration is available.
$insert='function animate(){'
if(!$s.Contains($insert)){throw 'Animation anchor missing; no changes made'}
$s=$s.Replace($insert,$module+"`r`n"+$insert)
$s | & node --check --input-type=module
if($LASTEXITCODE -ne 0){throw 'Syntax failed; no changes made'}
[IO.File]::WriteAllText($p,$s)
Write-Host 'STUDIO REBALANCE INSTALLED — sculptures restored; walls and colors corrected.' -ForegroundColor Green
Write-Host 'Ctrl+Shift+R; check console for wall decoration count. Runtime verification pending.'
