(() => {
    const root = '/api/azure-bridge';
    const menu = document.getElementById('menu');
    const panel = document.getElementById('panel');
    const content = document.getElementById('panelContent');
    if (!menu || !panel || !content) return;
    const repo = 'https://github.com/Cos229-239/2610_Team02';

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Contribute';
    button.dataset.contribute = '';
    menu.prepend(button);
    window.tfOpenMemberDesk = () => { button.click(); return true; };
    const studio=window.tfStudio({back:()=>button.click(), show(title) {
        clearTimeout(refreshTimer);menu.hidden=true;panel.hidden=false;
        document.getElementById('panelTag').textContent='TEAM WORKSPACE';
        document.getElementById('panelTitle').textContent=title;
        const page=document.createElement('section');page.className='tf-azure-loadout';
        content.replaceChildren(page);return page;
    }});
    const personalDesk = window.tfAzureLoadout?.(button, openUpdates, studio);
    let refreshTimer;
    const updatesButton = document.createElement('button');
    updatesButton.type = 'button';
    updatesButton.textContent = 'Team updates';
    updatesButton.dataset.teamUpdates = '';
    document.querySelector('#hud .toolbar')?.append(updatesButton);
    function openUpdates() {
        clearTimeout(refreshTimer);
        menu.hidden = true;
        panel.hidden = false;
        document.getElementById('panelTag').textContent = 'TEAM REPOSITORY';
        document.getElementById('panelTitle').textContent = 'TEAM UPDATES';
        const section = document.createElement('section');
        section.className = 'tf-azure-loadout tf-team-updates';
        section.innerHTML = `<h3>What changed on dev?</h3><p>Everyone in the room sees the same team history. Open a change to see the exact files.</p>
            <div class="row wrap"><button data-try-dev>Try merged web app</button><button data-demo>Live debug demo</button><button data-saved>Saved demos</button><a href="${repo}/commits/dev/" target="_blank" rel="noopener noreferrer">Full dev history</a>
            <a href="${repo}/pulls?q=is%3Apr+is%3Amerged+base%3Adev" target="_blank" rel="noopener noreferrer">Merged pull requests and test notes</a>
            <button type="button" data-my-desk>My workspace</button></div>
            <p data-update-status role="status">Loading team changes…</p><ol data-updates-list></ol>`;
        content.replaceChildren(section);
        section.querySelector('[data-try-dev]').onclick=studio.openPreview;
        section.querySelector('[data-demo]').onclick=studio.openDemo;
        section.querySelector('[data-saved]').onclick=()=>studio.openPreview(true);
        section.querySelector('[data-my-desk]').onclick = () => button.click();
        const status = section.querySelector('[data-update-status]'), list = section.querySelector('ol');
        let signature;
        async function refresh() {
            if (!section.isConnected || panel.hidden) return;
            try {
                const items = await api('/team-updates');
                const next = JSON.stringify(items);
                if (next !== signature) {
                    const rows = items.map(item => {
                        const row = document.createElement('li'), title = document.createElement('a');
                        title.textContent = item.title; title.href = repo+'/commit/'+item.sha;
                        title.target = '_blank'; title.rel = 'noopener noreferrer';
                        const detail = document.createElement('small'), time = document.createElement('time');
                        time.dateTime = item.at; time.textContent = new Date(item.at).toLocaleString();
                        detail.append(item.author+' · ', time, ' · '+item.sha.slice(0,7));
                        row.append(title,detail);
                        const labels = [];
                        if (!item.complete) labels.push('File details unavailable');
                        if (item.web === 'match') {
                            const app = document.createElement('a');
                            app.href = '/towerflow/index.html?revision='+item.sha; app.target = '_blank'; app.rel = 'noopener noreferrer';
                            app.textContent = 'Open published web app'; row.append(app);
                            labels.push('Changed web files match the room');
                        } else if (item.web === 'different') labels.push('Changed web files differ from the current room build');
                        else if (item.web === 'unknown') labels.push('Web publication unconfirmed');
                        if (item.native) labels.push('Native project · run this change in Visual Studio');
                        if (item.room) labels.push('Room code · installation on the host needs separate verification');
                        if (labels.length) { const text = document.createElement('p'); text.textContent = labels.join(' · '); row.append(text); }
                        return row;
                    });
                    list.replaceChildren(...rows); signature = next;
                }
                status.textContent = items.length ? 'Recent changes on the shared dev branch' : 'No changes on dev yet.';
            } catch { status.textContent = list.children.length ? 'Update unavailable. Showing the last loaded changes.' : 'Could not load team changes. Open Full dev history above.'; }
            if (section.isConnected && !panel.hidden) refreshTimer = setTimeout(refresh, 60000);
        }
        refresh();
    }
    updatesButton.onclick = openUpdates;
    function teammateWorkspace() {
        const section = document.createElement('section');
        section.dataset.teammateWorkspace = 'true';
        section.innerHTML = `<details><summary>Team contributions and shared tools</summary>
            <div class="row wrap"><a href="https://codespaces.new/Cos229-239/2610_Team02?ref=dev" target="_blank" rel="noopener noreferrer">Create a GitHub codespace</a>
            <a href="${repo}/compare/dev...dev" target="_blank" rel="noopener noreferrer">Submit feature</a>
            <a href="${repo}/pulls?q=is%3Apr+is%3Aopen+base%3Adev" target="_blank" rel="noopener noreferrer">Review features</a></div>
            <p>Already pushed? Choose <strong>Submit feature</strong> and select your branch under <strong>compare</strong>. The base is <strong>dev</strong>.</p>
            <details><summary>Start a feature or open a Windows project</summary>
            <p>For a new feature, create a branch from the latest dev. For existing work, switch to your feature branch. Use Source Control to commit and push.</p>
            <p>For the web app, choose “TowerFlow — Debug server / Codespaces” and press F5. Open port 4174. Use the preview browser’s developer tools for client breakpoints. Codespaces uses your available GitHub quota.</p>
            <a href="vscode://vscode.git/clone?url=https%3A%2F%2Fgithub.com%2FCos229-239%2F2610_Team02.git">Clone in desktop VS Code</a> ·
            <a href="${repo}/blob/dev/CONTRIBUTING.md#start-or-resume-a-feature" target="_blank" rel="noopener noreferrer">Find my Visual Studio project and debugger</a></details>
            <details><summary>Git terminal shortcuts</summary><p>Use the branch creation command only for new work. Replace the example branch name with your feature name.</p>
            <pre class="code" data-commands></pre></details>
            <h4>What changed?</h4>
            <div class="row wrap"><a href="${repo}/pulls?q=is%3Apr+is%3Amerged+base%3Adev" target="_blank" rel="noopener noreferrer">Merged features and test notes</a>
            <a href="${repo}/commits/dev/" target="_blank" rel="noopener noreferrer">All dev commits</a></div>
            <p data-build role="status">Checking the room’s published revision…</p>
            <a data-published-link hidden target="_blank" rel="noopener noreferrer">View published app commit</a>
            <p>The host publishes web changes after merge. Then refresh here or press Ctrl + Shift + R and try the feature.</p>
            <button type="button" data-reload>Refresh room</button></details>`;
        section.querySelector('[data-commands]').textContent = [
            'git fetch origin', 'git switch -c my-contribution origin/dev',
            '# Edit and run your code, then check it:', 'node tools/check-contributions.cjs',
            'git status', '# Replace the path below with your new or changed feature files.',
            'git add -- path/to/feature-file', 'git diff --cached',
            'git commit -m "Describe the change"', 'git push -u origin HEAD',
            'gh pr create --base dev --web',
            '# After review and passing checks, merge your PR:', 'gh pr merge --merge'
        ].join('\n');
        section.querySelector('[data-reload]').onclick = () => location.reload();
        async function readBuild() {
            if (!section.isConnected || panel.hidden) return;
            const status = section.querySelector('[data-build]');
            const published = section.querySelector('[data-published-link]');
            try {
                const response = await fetch('/towerflow/towerflow-build.json', {cache:'no-store'});
                if (!response.ok) throw Error('No deployment receipt');
                const build = await response.json();
                if (!/^[a-f0-9]{40}$/.test(build.revision)) throw Error('Invalid deployment receipt');
                const previous = section.dataset.revision;
                section.dataset.revision = build.revision;
                published.href = repo + '/commit/' + build.revision;
                published.hidden = false;
                status.textContent = (previous && previous !== build.revision ? 'A new revision is published. Press Ctrl + Shift + R. ' : 'Published room app: ') + build.revision.slice(0, 12);
            } catch {
                published.hidden = true;
                status.textContent = 'Published revision unavailable. Ask the host to import the merged commit.';
            }
            if (section.isConnected && !panel.hidden) setTimeout(readBuild, 15000);
        }
        if (personalDesk) section.prepend(personalDesk.card());
        setTimeout(readBuild, 0);
        return section;
    }
    const ideNames = /CODE NEXUS|BROWSER IDE|VISUAL STUDIO|DEVELOPMENT WORKSTATION|CURSOR|ANTIGRAVITY/i;
    const observer = new MutationObserver(() => {
        if (panel.hidden || content.querySelector('[data-teammate-workspace]')) return;
        if (ideNames.test(document.getElementById('panelTitle').textContent)) content.prepend(teammateWorkspace());
    });
    observer.observe(content, {childList:true});
    observer.observe(document.getElementById('panelTitle'), {childList:true,subtree:true,characterData:true});


    async function api(route, body) {
        const response = await fetch(root + route, body ? {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        } : { cache: 'no-store' });
        if (!response.ok) throw Error('Azure bridge returned HTTP ' + response.status);
        return response.json();
    }

    button.onclick = () => {
        clearTimeout(refreshTimer);
        menu.hidden = true;
        panel.hidden = false;
        document.getElementById('panelTag').textContent = 'AZURE · DEVELOPMENT WORKSTATION';
        document.getElementById('panelTitle').textContent = 'DEVELOPMENT DESK';
        const desk = document.createElement('section');
        desk.innerHTML = `<details><summary>Share a VS Code check result</summary><p>Pair VS Code, then run <strong>TowerFlow: Run and Report Check</strong> in the command palette.</p>
            <div class="row wrap"><button type="button" data-writer>Pair VS Code</button>
            <button type="button" data-reader disabled>Share this result with the assistant</button></div>
            <p role="status"></p><textarea readonly hidden aria-label="Temporary Azure access"></textarea>
            <pre class="code"></pre></details>`;
        content.replaceChildren(teammateWorkspace(), desk);
        const status = desk.querySelector('[role=status]');
        const output = desk.querySelector('pre');
        const tokenBox = desk.querySelector('textarea');
        const reader = desk.querySelector('[data-reader]');
        let current;
        async function refresh() {
            if (panel.hidden || !desk.isConnected) return;
            try {
                current = await api('/mine');
                output.textContent = current ? JSON.stringify(current, null, 2) : 'Waiting for your first check.';
                reader.disabled = !current;
            } catch (error) {
                reader.disabled = true;
                output.textContent = error.message;
            }
            if (desk.isConnected && !panel.hidden) refreshTimer = setTimeout(refresh, 5000);
        }
        async function pair(scope) {
            tokenBox.hidden = true;
            tokenBox.value = '';
            try {
                const grant = await api('/pair', { scope, receipt: current?.receipt });
                tokenBox.value = scope === 'writer' ? grant.token :
                    'Read ' + location.origin + root + '/read\nAuthorization: Bearer ' + grant.token;
                tokenBox.hidden = false;
                tokenBox.select();
                status.textContent = scope === 'writer' ?
                    'Copy this token into TowerFlow: Pair with Room. It expires in 30 minutes.' :
                    'Paste this one-use read grant into your assistant session within five minutes.';
            } catch (error) { status.textContent = error.message; }
        }
        desk.querySelector('[data-writer]').onclick = () => pair('writer');
        reader.onclick = () => pair('reader');
        refresh();
    };
})();
