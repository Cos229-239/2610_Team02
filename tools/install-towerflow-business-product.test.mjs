import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import {verifyIndex} from "./install-towerflow-business-product.mjs";
const app=join(dirname(fileURLToPath(import.meta.url)),"..","TowerFlow");
test("static installer preserves original financial tools and all business panels",()=>{
 const html=readFileSync(join(app,"index.html"),"utf8");
 assert.equal(verifyIndex(html),true);
 for(const name of ["portfolioValue","marketClock","tradeForm","allocationChart","themeSelect","assetForm","watchlist","transactionsBody"]){
  assert.match(html,new RegExp("id=[\"']"+name+"[\"']"));
 }
 for(const t of ["inventory","finance","revenue","business"])assert.match(html,new RegExp('data-tf-app-panel="'+t+'"'));
});
test("installer fails closed on missing legacy financial dashboard",()=>{
 const html=readFileSync(join(app,"index.html"),"utf8");
 assert.throws(()=>verifyIndex(html.replace('id="portfolioValue"','id="gone"')),/preservation/);
});
test("business product data is labeled demo, and finance remains separate",()=>{
 const ui=readFileSync(join(app,"inventory-ui.js"),"utf8");
 assert.match(ui,/DEMONSTRATION inventory/);
 assert.match(ui,/towerflow-business-inventory-v1/);
 assert.doesNotMatch(ui,/OPENAI_API_KEY|process\.env/);
});
