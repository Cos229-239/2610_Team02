"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict");
const {createBoard,colorForAccount}=require("./whiteboard-core.cjs");
test("stable account color, multi-author notes and restorable board state",()=>{
 let next=0;const board=createBoard({uuid:()=>String(++next),clock:()=>123});
 const a=board.apply({type:"add",text:"AURA checklist",x:1,y:2},{userId:"player1"});
 const b=board.apply({type:"add",text:"FLOW architecture",x:3,y:4},{userId:"player2"});
 assert.equal(a.note.color,colorForAccount("player1"));
 assert.equal(b.note.color,colorForAccount("player2"));
 assert.equal(board.list().length,2);assert.equal(board.snapshot().sequence,2);
 const restored=createBoard({restore:board.snapshot()});
 assert.deepEqual(restored.list(),board.list());
});
test("conflicting edits refuse stale versions and members cannot overwrite each other",()=>{
 const board=createBoard({uuid:()=>"note-1",clock:()=>123});
 board.apply({type:"add",text:"Original",x:0,y:0},{userId:"alice"});
 assert.throws(()=>board.apply({type:"edit",id:"note-1",expectedVersion:1,text:"Hijack"},{userId:"bob"}),/Not authorized/);
 board.apply({type:"edit",id:"note-1",expectedVersion:1,text:"Mine"},{userId:"alice"});
 assert.throws(()=>board.apply({type:"edit",id:"note-1",expectedVersion:1,text:"Stale"},{userId:"alice"}),/Stale/);
 board.apply({type:"remove",id:"note-1",expectedVersion:2},{userId:"owner",role:"maintainer"});
 assert.equal(board.list().length,0);
});
test("unauthorized input and invalid note data fail closed",()=>{
 const board=createBoard({uuid:()=>"A"});
 assert.throws(()=>board.apply({type:"add",text:"x",x:0,y:0},{userId:"anon",role:"viewer"}),/Write access/);
 assert.throws(()=>board.apply({type:"add",text:"",x:0,y:0},{userId:"alice"}),/Invalid note/);
 assert.throws(()=>board.apply({type:"add",text:"x",x:Infinity,y:0},{userId:"alice"}),/Invalid note coordinates/);
 assert.throws(()=>board.apply({type:"run_shell"},{userId:"alice"}),/Unsupported/);
});
