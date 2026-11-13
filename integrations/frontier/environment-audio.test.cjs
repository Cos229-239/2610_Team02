"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const bus=require("./environment-audio.js");
function fakeDoc(){
 const handlers=new Map(),elements=[];
 return {
  elements,
  querySelectorAll(){return elements},
  addEventListener(name,fn){handlers.set(name,fn)},
  removeEventListener(name,fn){if(handlers.get(name)===fn)handlers.delete(name)},
  click(which){
   handlers.get("click")?.({target:{closest(selector){
    if(which==="stop"&&selector.includes("#stopMusic"))return {};
    if(which==="rain"&&selector.includes("#rain"))return {};
    return null;
   }}});
  },
  handlers
 };
}
test("Stop ambient pauses only environmental HTML media; never team voice streams",()=>{
 const doc=fakeDoc(),music={currentTime:12,pauses:0,pause(){this.pauses++}},
 voice={srcObject:{active:true},currentTime:14,pauses:0,pause(){this.pauses++}};
 doc.elements.push(music,voice);
 const gate=bus.create({doc});doc.click("stop");
 assert.equal(music.pauses,1);assert.equal(music.currentTime,0);
 assert.equal(voice.pauses,0);assert.equal(voice.currentTime,14);
 assert.equal(gate.muted,true);gate.dispose();
 assert.equal(doc.handlers.size,0);
});
test("Web Audio gain stopped without suspending shared AudioContext, preserves gain on restart",()=>{
 const changes=[],ctx={currentTime:9,suspend(){throw Error("must not suspend")}},
 gain={value:.6,cancelScheduledValues(t){changes.push(["cancel",t])},
 setValueAtTime(v,t){this.value=v;changes.push(["value",v,t])}};
 const gate=bus.create({doc:null});gate.track({gain,context:ctx});
 const res=gate.stop();
 assert.equal(res.stopped,1);assert.deepEqual(changes.slice(0,2),[["cancel",9],["value",0,9]]);
 assert.equal(gate.stats().teamVoiceTracksUntouched,true);
 gate.arm();gate.dispose();
});
test("THREE environmental audio is stopped but never calls unrelated voice or scene APIs",()=>{
 let stops=0,volume=1;
 const environmental={isPlaying:true,stop(){stops++;this.isPlaying=false},
 getVolume(){return volume},setVolume(v){volume=v}};
 const gate=bus.create({doc:null});
 assert.strictEqual(gate.track(environmental),environmental);
 gate.stop();assert.equal(stops,1);assert.equal(volume,0);
 gate.arm();gate.dispose();
 assert.throws(()=>bus.classify({srcObject:{active:true},currentTime:1,pause(){}}),/MediaStream/);
});
test("stop is idempotent for one-shot oscillator resources",()=>{
 let stops=0;const source={stop(){if(stops)throw Error("duplicate");stops++}};
 const gate=bus.create({doc:null});gate.track(source);
 gate.stop();gate.stop();assert.equal(stops,1);
 const future={stop(){stops++}};
 gate.track(future);assert.equal(stops,2);
 gate.dispose();
});
test("Only explicitly environmental channels can be tracked",()=>{
 const gate=bus.create({doc:null});
 assert.throws(()=>gate.track({stop(){}},{role:"voice"}),/Only explicitly/);
 assert.throws(()=>gate.track({}),/Unsupported/);
 gate.dispose();
});
