'use strict';
// Read-only, authenticated business events. No fabricated stock-exchange location,
// broker profit, or global transactions when the approved ledger is unavailable.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const ID_SALT=crypto.randomBytes(32);
const MAX_BYTES=1024*1024,MAX_EVENTS=80,WINDOW=24*60*60*1000;
const clean=x=>typeof x==='string'&&x.length<=120&&/^[\w.:/@ -]+$/.test(x);
function normalize(raw,now=Date.now()){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
 const {event_id,kind,net_revenue_cents,latitude,longitude,occurred_at}=raw;
 if(!clean(event_id)||!['sale','return','refund','adjustment'].includes(kind))return null;
 if(!Number.isSafeInteger(net_revenue_cents)||Math.abs(net_revenue_cents)>1e11)return null;
 if(!Number.isFinite(latitude)||latitude< -90||latitude>90||
    !Number.isFinite(longitude)||longitude< -180||longitude>180)return null;
 const ts=Date.parse(occurred_at);
 if(!Number.isFinite(ts)||ts>now+60000||ts<now-WINDOW)return null;
 const state=kind==='refund'||kind==='return'||net_revenue_cents<0?'red':
   net_revenue_cents===0?'yellow':'green';
 return {id:crypto.createHmac('sha256',ID_SALT).update(event_id).digest('hex').slice(0,20),state,lat:Math.round(latitude*10)/10,lon:Math.round(longitude*10)/10,
  occurredAt:new Date(ts).toISOString(),
  source:'CONFIGURED_BUSINESS_FILE'};
}
function parseLedger(body,now=Date.now()){
 const seen=new Set(),out=[];
 for(const line of String(body).split(/\r?\n/).slice(-450).reverse()){
  if(!line.trim())continue;
  try{
   const event=normalize(JSON.parse(line),now);
   if(event&&!seen.has(event.id)){out.push(event);seen.add(event.id);}
  }catch{/* A corrupted record does not create a misleading pulse. */}
  if(out.length>=MAX_EVENTS)break;
 }
 return out;
}
function makeReader({file=process.env.TOWERFLOW_BUSINESS_EVENTS_FILE,read=fs.readFile,stat=fs.stat,now=Date.now}={}){
 return async()=>{
  if(typeof file!=='string'||!file||!path.isAbsolute(file))return {
   mode:'UNCONFIGURED',events:[],reason:'No approved business transaction file connected.'};
  try{
   const info=await stat(file);
   if(info.size>MAX_BYTES)throw Error('Ledger too large; rotate the file or reduce to 1 MiB.');
   const body=await read(file,'utf8');
   return {mode:'CONFIGURED_LEDGER',events:parseLedger(body,now()),
    reason:'File-backed events only. Upstream authenticity and financial accounting have not been independently verified. Region coordinates are rounded; customer IDs and amounts are withheld.'};
  }catch(e){return {mode:'UNAVAILABLE',events:[],reason:'Configured transaction file is unreadable or invalid.'};}
 };
}
function mount(app,{auth,ensureMember,reader=makeReader()}={}){
 if(typeof auth!=='function'||typeof ensureMember!=='function')throw Error('Member authorization required.');
 app.get('/api/azure-bridge/business-signals',auth,ensureMember,async(req,res)=>{
  res.set('Cache-Control','no-store').set('Referrer-Policy','no-referrer');
  try{return res.json({schema:'towerflow-business-signals/v1',...await reader()});}
  catch{return res.status(503).json({schema:'towerflow-business-signals/v1',mode:'UNAVAILABLE',events:[],
   reason:'Business event source currently unavailable.'});}
 });
}
module.exports={normalize,parseLedger,makeReader,mount};
