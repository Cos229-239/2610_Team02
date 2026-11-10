// TOWERFLOW_PRODUCT_INSTALL_V1
// Stages only reviewed business dashboard static files in the live room.
// No server changes, no process restarts, no secrets, no Git push.
import {readFile,writeFile,copyFile,rename,mkdir,rm} from "node:fs/promises";
import {existsSync} from "node:fs";
import {join,resolve,dirname} from "node:path";
import {homedir} from "node:os";
import {fileURLToPath} from "node:url";
import {createHash,randomUUID} from "node:crypto";
import {execFileSync} from "node:child_process";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const sourceDir=join(root,"TowerFlow");
const targets=[
  join(homedir(),"Desktop","Towerflow_Team02_Private_Invite_Room","Towerflow_Collaboration_Room","public"),
  join(root,"collaboration-room","live-room","public")
];
const names=["index.html","app.js","styles.css","inventory-core.js","inventory-ui.js","flow-core.js","flow-ui.js","contributions.js","contributions.json","flow-agent-ui.js"];
const digest=x=>createHash("sha256").update(x).digest("hex");
function verifyIndex(html){
 for(const marker of ['id="portfolioValue"','id="holdingsBody"','id="themeSelect"','id="marketClock"','data-tf-app-panel="inventory"','data-tf-app-panel="finance"','data-tf-app-panel="revenue"','data-tf-app-panel="business"','src="inventory-core.js"','src="inventory-ui.js"','src="flow-core.js"','src="flow-ui.js"','src="contributions.js"','src="flow-agent-ui.js"','id="tfFlowAnalyze"','data-tf-app-panel="contributions"'])
   if(!html.includes(marker))throw Error("Business preservation failure: "+marker);
 return true;
}
async function run(){
 const mode=process.argv.slice(2);
 if(mode.length!==1||!["--dry-run","--apply"].includes(mode[0]))throw Error("Use --dry-run or --apply");
 const apply=mode[0]==="--apply";
 const source=new Map();
 for(const name of names){
  const path=join(sourceDir,name);
  if(!existsSync(path))throw Error("Tracked portfolio asset missing: "+name);
  const bytes=await readFile(path);source.set(name,bytes);
 }
 verifyIndex(source.get("index.html").toString("utf8"));
 for(const name of ["app.js","inventory-core.js","inventory-ui.js","flow-core.js","flow-ui.js","contributions.js","flow-agent-ui.js"]){
  execFileSync(process.execPath,["--check",join(sourceDir,name)],{timeout:12000,stdio:"pipe"});
 }
 const plan=[];
 const authoritativeRoom=join(targets[0],"room.js");
 if(!existsSync(authoritativeRoom))throw Error("Authoritative live room missing: "+authoritativeRoom);
 const authoritativeRoomText=await readFile(authoritativeRoom,"utf8");
 for(const publicRoot of targets){
  const room=join(publicRoot,"room.js");
  if(publicRoot!==targets[0]){
   if(!existsSync(room)){
     console.log("WORKSPACE PRODUCT: missing room; safely skipped.");
     continue;
   }
   if(await readFile(room,"utf8")!==authoritativeRoomText){
     console.log("WORKSPACE PRODUCT: divergent room; leaving workspace assets untouched.");
     continue;
   }
  }
  for(const name of names){
   const dest=join(publicRoot,"towerflow",name);
   const previous=existsSync(dest)?await readFile(dest):null;
   const bytes=source.get(name);
   if(previous&&previous.equals(bytes))continue;
   if(previous){
    const old=previous.toString("utf8");
    const known={
      "index.html":['id="portfolioValue"','data-tf-app-panel="inventory"'],
      "app.js":["towerflow-state-v1","const palette"],
      "styles.css":["--surface","--accent"],
      "inventory-core.js":["TowerflowInventory","normalizeProduct"],
      "inventory-ui.js":["towerflow-business-inventory-v1","tfInventory"],
      "flow-core.js":["TowerflowFlow","TIERS"],
      "flow-ui.js":["tfFlowTier","tfFlowAnalyze"],
      "contributions.js":["tfContributorCards","contributions.json"],
      "contributions.json":["schemaVersion","pullRequest"],
      "flow-agent-ui.js":["tfAgentInspect","inventory.review","market.research"]
    };
    if(!known[name].every(s=>old.includes(s)))
      throw Error("Existing unrecognized product asset; refusing overwrite: "+dest);
   }
   plan.push({dest,previous,bytes,name});
  }
 }
 console.log("=== TOWERFLOW BUSINESS PRODUCT "+(apply?"APPLY":"DRY RUN")+" ===");
 for(const row of plan)console.log("COPY "+row.name+" to "+row.dest+" SHA256 "+digest(row.bytes).slice(0,16));
 console.log("Original room.js remains unchanged. Server restart NONE. Portfolio data remains per browser.");
 if(!apply)return;
 const backup=join(homedir(),"Desktop","Towerflow_Product_Backups",new Date().toISOString().replace(/[.:]/g,"-"));
 await mkdir(backup,{recursive:true});
 const records=[];
 for(const row of plan){
  if(!row.previous)records.push({destination:row.dest,created:true,sha256:digest(row.bytes)});
  else {
   const file=join(backup,records.length+"-"+row.name);
   await writeFile(file,row.previous);records.push({destination:row.dest,backup:file,sha256:digest(row.bytes)});
  }
 }
 await writeFile(join(backup,"manifest.json"),JSON.stringify(records,null,2)+"\n");
 const completed=[];
 try{
  for(const row of plan){
   await mkdir(dirname(row.dest),{recursive:true});
   const stage=row.dest+".towerflow-"+randomUUID();
   try{await writeFile(stage,row.bytes);await rename(stage,row.dest);completed.push(row.dest);}
   finally{await rm(stage,{force:true});}
  }
 }catch(e){
  const errors=[];
  for(const record of records.filter(r=>completed.includes(r.destination)).reverse())try{
   if(record.created)await rm(record.destination,{force:true});
   else await copyFile(record.backup,record.destination);
  }catch(x){errors.push(record.destination+": "+x.message);}
  throw Error("Copy failed; rollback attempted. "+e.message+(errors.length?" ROLLBACK ERRORS "+errors.join("; "):""));
 }
 console.log("DEPLOYED reviewed static files. Backup manifest: "+join(backup,"manifest.json"));
 console.log("Open /towerflow/index.html?tab=inventory on the room origin. No authenticated company database is connected.");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 run().catch(e=>{console.error("PRODUCT INSTALL BLOCKED:",e.message);process.exitCode=1;});
export {verifyIndex};
