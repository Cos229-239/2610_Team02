"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {create,DURATIONS}=require("./projector-machine.js");
test("projector remains off until an intentional wall click, then waits 3 seconds after descent",()=>{
 let now=0;const m=create({clock:()=>now});
 assert.equal(m.tick().stage,"IDLE");assert.equal(m.tick().lightOn,false);
 assert.equal(m.activate("front",now),true);
 assert.equal(m.tick(now).stage,"CLEARING");
 now=1500;assert.equal(m.tick(now).stage,"DESCENDING");assert.equal(m.tick(now).cleared,1);
 now=4800;assert.equal(m.tick(now).stage,"BOOT_DELAY");assert.equal(m.tick(now).lightOn,false);
 now=7799;assert.equal(m.tick(now).lightOn,false);
 now=7800;assert.equal(m.tick(now).stage,"PROJECTING");assert.equal(m.tick(now).portalEnabled,true);
});
test("clicking a different wall retargets one active projection, not a duplicate",()=>{
 let now=0;const m=create({clock:()=>now});
 assert.equal(m.activate("side",0),false);
 assert.equal(m.activate("left",0),true);
 assert.equal(m.activate("right",10),false); // cannot race an in-progress descent
 now=7800;assert.equal(m.tick(now).stage,"PROJECTING");
 assert.equal(m.activate("right",now),true);
 assert.equal(m.tick(now).wall,"right");assert.equal(m.tick(now).previousWall,"left");
 assert.equal(m.tick(now).portalEnabled,false);
 now+=DURATIONS.RETARGETING;assert.equal(m.tick(now).stage,"PROJECTING");
 assert.equal(m.tick(now).wall,"right");assert.equal(m.tick(now).previousWall,null);
 assert.equal(m.activate("right",now),false);
});
test("power off retracts, then raises props and returns to idle with no leftover portal",()=>{
 let now=0;const m=create({clock:()=>now});
 m.activate("front",now);now=7800;m.tick(now);
 assert.equal(m.powerOff(now),true);assert.equal(m.powerOff(now),false);
 assert.equal(m.tick(now).lightOn,false);assert.equal(m.tick(now).portalEnabled,false);
 now+=DURATIONS.RETRACTING;assert.equal(m.tick(now).stage,"RESTORING");
 assert.equal(m.tick(now).descended,0);
 now+=DURATIONS.RESTORING;const s=m.tick(now);
 assert.equal(s.stage,"IDLE");assert.equal(s.cleared,0);assert.equal(s.wall,null);
});
test("power off during descent cancels a delayed activation",()=>{
 let now=0;const m=create({clock:()=>now});
 m.activate("back",now);now=2700;
 assert.equal(m.powerOff(now),true);
 now+=15000;const s=m.tick(now);
 assert.equal(s.stage,"IDLE");assert.equal(s.lightOn,false);assert.equal(s.portalEnabled,false);
});
test("unknown wall, invalid clock and repeat clicks never start motion",()=>{
 const m=create({clock:()=>0});
 assert.equal(m.activate(null),false);assert.equal(m.activate("__proto__"),false);
 assert.equal(m.activate("front"),true);assert.equal(m.activate("front"),false);
 assert.throws(()=>m.tick(NaN),/clock/);
});
