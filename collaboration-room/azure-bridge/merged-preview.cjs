'use strict';
const {createHash, randomBytes} = require('node:crypto');
const path = require('node:path');
const {teamRepo} = require('./loadouts.cjs');
const {webPath} = require('./team-updates.cjs');
const prefix = '/api/azure-bridge/preview-files/';
const mime = {html:'text/html',js:'application/javascript',css:'text/css',json:'application/json',png:'image/png',
    jpg:'image/jpeg',jpeg:'image/jpeg',svg:'image/svg+xml',ico:'image/x-icon',gif:'image/gif',webp:'image/webp',
    mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',mp4:'video/mp4',webm:'video/webm',woff:'font/woff',woff2:'font/woff2'};

function mergedPreview(read=fetch, clock=Date.now) {
    let active, checking, checkedAt=-Infinity;
    const builds = new Map();
    async function download(token) {
        const signal = AbortSignal.timeout(20000);
        const get = async route => {
            const res = await read('https://api.github.com/repos/'+teamRepo+route,{signal,redirect:'error',
                headers:{Authorization:'Bearer '+token,'User-Agent':'TowerFlow-Dev-Preview'}});
            if (!res.ok) throw Error('Shared dev is unavailable.');
            return res.json();
        };
        const {sha,commit} = await get('/commits/dev');
        if (active?.sha === sha) return active;
        if (!/^[0-9a-f]{40}$/.test(sha) || !/^[0-9a-f]{40}$/.test(commit?.tree?.sha)) throw Error('Invalid dev revision.');
        const tree = await get('/git/trees/'+commit.tree.sha+'?recursive=1');
        if (tree.truncated) throw Error('The full web tree could not be read.');
        const entries = tree.tree.filter(e => e.type==='blob' && /^100(644|755)$/.test(e.mode) && webPath(e.path));
        if (!entries.some(e=>e.path==='TowerFlow/index.html') || entries.length>128 ||
            entries.some(e=>!Number.isSafeInteger(e.size) || e.size<0 || e.size>4*1024*1024) ||
            entries.reduce((n,e)=>n+e.size,0)>12*1024*1024) throw Error('Web preview exceeds the supported bundle size or lacks index.html.');
        const files = new Map();
        for (let i=0; i<entries.length; i+=4) {
            await Promise.all(entries.slice(i,i+4).map(async e => {
                const name=webPath(e.path), previous=active?.files.get(name);
                if (previous?.sha===e.sha) { files.set(name,previous); return; }
                const blob=await get('/git/blobs/'+e.sha);
                const bytes=Buffer.from(blob.content,'base64');
                const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
                if (actual!==e.sha || bytes.length!==e.size) throw Error('Preview file differs from git.');
                files.set(name,{sha:e.sha,bytes,type:mime[path.extname(name).slice(1).toLowerCase()]});
            }));
        }
        const build = {sha,files,key:randomBytes(24).toString('hex')};
        builds.set(build.key,build);
        if (builds.size>3) builds.delete(builds.keys().next().value);
        active=build;
        return build;
    }
    return {
        async open(token) {
            if (!active || clock()-checkedAt>=30000) {
                checking ??= download(token).then(result=>{checkedAt=clock();return result;}).finally(()=>{checking=null;});
                await checking;
            }
            active.until=clock()+30*60000;
            return {revision:active.sha,url:prefix+active.key+'/index.html'};
        },
        file(key,name) {
            const build=builds.get(key);
            return build && clock()<build.until ? build.files.get(name) : undefined;
        }
    };
}
function mountPreview(app,{auth,ensureMember,publicOrigin},preview=mergedPreview()) {
    app.get('/api/azure-bridge/merged-preview',auth,ensureMember,async (req,res)=>{
        try { res.json(await preview.open(req.session.token)); }
        catch { res.status(503).json({error:'The latest web build is unavailable. Try again or open Team updates.'}); }
    });
    // An opaque-origin iframe receives a temporary read-only URL for these verified static bytes.
    app.get(prefix+':key/*',(req,res)=>{
        const {key,0:name}=req.params, file=preview.file(key,name);
        if (!file) return res.sendStatus(404);
        const assets=publicOrigin+prefix+key+'/';
        res.set('Content-Security-Policy',[
            'sandbox allow-scripts allow-forms allow-downloads', "default-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'self'",
            'script-src '+assets, "style-src 'unsafe-inline' "+assets,'img-src data: blob: '+assets,
            'font-src '+assets,'media-src '+assets,'connect-src '+assets
        ].join('; '));
        res.set('Access-Control-Allow-Origin','*').set('X-Content-Type-Options','nosniff').type(file.type).send(file.bytes);
    });
}
module.exports={mergedPreview,mountPreview};
