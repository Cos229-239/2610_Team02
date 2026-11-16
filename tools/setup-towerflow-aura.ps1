# Towerflow AURA first-run setup. No live server restarts or Git pushes.
[CmdletBinding()]
param(
  [ValidateSet('qwen3:4b','qwen3:8b','qwen3:14b')][string]$Model='qwen3:8b',
  [switch]$InstallOllama,
  [switch]$PullModel,
  [switch]$RepairRoomConfig
)
$ErrorActionPreference='Stop'
$Repo=Split-Path -Parent $PSScriptRoot
$Report=[System.Collections.Generic.List[string]]::new()
$Report.Add('=== TOWERFLOW AURA SETUP ===')
function Run-Native([string]$exe,[string[]]$arguments) {
  & $exe @arguments
  if($LASTEXITCODE -ne 0){throw "Command failed ($LASTEXITCODE): $exe $($arguments -join ' ')"}
}
function Find-Ollama {
  $cmd=Get-Command ollama -ErrorAction SilentlyContinue
  if($cmd){return $cmd.Source}
  $paths=@(
   (Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'),
   (Join-Path $env:ProgramFiles 'Ollama\ollama.exe')
  )
  foreach($path in $paths){if(Test-Path -LiteralPath $path){return $path}}
  return $null
}
try {
  $required=@('tools\towerflow-expert-agent.mjs','tools\towerflow-expert-agent.test.mjs','towerflow-knowledge\WORLD.md','tools\towerflow-config-agent.mjs')
  foreach($file in $required){if(-not(Test-Path -LiteralPath (Join-Path $Repo $file))){throw "Missing $file. Retrieve PR #8 files before setup."}}
  $Report.Add("Repo: $Repo")
  $Report.Add("Selected model: $Model")
  Run-Native 'node' @('--check',(Join-Path $Repo 'tools\towerflow-expert-agent.mjs'))
  Run-Native 'node' @('--test',(Join-Path $Repo 'tools\towerflow-expert-agent.test.mjs'))
  $Report.Add('AI AGENT TESTS: PASS')
  if($RepairRoomConfig){
    $Agent=Join-Path $Repo 'tools\towerflow-config-agent.mjs'
    Run-Native 'node' @($Agent,'--dry-run')
    Run-Native 'node' @($Agent,'--apply')
    $Report.Add('ROOM CONFIG: VALIDATED AND APPLIED')
  }
  $ollamaExe=Find-Ollama
  if(-not $ollamaExe -and $InstallOllama){
    $winget=Get-Command winget -ErrorAction SilentlyContinue
    if(-not $winget){throw 'Ollama missing and winget unavailable. Install from https://ollama.com/download.'}
    $Report.Add('Installing Ollama with Windows Package Manager...')
    Run-Native $winget.Source @('install','--id','Ollama.Ollama','-e','--accept-package-agreements','--accept-source-agreements')
    $ollamaExe=Find-Ollama
  }
  if(-not $ollamaExe){
    $Report.Add('Ollama not detected: install from https://ollama.com/download, then rerun.')
  }else{
    $Report.Add("Ollama detected: $ollamaExe")
    if($PullModel){
      $Report.Add("Pulling model (download may be several GB): $Model")
      Run-Native $ollamaExe @('pull',$Model)
      $Report.Add("MODEL PULLED: $Model")
    }else{$Report.Add('Model download not requested.')}
  }
  $Report.Add('Original Towerflow Node server: UNCHANGED')
  $Report.Add('Tailscale Funnel: UNCHANGED')
  $Report.Add('Private memory: opt-in only (/remember)')
  $Report.Add('Desktop IDEs: NOT OPENED')
  if($ollamaExe){
    $Report.Add('To start AURA from the repository directory:')
    $Report.Add('  Set TOWERFLOW_AI_MODEL to your chosen model, then:')
    $Report.Add('  node .\tools\towerflow-expert-agent.mjs')
  }
}catch{
  $Report.Add("SETUP ERROR: $($_.Exception.Message)")
}
$out=$Report -join [Environment]::NewLine
try{$out|Set-Clipboard}catch{}
Write-Host $out
