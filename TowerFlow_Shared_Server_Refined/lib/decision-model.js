'use strict';
// Coherent Inventory Decision Model v1. Not an LLM or trained ML model.
const DAY = 86400, WINDOW = 30, MIN_HISTORY = 14, MIN_SALE_DAYS = 3, HORIZON = 7, LIMIT = 30;
function analyze(state, { now = Math.floor(Date.now()/1000), query = '' } = {}) {
  if (!state || !Array.isArray(state.products) || !Array.isArray(state.movements))
    throw new TypeError('A valid inventory state is required.');
  if (!Number.isSafeInteger(now) || now < 0 || typeof query !== 'string' || query.length > 160)
    throw new TypeError('Invalid model inputs.');
  const term = query.trim().toLowerCase();
  const valid = state.movements.filter(m => Number.isSafeInteger(m.recordedAt) &&
    m.recordedAt >= 0 && m.recordedAt <= now);
  const oldest = valid.reduce((min,m)=>Math.min(min,m.recordedAt),Infinity);
  const days = oldest === Infinity ? 0 : Math.min(WINDOW,Math.floor((now-oldest)/DAY));
  const since = now - days*DAY;
  const products = state.products.filter(p=>!p.archived && (!term ||
    [p.name,p.category,p.barcode,p.partNumber,p.serialNumber,
      p.partNumber!=null && p.serialNumber!=null ? `${p.partNumber}/${p.serialNumber}`:null]
      .some(x=>String(x??'').toLowerCase().includes(term)))).sort((a,b)=>a.id-b.id);
  const rows = products.slice(0,LIMIT).map(p=>{
    const stock = p.stock.reduce((n,x)=>n+x.quantity,0);
    const sales = valid.filter(m=>m.productId===p.id && m.type==='sale' &&
      m.recordedAt>=since && Number.isSafeInteger(m.quantity) && m.quantity>0);
    const saleDays = new Set(sales.map(m=>Math.floor(m.recordedAt/DAY))).size;
    const sold = sales.reduce((n,m)=>n+m.quantity,0);
    const evidence = { observationDays:days, distinctSaleDays:saleDays, unitsSold:sold,
      horizonDays:HORIZON, usesOnlySales:true };
    if (days<MIN_HISTORY || saleDays<MIN_SALE_DAYS) return {
      id:p.id,name:p.name,currentStock:stock,minimumStock:p.minimumStock,status:'INSUFFICIENT_DATA',
      evidence,dailyRate:null,projectedUnits:null,suggestedOrder:null,
      reason:`Abstained: require >=${MIN_HISTORY} recorded-history days and >=${MIN_SALE_DAYS} distinct sale days; observed ${days} days and ${saleDays} sale days.` };
    const rate = sold/days, demand = Math.ceil(rate*HORIZON);
    const projected = Math.max(0,stock-demand);
    const order = Math.max(0,p.minimumStock+demand-stock);
    const status = stock<=p.minimumStock?'CURRENTLY_LOW':
      projected<=p.minimumStock?'PROJECTED_LOW':'ABOVE_THRESHOLD';
    return { id:p.id,name:p.name,currentStock:stock,minimumStock:p.minimumStock,status,evidence,
      dailyRate:Number(rate.toFixed(3)),projectedUnits:projected,suggestedOrder:order,
      reason:`Planning estimate: ${sold} sales / ${days} observed days = ${rate.toFixed(2)} units/day; ${HORIZON}-day demand rounded up to ${demand}. Projected = max(0,${stock}-${demand}) = ${projected}; suggested order = max(0,minimum ${p.minimumStock} + demand ${demand} - stock ${stock}) = ${order}. Not a validated forecast.` };
  });
  const counts = { insufficient:rows.filter(r=>r.status==='INSUFFICIENT_DATA').length,
    currentlyLow:rows.filter(r=>r.status==='CURRENTLY_LOW').length,
    projectedLow:rows.filter(r=>r.status==='PROJECTED_LOW').length,
    aboveThreshold:rows.filter(r=>r.status==='ABOVE_THRESHOLD').length };
  return { model:'coherent-inventory-decision-v1',kind:'deterministic-statistical-decision-support',
    readOnly:true,now,assumptions:[
      'Only sale events represent demand; transfers and removals are excluded.',
      'Recorded history is assumed complete since its earliest movement.',
      'Constant observed sale rate over 7 days; no seasonality or trend correction.',
      'Sparse history causes abstention; estimates have no calibrated confidence.'],
    counts,matched:products.length,truncated:products.length>LIMIT,rows };
}
module.exports = { analyze };
