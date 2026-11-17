(() => {
    const root = '/api/azure-bridge';
    const menu = document.getElementById('menu');
    const panel = document.getElementById('panel');
    const content = document.getElementById('panelContent');
    if (!menu || !panel || !content) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Development Desk · VS Code Evidence';
    menu.append(button);
    let refreshTimer;

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
        document.getElementById('panelTag').textContent = 'DEVELOPMENT WORKSTATION';
        document.getElementById('panelTitle').textContent = 'VS CODE EVIDENCE';
        const desk = document.createElement('section');
        desk.innerHTML = `<p>Pair VS Code, then run <strong>TowerFlow: Run and Report Check</strong> in the command palette.</p>
            <div class="row wrap"><button type="button" data-writer>Pair VS Code</button>
            <button type="button" data-reader disabled>Share this result with the assistant</button></div>
            <p role="status"></p><textarea readonly hidden aria-label="Temporary Azure access"></textarea>
            <pre class="code"></pre>`;
        content.replaceChildren(desk);
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
