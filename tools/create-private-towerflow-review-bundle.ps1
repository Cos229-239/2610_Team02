# Produce a private, reviewable source bundle for completing the live-room integration.
# Does not run IDEs, restart servers, push to GitHub, or include .env and credentials.
[CmdletBinding()]
param(
 [string]$Room=(Join-Path ([Environment]::GetFolderPath('Desktop')) 'Towerflow_Team02_Private_Invite_Room\Towerflow_Collaboration_Room')
)
$ErrorActionPreference='Stop'
$report=[System.Collections.Generic.List[string]]::new()
$report.Add('=== PRIVATE TOWERFLOW SOURCE REVIEW BUNDLE ===')
$copyRoot=Join-Path $env:TEMP ("towerflow-review-"+[guid]::NewGuid().ToString('N'))
$created=$null
try {
 if(-not(Test-Path (Join-Path $Room 'server.js'))){throw "Live server.js missing: $Room"}
 New-Item -ItemType Directory -Path $copyRoot -Force|Out-Null
 $items=@('server.js','package.json','public\room.js','public\index.html','public\styles.css')
 $sensitive='(?i)(github_pat_|gh[pousr]_[a-z0-9_]{10,}|sk-[a-z0-9_-]{16,}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|GITHUB_CLIENT_SECRET\s*[:=]\s*["''][^"'']+|SESSION_SECRET\s*[:=]\s*["''][^"'']+)'
 foreach($relative in $items){
  $src=Join-Path $Room $relative
  if(-not(Test-Path -LiteralPath $src)) { $report.Add("SKIP (absent): $relative");continue }
  $text=[IO.File]::ReadAllText($src)
  if($text.Length -gt 1000000){throw "Unexpected large file: $relative"}
  if($text -match $sensitive){throw "Possible embedded credential in $relative. No ZIP generated. Review that source locally; never paste the secret."}
  $out=Join-Path $copyRoot $relative
  New-Item -ItemType Directory -Path (Split-Path $out -Parent) -Force|Out-Null
  Copy-Item -LiteralPath $src -Destination $out
  $report.Add("INCLUDED: $relative")
 }
 $desktop=[Environment]::GetFolderPath('Desktop')
 $created=Join-Path $desktop ("Towerflow_Private_Source_Review_"+(Get-Date -Format 'yyyyMMdd-HHmmss')+".zip")
 Compress-Archive -Path (Join-Path $copyRoot '*') -DestinationPath $created -CompressionLevel Optimal
 $report.Add("REVIEW BUNDLE: $created")
 $report.Add("Check ZIP before sharing. Does not include .env or dependencies; heuristic scanning cannot guarantee zero secrets.")
 $report.Add("NO GITHUB PUSH. NO TOWERFLOW RESTART.")
}catch{
 $report.Add("ERROR: $($_.Exception.Message)")
 if($created -and (Test-Path $created)){Remove-Item $created -Force}
}finally{
 if(Test-Path $copyRoot){Remove-Item $copyRoot -Recurse -Force}
}
$out=$report -join [Environment]::NewLine
try{$out|Set-Clipboard}catch{}
Write-Host $out
