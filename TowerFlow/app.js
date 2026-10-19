"use strict";
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
const number = n => new Intl.NumberFormat("en-US",{maximumFractionDigits:6}).format(Number(n)||0);
const palette = ["#50e39a","#62adff","#f8bd69","#d58bff","#ff7c9c","#55d9e8","#b6d36c","#ed9e68"];
const demo = {
cash:10000,
assets:[
{symbol:"AAPL",name:"Apple Inc.",shares:12,cost:172,price:189.84},
{symbol:"MSFT",name:"Microsoft",shares:5,cost:390,price:421.22},
{symbol:"NVDA",name:"NVIDIA",shares:8,cost:95,price:118.11}
],
watch:[{symbol:"AMZN",price:187.42},{symbol:"GOOGL",price:176.31},{symbol:"TSLA",price:248.5}],
transactions:[],
theme:"emerald"
};
let state;
try { state=JSON.parse(localStorage.getItem("towerflow-state-v1")) || structuredClone(demo); } catch { state=structuredClone(demo); }
function persist(){localStorage.setItem("towerflow-state-v1",JSON.stringify(state));}
function normalize(){state.cash=Number(state.cash)||0;state.assets=Array.isArray(state.assets)?state.assets:[];state.watch=Array.isArray(state.watch)?state.watch:[];state.transactions=Array.isArray(state.transactions)?state.transactions:[];state.assets.forEach(a=>{a.symbol=String(a.symbol||"").toUpperCase();a.shares=Number(a.shares)||0;a.cost=Number(a.cost)||0;a.price=Number(a.price)||0;});}
normalize();
function totals(){let invested=state.assets.reduce((s,a)=>s+a.shares*a.price,0),cost=state.assets.reduce((s,a)=>s+a.shares*a.cost,0);return {invested,cost,ret:invested-cost,total:state.cash+invested};}
function safe(text){return String(text??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
const t=totals();$("portfolioValue").textContent=money(t.total);$("investedValue").textContent=money(t.invested);$("cashValue").textContent=money(state.cash);$("totalReturn").textContent=(t.ret>0?"+":"")+money(t.ret);$("totalReturn").className="metric-value "+(t.ret>=0?"positive":"negative");$("returnPercent").textContent=(t.cost?((t.ret/t.cost)*100).toFixed(2)+"% return on recorded cost basis":"No recorded cost basis");$("returnPercent").className="metric-foot "+(t.ret>=0?"positive":"negative");
$("holdingsBody").innerHTML=state.assets.map((a,i)=>{let mv=a.shares*a.price,r=(a.price-a.cost)*a.shares,rp=a.cost?(a.price/a.cost-1)*100:0;return `<tr><td><div class="symbol">${safe(a.symbol)}</div><div class="asset-name">${safe(a.name||a.symbol)}</div></td><td>${number(a.shares)}</td><td>${money(a.price)}</td><td>${money(mv)}</td><td class="${r>=0?"positive":"negative"}">${r>=0?"+":""}${money(r)}<div class="asset-name">${rp.toFixed(2)}%</div></td><td><button class="small-action" data-remove="${i}" title="Remove asset" aria-label="Remove ${safe(a.symbol)}">✕</button></td></tr>`}).join("");
$("emptyHoldings").hidden=state.assets.length>0;
$("transactionsBody").innerHTML=state.transactions.slice(0,30).map(tx=>`<tr><td>${safe(new Date(tx.date).toLocaleDateString())}</td><td class="${tx.side==="buy"?"positive":"negative"}">${safe(tx.side.toUpperCase())}</td><td class="symbol">${safe(tx.symbol)}</td><td>${number(tx.shares)}</td><td>${money(tx.price)}</td><td>${money(tx.shares*tx.price)}</td></tr>`).join("");
$("emptyTransactions").hidden=state.transactions.length>0;
$("watchlist").innerHTML=state.watch.map((w,i)=>`<div class="watch-row"><div><div class="symbol">${safe(w.symbol)}</div><div class="asset-name">Manual/demo quote</div></div><div class="watch-price">${money(w.price)}</div><button class="small-action" data-watch-remove="${i}" aria-label="Remove ${safe(w.symbol)}">✕</button></div>`).join("")||'<div class="empty">Your watchlist is empty.</div>';
$("themeSelect").value=state.theme||"emerald";document.body.dataset.theme=state.theme||"emerald";drawChart();project();
}
function drawChart(){
const canvas=$("allocationChart"),ctx=canvas.getContext("2d"),rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;canvas.width=Math.max(1,rect.width*dpr);canvas.height=220*dpr;ctx.scale(dpr,dpr);const w=rect.width,h=220;ctx.clearRect(0,0,w,h);
const items=state.assets.map(a=>({label:a.symbol,value:a.shares*a.price})).filter(a=>a.value>0);if(!items.length){ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");ctx.font="12px Segoe UI";ctx.textAlign="center";ctx.fillText("Add holdings to view allocation",w/2,h/2);$("allocationLegend").innerHTML="";return;}
const total=items.reduce((s,a)=>s+a.value,0),cx=w/2,cy=h/2,r=Math.min(82,w*.24),ri=r*.62;let start=-Math.PI/2;
items.forEach((a,i)=>{let end=start+a.value/total*Math.PI*2;ctx.beginPath();ctx.arc(cx,cy,r,start,end);ctx.arc(cx,cy,ri,end,start,true);ctx.closePath();ctx.fillStyle=palette[i%palette.length];ctx.fill();start=end;});
ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--text");ctx.textAlign="center";ctx.font="bold 15px Segoe UI";ctx.fillText(money(total),cx,cy+3);ctx.font="10px Segoe UI";ctx.fillStyle=getComputedStyle(document.body).getPropertyValue("--muted");ctx.fillText("INVESTED",cx,cy+19);
$("allocationLegend").innerHTML=items.map((a,i)=>`<div><i style="background:${palette[i%palette.length]}"></i><span>${safe(a.label)} · ${(a.value/total*100).toFixed(1)}%</span></div>`).join("");
}
function project(){let start=Math.max(0,Number($("projectionStart").value)||0),monthly=Math.max(0,Number($("monthlyContribution").value)||0),rate=(Number($("annualReturn").value)||0)/100,years=Number($("projectionYears").value)||5;if(rate<=-1){$("projectionValue").textContent="Invalid return";return;}let r=Math.pow(1+rate,1/12)-1,n=years*12,value=start*Math.pow(1+r,n)+(Math.abs(r)<1e-10?monthly*n:monthly*(Math.pow(1+r,n)-1)/r);$("projectionValue").textContent=money(value);$("projectionNote").textContent=`${years} years · ${money(monthly)} monthly · ${Number($("annualReturn").value)||0}% assumed annual return. Not a forecast.`;}
function setMessage(msg,ok=true){$("tradeMessage").textContent=msg;$("tradeMessage").style.color=ok?"var(--accent)":"var(--bad)";}
function marketTick(){
const now=new Date(),fmt=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",minute:"2-digit",second:"2-digit",hour12:true}),parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now),p=Object.fromEntries(parts.map(x=>[x.type,x.value])),minute=Number(p.hour)*60+Number(p.minute),day=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(p.weekday),weekday=day>=1&&day<=5,open=weekday&&minute>=570&&minute<960;
$("marketClock").textContent=fmt.format(now);$("marketState").textContent=open?"REGULAR SESSION":"MARKET CLOSED";
let target=new Date(now);target.setSeconds(0,0);if(open){target.setMinutes(target.getMinutes()+(960-minute));$("marketCountdown").textContent="Closes in "+duration(target-now);}else{$("marketCountdown").textContent="Regular session 9:30 AM – 4:00 PM ET · weekdays";}
}
function duration(ms){let s=Math.max(0,Math.floor(ms/1000));return Math.floor(s/3600)+"h "+Math.floor(s%3600/60)+"m";}
function transact(side,symbol,shares,price){
symbol=symbol.trim().toUpperCase();shares=Number(shares);price=Number(price);
if(!/^[A-Z0-9.^_-]{1,12}$/.test(symbol)||!Number.isFinite(shares)||shares<=0||!Number.isFinite(price)||price<=0)throw Error("Enter a valid symbol, positive share quantity, and positive price.");
const total=shares*price;let asset=state.assets.find(a=>a.symbol===symbol);
if(side==="buy"){if(total>state.cash+1e-8)throw Error("Insufficient available cash for this purchase.");if(!asset){asset={symbol,name:symbol,shares:0,cost:0,price};state.assets.push(asset);}asset.cost=(asset.cost*asset.shares+total)/(asset.shares+shares);asset.shares+=shares;asset.price=price;state.cash-=total;}
else{if(!asset||asset.shares+1e-8<shares)throw Error("You do not own enough shares to sell this quantity.");asset.shares-=shares;asset.price=price;state.cash+=total;if(asset.shares<1e-8)state.assets=state.assets.filter(a=>a.symbol!==symbol);}
state.transactions.unshift({side,symbol,shares,price,total,date:new Date().toISOString()});persist();render();
}
$("tradeForm").addEventListener("submit",e=>{e.preventDefault();try{transact($("tradeSide").value,$("tradeSymbol").value,$("tradeShares").value,$("tradePrice").value);setMessage("Transaction recorded locally.");$("tradeForm").reset();$("tradeTotal").textContent=money(0);}catch(err){setMessage(err.message,false);}});
function updateOrderTotal(){ $("tradeTotal").textContent=money((Number($("tradeShares").value)||0)*(Number($("tradePrice").value)||0));}
["tradeShares","tradePrice"].forEach(id=>$(id).addEventListener("input",updateOrderTotal));
$("tradeSymbol").addEventListener("change",()=>{let a=state.assets.find(x=>x.symbol===$("tradeSymbol").value.trim().toUpperCase())||state.watch.find(x=>x.symbol===$("tradeSymbol").value.trim().toUpperCase());if(a)$("tradePrice").value=a.price;updateOrderTotal();});
$("addAssetBtn").addEventListener("click",()=>{$("modalTitle").textContent="Add asset";$("assetForm").reset();$("modal").hidden=false;});
$("closeModal").addEventListener("click",()=>$("modal").hidden=true);
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))$("modal").hidden=true;});
$("assetForm").addEventListener("submit",e=>{e.preventDefault();let symbol=$("assetSymbol").value.trim().toUpperCase(),shares=Number($("assetShares").value),cost=Number($("assetCost").value),price=Number($("assetPrice").value);if(!/^[A-Z0-9.^*-]{1,12}$/.test(symbol)||shares<=0||cost<=0||price<=0){alert("Enter a valid symbol and positive numeric values.");return;}if(state.assets.some(a=>a.symbol===symbol)){alert("That symbol already exists. Record a buy transaction to increase its position.");return;}state.assets.push({symbol,name:$("assetName").value.trim()||symbol,shares,cost,price});persist();render();$("modal").hidden=true;});
$("holdingsBody").addEventListener("click",e=>{let b=e.target.closest("[data-remove]");if(!b)return;let i=Number(b.dataset.remove),a=state.assets[i];if(a&&confirm(`Remove ${a.symbol} from tracked holdings? This does not create a sale or add cash.`)){state.assets.splice(i,1);persist();render();}});
$("addWatchBtn").addEventListener("click",()=>{$("watchForm").hidden=!$("watchForm").hidden;});
$("watchForm").addEventListener("submit",e=>{e.preventDefault();let symbol=$("watchSymbol").value.trim().toUpperCase(),price=Number($("watchPrice").value);if(!/^[A-Z0-9.^*-]{1,12}$/.test(symbol)||price<=0)return;if(state.watch.some(w=>w.symbol===symbol)){alert("That symbol is already on your watchlist.");return;}state.watch.push({symbol,price});persist();render();$("watchForm").reset();$("watchForm").hidden=true;});
$("watchlist").addEventListener("click",e=>{let b=e.target.closest("[data-watch-remove]");if(!b)return;state.watch.splice(Number(b.dataset.watchRemove),1);persist();render();});
["projectionStart","monthlyContribution","annualReturn","projectionYears"].forEach(id=>$(id).addEventListener("input",project));
$("themeSelect").addEventListener("change",()=>{state.theme=$("themeSelect").value;persist();render();});
$("clearTransactions").addEventListener("click",()=>{if(confirm("Clear transaction history? Holdings and cash will not change.")){state.transactions=[];persist();render();}});
$("resetDemo").addEventListener("click",()=>{if(confirm("Reset this browser's TowerFlow data to the demonstration portfolio? This replaces the saved local workspace.")){state=structuredClone(demo);persist();render();}});
$("exportBtn").addEventListener("click",()=>download("towerflow-portfolio.json",JSON.stringify(state,null,2),"application/json"));
$("importBtn").addEventListener("click",()=>$("fileInput").click());
function download(name,content,type){let blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function parseCSV(text){let lines=text.trim().split(/\r?\n/).map(x=>x.split(",").map(y=>y.trim().replace(/^"|"$/g,"")));let headers=lines.shift().map(x=>x.toLowerCase());return lines.filter(r=>r.length>1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]]))).map(r=>({symbol:r.symbol||r.ticker,name:r.name||r.symbol||r.ticker,shares:Number(r.shares||r.quantity),cost:Number(r.cost||r.costbasis||r.averagecost),price:Number(r.price||r.currentprice)})).filter(a=>a.symbol&&a.shares>0&&a.cost>0&&a.price>0);}
$("fileInput").addEventListener("change",async e=>{let f=e.target.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw Error("Files must be smaller than 5 MB.");let text=await f.text(),assets;if(/.pdf$/i.test(f.name))throw Error("PDF text extraction is not implemented. Export your holdings as CSV or JSON first.");if(/.json$/i.test(f.name)){let data=JSON.parse(text);assets=Array.isArray(data)?data:data.assets;if(!Array.isArray(assets))throw Error("JSON must contain an assets array.");if(data.cash!==undefined)state.cash=Number(data.cash)||0;if(Array.isArray(data.watch))state.watch=data.watch;if(Array.isArray(data.transactions))state.transactions=data.transactions;if(data.theme)state.theme=data.theme;}
else if(/.csv$/i.test(f.name))assets=parseCSV(text);
else if(/.xml$/i.test(f.name)){let xml=new DOMParser().parseFromString(text,"application/xml");if(xml.querySelector("parsererror"))throw Error("Invalid XML file.");assets=[...xml.querySelectorAll("asset,holding")].map(n=>({symbol:n.querySelector("symbol,ticker")?.textContent,name:n.querySelector("name")?.textContent,shares:Number(n.querySelector("shares,quantity")?.textContent),cost:Number(n.querySelector("cost,costBasis,averageCost")?.textContent),price:Number(n.querySelector("price,currentPrice")?.textContent)})).filter(a=>a.symbol&&a.shares>0&&a.cost>0&&a.price>0);}
else throw Error("Supported formats: JSON, CSV, XML, and PDF (PDF extraction is not available).");
assets=assets.map(a=>({symbol:String(a.symbol||a.ticker||"").trim().toUpperCase(),name:String(a.name||a.symbol||""),shares:Number(a.shares),cost:Number(a.cost||a.costBasis),price:Number(a.price||a.currentPrice)})).filter(a=>/^[A-Z0-9.^_-]{1,12}$/.test(a.symbol)&&a.shares>0&&a.cost>0&&a.price>0);if(!assets.length)throw Error("No valid holdings found. Expected symbol, shares, cost, and price columns/fields.");if(!confirm(`Import ${assets.length} valid holding(s) and replace the current holdings?`))return;state.assets=assets;persist();render();alert(`Imported ${assets.length} holdings. Check cash and cost basis before trading.`);}catch(err){alert("Import failed: "+err.message);}finally{$("fileInput").value="";}});
window.addEventListener("resize",drawChart);
marketTick();setInterval(marketTick,1000);render();
