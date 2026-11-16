"use strict";
// TowerFlow geographical sales data: verified input schema, never inferred from IP.
// Sales status is a business decision: contribution and margin, not raw volume only.
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.TowerflowSalesGlobeCore=api;
})(typeof globalThis!=="undefined"?globalThis:null,function(){
  const STATUSES=Object.freeze({good:"#40e49b",slow:"#f6d56b",bad:"#ff5e7a",none:null});
  const REGIONS=Object.freeze([
    {id:"na",label:"North America",lat:39,lon:-98},
    {id:"sa",label:"South America",lat:-15,lon:-62},
    {id:"eu",label:"Europe",lat:51,lon:12},
    {id:"af",label:"Africa",lat:0,lon:21},
    {id:"me",label:"Middle East",lat:29,lon:48},
    {id:"as",label:"East Asia",lat:35,lon:114},
    {id:"in",label:"South Asia",lat:21,lon:78},
    {id:"oc",label:"Oceania",lat:-25,lon:135}
  ]);
  const DEMO=Object.freeze([
    {region:"na",revenue:325000,cost:176000,units:11500},
    {region:"sa",revenue:39000,cost:45000,units:920},
    {region:"eu",revenue:245000,cost:142000,units:8100},
    {region:"af",revenue:13000,cost:10000,units:440},
    {region:"me",revenue:0,cost:0,units:0},
    {region:"as",revenue:184000,cost:162000,units:5100},
    {region:"in",revenue:41000,cost:62000,units:1400},
    {region:"oc",revenue:0,cost:0,units:0}
  ]);
  function assess(row,{healthyMargin=.2,minimumUnits=1000}={}){
    if(!row||typeof row.region!=="string"||!REGIONS.some(r=>r.id===row.region))
      throw Error("Unknown sales region");
    for(const field of ["revenue","cost","units"]){
      if(typeof row[field]!=="number"||!Number.isFinite(row[field])||row[field]<0||row[field]>1e12)
        throw Error("Invalid "+field);
    }
    if(row.units===0&&row.revenue===0&&row.cost===0)return Object.freeze({...row,status:"none",color:null,profit:0,margin:null});
    const profit=Math.round((row.revenue-row.cost)*100)/100;
    const margin=row.revenue>0?profit/row.revenue:null;
    const status=profit<0||row.revenue===0?"bad":row.units<minimumUnits||margin<healthyMargin?"slow":"good";
    return Object.freeze({...row,status,color:STATUSES[status],profit,margin});
  }
  function summarize(rows=DEMO){
    if(!Array.isArray(rows)||rows.length>REGIONS.length)throw Error("Invalid region set");
    const used=new Set(),byId=new Map(REGIONS.map(r=>[r.id,Object.freeze({...r,status:"none",color:null,revenue:0,cost:0,units:0,profit:0,margin:null})]));
    for(const item of rows){
      const value=assess(item);
      if(used.has(value.region))throw Error("Duplicate region");
      used.add(value.region);
      byId.set(value.region,Object.freeze({...REGIONS.find(r=>r.id===value.region),...value}));
    }
    return Object.freeze(Array.from(byId.values()));
  }
  return Object.freeze({REGIONS,DEMO,STATUSES,assess,summarize});
});
