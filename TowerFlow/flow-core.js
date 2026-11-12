"use strict";
// TowerFlow FLOW deterministic intelligence: local/manual or demo data ONLY.
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.TowerflowFlow=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
 const TIERS=Object.freeze({
  starter:{price:0,skuLimit:25,trendReports:0,marketSearches:0,ai:false},
  assisted:{price:500,skuLimit:250,trendReports:3,marketSearches:5,ai:true},
  corporate:{price:100000,skuLimit:5000,trendReports:null,marketSearches:null,ai:true}
 });
 function tier(name){if(!Object.hasOwn(TIERS,name))throw Error("Unknown simulation tier");return TIERS[name];}
 function limit(name,n){const t=tier(name);if(!Number.isSafeInteger(n)||n<0)throw Error("Invalid catalog count");return {allowed:n<=t.skuLimit,max:t.skuLimit,count:n};}
 function summarize(a){
  if(!a||!Array.isArray(a.items)||!Number.isFinite(a.inventoryCost))throw Error("Inventory analysis required");
  const stagnant=a.items.filter(i=>["NO SALES","SLOW MOVING"].includes(i.signal)).sort((x,y)=>y.inventoryCost-x.inventoryCost);
  const fastest=[...a.items].filter(i=>i.status==="active").sort((x,y)=>y.weeklySales-x.weeklySales);
  const categoryMap=new Map();
  for(const p of a.items){
    const key=p.category;
    if(!categoryMap.has(key))categoryMap.set(key,{category:key,skus:0,units:0,capital:0,weeklyRevenue:0,weeklyGrossProfit:0,spaceSqFt:0});
    const c=categoryMap.get(key);
    c.skus++;c.units+=p.units;c.capital+=p.inventoryCost;c.weeklyRevenue+=p.weeklyRevenue;
    c.weeklyGrossProfit+=p.weeklyGrossProfit;c.spaceSqFt+=p.footprintSqFt;
  }
  const categories=[...categoryMap.values()].sort((x,y)=>y.capital-x.capital);
  return {
   source:"manual-or-demonstration",totalSkus:a.totalSkus,inventoryCost:a.inventoryCost,
   weeklyRevenue:a.weeklyRevenue,weeklyGrossProfit:a.weeklyGrossProfit,
   grossMarginPct:a.weeklyRevenue>0?100*a.weeklyGrossProfit/a.weeklyRevenue:null,
   occupiedSqFt:a.occupiedSqFt,stagnantCost:a.stagnantCost,atRiskSkus:a.atRiskSkus,categories,
   candidates:stagnant.slice(0,5).map(p=>({sku:p.sku,name:p.name,capital:p.inventoryCost,signal:p.signal,
    note:p.weeklySales===0?"No recorded sales; check holding costs and actual demand before repricing.":"Review slow stock and warehouse footprint before action."})),
   fastest:fastest.slice(0,5).map(p=>({sku:p.sku,weeklySales:p.weeklySales})),
   disclaimer:"Local manual/demo catalog; not connected to external quotes, marketplace inventory or competitor data."
  };
 }
 const TOPICS=["overview","inventory risk","sales velocity","gross margin","warehouse space","growth"];
 function answer(topic,analysis,name="assisted"){
  const t=tier(name);if(!t.ai)throw Error("FLOW requires the $500 or $100,000 simulated tier.");
  if(!TOPICS.includes(topic))throw Error("Unsupported analysis topic");
  const s=summarize(analysis),money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
  const messages={
   "overview":"Your catalog records "+s.totalSkus+" SKUs and "+money(s.inventoryCost)+" in inventory cost. Estimated weekly revenue is "+money(s.weeklyRevenue)+", gross profit "+money(s.weeklyGrossProfit)+".",
   "inventory risk":s.atRiskSkus+" SKUs are flagged for slow/no sales, tying up "+money(s.stagnantCost)+". "+(s.candidates[0]?s.candidates[0].sku+" has the highest at-risk capital.":"No at-risk items are recorded."),
   "sales velocity":s.fastest.length?"Highest recorded weekly sales: "+s.fastest.map(x=>x.sku+" ("+x.weeklySales+" units)").join(", ")+".":"No active catalog items.",
   "gross margin":"Estimated gross margin: "+(s.grossMarginPct===null?"unavailable":s.grossMarginPct.toFixed(1)+"%")+". This excludes overhead, returns, taxes and fulfillment.",
   "warehouse space":"Recorded inventory occupies "+s.occupiedSqFt+" square feet. Review slow SKUs before changing space allocation.",
   "growth":"Review fast-moving SKUs before restocking and "+money(s.stagnantCost)+" of at-risk capital. Test with dated POS data and verified market feeds."
  };
  return {topic,text:messages[topic],evidence:s,model:"DETERMINISTIC LOCAL ANALYSIS",live:false};
 }
 return Object.freeze({TIERS,TOPICS,tier,limit,summarize,answer});
});
