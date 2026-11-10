"use strict";
// Separate from the original financial portfolio state. Business data stays local to this browser.
(function(){
  const core=window.TowerflowInventory;
  if(!core||!document.getElementById("tfInventory"))return;
  const key="towerflow-business-inventory-v1";
  const $=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);
  const num=n=>new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(n);
  const demo=()=>core.demo.map(x=>({...x}));
  function load(){
    try{const value=JSON.parse(localStorage.getItem(key));return Array.isArray(value)?value.map(core.normalizeProduct):demo();}
    catch{return demo();}
  }
  let products=load(),selected=null;
  const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(products));}catch{$("tfInventoryStatus").textContent="Storage unavailable. Export to retain changes.";}};
  const fields=["sku","name","category","units","weeklySales","unitCost","unitPrice","daysOnShelf","footprintSqFt","status"];
  const setStatus=s=>$("tfInventoryStatus").textContent=s;
  function render(){
    const analysis=core.analyze(products);
    $("tfBizUnits").textContent=num(analysis.unitsOnHand);
    $("tfBizCarrying").textContent=money(analysis.inventoryCost);
    $("tfBizSales").textContent=money(analysis.weeklyRevenue);
    $("tfBizRisk").textContent=num(analysis.atRiskSkus)+" SKUs · "+money(analysis.stagnantCost);
    $("tfBizProfit").textContent=money(analysis.weeklyGrossProfit);
    $("tfBizSqFt").textContent=num(analysis.occupiedSqFt)+" sq ft";
    const term=$("tfInventorySearch").value.trim().toLowerCase();
    const riskOnly=$("tfInventoryRiskOnly").checked;
    const rows=analysis.items.filter(p=>(!riskOnly||["NO SALES","SLOW MOVING"].includes(p.signal))&&(!term||[p.sku,p.name,p.category,p.signal].some(v=>String(v).toLowerCase().includes(term))));
    $("tfInventoryRows").replaceChildren();
    for(const p of rows){
      const tr=document.createElement("tr");
      for(const cell of [p.sku,p.name,p.category,p.units,p.weeklySales,money(p.unitPrice),money(p.inventoryCost),p.weeksOfCover===null?"No sales":num(p.weeksOfCover),p.signal]){
        const td=document.createElement("td");td.textContent=cell;tr.append(td);
      }
      const td=document.createElement("td");
      const button=document.createElement("button");button.className="btn secondary";button.textContent="Analyze";button.addEventListener("click",()=>inspect(p.sku));
      td.append(button);tr.append(td);$("tfInventoryRows").append(tr);
    }
    $("tfInventoryEmpty").hidden=rows.length!==0;
  }
  function inspect(sku){
    selected=sku;
    const item=core.metrics(products.find(p=>p.sku===sku));
    $("tfProductTitle").textContent=item.name+" · "+item.sku;
    $("tfProductSummary").textContent="Weekly sales "+num(item.weeklySales)+" units; on hand "+num(item.units)+"; current gross margin "+num(item.grossMarginPct)+"%; space "+num(item.footprintSqFt)+" sq ft. "+(item.weeksOfCover===null?"There are no recorded weekly sales.":"Estimated "+num(item.weeksOfCover)+" weeks of cover.");
    $("tfReprice").value=String(item.unitPrice);
    $("tfScenario").textContent="Change proposed unit price to compare potential gross profit. This does not alter the inventory until you explicitly save it.";
    $("tfProductEditor").hidden=false;
    $("tfProductEditor").scrollIntoView({block:"nearest",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }
  function scenario(){
    if(!selected)return;
    try {
      const p=products.find(x=>x.sku===selected),r=core.reprice(p,$("tfReprice").value);
      $("tfScenario").textContent="Old potential gross profit: "+money(r.oldPotentialGrossProfit)+
      " · New potential gross profit: "+money(r.newPotentialGrossProfit)+
      " · Difference: "+money(r.grossProfitDifference)+". "+r.assumptions;
    }catch(e){setStatus(e.message);}
  }
  $("tfInventorySearch").addEventListener("input",render);
  $("tfInventoryRiskOnly").addEventListener("change",render);
  $("tfReprice").addEventListener("input",scenario);
  $("tfApplyPrice").addEventListener("click",()=>{
    if(!selected)return;
    try{
      const row=products.find(p=>p.sku===selected),r=core.reprice(row,$("tfReprice").value);
      if(!confirm("Change the LOCAL catalog price for "+row.name+" to "+money(r.newPrice)+"? This is not a live market listing."))return;
      row.unitPrice=r.newPrice;save();render();inspect(row.sku);setStatus("Updated local scenario price for "+row.sku+".");
    }catch(e){setStatus(e.message);}
  });
  $("tfCloseEditor").addEventListener("click",()=>{$("tfProductEditor").hidden=true;selected=null;});
  $("tfSaveProduct").addEventListener("click",()=>{
    const form=$("tfProductForm");
    if(!form.reportValidity())return;
    try{
      const obj={};
      for(const name of fields)obj[name]=form.elements[name].value;
      const p=core.normalizeProduct(obj);
      const i=products.findIndex(x=>x.sku===p.sku);
      if(i>=0&&!confirm("Replace existing local catalog record "+p.sku+"?"))return;
      if(i>=0)products[i]=p;else products.push(p);
      core.analyze(products);save();render();form.reset();
      setStatus("Saved "+p.sku+" locally. Source: manual entry; no external product feed.");
    }catch(e){setStatus(e.message);}
  });
  $("tfExportInventory").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify({schema:1,items:products,source:"manual-or-illustrative"},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="towerflow-business-inventory.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);setStatus("Inventory exported.");
  });
  $("tfImportInventory").addEventListener("click",()=>$("tfInventoryFile").click());
  $("tfInventoryFile").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
      if(file.size>1_000_000)throw Error("Maximum import size is 1MB.");
      const parsed=JSON.parse(await file.text()),items=Array.isArray(parsed)?parsed:parsed.items;
      if(!Array.isArray(items))throw Error("Expected an array of inventory items.");
      const normalized=core.analyze(items).items.map(core.normalizeProduct);
      if(!confirm("Replace your LOCAL inventory with "+normalized.length+" imported products? Export first to back up."))return;
      products=normalized;save();render();setStatus("Imported "+products.length+" catalog items.");
    }catch(e){setStatus("Import rejected: "+e.message);}
    finally{e.target.value="";}
  });
  $("tfResetInventory").addEventListener("click",()=>{
    if(!confirm("Restore illustrative sample inventory? This overwrites LOCAL business items. Export first to retain your work."))return;
    products=demo();save();render();setStatus("Illustrative sample restored.");
  });
  const nav=document.querySelectorAll("[data-tf-app-tab]");
  function show(tab){
    nav.forEach(b=>{const active=b.dataset.tfAppTab===tab;b.setAttribute("aria-selected",String(active));b.tabIndex=active?0:-1;});
    for(const panel of document.querySelectorAll("[data-tf-app-panel]"))panel.hidden=panel.dataset.tfAppPanel!==tab;
    const url=new URL(window.location.href);url.searchParams.set("tab",tab);history.replaceState(null,"",url);
  }
  nav.forEach(b=>b.addEventListener("click",()=>show(b.dataset.tfAppTab)));
  const allowed=["inventory","finance","revenue","business"];
  const requested=new URL(location.href).searchParams.get("tab");
  show(allowed.includes(requested)?requested:"inventory");
  render();setStatus("DEMONSTRATION inventory. Figures are illustrative until you import real business data. This is not a live stock quote service.");
  window.TowerflowBusiness=Object.freeze({schemaVersion:1,getMetrics:()=>core.analyze(products),version:"v1"});
}());
