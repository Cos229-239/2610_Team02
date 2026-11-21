# TowerFlow read-only host/route/control audit. Does not run any UI action or mutate files.
$ErrorActionPreference='Stop'
$root=Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$results=[System.Collections.Generic.List[object]]::new()
function Record([string]$area,[string]$item,[string]$state,[string]$detail){
 $results.Add([pscustomobject]@{Area=$area;Item=$item;State=$state;Detail=$detail})
}
function Has([string]$content,[string]$value){return $content.Contains($value)}
Write-Host '=== TOWERFLOW LIVE ROOM VALIDATION (READ ONLY) ===' -ForegroundColor Cyan
Write-Host "Root: $root"
$files=[ordered]@{
 'Server'='server.js'
 '3D room'='public\room.js'
 'Room document'='public\index.html'
 'Room styles'='public\style.css'
 'Azure routes'='azure-bridge\server.cjs'
 'Development Desk'='azure-bridge\desk.js'
 'Project loadout'='azure-bridge\loadout.js'
 'Studio'='azure-bridge\studio.js'
 'Azure styles'='azure-bridge\loadout.css'
 'Dev intake'='azure-bridge\integration-intake.cjs'
 'Member audit'='azure-bridge\collaborator-audit.cjs'
}
$source=@{}
foreach($name in $files.Keys){
 $path=Join-Path $root $files[$name]
 if(!(Test-Path -LiteralPath $path)){
  Record 'File' $name 'MISSING' $files[$name];continue
 }
 $content=[IO.File]::ReadAllText($path)
 $source[$name]=$content
 Record 'File' $name 'PRESENT' ("{0:N0} bytes" -f ([IO.FileInfo]$path).Length)
 if($path -match '\.(js|cjs)$'){
  & node --check $path 2>&1 | Out-Null
  $status=if($LASTEXITCODE -eq 0){'PASS'}else{'FAIL'}
  Record 'Syntax' $name $status 'Node.js syntax-only check'
 }
}
$router=$source['Azure routes']
$world=$source['3D room']
$desk=$source['Development Desk']
$document=$source['Room document']
$style=$source['Room styles']
$azureStyle=$source['Azure styles']
if($router){
 foreach($item in @(
  @('Collaborator audit',"/collaborator-audit"),
  @('Collaborator source',"/collaborator-source"),
  @('Member dev sync',"/member-dev"),
  @('Integration intake',"/integration-intake"),
  @('Personal loadout',"/loadout"),
  @('Team updates',"/team-updates")
 )){
  Record 'Server routes' $item[0] $(if(Has $router $item[1]){'DEFINED'}else{'MISSING'}) $item[1]
 }
}
if($world){
 foreach($login in @('team-desk-malik','team-desk-omarion','team-desk-dayna','team-desk-william')){
  Record '3D stations' $login $(if(Has $world $login){'DEFINED'}else{'MISSING'}) 'Source evidence only'
 }
 foreach($item in @(
  @('Inspect project files','Inspect project files'),
  @('Dev synchronization','member-dev?member='),
  @('Read original code','collaborator-source?'),
  @('Room keyboard E','activateTFStation'),
  @('Room redraw','renderer.render(scene,camera)')
 )){
  Record 'Workstations' $item[0] $(if(Has $world $item[1]){'DEFINED'}else{'MISSING'}) 'Runtime behavior not asserted'
 }
}
if($desk){
 foreach($item in @(
  @('Contribute button','button.onclick'),
  @('Integration review','data-integration'),
  @('Try dev preview','data-try-dev'),
  @('Live demo','data-demo'),
  @('Team updates','data-teamUpdates'),
  @('Pair VS Code','data-writer')
  )){
  Record 'Desk controls' $item[0] $(if(Has $desk $item[1]){'REFERENCED'}else{'NOT FOUND'}) 'Static source inspection'
 }
}
if($document){
 foreach($tag in @('id="panel"','id="panelTitle"','id="panelContent"','src="/room.js"')){
  Record 'DOM' $tag $(if(Has $document $tag){'FOUND'}else{'MISSING'}) 'HTML reference'
 }
}
foreach($pair in @(@('Main CSS', $style),@('Azure CSS',$azureStyle))){
 $status=if($pair[1]){'PRESENT'}else{'MISSING'}
 Record 'Visual styles' $pair[0] $status 'Cannot confirm responsive layout without browser DOM geometry'
}
$routes=@(
 @('health','/api/health'),
 @('room','/room/team02'),
 @('Azure Desk JS','/azure-bridge/desk.js'),
 @('Azure style','/azure-bridge/loadout.css'),
 @('member-dev','/api/azure-bridge/member-dev?member=SVN-760'),
 @('collaborator-audit','/api/azure-bridge/collaborator-audit?member=SVN-760'),
 @('collaborator-source','/api/azure-bridge/collaborator-source?member=SVN-760&path=DisplayHelper.h&ref=dev'),
 @('integration-intake','/api/azure-bridge/integration-intake'),
 @('team-updates','/api/azure-bridge/team-updates')
)
foreach($entry in $routes){
 $name=$entry[0];$url='http://127.0.0.1:4173'+$entry[1]
 try{
  $r=Invoke-WebRequest -Uri $url -Method Get -SkipHttpErrorCheck -TimeoutSec 6
  $status=[int]$r.StatusCode
  $verdict=if($status -eq 404){'FAIL'}elseif($name -eq 'health' -and $status -eq 200){'PASS'}elseif($name -in @('health','room','Azure Desk JS','Azure style') -and $status -eq 200){'PASS'}elseif($status -in @(401,403)){'AUTH GATED'}elseif($status -eq 200){'PASS'}else{'CHECK'}
  Record 'HTTP' $name $verdict ("HTTP $status")
 }catch{
  Record 'HTTP' $name 'OFFLINE' $_.Exception.Message.Split([Environment]::NewLine)[0]
 }
}
try{
 $conn=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction Stop | Select-Object -First 1
 if($conn){
  $pidFound=$conn.OwningProcess
  $proc=Get-CimInstance Win32_Process -Filter "ProcessId=$pidFound" -ErrorAction SilentlyContinue
  Record 'Runtime' 'Port 4173 owner' 'FOUND' ("PID {0}; {1}" -f $pidFound, ($proc.CommandLine -replace '(?i)(token|secret|password)=\S+','$1=[REDACTED]'))
 }
}catch{Record 'Runtime' 'Port 4173 owner' 'UNKNOWN' 'Process details inaccessible'}
Write-Host ''
$results | Format-Table -AutoSize -Wrap | Out-Host
$failures=@($results | Where-Object {$_.State -in @('FAIL','MISSING','OFFLINE')})
Write-Host ("Audit entries: {0}; problems/unknown missing items: {1}" -f $results.Count,$failures.Count)
$report=($results | Format-Table -AutoSize -Wrap | Out-String -Width 240)
$report | Set-Clipboard
Write-Host 'Report copied to clipboard. No files, branches, browser state or credentials changed.' -ForegroundColor Green
