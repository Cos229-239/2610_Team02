# TowerFlow exact live-source ownership discovery. No changes to live files.
$ErrorActionPreference='Stop'
$live=Join-Path $env:USERPROFILE 'Desktop\Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room'
$file=Join-Path $live 'public\room.js'
$report=New-Object 'System.Collections.Generic.List[string]'
function Say([string]$s){Write-Host $s;[void]$report.Add($s)}
try {
 Say '=== TOWERFLOW EARTH / AZURE / CHAOS OWNERSHIP ==='
 if(!(Test-Path $file)){throw 'Live room.js missing'}
 Say ('LIVE_SHA256: '+(Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash)
 $lines=[IO.File]::ReadAllLines($file)
 foreach($term in @('Azure','AZURE','azure','chaos','Chaos','CHAOS','tfEarthStatus','TF_EARTH_HOLOGRAM_V1','core.position.set','earthStatus','orb')){
  $hits=New-Object 'System.Collections.Generic.List[string]'
  for($i=0;$i -lt $lines.Length;$i++){
   $line=$lines[$i]
   if($line.Contains($term) -and $line.Length -lt 2000 -and $line -notmatch '(?i)(base64|token|secret|password|authorization|\.env)'){
     $snippet=$line.Trim()
     if($snippet.Length -gt 260){$snippet=$snippet.Substring(0,260)+' [TRUNCATED]'}
     [void]$hits.Add(('{0,5}: {1}' -f ($i+1),$snippet))
   }
  }
  Say ('--- '+$term+' / '+$hits.Count+' relevant lines ---')
  foreach($hit in ($hits|Select-Object -First 14)){Say $hit}
 }
 Say 'NO LIVE FILES MODIFIED'
}catch{Say ('INSPECTION ERROR: '+$_.Exception.Message)}finally{
 ($report -join [Environment]::NewLine)|Set-Clipboard
 Write-Host 'REPORT COPIED TO CLIPBOARD' -ForegroundColor Cyan
}
