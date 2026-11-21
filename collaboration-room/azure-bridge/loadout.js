'use strict';

window.tfAzureLoadout = function mountLoadout(openDesk, openUpdates, studio) {
    const team = 'Cos229-239/2610_Team02';
    const hud = document.getElementById('hud');
    const shortcut = document.createElement('button');
    shortcut.type = 'button';
    shortcut.textContent = 'Contribute';
    shortcut.onclick = () => openDesk.click();
    hud?.querySelector('.toolbar')?.prepend(shortcut);
    let model, pending, pin, chosen, visibleCard;
    const drafts = new Map();

    function getPin() {
        try {
            const saved = JSON.parse(localStorage.getItem('tf:loadout:' + model.login.toLowerCase()));
            if (saved && Object.hasOwn(model.projects, saved.project) && (!saved.work || validWork(saved.work))) return saved;
        } catch { /* storage is optional */ }
        return null;
    }
    function validWork(w) {
        return w && Object.hasOwn(model.projects, w.project) && /^[a-z\d_.-]+\/[a-z\d_.-]+$/i.test(w.repo)
            && typeof w.ref === 'string' && w.ref.length > 0 && !w.ref.startsWith('-')
            && typeof w.file === 'string' && /^[a-f\d]{40}$/i.test(w.revision)
            && (w.type === 'commit' || (w.type === 'pull' && Number.isSafeInteger(w.number) && w.number > 0));
    }
    function selected() {
        if (chosen) return {project: chosen};
        if (pin) return pin;
        const work = validWork(model.work) ? model.work : null;
        return {project: work?.project || model.defaultProject, work};
    }
    function refresh() {
        if (!model) return;
        const title = model.projects[selected().project].name;
        shortcut.textContent = 'Contribute · ' + title;
        shortcut.title = model.name + ' · Open your development desk';
        if (visibleCard) render(visibleCard);
    }
    async function load() {
        if (pending) return pending;
        pending = (async () => {
            try {
                const response = await fetch('/api/azure-bridge/loadout', {cache:'no-store'});
                if (!response.ok) throw Error();
                const next = await response.json();
                if (model?.login !== next.login) { chosen = null; drafts.clear(); }
                model = next;
                pin = getPin();
                refresh();
            } catch {
                model = null; chosen = null; pin = null; drafts.clear();
                shortcut.textContent = 'Contribute';
                if (visibleCard) visibleCard.textContent = 'Azure could not load your personal desk. The shared contribution tools are available below.';
            } finally { pending = null; }
        })();
        return pending;
    }
    if (hud) {
        const entered = () => {
            if (hud.hidden) return;
            observer.disconnect();
            load();
        };
        const observer = new MutationObserver(entered);
        observer.observe(hud, {attributes:true, attributeFilter:['hidden']});
        entered();
    }
    const escapePS = value => "'" + value.replaceAll("'", "''") + "'";
    const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
    function windowsCommand(repo, ref, project, key, editBranch, editor = 'auto') {
        const file = key === 'interface' ? 'tools/header-preview' : key === 'operations' || key === 'integration' ? project.path : [project.path,project.file].filter(Boolean).join('/');
        const workspace = 'TowerFlow-' + key + '-' + ref.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0,60);

        return [
            '& {', "  $ErrorActionPreference = 'Stop'",
            '  $login = ' + escapePS(model.login),
            '  $url = ' + escapePS('https://github.com/'+repo+'.git'), '  $ref = ' + escapePS(ref),
            '  $branch = ' + escapePS(editBranch),
            "  $base = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'TowerFlow Workspaces'",
            '  $dir = Join-Path (Join-Path $base $login) ' + escapePS(workspace),
            "  if (!(Test-Path -LiteralPath $dir)) {",
            '    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dir) | Out-Null',
            '    $start = $ref',
            '    if ($branch -ne $ref) {',
            '      git ls-remote --exit-code --heads $url ("refs/heads/"+$branch) | Out-Null',
            '      if ($LASTEXITCODE -eq 0) { $start = $branch } elseif ($LASTEXITCODE -ne 2) { throw "Could not check your remote branch." }',
            '    }',
            '    git clone --config "credential.https://github.com.username=$login" --branch $start -- $url $dir',
            "    if ($LASTEXITCODE) { throw 'Clone failed.' }",
            '    if ($start -ne $branch) {',
            '      git -C $dir switch -c $branch',
            "      if ($LASTEXITCODE) { throw 'Could not create your working branch.' }",
            '    }', '  }',
            '  $origin = git -C $dir remote get-url origin',
            '  $current = git -C $dir branch --show-current',
            '  if ($origin -ne $url -or $current -ne $branch) { throw "Expected $url on $branch at $dir. Check your existing workspace." }',
            '  $account = Invoke-RestMethod ("https://api.github.com/users/" + $login)',
            '  if ($account.login -ne $login -or [long]$account.id -le 0) { throw "Could not verify @$login." }',
            '  git -C $dir config --local user.name $login',
            "  if ($LASTEXITCODE) { throw 'Could not set the author in this checkout.' }",
            '  git -C $dir config --local user.email ("{0}+{1}@users.noreply.github.com" -f $account.id,$login)',
            "  if ($LASTEXITCODE) { throw 'Could not set the email in this checkout.' }",
            '  $project = Join-Path $dir ' + escapePS(file),
            ...(key==='interface' ? [
                '  if (!(Test-Path -LiteralPath (Join-Path $project "CMakeLists.txt"))) {',
                '    $header = Join-Path $dir "DisplayHelper.h"',
                '    if (!(Test-Path -LiteralPath $header)) { throw "DisplayHelper.h is missing on this branch." }',
                '    $project = Join-Path $dir ".vs/TowerFlowHeaderDemo"',
                '    New-Item -ItemType Directory -Force -Path $project | Out-Null',
                '    $sourceRoot = $dir.Replace("\\", "/")',
                `    $lines = @('cmake_minimum_required(VERSION 3.16)','project(TowerFlowHeaderDemo LANGUAGES CXX)','add_executable(TowerFlowHeaderDemo main.cpp)',"target_include_directories(TowerFlowHeaderDemo PRIVATE [==[$sourceRoot]==])")`,
                '    [IO.File]::WriteAllLines((Join-Path $project "CMakeLists.txt"),$lines)',
                `    [IO.File]::WriteAllLines((Join-Path $project "main.cpp"),@('#include "DisplayHelper.h"','int main() { TowerDisplay::PrintHeader(); }'))`,
                '  }'
            ] : []),
            '  if (!(Test-Path -LiteralPath $project)) { throw "Project missing on $branch at $project." }',
            ...(editor === 'vscode' || (editor === 'auto' && ['integration','shared'].includes(key)) ? [
                "  $code = Get-Command code -ErrorAction SilentlyContinue",
                "  if (!$code) { throw 'VS Code command not found. Select Visual Studio Community or install VS Code.' }",
                "  & $code.Source $dir"
            ] : [
                "  $finder = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'",
                "  if (!(Test-Path $finder)) { throw 'Visual Studio Installer missing. Install free Visual Studio Community first.' }",
                "  $vs = & $finder -latest -products Microsoft.VisualStudio.Product.Community -requires Microsoft.VisualStudio.Component.CoreEditor -property productPath",
                "  if ($LASTEXITCODE -ne 0 -or !$vs -or !(Test-Path $vs)) { throw 'Visual Studio Community IDE not installed. Build Tools is not the IDE.' }",
                "  $solution = Get-ChildItem -LiteralPath $dir -File -Include '*.sln','*.slnx' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1",
                "  if ($solution) { & $vs $solution.FullName }",
                "  elseif ($project -match '\.(sln|slnx|vcxproj|csproj)$') { & $vs $project }",
                "  else { & $vs $dir }",
                "  Write-Output 'Visual Studio Community opened. Native F5 needs a C++/C# solution and relevant workload. JavaScript opens as source, not as a native build.'"
            ]),
            '  Write-Output "Workspace: $dir on $branch"', '}'
        ].join('\r\n');
    }
    function link(el, url) { el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    function render(el) {
        const active = selected(), key = active.project, project = model.projects[key], work = active.work;
        const repoName = work?.repo || team, ref = work?.ref || project.ref;
        const ownBranch = ref !== 'dev' && ref !== 'main' && (ref === model.personalRef || work?.type === 'pull');
        const editBranch = ownBranch ? ref : 'work/' + model.login + '/' + key;
        const crossReview = !ownBranch && ref !== 'dev';
        const repo = 'https://github.com/'+repoName;
        const targetFile = work?.file || [project.path, project.file].filter(Boolean).join('/');
        el.style.setProperty('--desk-accent', project.accent);
        el.innerHTML = `<div class="tf-desk-heading"><strong data-name></strong><label>Workspace <select data-select></select></label></div>
            <div class="tf-repo-bar">
                <div><small>Current repository</small><a data-repo></a></div>
                <div><small>Current branch on GitHub</small><a data-ref></a></div>
                <a class="tf-open-desktop" data-desktop>Open in GitHub Desktop</a>
            </div>
            <div class="tf-repo-tabs" role="group" aria-label="Repository views"><button type="button" data-changes aria-pressed="true">Changes</button><button type="button" data-history aria-pressed="false">History</button></div>
            <section data-history-pane hidden><p data-history-status role="status"></p><ol data-history-list></ol><a data-history-web>Full branch history</a></section>
            <div data-changes-pane><h3 data-title></h3><p data-context></p><ol class="tf-contribute-guide">
            <li><strong>Open your IDE and debug</strong><p data-debug-help></p><label>Editor <select data-editor aria-label="Choose desktop editor"><option value="community">Visual Studio Community (free)</option><option value="vscode">VS Code</option></select></label> <button type="button" data-windows></button> <a data-cloud hidden>Browser debugger</a></li>
            <li><strong>Share your change</strong><p data-submit-help></p><a data-review></a> <button type="button" data-new>Prepare feature notes</button></li>
            <li><strong>Try it together</strong><p>Show your running window during development, or try the latest merged web app here.</p>
            <button type="button" data-demo>Live debug demo</button> <button type="button" data-try-dev>Try merged web app</button> <button type="button" data-see-updates>Team updates</button></li></ol><ul data-remote-files hidden></ul>
            <textarea data-command hidden readonly aria-label="Windows launch command"></textarea><p data-command-status role="status"></p>
            <p data-check></p>
            <details><summary>Debugger and source</summary><p data-launch></p>
            <a data-resume>Browse source</a> · <a data-source>View source evidence</a><p data-local></p></details>
            <form data-template hidden><h4>Feature handoff</h4><label>Feature title<input data-feature required maxlength="120"></label>
            <label data-options hidden>Your pushed branches<select data-pushed></select></label><label>Pushed feature branch<input data-branch required maxlength="160"></label>
            <label>What to try and what happened<textarea data-notes required rows="7" maxlength="4000"></textarea></label>
            <button type="submit">Open pull request on GitHub</button><p data-form-status role="status"></p></form>
            <div class="row wrap"><button type="button" data-pin></button><button type="button" data-auto>Follow my work</button></div></div>
            <a class="tf-account" href="/auth/github">Switch GitHub account</a>`;
        const $ = selector => el.querySelector(selector);
        $('[data-name]').textContent = 'Signed in as @' + model.login;
        $('[data-repo]').textContent = repoName;
        link($('[data-repo]'),repo);
        $('[data-ref]').textContent = ref;
        link($('[data-ref]'),repo+'/tree/'+encodePath(ref));
        $('[data-desktop]').href = 'x-github-client://openRepo/'+repo+'?branch='+encodeURIComponent(crossReview ? 'dev' : ref);
        $('[data-see-updates]').onclick = openUpdates;
        $('[data-try-dev]').onclick=studio.openPreview;
        $('[data-demo]').onclick=studio.openDemo;
        const editorPicker=$('[data-editor]');
        const savedEditor=(()=>{try{return localStorage.getItem('tf:editor:'+model.login.toLowerCase());}catch{return null;}})();
        editorPicker.value=['community','vscode'].includes(savedEditor)?savedEditor:'community';
        const roomCode=work?.file?.startsWith('collaboration-room/');
        function updateEditorUi(){
            const community=editorPicker.value==='community';
            $('[data-windows]').textContent=community?'Open Visual Studio Community on Windows…':'Open VS Code on Windows…';
            $('[data-debug-help]').textContent=community
                ? 'Open the real local checkout in Visual Studio Community. Use F5 on a supported C++/C# project; JavaScript requires a separately configured debugger.'
                : roomCode?'Run and Debug room checks in VS Code with a suitable launch configuration.'
                : 'Edit your checkout in VS Code. Debugging requires an appropriate launch configuration.';
            const cloud=$('[data-cloud]');cloud.hidden=community;
            if(!community){link(cloud,'https://codespaces.new/'+repoName+'?'+new URLSearchParams({ref}));cloud.title='Uses available GitHub Codespaces quota.';}
            $('[data-submit-help]').textContent=(community?'In Visual Studio Community, open Git Changes':'In VS Code, open Source Control')+', commit and push your own branch, then submit a PR targeting dev.';
        }
        editorPicker.onchange=()=>{
            try{localStorage.setItem('tf:editor:'+model.login.toLowerCase(),editorPicker.value);}catch{}
            updateEditorUi();
        };
        updateEditorUi();

        $('[data-local]').textContent = ownBranch
            ? 'Open in GitHub Desktop as @'+model.login+' and select '+editBranch+' under Current branch. Open the project in your editor.'
            : crossReview ? 'The Windows launcher opens '+ref+' in your own working branch '+editBranch+'. Desktop starts on team dev.' : 'Open in GitHub Desktop as @'+model.login+'. Fetch and pull dev, then choose Current branch → New branch and name it '+editBranch+'. If you already pushed a feature, select that branch instead.';
        if (work?.type === 'pull' && Array.isArray(work.files)) {
            const list = $('[data-remote-files]');
            list.hidden = false;
            list.setAttribute('aria-label','Published pull request changes');
            for (const f of work.files) {
                const li = document.createElement('li');
                li.textContent = f.status+' · '+f.path; list.append(li);
            }
        }
        link($('[data-history-web]'),repo+'/commits/'+encodePath(ref)+'/');
        const historyStatus = $('[data-history-status]'), historyList = $('[data-history-list]');
        let reading = false;
        function view(history) {
            $('[data-changes-pane]').hidden = history;
            $('[data-history-pane]').hidden = !history;
            $('[data-changes]').setAttribute('aria-pressed', String(!history));
            $('[data-history]').setAttribute('aria-pressed', String(history));
        }
        $('[data-changes]').onclick = () => view(false);
        $('[data-history]').onclick = async () => {
            view(true);
            if (reading || historyList.childElementCount) return;
            reading = true; historyStatus.textContent = 'Reading branch history…';
            try {
                const response = await fetch('/api/azure-bridge/history?'+new URLSearchParams({repo:repoName,ref}),{cache:'no-store'});
                if (!response.ok) throw Error();
                const commits = await response.json();
                historyStatus.textContent = commits.length ? 'Recent commits on '+ref : 'No published commits.';
                for (const c of commits) {
                    const item = document.createElement('li'), a = document.createElement('a');
                    a.textContent = c.title; link(a,repo+'/commit/'+c.sha);
                    item.append(a,document.createTextNode(' · '+c.author+' · '+c.sha.slice(0,7)));
                    historyList.append(item);
                }
            } catch { historyStatus.textContent = 'Could not load history. Open the full branch history on GitHub.'; }
            finally { reading = false; }
        };
        $('[data-title]').textContent = project.name;
        $('[data-context]').textContent = work
            ? (pin && !chosen ? 'Pinned work' : work.type === 'pull' ? (work.draft ? 'Draft PR' : 'Open PR') : 'Recent source change') + ' · ' + work.title
            : (chosen || pin ? 'Project starter' : model.available ? 'Recorded project starter' : 'GitHub activity unavailable · recorded project starter') + ' · ' + project.prior;
        if (key === 'integration' && model.teamReview) {
            const review = document.createElement('a');
            review.textContent = 'Team review · ' + model.teamReview.title;
            link(review, 'https://github.com/'+team+'/pull/'+model.teamReview.number);
            $('[data-check]').after(review);
        }
        const select = $('[data-select]');
        for (const [id, p] of Object.entries(model.projects)) select.add(new Option(p.name,id));
        select.value = key;
        select.onchange = () => { chosen = select.value; refresh(); };
        link($('[data-resume]'), 'https://github.dev/'+repoName+'/blob/'+encodePath(ref)+'/'+encodePath(targetFile));
        const proof = !work && !project.revision ? repo+'/tree/'+encodePath(ref) : work?.type === 'pull' ? 'https://github.com/'+team+'/pull/'+work.number : repo+'/commit/'+(work?.revision || project.revision);
        link($('[data-source]'), proof);
        const review = $('[data-review]');
        const head = branch => (repoName === team ? '' : repoName.split('/')[0]+':') + branch;
        const compare = 'https://github.com/'+team+'/compare/dev...';
        review.textContent = work?.type === 'pull' ? 'Review pull request' : 'Submit feature';
        const defaultBranch = editBranch;
        link(review, work?.type === 'pull' ? proof : compare + encodePath(head(defaultBranch)) + '?quick_pull=1');
        let branchLookup;
        function showHandoff() {
            $('[data-template]').hidden = false;
            if (!branchLookup && repoName === team && work?.type !== 'pull') {
                const branch = $('[data-branch]'), options = $('[data-options]'), picker = $('[data-pushed]');
                const initial = branch.value;
                branchLookup = fetch('/api/azure-bridge/branches',{cache:'no-store'}).then(async response => {
                    if (!response.ok) return;
                    const branches = await response.json();
                    if (!branches.length) return;
                    picker.add(new Option('Choose a branch…',''));
                    branches.forEach(name => picker.add(new Option(name,name)));
                    options.hidden = false;
                    if (branches.includes(branch.value)) picker.value = branch.value;
                    else if (branches.length === 1 && branch.value === initial && !draft) {
                        branch.value = picker.value = branches[0];
                    }
                    picker.onchange = () => {
                        if (picker.value) { branch.value = picker.value; branch.dispatchEvent(new Event('input',{bubbles:true})); }
                    };
                }).catch(()=>{ /* The branch field also supports a pasted or newly pushed name. */ });
            }
        }
        if (work?.type !== 'pull') {
            // The branch name is editable, including for a branch that has not been published yet.
            review.onclick = e => { e.preventDefault(); showHandoff(); $('[data-feature]').focus(); };
        }
        $('[data-check]').textContent = 'Try it · ' + project.steps;
        $('[data-launch]').textContent = project.launch + ' Browse source opens the browser editor. The Windows command opens a separate local workspace on first use and reuses it on your next visit.';
        $('[data-windows]').onclick = async () => {
            const box = $('[data-command]'); box.value = windowsCommand(repoName,ref,project,key,editBranch,editorPicker.value);
            try { await navigator.clipboard.writeText(box.value); $('[data-command-status]').textContent = 'Copied. Paste into Windows PowerShell to open your workspace.'; }
            catch { box.hidden = false; box.select(); $('[data-command-status]').textContent = 'Copy the selected command, then paste into Windows PowerShell.'; }
        };
        const draftKey = [model.login, key, repoName, ref, work?.number ?? ''].join(':');
        const draft = drafts.get(draftKey);
        $('[data-new]').onclick = () => { showHandoff(); $('[data-feature]').focus(); };
        $('[data-feature]').value = draft?.title ?? project.starter;
        $('[data-branch]').value = draft?.branch ?? defaultBranch;
        $('[data-notes]').value = draft?.notes ?? ['Sample',project.sample,'','How to try it',project.steps,'','Expected',project.expected,'','Observed result','Pending'].join('\n');
        $('[data-template]').oninput = () => drafts.set(draftKey, {title:$('[data-feature]').value, branch:$('[data-branch]').value, notes:$('[data-notes]').value});
        $('[data-template]').onsubmit = e => {
            e.preventDefault();
            const branch = $('[data-branch]').value.trim();
            if (!branch || branch === 'dev' || branch.startsWith('-') || /[\s~^:?*\[\\]|\.\.|@\{|\/\/|[./]$/.test(branch)) {
                $('[data-form-status]').textContent = 'Enter the name of your pushed feature branch.'; return;
            }
            const query = new URLSearchParams({quick_pull:'1',title:$('[data-feature]').value,body:$('[data-notes]').value});
            window.open(compare+encodePath(head(branch))+'?'+query,'_blank','noopener,noreferrer');
        };
        $('[data-pin]').textContent = work ? 'Pin this feature' : 'Pin this project';
        $('[data-pin]').disabled = Boolean(pin && !chosen);
        $('[data-auto]').hidden = !pin && !chosen;
        function save(value) {
            pin = value; chosen = null;
            try { if (pin) localStorage.setItem('tf:loadout:'+model.login.toLowerCase(),JSON.stringify(pin));
                else localStorage.removeItem('tf:loadout:'+model.login.toLowerCase()); } catch { /* session preference still applies */ }
            refresh();
        }
        $('[data-pin]').onclick = () => save(active);
        $('[data-auto]').onclick = () => save(null);
    }
    return {card() {
        visibleCard = document.createElement('section');
        visibleCard.className = 'tf-azure-loadout';
        visibleCard.textContent = 'Loading your Azure desk…';
        load();
        return visibleCard;
    }};
};
