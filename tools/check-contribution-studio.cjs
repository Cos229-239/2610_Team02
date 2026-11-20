'use strict';
// Exercise the installed room routes, sandboxed app and two independent browser sessions.
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const {once}=require('node:events');
const express=require('express');
const {chromium}=require('playwright-core');
const {mount}=require('../collaboration-room/azure-bridge/server.cjs');
const {mergedPreview}=require('../collaboration-room/azure-bridge/merged-preview.cjs');
const {projects}=require('../collaboration-room/azure-bridge/loadouts.cjs');
const root=path.resolve(__dirname,'..');

async function previewFixture() {
    const entries=[],data=new Map(),tree='a'.repeat(40);
    let revision='f'.repeat(40),now=0;
    for (const name of ['index.html','styles.css','app.js']) {
        const bytes=await fs.readFile(path.join(root,'TowerFlow',name));
        const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
        entries.push({type:'blob',mode:'100644',path:'TowerFlow/'+name,size:bytes.length,sha});data.set(sha,bytes);
    }
    const preview=mergedPreview(async url=>{
        const last=url.split('/').pop();
        const value=url.includes('/git/blobs/')?{content:data.get(last).toString('base64')}:last==='dev'?{sha:revision,commit:{tree:{sha:tree}}}:{tree:entries};
        return {ok:true,json:async()=>value};
    },()=>now);
    return {preview,includeDemo(bytes) {
        const sha=crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
        entries.push({type:'blob',mode:'100644',path:'TowerFlow/demos/stock-check.jpg',size:bytes.length,sha});
        data.set(sha,bytes);revision='b'.repeat(40);now+=31000;
    }};
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
        const repo=await previewFixture();
        mount(app,{auth,ensureMember:auth,publicOrigin:origin,publicDir:dir,preview:repo.preview});
        browser=await chromium.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
        const member=async name=>{
            const ctx=await browser.newContext();await ctx.addCookies([{name:'pilot',value:name,url:origin}]);
            const page=await ctx.newPage();await page.goto(origin+'/room/team02');await page.locator('#enterBtn').dispatchEvent('click');
            await page.locator('.toolbar button').first().click();
            await page.locator('.tf-dev-legacy-details').waitFor();
            await page.locator('.tf-dev-legacy-details > summary').click();
            await page.locator('[data-windows]').waitFor();return page;
        };
        const presenter=await member('William'),viewer=await member('Omarion');
        // Azure Bridge B must produce an actionable provider-specific handoff.
        await presenter.locator('[data-azure-ai]').click();
        assert.equal(await presenter.locator('.tf-ai-provider-card').count(),5);
        assert.equal(await presenter.locator('.tf-ai-provider-card').filter({hasText:'Gemini'}).count(),1);
        await presenter.locator('.tf-ai-provider-card').filter({hasText:'Grok'}).click();
        await presenter.locator('.tf-ai-handoff-form textarea:not([readonly])').fill(
            'Add an authenticated display name to the dashboard without changing portfolio calculations.'
        );
        assert.equal(await presenter.locator('.tf-ai-azure-head h2').textContent(),'Connect an AI');
        assert.equal(await presenter.locator('.tf-ai-generated-wrap').evaluate(el=>el.open),false);
        await presenter.getByRole('button',{name:'Copy task for my AI'}).click();
        await presenter.waitForFunction(()=>{
            const value=document.querySelector('textarea[readonly][aria-label="Generated repository access and integration prompt"]')?.value;
            return typeof value==='string'&&value.includes('Cos229-239/2610_Team02');
        },null,{timeout:12000});
        const generated=await presenter.locator('textarea[readonly][aria-label="Generated repository access and integration prompt"]').inputValue();
        assert.match(generated,/Cos229-239\/2610_Team02/);
        assert.match(generated,/FIRST: PROVE ACTUAL REPOSITORY ACCESS/);
        assert.match(generated,/Grok/);
        assert.equal(await presenter.locator('.tf-ai-azure').getByText('Give your AI a verified path into TowerFlow').count(),0);
        assert.equal(await presenter.getByRole('button',{name:'VERIFY MY PR'}).count(),1);
        const ideOpens=await presenter.evaluate(()=>window.tfOpenIDEStation?.('dev-ide-cursor'));
        assert.equal(ideOpens,true);
        await presenter.locator('.tf-dev-ide-station select').selectOption('markets');
        await presenter.locator('.tf-dev-ide-station a[href*="TowerFlow/app.js"]').waitFor();
        await presenter.getByRole('button',{name:'OPEN IN CURSOR IDE'}).click();
        assert.match(await presenter.locator('.tf-dev-ide-station [role="status"]').last().textContent(),/pair|connected|not|bridge/i);
        // The new Azure harness is actual source routing, not a model or IDE execution claim.
        assert.equal(await presenter.evaluate(()=>window.tfOpenAzureWorkspace?.()),true);
        await presenter.locator('.tf-azure-harness textarea').fill('Inspect the Dashboard source');
        await presenter.locator('.tf-azure-harness select').selectOption('antigravity');
        await presenter.locator('.tf-azure-harness button').filter({hasText:'Find code'}).click();
        await presenter.locator('.tf-azure-harness').getByText('TowerFlow/index.html',{exact:true}).waitFor();
        assert.match(await presenter.locator('.tf-azure-harness [role="status"]').textContent(),/GitHub access\/source proof is unavailable/i);
        assert.equal(await presenter.locator('.tf-azure-harness').getByText('Open in Google Antigravity').count(),1);
        console.log('Azure harness selected actual dashboard file and Antigravity; unverified fixture access is honestly blocked.');
        await presenter.locator('.tf-development-entry').click();
        console.log('Azure handoff and source-aware Cursor workstation expose real actions and fail closed without PC pairing.');

        // User journey: two prominently visible choices, exact source card and real preview.
        await presenter.locator('.tf-developer-center').waitFor();
        assert.equal(await presenter.locator('.tf-dev-choice').count(),2);
        await presenter.locator('.tf-dev-choice').first().click();
        await presenter.locator('.tf-dev-component').filter({hasText:'Markets'}).first().click();
        await presenter.locator('.tf-dev-action-result a[href*="TowerFlow%2Fapp.js"], .tf-dev-action-result a[href*="TowerFlow/app.js"]').waitFor();
        assert.match(await presenter.locator('.tf-dev-action-result').textContent(),/browser/);
        await presenter.locator('.tf-dev-choice').nth(1).click();
        await presenter.locator('.tf-dev-examples-guide > summary').click();
        await presenter.locator('.tf-dev-example').first().click();
        assert.match(await presenter.locator('.tf-dev-workspace textarea').inputValue(),/TowerFlow Command Center/);
        await presenter.locator('.tf-dev-workspace .tf-dev-primary').first().click();
        await presenter.locator('.tf-dev-review iframe').waitFor();
        await presenter.frameLocator('.tf-dev-review iframe').getByText('TowerFlow Command Center').waitFor();
        assert.match(await presenter.locator('.tf-dev-review').textContent(),/Not published/);
        await presenter.locator('.tf-dev-example').filter({hasText:'Background: magenta'}).click();
        await presenter.locator('.tf-dev-workspace .tf-dev-primary').first().click();
        try{
            await presenter.waitForFunction(()=>document.querySelector('.tf-dev-change-summary')?.textContent.includes('TowerFlow/styles.css'),null,{timeout:12000});
        }catch(error){
            console.error('CSS PREVIEW DIAGNOSTIC',await presenter.locator('.tf-dev-status').textContent());
            console.error('CSS SUMMARY DIAGNOSTIC',await presenter.locator('.tf-dev-change-summary').textContent());
            throw error;
        }
        await presenter.frameLocator('.tf-dev-review iframe').locator('body').waitFor();
        let newBackground='';
        for(let attempt=0;attempt<30;attempt++){
          newBackground=await presenter.frameLocator('.tf-dev-review iframe').locator('body').evaluate(()=>{
            return getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
          });
          if(newBackground==='#d946ef')break;
          await new Promise(resolve=>setTimeout(resolve,150));
        }
        assert.equal(newBackground,'#d946ef','CSS request did not affect the actual preview style');
        console.log('Real CSS transformation applied in the isolated web app preview.');

        console.log('Two-choice developer center navigates to real source and renders the actual changed dashboard.');

        // Returning from the compact workflow keeps legacy tools collapsed by default.
        // Expand them deliberately before testing their preserved functions.
        const advanced=presenter.locator('.tf-dev-legacy-details');
        if(!(await advanced.evaluate(el=>el.open)))await advanced.locator(':scope > summary').click();
        for (const key of ['interface','forms','portfolio','operations','reporting','integration','shared']) {
            await presenter.locator('[data-select]').selectOption(key);
            await presenter.locator('[data-windows]').evaluate(button=>{
                for(let parent=button.parentElement;parent;parent=parent.parentElement){
                    if(parent.tagName==='DETAILS')parent.open=true;
                }
            });
            await presenter.locator('[data-windows]').click();
            const script=await presenter.locator('[data-command]').inputValue();
            assert.ok(script.includes("$login = 'William'"));
            const file=path.join(dir,key+'.ps1');await fs.writeFile(file,script);
            execFileSync('pwsh',['-NoProfile','-Command',
                '$errors=$null; [void][System.Management.Automation.Language.Parser]::ParseFile($env:TF_TEST_LAUNCHER,[ref]$null,[ref]$errors); if ($errors.Count) { throw ($errors -join [Environment]::NewLine) }'],
                {env:{...process.env,TF_TEST_LAUNCHER:file}});
        }
        console.log('PowerShell parsed all seven account-specific IDE launch commands.');
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
            window.showSaveFilePicker=async()=>({createWritable:async()=>({write:async blob=>{window.savedJpeg=Array.from(new Uint8Array(await blob.arrayBuffer()));},close:async()=>{}})});
            navigator.mediaDevices.getDisplayMedia=async()=>{
                const canvas=document.createElement('canvas');canvas.width=100;canvas.height=60;
                const ctx=canvas.getContext('2d');ctx.fillStyle='#12bb55';ctx.fillRect(0,0,100,60);
                const stream=canvas.captureStream(2);const track=stream.getVideoTracks()[0];
                const settings=track.getSettings.bind(track);track.getSettings=()=>({...settings(),displaySurface:'window'});
                const timer=setInterval(()=>ctx.fillRect(0,0,100,60),300);track.onended=()=>clearInterval(timer);return stream;
            };
        });
        for(const page of [presenter,viewer]){
            const details=page.locator('.tf-dev-legacy-details');
            if(!(await details.evaluate(el=>el.open)))await details.locator(':scope > summary').click();
        }
        await presenter.locator('[data-demo]').click();await viewer.locator('[data-demo]').click();
        await presenter.locator('[data-share]').click();
        await viewer.waitForFunction(()=>document.querySelector('img.tf-demo-image')?.naturalWidth>0);
        assert.match(await viewer.locator('[data-presenter]').textContent(),/William/);
        await presenter.locator('[data-save]').click();
        await presenter.waitForFunction(()=>window.savedJpeg?.length>0);
        repo.includeDemo(Buffer.from(await presenter.evaluate(()=>window.savedJpeg)));
        await presenter.getByRole('button',{name:'Stop sharing my window'}).first().click();
        await viewer.waitForFunction(()=>document.querySelector('img.tf-demo-image')?.hidden && document.querySelector('[data-presenter]').textContent.includes('No teammate'));
        await viewer.locator('[data-saved]').click();
        await viewer.waitForFunction(()=>document.querySelector('img.tf-demo-image')?.naturalWidth>0);
        assert.equal(await viewer.locator('.tf-demo-image').getAttribute('alt'),'stock-check.jpg');
        console.log('The saved JPEG in the next fixture dev commit is viewable after the presenter stops.');
        console.log('Independent presenter and viewer sessions delivered, decoded and cleared a debugger-demo frame.');
    } finally {await browser?.close();server?.close();web.kill();await fs.rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
