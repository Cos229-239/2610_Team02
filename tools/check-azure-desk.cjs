'use strict';
// Real browser controls and the checked-in room shell, using two fixture members and no GitHub credentials.
const assert = require('node:assert/strict');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {mount} = require('../collaboration-room/azure-bridge/server.cjs');
const {projects} = require('../collaboration-room/azure-bridge/loadouts.cjs');
const execute = promisify(execFile);

async function exercise(member) {
    const until = async predicate => {
        for (let i=0;i<120;i++) {
            if (predicate()) return;
            await new Promise(r=>setTimeout(r,40));
        }
        throw Error('Timed out waiting for ' + predicate.toString());
    };
    const check = (value,message) => { if (!value) throw Error(message); };
    try {
        document.querySelector('#enterBtn').click();
        const william = member === 'William', title = william ? 'Forms studio' : 'Inventory and reporting';
        await until(()=>document.querySelector('.toolbar button')?.textContent === 'Contribute · '+title);
        check(document.querySelectorAll('script[src="/azure-bridge/desk.js"]').length === 1,'Duplicate desk script');
        check(window.spoken === 0 && window.recordings === 0,'Entry played a voice');
        document.querySelector('.toolbar button').click();
        await until(()=>document.querySelector('[data-title]')?.textContent === title);
        check(document.querySelector('[data-resume]').href.includes(william ? '/WilliamPersonal/TowerFlowWindow/' : '/dev/Towerflow_OW/'),'Wrong resume target');
        const login = william ? 'Lopobunnie' : 'HyperRealmEnd';
        check(document.querySelector('[data-name]').textContent.endsWith('@'+login),'Wrong signed-in handle');
        check(document.querySelector('[data-desktop]').href.startsWith('x-github-client://openRepo/'),'Missing native Desktop action');
        document.querySelector('[data-history]').click();
        await until(()=>document.querySelector('[data-history-list]')?.textContent.includes(login));
        document.querySelector('[data-changes]').click();
        document.querySelector('[data-new]').click();
        await until(()=>document.querySelector('[data-branch]').value === 'feature/'+member.toLowerCase());
        const notes = document.querySelector('[data-notes]');
        check(notes.value.includes(william ? 'increases by 3' : 'TF-CHECK-407'),'Wrong review template');
        notes.value += '\nReviewed locally'; notes.dispatchEvent(new Event('input',{bubbles:true}));
        const current = document.querySelector('[data-select]');
        current.value = william ? 'reporting' : 'forms';
        current.dispatchEvent(new Event('change'));
        document.querySelector('[data-pin]').click();
        document.querySelector('#menu [data-contribute]').click();
        await until(()=>document.querySelector('[data-title]')?.textContent === (william ? 'Inventory and reporting' : 'Forms studio'));
        if (!william) {
            check(new URL(document.querySelector('[data-desktop]').href).searchParams.get('branch')==='dev','Opened a peer branch for editing');
            document.querySelector('[data-windows]').click();
            check(document.querySelector('[data-command]').value.includes("$branch = 'work/HyperRealmEnd/forms'"),'Wrong Windows workspace');
        }
        document.querySelector('[data-auto]').click();
        check(document.querySelector('[data-title]').textContent === title,'Follow my work did not return to member');
        check(document.querySelector('[data-notes]').value.endsWith('Reviewed locally'),'Handoff draft was lost');
        let compared;
        window.open = url => {compared = new URL(url);};
        document.querySelector('[data-template]').requestSubmit();
        check(compared?.pathname.startsWith('/Cos229-239/2610_Team02/compare/dev...'),'Wrong PR base');
        check(compared.searchParams.get('body').endsWith('Reviewed locally'),'Missing handoff');
        document.querySelector('[data-see-updates]').click();
        await until(()=>document.querySelector('[data-updates-list]')?.childElementCount===3);
        const rows=[...document.querySelectorAll('[data-updates-list] li')];
        check(rows[0].textContent.includes('Open published web app') && rows[0].querySelector('a[href^="/towerflow/"]'),'Published web action missing');
        check(rows[1].textContent.includes('differ') && !rows[1].querySelector('a[href^="/towerflow/"]'),'Pending web change shown as published');
        check(rows[2].textContent.includes('Visual Studio') && !rows[2].querySelector('a[href^="/towerflow/"]'),'Native merge shown as live');
        document.querySelector('[data-my-desk]').click();
        await until(()=>document.querySelector('[data-title]')?.textContent===title);
        if (william) { const select=document.querySelector('[data-select]');select.value='integration';select.dispatchEvent(new Event('change'));document.querySelector('[data-pin]').click(); }
        document.documentElement.dataset.pilot = 'passed';
    } catch (error) { document.documentElement.dataset.pilot = 'failed '+error.message; }
}

async function main() {
    const room = fs.mkdtempSync(path.join(os.tmpdir(),'azure-browser-'));
    const root = path.resolve(__dirname,'../collaboration-room');
    const shell = fs.readFileSync(path.join(root,'live-room/public/index.html'),'utf8');
    const routes = new Map();
    mount({use(){}, post(){}, head(){}, get(url,...handlers){routes.set(url,handlers.at(-1));}},{
        auth(){},ensureMember(){},publicOrigin:'http://localhost',publicDir:room
    });
    const legacy = `window.spoken=0;window.recordings=0;function say(){window.spoken++;}window.tfRockyGreeting={onEnter(){window.recordings++;}};
        document.getElementById('enterBtn').onclick=()=>{document.getElementById('hud').hidden=false;say('Welcome to Towerflow. Can I assist you? Pun intended.',true)};
        document.getElementById('enterBtn').addEventListener('click',()=>{window.tfRockyGreeting?.onEnter();});`;
    fs.writeFileSync(path.join(room,'room.js'),legacy);
    let member;
    const server = http.createServer(async (req,res) => {
        const url = new URL(req.url,'http://localhost').pathname;
        if (url === '/api/azure-bridge/loadout') {
            res.setHeader('Content-Type','application/json');
            return res.end(JSON.stringify({name:member,login:member==='William'?'Lopobunnie':'HyperRealmEnd',defaultProject:member==='William'?'forms':'reporting',
                personalRef:member==='William'?'WilliamPersonal':'OmarionPersonal',work:null,projects,available:true,checkedAt:Date.now()}));
        }
        if (url === '/api/azure-bridge/branches') return res.end(JSON.stringify(['feature/'+member.toLowerCase()]));
        if (url === '/api/azure-bridge/history') return res.end(JSON.stringify([{title:'Update source',author:member==='William'?'Lopobunnie':'HyperRealmEnd',sha:'e'.repeat(40)}]));
        if (url === '/api/azure-bridge/team-updates') return res.end(JSON.stringify(['match','different',null].map((web,i)=>({sha:String(i).repeat(40),title:'Team change '+i,author:'TeamMember',at:'2026-11-18',complete:true,web,native:i===2}))));
        if (url === '/api/azure-bridge/mine') return res.end('null');
        if (url === '/pilot.js') return res.writeHead(200,{'Content-Type':'text/javascript'}).end(
            'window.addEventListener("load",()=>('+exercise.toString()+')('+JSON.stringify(member)+'));');
        const handler = routes.get(url);
        if (!handler) return res.writeHead(404).end();
        const response = {
            set(k,v){res.setHeader(k,v);return this;},type(t){return this.set('Content-Type',t==='html'?'text/html':t);},
            send:s=>res.end(s),sendFile:f=>{res.setHeader('Content-Type', f.endsWith('.css')?'text/css':'text/javascript');res.end(fs.readFileSync(f));}
        };
        await handler(req,response,()=>res.writeHead(500).end());
    });
    try {
        fs.writeFileSync(path.join(room,'index.html'),shell.replace('</body>','<script defer src="/azure-bridge/desk.js"></script><script defer src="/pilot.js"></script></body>'));
        await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
        for (member of ['William','Omarion']) {
            const {stdout} = await execute(process.env.CHROME_BIN || 'google-chrome', ['--headless','--no-sandbox','--disable-gpu','--disable-background-networking',
                '--user-data-dir='+path.join(room,'shared-browser'),'--dump-dom','--virtual-time-budget=10000','http://127.0.0.1:'+server.address().port+'/room/team02'],{timeout:35000});
            assert.equal(stdout.match(/data-pilot="([^"]*)"/)?.[1],'passed',member+' browser pilot');
            console.log(member+' passed account desk, history, feature handoff and shared web/native publication views.');
        }
    } finally {server.close();fs.rmSync(room,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
