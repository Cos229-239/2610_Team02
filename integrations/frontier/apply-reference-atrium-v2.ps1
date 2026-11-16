# TowerFlow reference studio architectural reconstruction, in-place, fail-closed.
# Updates only the original atrium architecture block; never touches OAuth/server/dev room.
$ErrorActionPreference = 'Stop'
$live = Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room\public\room.js'
if (-not (Test-Path -LiteralPath $live)) { throw "Live renderer missing: $live" }
$src = [IO.File]::ReadAllText($live)
$startMarker = '// Reflective seams, luminous ceiling rails, and wall insets.'
$endMarker = 'function textTexture('
$start = $src.IndexOf($startMarker, [StringComparison]::Ordinal)
$end = $src.IndexOf($endMarker, [StringComparison]::Ordinal)
if ($start -lt 0 -or $end -le $start) { throw 'Expected atrium architecture boundaries not found; unchanged.' }
$old = $src.Substring($start, $end - $start)
if ($old.Contains('TF_REFERENCE_ATRIUM_V2')) { Write-Host 'ATRIUM V2 ALREADY INSTALLED'; return }
if (-not ($old.Contains('for(let i=-18;i<=18;i+=3)') -and $old.Contains('for(let z of [-10,0,10])') -and $old.Contains('Panoramic skyline silhouettes'))) {
  throw 'Original architecture differs from reviewed version; unchanged.'
}
$new = @'
// TF_REFERENCE_ATRIUM_V2_BEGIN
// Single coherent replacement for original exhibition wall/ceiling grid and fake skyline.
// Reference: graphite studio, polished ceramic, cyan/green coves, city window, acoustic walls.
{
 const studio=new THREE.Group();studio.name="TF_REFERENCE_ATRIUM_V2";scene.add(studio);
 const finish=(color,metalness=.05,roughness=.78,emissive=0x000000,intensity=0)=>
   new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:intensity});
 const graphite=finish(0x151a20,.08,.89),trim=finish(0x242b32,.32,.5),
   ceramic=finish(0x8e989d,.16,.2),cyanLED=finish(0x21b6d8,.05,.4,0x00a4dc,1.3),
   greenLED=finish(0x4fc568,.05,.43,0x1ea83e,1.1),acoustic=finish(0x0b1015,.02,.98);
 const add=(w,h,d,x,y,z,m)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
   mesh.position.set(x,y,z);mesh.receiveShadow=true;studio.add(mesh);return mesh;
 };
 // Light-colored tile surface with fine joints. Overlay is intentionally thin.
 for(let x=-19.5;x<20;x+=2.5)for(let z=-14.5;z<15;z+=2.5)
   add(2.47,.012,2.47,x,.015,z,ceramic);
 // Perimeter coves; no neon lattice across the ceiling.
 for(const z of [-14.9,14.9]){add(38,.09,.12,0,10.92,z,graphite);add(37.7,.035,.06,0,10.86,z,cyanLED);}
 for(const x of [-19.9,19.9]){add(.12,.09,28.5,x,10.92,0,graphite);add(.06,.035,28.2,x,10.86,0,cyanLED);}
 // Recessed feature lighting, not free-standing columns.
 for(const x of [-15.5,15.5])add(2.5,.055,.075,x,10.82,-13.6,greenLED);
 // Acoustic slats limited to corners, leaving station/projection surfaces unobstructed.
 for(const side of [-1,1])for(let i=0;i<9;i++){
   const x=side*(16.1+i*.37);
   add(.18,5.5,.13,x,6.4,-15.49,acoustic);
 }
 // City window on left side; keep original interactive wall and entry clear.
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d');
 if(ctx){
   const sky=ctx.createLinearGradient(0,0,0,512);
   sky.addColorStop(0,'#07111e');sky.addColorStop(.65,'#163044');sky.addColorStop(1,'#314254');
   ctx.fillStyle=sky;ctx.fillRect(0,0,1024,512);
   let seed=10091;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   for(let i=0;i<90;i++){
     const x=i*12, height=65+rand()*260;
     ctx.fillStyle=i%3===0?'#0b1724':'#101d2b';ctx.fillRect(x,512-height,11, height);
     ctx.fillStyle='#89c9d0';
     for(let y=520-height;y<500;y+=14)if(rand()>.72)ctx.fillRect(x+3,y,2,3);
   }
   const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
   const glass=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
   const windowMesh=new THREE.Mesh(new THREE.PlaneGeometry(12,5.5),glass);
   windowMesh.rotation.y=Math.PI/2;windowMesh.position.set(-20.66,6.6,0);studio.add(windowMesh);
   for(const z of [-6,-3,0,3,6])add(.08,5.7,.09,-20.58,6.6,z,trim);
   add(.08,.1,12.3,-20.58,9.4,0,trim);add(.08,.1,12.3,-20.58,3.8,0,trim);
 }
 // Architectural skirting and restrained green/cyan accents.
 add(39,.07,.08,0,.18,-15.6,greenLED);
 add(39,.07,.08,0,.18,15.6,cyanLED);
}
// TF_REFERENCE_ATRIUM_V2_END
'@
$updated = $src.Substring(0,$start) + $new + "`r`n" + $src.Substring($end)
# Validate without writing: Node reads stdin as a module.
$updated | & node --check --input-type=module
if ($LASTEXITCODE -ne 0) { throw 'JavaScript syntax check failed; original unchanged.' }
[IO.File]::WriteAllText($live,$updated)
Write-Host 'ATRIUM V2 INSTALLED: original neon grid, wall pillars and fake skyline replaced.' -ForegroundColor Green
Write-Host 'LIVE RENDERER UPDATED. Ctrl+Shift+R to refresh. Runtime appearance not yet verified.'
