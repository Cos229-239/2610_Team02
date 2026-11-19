'use strict';
window.tfStudio = function studio({show,back}) {
    const root='/api/azure-bridge/';
    let sharing, starting=false;
    const stopButton=document.createElement('button');
    stopButton.type='button';stopButton.textContent='Stop sharing my window';stopButton.hidden=true;
    document.querySelector('#hud .toolbar')?.append(stopButton);
    function post(route,body,extra={}) {
        return fetch(root+'demo/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000),...extra});
    }
    function stop() {
        const s=sharing;if (!s) return;
        sharing=null;stopButton.hidden=true;clearTimeout(s.timer);
        s.stream.getTracks().forEach(t=>t.stop());s.video.srcObject=null;
        void post('stop',{id:s.id},{keepalive:true}).catch(()=>{});
    }
    stopButton.onclick=stop;addEventListener('pagehide',stop);
    async function share(status) {
        if (sharing) {stop();status.textContent='Sharing stopped.';return;}
        if (starting) return;
        starting=true;
        let stream,id;
        try {
            if (!navigator.mediaDevices?.getDisplayMedia) throw Error('Use a desktop browser with window sharing on the HTTPS room.');
            stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'window',frameRate:2},audio:false,monitorTypeSurfaces:'exclude'});
            const track=stream.getVideoTracks()[0];
            if (!['browser','window'].includes(track?.getSettings().displaySurface)) throw Error('Choose a single window or browser tab.');
            const video=document.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=stream;await video.play();
            const res=await post('start',{});
            if (!res.ok) throw Error(res.status===409?'A teammate is presenting. Wait until they stop.':'The room could not start the demo.');
            ({id}=await res.json());
            const s={stream,video,id,timer:null};sharing=s;track.onended=stop;stopButton.hidden=false;
            if (track.readyState==='ended') {stop();return;}
            const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d');
            async function send() {
                if (sharing!==s) return;
                try {
                    const scale=Math.min(1,1280/video.videoWidth,800/video.videoHeight);
                    canvas.width=Math.max(1,Math.round(video.videoWidth*scale));canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
                    ctx.drawImage(video,0,0,canvas.width,canvas.height);
                    let image=canvas.toDataURL('image/jpeg',.68);
                    if (image.length>350000) {
                        canvas.width=Math.round(canvas.width*.66);canvas.height=Math.round(canvas.height*.66);
                        ctx.drawImage(video,0,0,canvas.width,canvas.height);image=canvas.toDataURL('image/jpeg',.52);
                    }
                    const res=await post('frame',{id,image});
                    if (!res.ok) throw Error();
                    if (sharing===s) s.timer=setTimeout(send,1100);
                } catch { if (sharing===s) {stop();status.textContent='The room lost the feed. Choose your window to share again.';} }
            }
            void send();
        } catch(error) {
            stream?.getTracks().forEach(t=>t.stop());
            status.textContent=error.name==='NotAllowedError'?'Window sharing was cancelled or blocked.':error.message;
        } finally {starting=false;}
    }
    function openDemo() {
        const page=show('LIVE DEBUG DEMO');
        page.innerHTML='<div class="row wrap"><button type="button" data-back>Back to my desk</button><button type="button" data-share>Share my debug window</button></div><p>Choose your running app or IDE window. Room members can watch while you keep control. Only the latest frame is held in memory.</p><p role="status" data-action></p><p data-presenter></p><img class="tf-demo-image" hidden alt="Selected window from the presenting teammate">';
        page.querySelector('[data-back]').onclick=back;
        const action=page.querySelector('[data-action]'), label=page.querySelector('[data-presenter]'), image=page.querySelector('img'), button=page.querySelector('[data-share]');
        button.onclick=()=>share(action);
        let version='';
        async function poll() {
            if (!page.isConnected || document.getElementById('panel').hidden) return;
            try {
                const response=await fetch(root+'demo?after='+encodeURIComponent(version),{cache:'no-store'});
                if (!response.ok) throw Error();
                const current=await response.json();
                label.textContent=current?'@'+current.login+' is presenting':'No teammate is sharing a window.';
                if (!current || (!current.image && current.version!==version)) {image.removeAttribute('src');image.hidden=true;}
                if (current?.image) {image.src=current.image;image.hidden=false;}
                version=current?.version || '';
            } catch {version='';image.hidden=true;image.removeAttribute('src');label.textContent='Demo unavailable. Reconnecting…';}
            button.textContent=sharing?'Stop sharing my window':'Share my debug window';
            if (page.isConnected && !document.getElementById('panel').hidden) setTimeout(poll,1250);
        }
        poll();
    }
    async function openPreview() {
        const page=show('MERGED WEB APP');
        page.innerHTML='<div class="row wrap"><button type="button" data-back>Back to my desk</button><button type="button" data-reload>Check latest dev</button></div><p role="status">Loading the merged web app…</p>';
        page.querySelector('[data-back]').onclick=back;page.querySelector('[data-reload]').onclick=openPreview;
        const status=page.querySelector('p');
        try {
            const response=await fetch(root+'merged-preview',{cache:'no-store'});
            if (!response.ok) throw Error();
            const {url,revision}=await response.json();
            if (!/^\/api\/azure-bridge\/preview-files\/[a-f0-9]{48}\/index\.html$/.test(url) || !/^[a-f0-9]{40}$/.test(revision)) throw Error();
            const frame=document.createElement('iframe');
            frame.className='tf-merged-app';frame.title='Interactive app from shared dev';frame.setAttribute('sandbox','allow-scripts allow-forms allow-downloads');
            frame.referrerPolicy='no-referrer';frame.src=url;
            status.textContent='Team dev · '+revision.slice(0,8)+' · Demo edits last for this preview.';
            page.append(frame);
        } catch {status.textContent='Could not load the merged web app. Check latest dev to retry.';}
    }
    return {openDemo,openPreview};
};
