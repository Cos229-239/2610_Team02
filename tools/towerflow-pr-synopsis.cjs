"use strict";
// Read-only deterministic PR synopsis. Does not merge, deploy or delete work.
const cp=require("node:child_process"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
function git(args){return cp.execFileSync("git",["-C",root,...args],{encoding:"utf8",timeout:15000,maxBuffer:1024*1024,windowsHide:true});}
function bucket(file){
 if(/^TowerFlow\//.test(file))return "TowerFlow business application";
 if(/^collaboration-room\//.test(file)||/^integrations\/(frontier|aura|world)\//.test(file))return "3D multiplayer room / AURA";
 if(/^integrations\/mediator\//.test(file)||/^\.devcontainer\//.test(file)||/^\.vsconfig$/.test(file))return "Developer environment and mediator";
 if(/^\.github\//.test(file)||/^tools\//.test(file))return "Verification / delivery tooling";
 return "Other project files";
}
function synopsis(changes,commits){
 const groups=new Map(),safe=s=>String(s).replace(/[<>|]/g," ").replaceAll(String.fromCharCode(96)," ").slice(0,180);
 for(const change of changes){const name=bucket(change.path);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(change);}
 const lines=["# TowerFlow Contribution / Merge Synopsis","","**Scope:** "+[...groups.keys()].join("; "),"",
 "**Protection:** A preview does not equal a merge. Contributors retain their branches; host review is required before merge. Merging does not deploy.","",
 "## Source changes"];
 for(const [name,files] of groups){
  lines.push("### "+name);
  for(const f of files.slice(0,100))lines.push("- **"+safe(f.status)+"** "+safe(f.path));
  if(files.length>100)lines.push("- "+(files.length-100)+" additional files");
 }
 lines.push("","## Proposed commit synopsis");
 for(const c of commits.slice(0,25))lines.push("- "+safe(c));
 lines.push("","## Review and evidence checklist",
 "- [ ] Screenshots/visual preview of business application and 3D room",
 "- [ ] Original portfolio, themes and first-person camera controls preserved",
 "- [ ] Original four-station Development Room still accessible",
 "- [ ] Windows and Linux inventory/preview tests pass",
 "- [ ] Multiplayer voice, GitHub OAuth and authorization unchanged",
 "- [ ] Demo figures labeled; no payments or live market feeds falsely represented",
 "- [ ] No credentials, private live server files or host business data committed",
 "- [ ] Reviewer approves merge; deployment remains separate");
 return lines.join("\n")+"\n";
}
function approvedBase(base){
 // Allow exactly one reviewed stacked-PR integration base; no arbitrary branches.
 return /^(dev|main|master|feature\\/frontier-execution-evidence-20261111)$/.test(base);
}
function run(){
 const base=(process.env.GITHUB_BASE_REF||process.argv[2]||"dev");
 if(!approvedBase(base))throw Error("Only approved base branches supported");
 const ref="origin/"+base;
 const changes=git(["diff","--name-status",ref+"...HEAD","--"]).split(/\r?\n/).filter(Boolean).map(line=>{
  const parts=line.split("\t");return {status:parts[0],path:parts[parts.length-1]};
 });
 const commits=git(["log","--format=%h %s",ref+"..HEAD"]).split(/\r?\n/).filter(Boolean);
 const output=synopsis(changes,commits);
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,output);
 else process.stdout.write(output);
}
if(require.main===module)try{run();}catch(e){console.error("SYNOPSIS UNAVAILABLE:",e.message);process.exitCode=1;}
module.exports={synopsis,bucket,approvedBase};
