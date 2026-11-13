import test from "node:test";
import assert from "node:assert/strict";
import {zone,mergeThreeWay,reconcile,checkMergedRoom} from "./reconcile-frontier-cinematic.mjs";
const begin="// TF_FRONTIER_LOBBY_V1_BEGIN",end="// TF_FRONTIER_LOBBY_V1_END";
const flags=[
"TF_PROJECTOR_MACHINE_V1","TF_FRONTIER_CYBER_AMBIENCE_V1",
"TF_FRONTIER_CINEMATIC_FIDELITY_V1","TF_FRONTIER_KINETIC_PEDESTALS_V1",
"TF_FRONTIER_NEON_LIGHTING_V1","TF_FRONTIER_TEAM_CHAT_DOCK_V1",
"TF_FRONTIER_ENVIRONMENT_AUDIO_V1"
];
// Realistic spacing ensures that independent local and incoming edits are
// separated by multiple unchanged context lines. Adjacent edits conflict in Git.
const stableLines=Array.from({length:36},(_,i)=>"const preservedPart"+i+"="+i+";");
const base=[begin,"(function(){","const shared=42;","const preserved=10;",
  ...stableLines,"window.tfFrontier=shared;","})();",end].join("\n");
const incoming=[begin,"(function(){","const shared=42;","const preserved=10;",
  ...stableLines,...flags.map(m=>"// "+m),"const extra=99;",
  "window.tfFrontier=shared+extra;","})();",end].join("\n");
const wrap=m=>"// ORIGINAL PRIVATE SETTINGS\n// environment unchanged\n"+m+"\n// AUTH BOUNDARY\n";
test("no original room replacement: only source inside exact markers may differ",()=>{
 const a=wrap(base),b=wrap(incoming);
 assert.equal(zone(a).prefix,zone(b).prefix);
 assert.equal(zone(a).suffix,zone(b).suffix);
 assert.ok(checkMergedRoom(a,b));
 assert.throws(()=>checkMergedRoom(a,"// changed\n"+b),/Unrelated/);
 assert.throws(()=>zone(a+"\n"+base),/duplicate/);
});
test("a conflict-free three-way merge retains private local modifications and adds release",()=>{
 const local=base.replace("const preserved=10;","const preserved=10;\nconst personalCustom=18;");
 const x=mergeThreeWay(local,base,incoming);
 assert.equal(x.clean,true);
 assert.match(x.merged,/personalCustom=18/);
 assert.match(x.merged,/const extra=99/);
 const full=wrap(local),chosen=reconcile(full,{next:incoming,ancestors:[{name:"baseline",text:base}]});
 assert.equal(chosen.kind,"merged");
 assert.match(chosen.updated,/personalCustom=18/);
 assert.match(chosen.updated,/const extra=99/);
 assert.ok(checkMergedRoom(full,chosen.updated));
 assert.ok(chosen.updated.startsWith("// ORIGINAL PRIVATE SETTINGS"));
});
test("conflicting local edits to the same line fail closed, without overwriting",()=>{
 const local=base.replace("const shared=42;","const shared='local version';");
 const target=incoming.replace("const shared=42;","const shared='incoming version';");
 const x=mergeThreeWay(local,base,target);
 assert.equal(x.clean,false);
 assert.throws(()=>reconcile(wrap(local),{next:target,ancestors:[{name:"baseline",text:base}]}),/No conflict-free/);
});
test("no action if source is already at target revision",()=>{
 const x=reconcile(wrap(incoming),{next:incoming,ancestors:[{name:"baseline",text:base}]});
 assert.equal(x.kind,"already-current");
 assert.equal(x.updated,wrap(incoming));
});
test("ambiguous ancestors cannot silently promote one competing merge",()=>{
 const b1=base,b2=base.replace("const preserved=10;","const preserved=15;");
 const local=b2.replace("const shared=42;","const shared=77;");
 const newer=incoming.replace("const shared=42;","const shared=77;");
 // Whether an input is a valid merge depends on diff hunk boundaries;
 // ambiguity is permitted to fail safe. Always preserve outside-region source.
 const all=wrap(local);
 try{const out=reconcile(all,{next:newer,ancestors:[{name:"first",text:b1},{name:"second",text:b2}]});
   assert.ok(checkMergedRoom(all,out.updated));
 }catch(e){assert.match(e.message,/conflict-free|Ambiguous/);}
});

test("Git merge-file counts multiple conflicts as preservation blocks rather than execution errors",()=>{
 const baseText=Array.from({length:45},(_,i)=>"line="+i+";");
 const local=baseText.slice(),target=baseText.slice();
 for(const i of [3,39]){local[i]="local="+i+";";target[i]="release="+i+";";}
 const out=mergeThreeWay(local.join("\n"),baseText.join("\n"),target.join("\n"));
 assert.equal(out.clean,false);
 assert.ok(out.conflicts>=2,"expected Git to report at least two conflicts");
 assert.match(out.merged,/<<<<<<< original-live/);
});
