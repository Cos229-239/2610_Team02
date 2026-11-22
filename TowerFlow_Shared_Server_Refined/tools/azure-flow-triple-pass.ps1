# Azure Flow x3: tests, real authenticated provider evidence, runtime findings + clipboard.
# Read-only against existing port 4173. Does not restart servers or change workspace data.
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$report=[System.Collections.Generic.List[string]]::new()
$tests='UNKNOWN';$api='UNKNOWN';$runtime='UNKNOWN';$assets='UNKNOWN'
function Log([string]$s){Write-Host $s;[void]$report.Add($s)}
try {
  Log '=== AZURE FLOW X3 EVIDENCE WORKFLOW ==='
  Log "TIME: $([DateTimeOffset]::Now.ToString('o'))"
  $branch=git -C $root branch --show-current
  $commit=git -C $root rev-parse --short HEAD
  Log "BRANCH: $branch | COMMIT: $commit"
  if($branch -ne 'feature/azure-flow-frontier-v1-20261122'){throw 'Unexpected branch. Stop.'}
  Log "EXISTING ACCOUNTS: $(Test-Path (Join-Path $root 'data\accounts.json'))"
  Log "LOCAL MODIFICATIONS: $(@(git -C $root status --porcelain).Count) (preserved)"
  Log '[PROCESS 1 / OBJECTIVE] Verify current source with complete test suite.'
  Push-Location $root
  try {
    $tap=@(& npm.cmd test 2>&1 | ForEach-Object { $_.ToString() })
    $exit=$LASTEXITCODE
  }finally{Pop-Location}
  $string=$tap -join [Environment]::NewLine
  $n=[regex]::Matches($string,'(?m)^\s*(?:#|\S+)?\s*tests\s+(\d+)')
  $p=[regex]::Matches($string,'(?m)^\s*(?:#|\S+)?\s*pass\s+(\d+)')
  $f=[regex]::Matches($string,'(?m)^\s*(?:#|\S+)?\s*fail\s+(\d+)')
  $total=if($n.Count){[int]$n[$n.Count-1].Groups[1].Value}else{-1}
  $passed=if($p.Count){[int]$p[$p.Count-1].Groups[1].Value}else{-1}
  $failed=if($f.Count){[int]$f[$f.Count-1].Groups[1].Value}else{-1}
  $tests=if($exit -eq 0 -and $failed -eq 0 -and $total -gt 0 -and $passed -eq $total){'PASS'}else{'FAIL'}
  Log "TEST_GATE: $tests | $passed/$total PASS | failed=$failed | exit=$exit"
  if($tests -ne 'PASS'){foreach($line in @($tap|Select-Object -Last 20)){Log "  $line"}}
  Log '[PROCESS 2 / DIRECT RESULTS] Real public market via actual authenticated localhost HTTP endpoint.'
  # This test server uses its own disposable account directory and actual Coinbase network.
  # No test fixtures are used for prices. Production port 4173 is never touched.
  $node=@'
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('./server');
(async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'azure-flow-x3-'));
  const app=createApp({directory:dir});
  let listening=false,report={verdict:'NOT_COMPLETED'};
  try{
    await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));listening=true;
    const base='http://127.0.0.1:'+app.address().port;
    const post=(url,body,cookie='')=>fetch(base+url,{method:'POST',
      headers:{Origin:base,'X-TowerFlow-Request':'1','Content-Type':'application/json',
      ...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
    const withoutLogin=await post('/api/azure-flow/live-market',{allowPublic:true});
    if(withoutLogin.status!==401)throw Error('AUTH_CHECK_'+withoutLogin.status);
    const created=await post('/api/auth/setup',{username:'flowtrial',
      password:'TemporaryOnly!2026-Valid'});
    if(created.status!==201)throw Error('TEST_ACCOUNT_SETUP_'+created.status);
    const cookie=created.headers.get('set-cookie')?.split(';')[0];
    if(!cookie)throw Error('SESSION_COOKIE_MISSING');
    const withoutConsent=await post('/api/azure-flow/live-market',{allowPublic:false},cookie);
    if(withoutConsent.status!==400)throw Error('CONSENT_CHECK_'+withoutConsent.status);
    const result=await post('/api/azure-flow/live-market',{allowPublic:true},cookie);
    if(result.status!==200)throw Error('LIVE_HTTP_'+result.status);
    const payload=await result.json();
    if(payload.schema!=='azure-flow.live-market/v1'||payload.market!=='CRYPTO_SPOT_ONLY')
      throw Error('UNEXPECTED_SCHEMA');
    if(fs.existsSync(path.join(dir,'inventory.json')))throw Error('INVENTORY_WRITE');
    report={verdict:payload.verifiedCount===3?'PASS':'PARTIAL',
      access:[withoutLogin.status,withoutConsent.status,result.status],
      observed:payload.verifiedCount,expected:3,provider:payload.provider,
      retrievedAt:payload.retrievedAt,
      quotes:payload.results.map(x=>x.status==='OBSERVED'?
        {pair:x.pair,status:x.status,price:x.price,bid:x.bid,ask:x.ask,
          exchangeTime:x.exchangeTime,ageMs:x.ageMs}:
        {pair:x.pair,status:x.status,reason:x.reason})};
  }catch(e){report={verdict:'FAIL',reason:e.message};}
  finally{
    if(listening)await new Promise(resolve=>app.close(resolve));
    fs.rmSync(dir,{recursive:true,force:true});
  }
  console.log('X3_HTTP_REPORT='+JSON.stringify(report));
  if(report.verdict!=='PASS')process.exitCode=1;
})().catch(e=>{console.log('X3_HTTP_REPORT='+JSON.stringify({verdict:'FAIL',reason:e.message}));process.exitCode=1});
'@
  Push-Location $root
  try{
    $lines=@(& node.exe -e $node 2>&1|ForEach-Object {$_.ToString()})
    $nodeExit=$LASTEXITCODE
  }finally{Pop-Location}
  $marker=@($lines|Where-Object {$_ -like 'X3_HTTP_REPORT=*'}|Select-Object -Last 1)
  if($marker.Count){
    $data=$marker[0].Substring('X3_HTTP_REPORT='.Length)|ConvertFrom-Json
    $api=$data.verdict
    Log "API_GATE: $api | nodeExit=$nodeExit | observed=$($data.observed)/$($data.expected)"
    if($data.access){Log "HTTP_SECURITY: unauth=$($data.access[0]); noConsent=$($data.access[1]); accepted=$($data.access[2])"}
    if($data.provider){Log "PROVIDER: $($data.provider); at $($data.retrievedAt)"}
    foreach($quote in @($data.quotes)){
      if($quote.status -eq 'OBSERVED'){
        Log "QUOTE: $($quote.pair) USD $($quote.price) | bid=$($quote.bid) ask=$($quote.ask) | timestamp=$($quote.exchangeTime) | ageMs=$($quote.ageMs)"
      }else{Log "QUOTE: $($quote.pair) UNAVAILABLE $($quote.reason)"}
    }
    if($data.reason){Log "API_FAILURE: $($data.reason)"}
  }else{
    $api='UNVERIFIED'
    Log "API_GATE: UNVERIFIED. Node exit=$nodeExit. Output: $($lines -join ' | ')"
  }
  Log '[PROCESS 3 / SUGGESTIVE MEASURES] Inspect real running application and next priorities.'
  $listener=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue|Select-Object -First 1
  if(!$listener){$runtime='NO_LISTENER';Log 'HOST_4173: OFFLINE; no process changed.'}
  else{
    $process=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    $mtime=(Get-Item (Join-Path $root 'server.js')).LastWriteTime
    $runtime=if($process.CreationDate -lt $mtime){'STALE_SUSPECTED'}else{'STARTUP_NEWER_THAN_FILE'}
    Log "HOST_4173: PID=$($listener.OwningProcess); started=$($process.CreationDate); onDiskServer=$mtime; runtime=$runtime"
    try{
      $base='http://127.0.0.1:4173'
      $health=Invoke-WebRequest -Uri "$base/api/auth/status" -TimeoutSec 5
      $page=Invoke-WebRequest -Uri "$base/" -TimeoutSec 5
      $js=Invoke-WebRequest -Uri "$base/azure-flow.js" -TimeoutSec 5
      $css=Invoke-WebRequest -Uri "$base/azure-flow.css" -TimeoutSec 5
      $equal=($page.Content -eq [IO.File]::ReadAllText((Join-Path $root 'public\index.html'))) -and
        ($js.Content -eq [IO.File]::ReadAllText((Join-Path $root 'public\azure-flow.js'))) -and
        ($css.Content -eq [IO.File]::ReadAllText((Join-Path $root 'public\azure-flow.css')))
      $assets=if($equal){'MATCH'}else{'MISMATCH'}
      Log "HOST_HTTP: $($health.StatusCode); HTML_JS_CSS: $assets"
      Log 'HOST_AUTHENTICATED_ROUTE: NOT_TESTED (existing login cookies not copied).'
    }catch{$assets='HTTP_ERROR';Log "HOST_CHECK_FAILURE: $($_.Exception.Message)"}
  }
}catch{Log "WORKFLOW_ERROR: $($_.Exception.Message)"}
finally{
  Log '=== X3 DECISION REPORT ==='
  Log "TESTS=$tests | REAL_AUTHENTICATED_PROVIDER=$api | RUNNING_SERVER=$runtime | ASSETS=$assets"
  Log 'RECOMMENDATIONS:'
  if($tests -ne 'PASS'){Log 'P1 FIX: Resolve failing real Node tests; do not promote this revision.'}
  if($api -ne 'PASS'){Log 'P1 PROVIDER: Verify network/provider restrictions; no invented prices.'}
  if($runtime -eq 'STALE_SUSPECTED'){
    Log 'P1 RUNTIME: Coordinate downtime, then controlled restart of the verified host. Do not kill automatically.'
  }elseif($runtime -eq 'NO_LISTENER'){
    Log 'P1 RUNTIME: Start existing host from verified app directory, preserving account storage.'
  }elseif($assets -ne 'MATCH'){
    Log 'P1 ASSETS: Resolve live source parity before interpreting browser UI.'
  }else{
    Log 'P1 BROWSER: Sign in, authorize external data, Start live feed; verify displayed quotes and timestamps.'
  }
  Log 'P2 EVIDENCE: Production signed-in browser acceptance is separate from disposable real-provider HTTP test.'
  Log 'P3 PRESERVATION: No dev merge; no existing server restart; no inventory/account modification.'
  Log '=== END X3 REPORT ==='
  $summary=$report -join [Environment]::NewLine
  try{Set-Clipboard -Value $summary;Write-Host 'FULL X3 REPORT COPIED TO CLIPBOARD'}
  catch{Write-Host 'Clipboard unavailable; full report printed above.'}
}
