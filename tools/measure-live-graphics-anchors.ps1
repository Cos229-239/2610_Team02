# TowerFlow stage 1: read-only, focused live geometry and visual ownership inspection.
# No checkout, deployment, file mutation, browser refresh, or secrets.
$ErrorActionPreference='Stop'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$file=Join-Path $live 'public\room.js'
$expected='0A295FF1B3D58A3437D6C47152387B63E208D0D90BECA06D09FF9CDDD8676BB0'
$log=New-Object System.Collections.Generic.List[string]
function Say([string]$v){Write-Host $v;[void]$log.Add($v)}
try {
 Say '=== TOWERFLOW LIVE GEOMETRY / OWNERSHIP MEASUREMENT ==='
 if(!(Test-Path $file)){throw 'The live room source was not found.'}
 $hash=(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
 Say ('SOURCE_SHA256: '+$hash)
 if($hash -ne $expected){throw 'NOT THE ACCEPTED SOURCE. STOP. No changes.'}
 $lines=[System.IO.File]::ReadAllLines($file)
 Say ('SOURCE_LINES: '+$lines.Length)
 $groups=@(
  @{name='CAMERA_AND_INITIAL_WALLS';patterns=@('PerspectiveCamera(', 'box(.6,11,32,-21,5.5,0,wall)');radius=4},
  @{name='FLOOR_AND_WINDOW_OWNERSHIP';patterns=@('TF_REFERENCE_STUDIO_V1_BEGIN','TF_CINEMATIC_V2_BEGIN','TF_TIER4_ATMOSPHERE_V1_BEGIN');radius=5},
  @{name='PROJECTOR_PICKING';patterns=@('const wallLayout=','const wallTargets=','function projectorPick(');radius=12},
  @{name='SECOND_SCENE_OR_OFFSCREEN_PREVIEW';patterns=@('new THREE.Scene()');radius=3}
 )
 foreach($group in $groups){
   Say ('--- '+$group.name+' ---')
   $hits=@()
   for($i=0;$i -lt $lines.Length;$i++){
     foreach($pattern in $group.patterns){
       if($lines[$i].Contains($pattern)){ $hits+=@{index=$i;pattern=$pattern};break }
     }
   }
   Say ('HITS: '+$hits.Count)
   if($hits.Count -gt 8){Say 'Only first eight hits expanded.'}
   foreach($hit in ($hits|Select-Object -First 8)){
     $begin=[Math]::Max(0,$hit.index-$group.radius)
     $end=[Math]::Min($lines.Length-1,$hit.index+$group.radius)
     Say ('ANCHOR '+$hit.pattern+' AT '+($hit.index+1))
     for($j=$begin;$j -le $end;$j++){
       $line=$lines[$j]
       if($line.Length -gt 330){$line=$line.Substring(0,330)+' [TRUNCATED]'}
       Say (('{0,5}: ' -f ($j+1))+$line)
     }
   }
 }
 Say 'MEASUREMENT LIMIT: expressions are source units, not surveyed metres.'
 Say 'WINDOW_OCCLUSION: UNMEASURED; must inspect actual browser view.'
 Say 'DEPLOYMENT: NONE. REFRESH: NOT REQUIRED.'
} catch {Say ('FAIL_CLOSED: '+$_.Exception.Message)} finally {
 ($log -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
