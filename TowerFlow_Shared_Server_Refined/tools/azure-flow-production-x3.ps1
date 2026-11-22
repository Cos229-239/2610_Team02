# Azure Flow X3 — real signed-in production API from Command Prompt/PowerShell.
# Existing TowerFlow login required. No browser-console code or fabricated quotes.
# Never restarts the server, touches dev, saves user data, or persists credentials.
$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$repo=Split-Path $root -Parent
$base='http://127.0.0.1:4173'
$report=[System.Collections.Generic.List[string]]::new()
$gates=[ordered]@{source='UNVERIFIED';auth='UNVERIFIED';production='UNVERIFIED';freshness='UNVERIFIED';preservation='UNVERIFIED';browser='NOT_TESTED_BY_CLI'}
$session=New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loggedIn=$false
function Log([string]$line){Write-Host $line;[void]$report.Add($line)}
function Status([string]$url,[string]$method='GET',[object]$payload=$null){
    $args=@{Uri=($base+$url);Method=$method;WebSession=$session;TimeoutSec=15;UseBasicParsing=$true}
    if($method -eq 'POST'){
        $args.Headers=@{'X-TowerFlow-Request'='1';'Origin'=$base}
        $args.ContentType='application/json'
        $args.Body=ConvertTo-Json -Compress -Depth 7 -InputObject $payload
    }
    try{
        $res=Invoke-WebRequest @args
        return [pscustomobject]@{Code=[int]$res.StatusCode;Body=($res.Content|ConvertFrom-Json)}
    }catch [System.Net.WebException]{
        $response=$_.Exception.Response
        if(!$response){throw}
        $code=[int]$response.StatusCode
        return [pscustomobject]@{Code=$code;Body=$null}
    }
}
function HashFile([string]$file){
    if(!(Test-Path -LiteralPath $file)){return 'ABSENT'}
    return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash
}
$accounts=Join-Path $root 'data\accounts.json'
$inventory=Join-Path $root 'data\inventory.json'
$accountBefore=HashFile $accounts
$inventoryBefore=HashFile $inventory
try {
    Log '=== AZURE FLOW X3 / REAL PRODUCTION COMMAND-LINE ACCEPTANCE ==='
    Log "TIME: $([DateTimeOffset]::Now.ToString('o'))"
    $branch=git -C $repo branch --show-current
    $commit=git -C $repo rev-parse --short HEAD
    Log "BRANCH: $branch | COMMIT: $commit"
    if($branch -ne 'feature/azure-flow-frontier-v1-20261122'){throw 'Incorrect branch; no execution.'}
    if($accountBefore -eq 'ABSENT'){throw 'Existing account database absent. Stop.'}
    Log '[PROCESS 1 / OBJECTIVE] Validate actual running production server and login boundary.'
    $listener=Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if(!$listener){throw 'No running server on port 4173. Nothing restarted.'}
    $process=Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    Log "HOST: PID $($listener.OwningProcess) / $($process.Name) / launched $($process.CreationDate)"
    if($process.Name -ne 'node.exe'){throw '4173 is not owned by node.exe.'}
    Log 'NATIVE_TESTS: running complete suite before production requests.'
    Push-Location $root
    try {
        $tap=@(& npm.cmd test 2>&1 | ForEach-Object {$_.ToString()})
        $testExit=$LASTEXITCODE
    }finally {Pop-Location}
    $tapText=$tap -join [Environment]::NewLine
    $tests=[regex]::Matches($tapText,'(?m)^\s*(?:#|\S+)?\s*tests\s+(\d+)')
    $pass=[regex]::Matches($tapText,'(?m)^\s*(?:#|\S+)?\s*pass\s+(\d+)')
    $fail=[regex]::Matches($tapText,'(?m)^\s*(?:#|\S+)?\s*fail\s+(\d+)')
    $count=if($tests.Count){[int]$tests[$tests.Count-1].Groups[1].Value}else{-1}
    $passed=if($pass.Count){[int]$pass[$pass.Count-1].Groups[1].Value}else{-1}
    $failed=if($fail.Count){[int]$fail[$fail.Count-1].Groups[1].Value}else{-1}
    Log "NATIVE_TESTS: $passed/$count passed; failed=$failed; exit=$testExit"
    if($testExit -ne 0 -or $count -le 0 -or $passed -ne $count -or $failed -ne 0){
        foreach($line in @($tap | Select-Object -Last 20)){Log "TEST_FAILURE: $line"}
        throw 'Native source tests failed. Production feed request blocked.'
    }
    $health=Status '/api/auth/status'
    if($health.Code -ne 200 -or !$health.Body.initialized){throw 'Existing server health/setup unavailable.'}
    $unauth=Status '/api/azure-flow/live-market' 'POST' @{allowPublic=$true}
    if($unauth.Code -ne 401){throw "Unauthenticated market gate did not return 401: $($unauth.Code)"}
    $gates.source='PASS_HTTP_200_AND_401'
    Log "SOURCE_GATE: PASS | host health=200 | unauth market=$($unauth.Code)"
    $user=Read-Host 'Existing TowerFlow username (never copied to report)'
    $secure=Read-Host 'Existing TowerFlow password (hidden; not stored)' -AsSecureString
    $ptr=[IntPtr]::Zero
    try{
        $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        $plain=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        $auth=Status '/api/auth/login' 'POST' @{username=$user;password=$plain}
    }finally{
        if($ptr -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}
        Remove-Variable plain,secure -ErrorAction SilentlyContinue
    }
    if($auth.Code -ne 200){throw "PRODUCTION_LOGIN_FAILED_HTTP_$($auth.Code). Existing credentials not modified."}
    $loggedIn=$true
    $who=Status '/api/auth/status'
    if($who.Code -ne 200 -or !$who.Body.user){throw 'Signed-in session not recognized.'}
    $config=Status '/api/azure-flow/config'
    if($config.Code -ne 200 -or $config.Body.schema -ne 'towerflow.azure-flow.runtime-config/v1'){
        throw "Production config API failed: HTTP $($config.Code)"
    }
    $denied=Status '/api/azure-flow/live-market' 'POST' @{allowPublic=$false}
    if($denied.Code -ne 400){throw "Consent gate failed: HTTP $($denied.Code)"}
    $gates.auth='PASS'
    Log "AUTH_GATE: PASS | signed-in config=200 | denial=$($denied.Code) | no session token disclosed"
    Log '[PROCESS 2 / DIRECT RESULTS] Request actual production endpoint twice; compare source timestamps.'
    Write-Host 'This test sends two read-only external Coinbase requests from your logged-in session.'
    $approved=Read-Host 'Authorize these two external market requests? (type YES)'
    if($approved -cne 'YES'){throw 'External access not authorized. No provider request issued.'}
    $observations=@()
    for($round=1;$round -le 2;$round++){
        if($round -eq 2){Start-Sleep -Seconds 21}
        $response=Status '/api/azure-flow/live-market' 'POST' @{allowPublic=$true}
        if($response.Code -ne 200){throw "Production live-market call $round returned HTTP $($response.Code)"}
        $body=$response.Body
        if($body.schema -ne 'azure-flow.live-market/v1' -or $body.market -ne 'CRYPTO_SPOT_ONLY'){
            throw "Unexpected market API contract at request $round"
        }
        $observations+=,$body
        Log "ROUND_$($round): HTTP 200; observed=$($body.verifiedCount)/3; provider=$($body.provider); retrieved=$($body.retrievedAt)"
        foreach($q in @($body.results)){
            if($q.status -eq 'OBSERVED'){
                Log "QUOTE_$($round): $($q.pair) USD $($q.price) bid=$($q.bid) ask=$($q.ask) time=$($q.exchangeTime) ageMs=$($q.ageMs)"
            }else{
                Log "QUOTE_$($round): $($q.pair) UNAVAILABLE reason=$($q.reason)"
            }
        }
    }
    $r1=$observations[0];$r2=$observations[1]
    $full=($r1.verifiedCount -eq 3 -and $r2.verifiedCount -eq 3)
    $gates.production=if($full){'PASS_2_X_3_REAL_QUOTES'}else{'PARTIAL_DATA'}
    $d1=[DateTimeOffset]::Parse($r1.retrievedAt)
    $d2=[DateTimeOffset]::Parse($r2.retrievedAt)
    $diff=($d2-$d1).TotalSeconds
    $gates.freshness=if($diff -ge 18 -and $diff -le 45){'PASS_SEPARATE_FETCHES'}else{'UNVERIFIED_TIME_DELTA'}
    Log "POLLING_EVIDENCE: two distinct direct CLI requests, interval $([math]::Round($diff,1)) seconds."
    Log 'STOP_EVIDENCE: CLI issued exactly two requests; browser scheduler/visual cards not exercised.'
}catch{
    Log "BLOCKED_OR_FAILED: $($_.Exception.Message)"
}finally{
    if($loggedIn){
        try{
            $off=Status '/api/auth/logout' 'POST' @{}
            Log "SESSION_CLEANUP: logout HTTP $($off.Code)"
        }catch{Log "SESSION_CLEANUP: server logout not confirmed ($($_.Exception.Message))"}
    }
    $afterAccounts=HashFile $accounts
    $afterInventory=HashFile $inventory
    $gates.preservation=if($accountBefore -eq $afterAccounts -and $inventoryBefore -eq $afterInventory){
        'PASS_SNAPSHOT_HASHES_UNCHANGED'
    }else{'CHANGED_OR_CONCURRENT_WRITE'}
    Log '[PROCESS 3 / DECISION] Preservation, findings, next steps and clipboard.'
    Log "PRESERVATION: $($gates.preservation) | accounts SHA256 same=$($accountBefore -eq $afterAccounts); inventory same=$($inventoryBefore -eq $afterInventory)"
    Log "CODE_STATUS: $(git -C $repo status --short --branch | Out-String)"
    Log '=== X3 EVIDENCE GATES ==='
    foreach($key in $gates.Keys){Log "$($key)=$($gates[$key])"}
    Log '=== PRIORITIZED RECOMMENDATIONS ==='
    if($gates.source -ne 'PASS_HTTP_200_AND_401'){Log 'P1: Verify active Node process identity and 4173 route before any restart.'}
    elseif($gates.auth -ne 'PASS'){Log 'P1: Investigate existing account login or consent boundary; no new account creation.'}
    elseif($gates.production -ne 'PASS_2_X_3_REAL_QUOTES'){Log 'P1: Check live production source failure or stale/partial quote results, not local unit-test fixtures.'}
    elseif($gates.freshness -ne 'PASS_SEPARATE_FETCHES'){Log 'P1: Inspect source timestamps; no proof of independent refresh.'}
    else{Log 'P1: Real production authenticated market data confirmed. Do not revisit backend startup.'}
    Log 'P2: Headless browser visual acceptance remains separate from CLI API evidence.'
    Log 'P3: Trial X3 method is not promoted until independent runs prove >=80% reliability.'
    Log 'P4: No dev merge; no inventory writes, no process termination, no credentials in clipboard.'
    Log '=== END PRODUCTION X3 REPORT ==='
    $output=$report -join [Environment]::NewLine
    try{Set-Clipboard -Value $output;Write-Host 'X3 REPORT COPIED TO CLIPBOARD'}
    catch{$output|clip.exe;Write-Host 'X3 REPORT COPIED USING clip.exe'}
}
