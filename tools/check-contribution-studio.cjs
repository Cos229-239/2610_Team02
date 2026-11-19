'use strict';
// Exercise the installed room routes, sandboxed app and two independent browser sessions.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {once}=require('node:events');
const express=require('express');
const {chromium}=require('playwright-core');
const {mount}=require('../collaboration-room/azure-bridge/server.cjs');
const {mergedPreview}=require('../collaboration-room/azure-bridge/merged-preview.cjs');
const {projects}=require('../collaboration-room/azure-bridge/loadouts.cjs');
const root=path.resolve(__dirname,'..');

async function previewFixture() {
    const entries=[],data=new Map(),revision='f'.repeat(40),tree='a'.repeat(40);
    for (const name of ['index.html','styles.css','app.js']) {
        const bytes=await fs.readFile(path.join(root,'TowerFlow',name));
        const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
        entries.push({type:'blob',mode:'100644',path:'TowerFlow/'+name,size:bytes.length,sha});data.set(sha,bytes);
    }
    return mergedPreview(async url=>{
        const last=url.split('/').pop();
        const value=url.includes('/git/blobs/')?{content:data.get(last).toString('base64')}:last==='dev'?{sha:revision,commit:{tree:{sha:tree}}}:{tree:entries};
        return {ok:true,json:async()=>value};
    });
}

async function main() {
    const web=spawn(process.execPath,[path.join(root,'TowerFlow/server.js')],{env:{...process.env,PORT:'4174'},stdio:['ignore','pipe','inherit']});
    const startup=once(web.stdout,'data',{signal:AbortSignal.timeout(8000)});
    const dir=await fs.mkdtemp(path.join(os.tmpdir(),'tf-studio-'));
    let browser,server;
    try {
        await startup;
        const app=express();app.use(express.json({limit:'2mb'}));
        server=app.listen(0,'127.0.0.1');await once(server,'listening');
        const origin='http://127.0.0.1:'+server.address().port;
        app.use((req,res,next)=>{
            const login=/pilot=(William|Omarion)/.exec(req.headers.cookie||'')?.[1];
            req.sessionID=login;req.session=login?{user:{login},token:'fixture'}:{};next();
        });
        const auth=(req,res,next)=>req.session.user?next():res.sendStatus(401);
        app.get('/api/azure-bridge/loadout',auth,(req,res)=>res.json({name:req.sessionID,login:req.sessionID,defaultProject:'integration',projects,available:true}));
        await fs.copyFile(path.join(root,'collaboration-room/live-room/public/index.html'),path.join(dir,'index.html'));
        await fs.writeFile(path.join(dir,'room.js'),"document.getElementById('enterBtn').onclick=()=>{document.getElementById('hud').hidden=false;document.getElementById('welcome').hidden=true};");
        mount(app,{auth,ensureMember:auth,publicOrigin:origin,publicDir:dir,preview:await previewFixture()});
        browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
        const member=async name=>{
            const ctx=await browser.newContext();await ctx.addCookies([{name:'pilot',value:name,url:origin}]);
            const page=await ctx.newPage();await page.goto(origin+'/room/team02');await page.locator('#enterBtn').dispatchEvent('click');
            await page.locator('.toolbar button').first().click();await page.locator('[data-windows]').waitFor();return page;
        };
        const presenter=await member('William'),viewer=await member('Omarion');
        await viewer.locator('[data-try-dev]').click();
        const frame=viewer.frameLocator('iframe.tf-merged-app');
        await frame.locator('#addWatchBtn').click();
        await frame.locator('#watchSymbol').fill('ROOM');await frame.locator('#watchPrice').fill('24');
        await frame.locator('#watchForm button').click();
        await frame.locator('#watchlist').getByText('ROOM',{exact:true}).waitFor();
        await viewer.locator('[data-back]').click();
        console.log('Merged web app loaded and accepted a watchlist edit inside the room frame.');

        // A real Chromium breakpoint in the actual web app served by the checked-in F5 target.
        const debug=await presenter.context().newPage();
        await debug.goto('http://127.0.0.1:4174');
        const cdp=await debug.context().newCDPSession(debug);await cdp.send('Debugger.enable');
        const source=await fs.readFile(path.join(root,'TowerFlow/app.js'),'utf8');
        const lineNumber=source.split('\n').findIndex(l=>l.includes('try { localStorage.setItem'));
        const bp=await cdp.send('Debugger.setBreakpointByUrl',{url:'http://127.0.0.1:4174/app.js',lineNumber});
        assert.ok(bp.locations.length>0);
        const paused=once(cdp,'Debugger.paused',{signal:AbortSignal.timeout(15000)});
        const change=debug.locator('#themeSelect').selectOption('blue');
        const [event]=await paused;assert.equal(event.callFrames[0].functionName,'persist');
        await cdp.send('Debugger.resume');await change;
        assert.equal(await debug.evaluate(()=>JSON.parse(localStorage.getItem('towerflow-state-v1')).theme),'blue');
        await debug.close();console.log('Chrome hit and resumed a real breakpoint in app.js on the F5 server.');

        // The window picker belongs to the OS. Supply a generated video track at that boundary.
        await presenter.evaluate(()=>{
            navigator.mediaDevices.getDisplayMedia=async()=>{
                const canvas=document.createElement('canvas');canvas.width=100;canvas.height=60;
                const ctx=canvas.getContext('2d');ctx.fillStyle='#12bb55';ctx.fillRect(0,0,100,60);
                const stream=canvas.captureStream(2);const track=stream.getVideoTracks()[0];
                const settings=track.getSettings.bind(track);track.getSettings=()=>({...settings(),displaySurface:'window'});
                const timer=setInterval(()=>ctx.fillRect(0,0,100,60),300);track.onended=()=>clearInterval(timer);return stream;
            };
        });
        await presenter.locator('[data-demo]').click();await viewer.locator('[data-demo]').click();
        await presenter.locator('[data-share]').click();
        await viewer.waitForFunction(()=>document.querySelector('img.tf-demo-image')?.naturalWidth>0);
        assert.match(await viewer.locator('[data-presenter]').textContent(),/William/);
        await presenter.getByRole('button',{name:'Stop sharing my window'}).first().click();
        await viewer.waitForFunction(()=>document.querySelector('img.tf-demo-image')?.hidden && document.querySelector('[data-presenter]').textContent.includes('No teammate'));
        console.log('Independent presenter and viewer sessions delivered, decoded and cleared a debugger-demo frame.');
    } finally {await browser?.close();server?.close();web.kill();await fs.rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
