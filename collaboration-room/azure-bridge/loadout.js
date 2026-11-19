'use strict';

window.tfAzureLoadout = function mountLoadout(openDesk) {
    const team = 'Cos229-239/2610_Team02';
    const hud = document.getElementById('hud');
    const shortcut = document.createElement('button');
    shortcut.type = 'button';
    shortcut.textContent = 'Azure · My desk';
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
        shortcut.textContent = 'Azure · ' + title;
        shortcut.title = model.name + ' · Open your development desk';
        if (visibleCard) render(visibleCard);
    }
    async function load() {
        if (pending) return pending;
        pending = (async () => {
            try {
                const response = await fetch('/api/azure-bridge/loadout', {cache:'no-store'});
                if (!response.ok) throw Error();
                model = await response.json();
                pin = getPin();
                refresh();
            } catch {
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
    function windowsCommand(repo, ref, project, key) {
        const file = key === 'operations' || key === 'integration' ? project.path : [project.path,project.file].filter(Boolean).join('/');
        const workspace = 'TowerFlow-' + key + '-' + ref.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0,60);
        const editBranch = ref === 'dev' ? 'work/' + model.login + '/' + key : ref;
        return [
            '& {', "  $ErrorActionPreference = 'Stop'",
            '  $url = ' + escapePS('https://github.com/'+repo+'.git'), '  $ref = ' + escapePS(ref),
            '  $branch = ' + escapePS(editBranch),
            "  $base = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'TowerFlow Workspaces'",
            '  $dir = Join-Path $base ' + escapePS(workspace),
            "  if (!(Test-Path -LiteralPath $dir)) {",
            '    New-Item -ItemType Directory -Force -Path $base | Out-Null',
            '    git clone --branch $ref -- $url $dir',
            "    if ($LASTEXITCODE) { throw 'Clone failed.' }",
            '    if ($ref -ne $branch) {',
            '      git -C $dir switch -c $branch',
            "      if ($LASTEXITCODE) { throw 'Could not create your working branch.' }",
            '    }', '  }',
            '  $origin = git -C $dir remote get-url origin',
            '  $current = git -C $dir branch --show-current',
            '  if ($origin -ne $url -or $current -ne $branch) { throw "Expected $url on $branch at $dir. Check your existing workspace." }',
            '  $project = Join-Path $dir ' + escapePS(file),
            '  if (!(Test-Path -LiteralPath $project)) { throw "Project missing on $branch at $project." }',
            ...(key === 'integration' ? ['  & code $dir'] : [
                "  $finder = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'",
                "  $vs = & $finder -latest -products '*' -requires Microsoft.VisualStudio.Component.CoreEditor -property productPath",
                "  if (!$vs) { throw 'Install Visual Studio Community with the workload for this project.' }",
                '  & $vs $project'
            ]),
            '  Write-Output "Workspace: $dir on $branch"', '}'
        ].join('\r\n');
    }
    function link(el, url) { el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
    function render(el) {
        const active = selected(), key = active.project, project = model.projects[key], work = active.work;
        const repoName = work?.repo || team, ref = work?.ref || project.ref;
        const repo = 'https://github.com/'+repoName;
        const targetFile = work?.file || [project.path, project.file].filter(Boolean).join('/');
        el.style.setProperty('--desk-accent', project.accent);
        el.innerHTML = `<div class="tf-desk-heading"><strong data-name></strong><label>Workspace <select data-select></select></label></div>
            <h3 data-title></h3><p data-context></p>
            <div class="row wrap"><a data-resume>Resume feature</a><button type="button" data-new>New feature</button>
            <a data-review></a><button type="button" data-windows>Open Windows workspace…</button></div>
            <textarea data-command hidden readonly aria-label="Windows launch command"></textarea><p data-command-status role="status"></p>
            <p data-check></p>
            <details><summary>Debugger and source</summary><p data-launch></p>
            <a data-source>View source evidence</a></details>
            <form data-template hidden><h4>Feature handoff</h4><label>Feature title<input data-feature required maxlength="120"></label>
            <label>Pushed feature branch<input data-branch required maxlength="160"></label>
            <label>What to try and what happened<textarea data-notes required rows="7" maxlength="4000"></textarea></label>
            <button type="submit">Prepare pull request</button><p data-form-status role="status"></p></form>
            <div class="row wrap"><button type="button" data-pin></button><button type="button" data-auto>Follow my work</button></div>`;
        const $ = selector => el.querySelector(selector);
        $('[data-name]').textContent = 'Azure · ' + model.name;
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
        const proof = work?.type === 'pull' ? 'https://github.com/'+team+'/pull/'+work.number : repo+'/commit/'+(work?.revision || project.revision);
        link($('[data-source]'), proof);
        const review = $('[data-review]');
        const head = branch => (repoName === team ? '' : repoName.split('/')[0]+':') + branch;
        const compare = 'https://github.com/'+team+'/compare/dev...';
        review.textContent = work?.type === 'pull' ? 'Review pull request' : 'Submit feature';
        const defaultBranch = ref === 'dev' ? 'work/'+model.login+'/'+key : ref;
        link(review, work?.type === 'pull' ? proof : compare + encodePath(head(defaultBranch)) + '?quick_pull=1');
        if (work?.type !== 'pull') {
            // The branch name is editable, including for a branch that has not been published yet.
            review.onclick = e => { e.preventDefault(); $('[data-template]').hidden = false; $('[data-branch]').focus(); };
        }
        $('[data-check]').textContent = 'Try it · ' + project.steps;
        $('[data-launch]').textContent = project.launch + ' Resume feature opens the source in the browser editor. The Windows command opens a separate local workspace on first use and reuses it on your next visit.';
        $('[data-windows]').onclick = async () => {
            const box = $('[data-command]'); box.value = windowsCommand(repoName,ref,project,key);
            try { await navigator.clipboard.writeText(box.value); $('[data-command-status]').textContent = 'Copied. Paste into Windows PowerShell to open your workspace.'; }
            catch { box.hidden = false; box.select(); $('[data-command-status]').textContent = 'Copy the selected command, then paste into Windows PowerShell.'; }
        };
        const draftKey = [model.login, key, repoName, ref, work?.number ?? ''].join(':');
        const draft = drafts.get(draftKey);
        $('[data-new]').onclick = () => { $('[data-template]').hidden = false; $('[data-feature]').focus(); };
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
        if (model && Date.now() - model.checkedAt < 60_000) refresh();
        else { visibleCard.textContent = 'Loading your Azure desk…'; load(); }
        return visibleCard;
    }};
};
