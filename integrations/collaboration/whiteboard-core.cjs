"use strict";
// Account-scoped collaborative whiteboard domain model. Transport/storage adapters
// are deliberately separate; no promise of live multiplayer until connected.
const {createHash,randomUUID}=require("node:crypto");
const COLORS=Object.freeze(["#5BCBFF","#F46BC7","#EBC267","#8FF5AC","#A9A0FF","#FF9570","#59E9D2","#D7A4FA"]);
const MAX_NOTES=250,MAX_LENGTH=3000;
function validUser(user){if(typeof user!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(user))throw Error("Invalid authenticated user");return user;}
function colorForAccount(account){
 const h=createHash("sha256").update(validUser(account).toLowerCase()).digest();
 return COLORS[h.readUInt32BE(0)%COLORS.length];
}
function createBoard({boardId="main",uuid=randomUUID,clock=()=>Date.now(),restore}={}){
 if(!/^[a-z0-9_-]{1,64}$/i.test(boardId))throw Error("Invalid board identifier");
 const notes=new Map(),history=[];let sequence=0;
 if(restore){
  if(restore.boardId!==boardId||!Array.isArray(restore.notes)||restore.notes.length>MAX_NOTES)
    throw Error("Invalid restored board");
  for(const note of restore.notes){
   validUser(note.author);
   if(typeof note.id!=="string"||!note.id||typeof note.text!=="string"||note.text.length>MAX_LENGTH||
      !Number.isInteger(note.version)||note.version<1||notes.has(note.id))
     throw Error("Invalid restored note");
   notes.set(note.id,{...note,color:colorForAccount(note.author)});
  }
  sequence=Number.isSafeInteger(restore.sequence)&&restore.sequence>=0?restore.sequence:0;
 }
 function list(){return Array.from(notes.values()).map(n=>({...n}));}
 function snapshot(){return {boardId,sequence,notes:list(),history:history.map(e=>({...e}))};}
 function apply(op,{userId,role="contributor"}={}){
  validUser(userId);
  if(!["contributor","maintainer"].includes(role))throw Error("Write access required");
  if(!op||!["add","edit","remove"].includes(op.type))throw Error("Unsupported whiteboard operation");
  let result,action=op.type;
  if(op.type==="add"){
   if(notes.size>=MAX_NOTES)throw Error("Board note capacity reached");
   if(typeof op.text!=="string"||!op.text.trim()||op.text.length>MAX_LENGTH)throw Error("Invalid note");
   if(!Number.isFinite(op.x)||!Number.isFinite(op.y)||Math.abs(op.x)>100||Math.abs(op.y)>100)
     throw Error("Invalid note coordinates");
   const id=uuid();if(typeof id!=="string"||!id||notes.has(id))throw Error("Duplicate generated note id");
   result={id,author:userId,color:colorForAccount(userId),text:op.text.trim(),x:op.x,y:op.y,
     version:1,createdAt:clock(),modifiedAt:clock()};
   notes.set(id,result);
  }else{
   if(typeof op.id!=="string")throw Error("Invalid note id");
   const prior=notes.get(op.id);if(!prior)throw Error("Note not found");
   if(prior.author!==userId&&role!=="maintainer")throw Error("Not authorized to alter another author's note");
   if(!Number.isSafeInteger(op.expectedVersion)||prior.version!==op.expectedVersion)
     throw Error("Stale note version; reload before editing");
   if(op.type==="edit"){
    if(typeof op.text!=="string"||!op.text.trim()||op.text.length>MAX_LENGTH)throw Error("Invalid note");
    result={...prior,text:op.text.trim(),version:prior.version+1,modifiedAt:clock()};
    notes.set(op.id,result);
   }else{notes.delete(op.id);result={...prior,deleted:true,version:prior.version+1};}
  }
  sequence++;
  const event=Object.freeze({sequence,boardId,action,noteId:result.id,actor:userId,at:clock(),version:result.version});
  history.push(event);if(history.length>1000)history.shift();
  return {event:{...event},note:{...result},snapshot:snapshot()};
 }
 return Object.freeze({apply,snapshot,list,boardId});
}
module.exports={createBoard,colorForAccount,COLORS,MAX_NOTES};
