// TowerFlow Business Inventory v1 — pure, deterministic analysis.
// No quote API, live sales integration or external telemetry is implied.
"use strict";
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.TowerflowInventory=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const finite=(v,label,min=0,max=1e12)=>{
    if(typeof v==="boolean"||v===null||v==="")throw Error(label+" must be a number");
    const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error("Invalid "+label);
    return n;
  };
  const text=(v,label,max=100)=>{
    if(typeof v!=="string"||!v.trim()||v.length>max)throw Error("Invalid "+label);
    return v.trim().replace(/[\x00-\x1f]/g," ");
  };
  function normalizeProduct(raw){
    if(!raw||typeof raw!=="object")throw Error("Invalid product");
    return {
      sku:text(raw.sku,"SKU",32).toUpperCase(),
      name:text(raw.name,"product name",90),
      category:text(raw.category||"Other","category",50),
      units:finite(raw.units,"on-hand units",0,1e7),
      weeklySales:finite(raw.weeklySales,"weekly units sold",0,1e7),
      unitCost:finite(raw.unitCost,"unit cost",0,1e8),
      unitPrice:finite(raw.unitPrice,"sale price",0,1e8),
      daysOnShelf:finite(raw.daysOnShelf,"days on shelf",0,36500),
      footprintSqFt:finite(raw.footprintSqFt||0,"space square feet",0,1e7),
      status:["active","paused","retired"].includes(raw.status)?raw.status:"active"
    };
  }
  function metrics(record){
    const p=normalizeProduct(record);
    const inventoryCost=p.units*p.unitCost;
    const potentialRevenue=p.units*p.unitPrice;
    const potentialGrossProfit=potentialRevenue-inventoryCost;
    const weeklyRevenue=p.weeklySales*p.unitPrice;
    const weeklyGrossProfit=p.weeklySales*(p.unitPrice-p.unitCost);
    const weeksOfCover=p.weeklySales===0?null:p.units/p.weeklySales;
    const grossMarginPct=p.unitPrice>0?100*(p.unitPrice-p.unitCost)/p.unitPrice:0;
    const sellThroughRisk=p.units>0&&(p.weeklySales===0||weeksOfCover>12||p.daysOnShelf>90);
    // Based on user supplied/manual sales, NOT market predictions.
    const signal=p.status!=="active"?p.status.toUpperCase():
      p.weeklySales===0&&p.units>0?"NO SALES":
      sellThroughRisk?"SLOW MOVING":
      weeksOfCover!==null&&weeksOfCover<2?"RESTOCK REVIEW":"HEALTHY";
    return {...p,inventoryCost,potentialRevenue,potentialGrossProfit,weeklyRevenue,weeklyGrossProfit,weeksOfCover,grossMarginPct,signal,salesPerSqFt:p.footprintSqFt>0?weeklyRevenue/p.footprintSqFt:null};
  }
  function analyze(products){
    if(!Array.isArray(products)||products.length>5000)throw Error("Invalid inventory list");
    const items=products.map(metrics),ids=new Set();
    for(const p of items){if(ids.has(p.sku))throw Error("Duplicate SKU: "+p.sku);ids.add(p.sku);}
    const sum=(key)=>items.reduce((n,p)=>n+p[key],0);
    return {
      items,
      totalSkus:items.length,
      unitsOnHand:sum("units"),
      inventoryCost:sum("inventoryCost"),
      potentialRevenue:sum("potentialRevenue"),
      potentialGrossProfit:sum("potentialGrossProfit"),
      weeklyRevenue:sum("weeklyRevenue"),
      weeklyGrossProfit:sum("weeklyGrossProfit"),
      occupiedSqFt:sum("footprintSqFt"),
      atRiskSkus:items.filter(p=>["NO SALES","SLOW MOVING"].includes(p.signal)).length,
      stagnantCost:items.filter(p=>["NO SALES","SLOW MOVING"].includes(p.signal)).reduce((n,p)=>n+p.inventoryCost,0)
    };
  }
  function reprice(record,newPrice){
    const p=normalizeProduct(record),price=finite(newPrice,"new price",0,1e8);
    const oldGrossProfit=(p.unitPrice-p.unitCost)*p.units;
    const newGrossProfit=(price-p.unitCost)*p.units;
    // Revenue/profit scenarios keep quantities constant. Demand changes UNKNOWN.
    return {
      sku:p.sku,oldPrice:p.unitPrice,newPrice:price,
      oldPotentialGrossProfit:oldGrossProfit,
      newPotentialGrossProfit:newGrossProfit,
      grossProfitDifference:newGrossProfit-oldGrossProfit,
      breakEvenPrice:p.unitCost,
      assumptions:"All on-hand units eventually sell; sales volume and demand elasticity unchanged. Illustrative only."
    };
  }
  const demo=Object.freeze([
    {sku:"PHONE-PRIOR",name:"Previous-generation phone",category:"Phones",units:96,weeklySales:3,unitCost:390,unitPrice:479,daysOnShelf:132,footprintSqFt:38,status:"active"},
    {sku:"PHONE-CURRENT",name:"Current-generation phone",category:"Phones",units:42,weeklySales:21,unitCost:640,unitPrice:850,daysOnShelf:21,footprintSqFt:25,status:"active"},
    {sku:"TABLET-PRIOR",name:"Previous-generation tablet",category:"Tablets",units:79,weeklySales:1,unitCost:270,unitPrice:359,daysOnShelf:175,footprintSqFt:28,status:"active"},
    {sku:"LAPTOP-CURRENT",name:"Current-generation laptop",category:"Computers",units:30,weeklySales:11,unitCost:840,unitPrice:1240,daysOnShelf:15,footprintSqFt:35,status:"active"},
    {sku:"GPU-LEGACY",name:"Previous-generation graphics component",category:"Components",units:65,weeklySales:0,unitCost:178,unitPrice:229,daysOnShelf:210,footprintSqFt:16,status:"active"}
  ]);
  return Object.freeze({normalizeProduct,metrics,analyze,reprice,demo});
});
