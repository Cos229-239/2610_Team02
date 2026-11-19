'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function prepare(room) {
    if (!fs.existsSync(path.join(room,'server.js'))) throw Error('Choose the running collaboration room directory.');
    const git = args => execFileSync('git', args, {cwd:root,encoding:'utf8'}).trim();
    if (git(['status','--porcelain','--untracked-files=all','--','TowerFlow'])) throw Error('TowerFlow has local edits. Commit or review them before importing.');
    const revision = git(['rev-parse','HEAD']);
    const paths = execFileSync('git',['ls-files','-z','--','TowerFlow/'],{cwd:root,encoding:'utf8'}).split('\0')
        .filter(file=>/\.(?:html|css|js|json|png|jpe?g|webp|gif|svg|ico|woff2?|mp3|ogg|wav|mp4|webm)$/i.test(file))
        .filter(file=>!file.endsWith('/server.js'));
    const files = paths.map(file=>{
        const source=path.join(root,file);
        if (!fs.lstatSync(source).isFile()) throw Error('Only regular files can be imported: '+file);
        const bytes=fs.readFileSync(source);
        return {file:file.slice('TowerFlow/'.length),bytes,sha256:hash(bytes)};
    });
    if (!files.some(item=>item.file==='index.html')) throw Error('TowerFlow/index.html is missing.');
    const destination=path.join(room,'public','towerflow');
    const changes=files.filter(item=>!fs.existsSync(path.join(destination,item.file)) || hash(fs.readFileSync(path.join(destination,item.file)))!==item.sha256).map(item=>item.file);
    return {revision,files,destination,changes};
}
function install(room,apply=false) {
    const plan=prepare(room);
    console.log('Source commit: '+plan.revision);
    console.log('Destination: '+plan.destination);
    console.log('Changed or added files: '+(plan.changes.join(', ')||'none'));
    if (!apply) { console.log('Preview only. Add --apply after reviewing this commit.'); return; }
    execFileSync(process.execPath,[path.join(root,'tools','check-contributions.cjs')],{cwd:root,stdio:'inherit'});
    const stage=plan.destination+'.stage-'+crypto.randomUUID();
    const rollback=plan.destination+'.previous';
    fs.mkdirSync(stage,{recursive:true});
    try {
        if(fs.existsSync(plan.destination)) fs.cpSync(plan.destination,stage,{recursive:true});
        for(const item of plan.files){
            const target=path.join(stage,item.file);
            fs.mkdirSync(path.dirname(target),{recursive:true});
            fs.writeFileSync(target,item.bytes);
        }
        fs.writeFileSync(path.join(stage,'towerflow-build.json'),JSON.stringify({revision:plan.revision,importedAt:new Date().toISOString(),files:plan.files.map(({file,sha256})=>({file,sha256}))},null,2)+'\n');
        if(fs.existsSync(rollback))throw Error('Review the previous import directory before another import: '+rollback);
        const hadPrevious=fs.existsSync(plan.destination);
        if(hadPrevious)fs.renameSync(plan.destination,rollback);
        try{fs.renameSync(stage,plan.destination);}
        catch(error){if(hadPrevious)fs.renameSync(rollback,plan.destination);throw error;}
        console.log('Imported. Inspect /towerflow/towerflow-build.json on the host, then reopen the business panel.');
    } finally { fs.rmSync(stage,{recursive:true,force:true}); }
}
if(require.main===module){
    try{
        const args=process.argv.slice(2), room=args.find(arg=>!arg.startsWith('--'));
        if(!room)throw Error('Usage: node tools/import-room-app.cjs <room-directory> [--apply]');
        if(args.some(arg=>arg.startsWith('--')&&arg!=='--apply'))throw Error('Unknown option.');
        install(path.resolve(room),args.includes('--apply'));
    }catch(error){console.error(error.message);process.exitCode=1;}
}
module.exports={prepare,install};
