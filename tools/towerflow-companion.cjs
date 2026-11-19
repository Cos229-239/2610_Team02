'use strict';
// Optional per-contributor companion. Runs on the contributor's own PC; never on the room host.
// No shell, arbitrary command, arbitrary filesystem path, or remote network listener.
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {execFile, spawn} = require('node:child_process');
const {promisify} = require('node:util');
const exec = promisify(execFile);
const {projects} = require('../collaboration-room/azure-bridge/loadouts.cjs');
const {sourceTarget} = require('../collaboration-room/azure-bridge/source-navigation.cjs');
const REPO = 'https://github.com/Cos229-239/2610_Team02.git';
const PORT = 4179;
const maxBytes = 8192;
const names = new Set(Object.keys(projects));
const loginPattern = /^[a-zA-Z0-9-]{1,39}$/;
const LOOPBACK = '127.0.0.1';
const acceptableOrigin = raw => {
    try {
        const url = new URL(raw);
        return url.origin === raw && (url.protocol === 'https:' ||
            (url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)));
    } catch { return false; }
};
function workspaceRoot() {
    return path.join(os.homedir(), 'Documents', 'TowerFlow Workspaces');
}
function workspace(login, project) {
    if (!loginPattern.test(login) || !names.has(project)) throw Error('Invalid contributor or project.');
    return path.join(workspaceRoot(), login, 'TowerFlow-' + project);
}
const projectEntry = key => {
    const p = projects[key];
    // Fixed, audited set of repo-relative launch entry points. Never derived from request paths.
    if (key === 'interface') return 'tools/header-preview';
    if (key === 'operations') return p.path;
    if (key === 'integration' || key === 'shared') return '.';
    return path.posix.join(p.path, p.file);
};
async function git(dir, ...args) {
    const {stdout} = await exec('git', ['-C',dir,...args], {windowsHide:true, timeout:20000, maxBuffer:1024*1024});
    return stdout.trim();
}
async function exists(p) { try { await fs.promises.access(p); return true; } catch { return false; } }
function folderRef(login, project) { return 'work/' + login.toLowerCase() + '/' + project; }
async function remoteExists(ref) {
    try {
        const {stdout} = await exec('git',['ls-remote','--heads',REPO,'refs/heads/'+ref],
            {windowsHide:true,timeout:20000});
        return Boolean(stdout.trim());
    } catch (e) { if (e.code===2) return false; throw Error('Cannot check GitHub. Check Git credentials/network. ' + e.message); }
}
async function prepare(login, project) {
    const dir = workspace(login,project), desired = folderRef(login,project);
    if (!(await exists(dir))) {
        await fs.promises.mkdir(path.dirname(dir),{recursive:true});
        const base=projects[project].ref && projects[project].ref!=='dev' ? projects[project].ref : 'dev';
        const start = await remoteExists(desired) ? desired : base;
        await exec('git',['clone','--branch',start,'--',REPO,dir],
            {windowsHide:true,timeout:120000,maxBuffer:1024*1024});
        if (start !== desired) await git(dir,'switch','-c',desired);
    }
    if (!(await exists(path.join(dir,'.git')))) throw Error('Workspace exists but is not a Git checkout. Nothing was overwritten.');
    const origin=await git(dir,'remote','get-url','origin');
    if (origin !== REPO && origin !== REPO.replace('.git','')) throw Error('Workspace points to a different repository. Nothing was overwritten.');
    const branch=await git(dir,'branch','--show-current');
    if (branch !== desired) throw Error('Workspace is on '+branch+', expected '+desired+'. No branch was changed; inspect the existing work first.');
    const entry=path.join(dir,projectEntry(project));
    if (!(await exists(entry))) throw Error('Project entry point not present on '+branch+': '+projectEntry(project));
    return {dir,branch,entry};
}
async function status(login, project) {
    const dir=workspace(login,project);
    if (!(await exists(path.join(dir,'.git')))) return {ready:false,reason:'Workspace not installed',project};
    const current=await git(dir,'branch','--show-current');
    const origin=await git(dir,'remote','get-url','origin');
    if (![REPO,REPO.replace('.git','')].includes(origin)) return {ready:false,reason:'Repository remote mismatch; no operation performed',project};
    const changed=(await git(dir,'status','--porcelain=v1','--untracked-files=all')).split(/\r?\n/).filter(Boolean);
    const expected=folderRef(login,project);
    return {ready:current===expected,branch:current,expected,changed:changed.slice(0,100),
        changeCount:changed.length,project,reason:current===expected?null:'Branch mismatch: inspect existing work before continuing.'};
}
async function diff(login,project) {
    const summary=await status(login,project);
    if(!summary.ready) throw Error(summary.reason||'Workspace is not ready for diff review.');
    const dir=workspace(login,project);
    const patch=await git(dir,'-c','core.pager=cat','diff','--no-ext-diff','--no-color','HEAD','--');
    return {patch:patch.slice(0,32768),truncated:patch.length>32768,
        note:'Shows tracked staged/unstaged changes only. Untracked files appear in status until added to Git.'};
}
function locateVS() {
    const p=process.env['ProgramFiles(x86)'];
    return p && path.join(p,'Microsoft Visual Studio','Installer','vswhere.exe');
}
function launchProcess(binary,args) {
    return new Promise((resolve,reject)=>{
        const child=spawn(binary,args,{detached:true,stdio:'ignore',windowsHide:true});
        child.once('error',reject);
        child.once('spawn',()=>{child.unref();resolve(child.pid);});
    });
}
async function startEditor(project, entry, dir) {
    if (project==='integration' || project==='shared') {
        const candidates=process.platform==='win32'
            ? [process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA,'Programs','Microsoft VS Code','Code.exe'),
                process.env.ProgramFiles && path.join(process.env.ProgramFiles,'Microsoft VS Code','Code.exe')]
            : ['/usr/bin/code','/usr/local/bin/code'];
        const editor=candidates.find(p=>p && fs.existsSync(p));
        if (!editor) throw Error('VS Code not found. Install the desktop VS Code application.');
        await launchProcess(editor,[dir]);
        return {editor:'VS Code',launched:true,verifiedDebugSession:false};
    }
    if (process.platform!=='win32') throw Error('Native Visual Studio requires Windows.');
    const vswhere=locateVS();
    if (!vswhere || !(await exists(vswhere))) throw Error('Visual Studio installer not found. Install Visual Studio Community.');
    const {stdout}=await exec(vswhere,['-latest','-products','*','-requires','Microsoft.VisualStudio.Component.CoreEditor','-property','productPath'],{windowsHide:true,timeout:15000});
    const editor=stdout.trim();
    if (!editor || !(await exists(editor))) throw Error('Visual Studio IDE is unavailable. Install the project workload.');
    await launchProcess(editor,[entry]);
    return {editor:'Visual Studio',launched:true,verifiedDebugSession:false};
}
async function openSource(login,area){
    const prepared=await prepare(login,'integration');
    const target=await sourceTarget(prepared.dir,area);
    if(process.platform!=='win32')throw Error('VS Code desktop navigation requires a Windows contributor PC.');
    const candidates=[process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA,'Programs','Microsoft VS Code','Code.exe'),process.env.ProgramFiles && path.join(process.env.ProgramFiles,'Microsoft VS Code','Code.exe')];
    const editor=candidates.find(p=>p && fs.existsSync(p));
    if(!editor)throw Error('VS Code desktop was not found on this PC.');
    await launchProcess(editor,['--new-window',prepared.dir,'--goto',target.fullPath+':'+target.line]);
    return {area,file:target.file,line:target.line,editor:'VS Code',launched:true,verifiedDebugSession:false,workspace:prepared.branch};
}
function makeBridge({origin,allowedLogin,token=crypto.randomBytes(24).toString('hex'),prepareWorkspace=prepare,
    getStatus=status,getDiff=diff,launch=startEditor,openTarget=openSource}={}) {
    if (!acceptableOrigin(origin)) throw Error('Supply an exact HTTPS TowerFlow origin using --origin=https://your-room-host');
    if (!loginPattern.test(allowedLogin||'')) throw Error('Supply your GitHub username using --login=your-user');
    const fail=(res,code,msg)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});
        res.end(JSON.stringify({ok:false,error:msg}));};
    const handler=async(req,res)=>{
        const requestOrigin=req.headers.origin;
        if (requestOrigin!==origin) return fail(res,403,'Origin denied');
        res.setHeader('Access-Control-Allow-Origin',origin);
        res.setHeader('Vary','Origin');
        res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
        if(req.headers['access-control-request-private-network']==='true') res.setHeader('Access-Control-Allow-Private-Network','true');
        res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
        res.setHeader('Cache-Control','no-store');
        if(req.method==='OPTIONS') {res.writeHead(204);return res.end();}
        if(req.headers.authorization!=='Bearer '+token) return fail(res,401,'Pairing token required');
        const reply=value=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,...value}));};
        try {
            if(req.method==='GET'&&req.url==='/health') return reply({version:1,capabilities:['prepare','open','status','diff','open-target']});
            if(req.method!=='POST'||!['/status','/open','/diff','/open-target'].includes(req.url)) return fail(res,404,'Unknown action');
            if(!String(req.headers['content-type']||'').startsWith('application/json')) return fail(res,415,'JSON required');
            let body='';for await(const chunk of req) {body+=chunk; if(Buffer.byteLength(body)>maxBytes)return fail(res,413,'Request too large');}
            const input=JSON.parse(body),{login,project}=input;
            if (typeof login!=='string'||login.toLowerCase()!==allowedLogin.toLowerCase()) return fail(res,403,'This companion belongs to another GitHub account.');
            workspace(login,project); // Validate before accessing the filesystem.
            if(req.url==='/open-target')return reply({target:await openTarget(login,input.area)});
            if(req.url==='/status')return reply({workspace:await getStatus(login,project)});
            if(req.url==='/diff')return reply({review:await getDiff(login,project)});
            const prepared=await prepareWorkspace(login,project);
            const launched=await launch(project,prepared.entry,prepared.dir);
            return reply({workspace:await getStatus(login,project),opened:launched});
        }catch(error){return fail(res,422,error.message);}
    };
    return {handler,token,origin};
}
async function main() {
    const arg=process.argv.find(s=>s.startsWith('--origin='));
    const origin=arg?.slice('--origin='.length);
    const login=process.argv.find(s=>s.startsWith('--login='))?.slice('--login='.length);
    const bridge=makeBridge({origin,allowedLogin:login});
    const server=http.createServer(bridge.handler);
    server.listen(PORT,LOOPBACK,()=>{
        console.log('TowerFlow companion listening on http://127.0.0.1:'+PORT);
        console.log('Allowed room origin: '+origin);
        console.log('Session pairing token (keep private): '+bridge.token);
        console.log('Closing this window stops access. No Git commits, pushes, or merges are performed.');
    });
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={makeBridge,workspace,projectEntry,acceptableOrigin,folderRef,prepare,status,diff,openSource};
