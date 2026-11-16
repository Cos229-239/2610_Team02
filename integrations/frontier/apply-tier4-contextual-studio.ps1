# TowerFlow Tier4 correction: preserve app, replace primitive workstation visuals with contextual digital UI.
$ErrorActionPreference='Stop'
$p=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room\public\room.js'
if(!(Test-Path -LiteralPath $p)){throw "Missing live renderer: $p"}
$s=[IO.File]::ReadAllText($p)
if($s.Contains('TF_TIER4_CONTEXTUAL_STUDIO_V1')){Write-Host 'TIER4 CONTEXTUAL STUDIO ALREADY INSTALLED';return}
$start=$s.IndexOf('function sign(')
$end=$s.IndexOf("station('ide'", $start)
if($start -lt 0 -or $end -le $start){throw 'Original station boundaries not found'}
$old=$s.Substring($start,$end-$start)
if(!$old.Contains('const stations=[];') -or !$old.Contains('function station(')){throw 'Unrecognized station implementation'}
$replacement=@'
// TF_TIER4_CONTEXTUAL_STUDIO_V1_BEGIN
// World-space UI anchors stay clickable; physical black TVs and neon platforms are removed.
function sign(name,sub,x,y,z,w=5,h=1.3,rot=0){
  const c=document.createElement('canvas');c.width=1024;c.height=256;
  const g=c.getContext('2d');
  g.clearRect(0,0,1024,256);
  g.fillStyle='rgba(5,18,27,.78)';g.fillRect(8,8,1008,240);
  g.strokeStyle='rgba(72,222,241,.85)';g.lineWidth=3;
  g.strokeRect(8,8,1008,240);
  g.fillStyle='#e4faff';g.font='600 64px Segoe UI,Arial';g.textAlign='center';
  g.fillText(name,512,115,940);
  g.fillStyle='#77c8d7';g.font='32px Segoe UI,Arial';g.fillText(sub,512,181,940);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),
    new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false}));
  mesh.position.set(x,y,z);mesh.rotation.y=rot;mesh.userData.tfContextualInterface=true;
  scene.add(mesh);return mesh;
}
const stations=[];
function station(id,label,desc,x,z,color=neon){
  stations.push({id,label,x,z});
  // Functional station position is preserved. E opens the existing application panel.
  // A compact floating marker replaces physical TVs, pillars and oversized platforms.
  const marker=new THREE.Group();marker.position.set(x,1.78,z);
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.075,12,8),
    new THREE.MeshBasicMaterial({color:0x55dcec,transparent:true,opacity:.86}));
  marker.add(dot);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.16,.185,32),
    new THREE.MeshBasicMaterial({color:0x36cfdd,side:THREE.DoubleSide,transparent:true,opacity:.58,depthWrite:false}));
  marker.add(ring);scene.add(marker);
}
// TF_TIER4_CONTEXTUAL_STUDIO_V1_END
'@
$s=$s.Substring(0,$start)+$replacement+"`r`n"+$s.Substring($end)
# Original signs are retained as functional portals; hide only decorative, non-clickable labels.
$s=$s.Replace("sign('TOWERFLOW','ENTER WORLD    •    FEATURE LAB    •    SHARED DEV',0,8.5,-15.56,10,1.9);","/* Atrium decorative billboard retired; clickable entrance remains. */")
$s=$s.Replace("sign('AURA','Can I assist you? Pun intended.',-17,4.9,-15.4,5,1.1);","/* Decorative AURA billboard retired; help interaction remains. */")
# Remove original chaperone geometry, preserve help station entry.
$s=$s.Replace('guide.position.set(-17,0,-12);scene.add(guide);','guide.position.set(-17,0,-12);scene.add(guide);guide.visible=false;')
# Remove original holographic core, preserve IDE station and animation references.
$s=$s.Replace('core.position.set(0,3.2,-2);scene.add(core);','core.position.set(0,3.2,-2);scene.add(core);core.visible=false;')
# Four renderer-owned exhibition pedestals: hide the entire visual assembly, preserve state/control API.
$needle='pad.add(holo);scene.add(pad);'
if(!$s.Contains($needle)){throw 'Pedestal anchor missing; original preserved'}
$s=$s.Replace($needle,'pad.add(holo);scene.add(pad);pad.visible=false;')
# Retire the earlier reference overlay with primitive black monitors without deleting its source.
$s=$s.Replace('scene.add(group);'+"\n"+'window.tfReferenceStudio=', 'group.visible=false;scene.add(group);'+"\n"+'window.tfReferenceStudio=')
$s=$s.Replace('scene.add(group);'+"`r`n"+'window.tfReferenceStudio=', 'group.visible=false;scene.add(group);'+"`r`n"+'window.tfReferenceStudio=')
# Improve base material calibration without changing the separate development room's geometry.
$s=$s.Replace("const wall=mat('#172638',.55,.46),floor=mat('#182432',.36,.63)","const wall=mat('#24272d',.08,.86),floor=mat('#a5adb2',.12,.25)")
$s | & node --check --input-type=module
if($LASTEXITCODE -ne 0){throw 'Syntax validation failed; live file unchanged'}
[IO.File]::WriteAllText($p,$s)
Write-Host 'TIER4 CONTEXTUAL STUDIO INSTALLED: TVs/station platforms retired; interaction IDs retained.' -ForegroundColor Green
Write-Host 'Pedestals and decorative signs disabled. Refresh Ctrl+Shift+R; visual/runtime QA pending.'
