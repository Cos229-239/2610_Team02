'use strict';

const vscode = require('vscode');
const { execFile } = require('node:child_process');
const { readFile } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const roomOrigin = 'https://dulsky.tail0ef7c0.ts.net';

async function fingerprint(file) {
    return createHash('sha256').update(await readFile(file)).digest('hex');
}

function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('towerflowEvidence.pair', async () => {
        const token = await vscode.window.showInputBox({
            title: 'TowerFlow room pairing', prompt: 'Paste the token from Pair VS Code.', password: true,
            validateInput: value => /^[A-Za-z0-9_-]{43}$/.test(value) ? undefined : 'Enter the pairing token.'
        });
        if (token) {
            await context.secrets.store('towerflowEvidence.checkToken', token);
            vscode.window.showInformationMessage('TowerFlow check pairing saved.');
        }
    }));

    let running = false;
    context.subscriptions.push(vscode.commands.registerCommand('towerflowEvidence.check', async () => {
        if (running) return;
        running = true;
        try {
            if (!vscode.workspace.isTrusted) throw Error('Open a trusted TowerFlow checkout first.');
            const folders = vscode.workspace.workspaceFolders ?? [];
            const folder = folders.length > 1 ? await vscode.window.showWorkspaceFolderPick() : folders[0];
            if (!folder || folder.uri.scheme !== 'file') throw Error('Open a local TowerFlow checkout first.');
            const token = await context.secrets.get('towerflowEvidence.checkToken');
            if (!token) throw Error('Use TowerFlow: Pair with Room first.');
            const cwd = folder.uri.fsPath;
            const options = { cwd, timeout: 20000, windowsHide: true, maxBuffer: 65536 };
            const remote = (await execute('git', ['remote', 'get-url', 'origin'], options)).stdout.trim();
            if (!/^(https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)Cos229-239\/2610_Team02(\.git)?\/?$/i.test(remote)) {
                throw Error('This checkout has a different Git origin.');
            }
            const revision = (await execute('git', ['rev-parse', 'HEAD'], options)).stdout.trim();
            const file = 'TowerFlow/app.js';
            const filename = path.join(cwd, file);
            const fileSha256 = await fingerprint(filename);
            const start = Date.now();
            let exitCode = 0;
            try {
                await execute('node', ['--check', file], options);
            } catch (error) {
                if (!Number.isInteger(error.code)) throw Error('Node check could not run.');
                exitCode = error.code;
                const output = vscode.window.createOutputChannel('TowerFlow Check');
                context.subscriptions.push(output);
                output.appendLine(error.stderr || error.message);
                output.show(true);
            }
            const durationMs = Date.now() - start;
            if (fileSha256 !== await fingerprint(filename)) throw Error('The checked file changed. Run the check again.');
            const response = await fetch(roomOrigin + '/api/azure-bridge/checks', {
                method: 'POST', redirect: 'error', signal: AbortSignal.timeout(12000),
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
                body: JSON.stringify({ revision, fileSha256, exitCode, durationMs })
            });
            if (response.status === 401) {
                await context.secrets.delete('towerflowEvidence.checkToken');
                throw Error('The room pairing expired. Pair again.');
            }
            if (!response.ok) throw Error('TowerFlow could not accept the result (HTTP ' + response.status + ').');
            const record = await response.json();
            vscode.window.showInformationMessage('TowerFlow check reported: ' + (exitCode ? 'failed' : 'passed') + ' · ' + record.receipt);
        } catch (error) {
            vscode.window.showErrorMessage(error.message);
        } finally {
            running = false;
        }
    }));
}

module.exports = { activate };
