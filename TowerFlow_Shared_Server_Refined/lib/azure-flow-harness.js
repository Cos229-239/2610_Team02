'use strict';
// Azure Flow: deterministic, read-only capability harness; no cloud or brokerage API.
const crypto = require('node:crypto');
const { summary } = require('./inventory');
const { analyze } = require('./decision-model');

const CAPABILITIES = Object.freeze({
  inventory: 'inventory.read',
  operations: 'sales.aggregate',
  portfolio: 'portfolio.evaluate-import',
});
const MAX_PORTFOLIO_ROWS = 25;
function reject(message) { const error = new Error(message); error.status = 400; throw error; }
function assertState(state) {
  if (!state || !Array.isArray(state.products) || !Array.isArray(state.movements)) reject('Invalid inventory snapshot.');
}
function monthKey(timestamp) { return new Date(timestamp * 1000).toISOString().slice(0, 7); }
function aggregateSales(state) {
  const byMonth = new Map();
  let count = 0, revenue = 0n;
  for (const movement of state.movements) {
    if (movement.type !== 'sale' || !Number.isSafeInteger(movement.recordedAt) ||
      !Number.isSafeInteger(movement.quantity) || movement.quantity <= 0 ||
      !Number.isSafeInteger(movement.unitPriceCents) || movement.unitPriceCents < 0) continue;
    const month = monthKey(movement.recordedAt);
    const amount = BigInt(movement.quantity) * BigInt(movement.unitPriceCents);
    byMonth.set(month, (byMonth.get(month) || 0n) + amount);
    revenue += amount; count++;
  }
  const monthly = [...byMonth.entries()].sort((a,b) => a[0].localeCompare(b[0])).slice(-12)
    .map(([month, cents]) => ({ month, salesCents: cents.toString() }));
  return { recordedSales: count, recordedSalesCents: revenue.toString(), monthly,
    basis: 'Recorded sale movements; gross sales, not net profit. No inferred market revenue.' };
}
function overview(state, { now = Math.floor(Date.now() / 1000), revision = 'unknown' } = {}) {
  assertState(state);
  if (!Number.isSafeInteger(now) || now < 0) reject('Invalid evaluation timestamp.');
  const totals = summary(state);
  const analyzed = analyze(state, { now });
  const data = aggregateSales(state);
  const low = state.products.filter(p => !p.archived &&
    p.stock.reduce((n,x) => n + x.quantity, 0) <= p.minimumStock);
  const findings = [];
  if (low.length) findings.push({ severity:'attention', title:low.length + ' products at or below minimum',
    basis:'Compared current per-location quantities with each product minimum stock.', action:'Inspect low-stock products in Inventory.' });
  if (analyzed.counts.projectedLow) findings.push({ severity:'review', title:analyzed.counts.projectedLow + ' modeled stock risks',
    basis:'Seven-day planning estimate on tested product histories; not a validated forecast.', action:'Review the Azure Stock Guide seven-day outlook.' });
  if (!data.recordedSales) findings.push({ severity:'unknown', title:'No recorded sales to analyze',
    basis:'No sale movements carrying valid quantity and unit price.', action:'Record transactions before evaluating demand.' });
  if (!findings.length) findings.push({severity:'stable',title:'No immediate inventory threshold alerts',
    basis:'Checked currently recorded active products. This is not a guarantee of future sales.',action:'Continue monitoring.'});
  const result = {
    kind:'azure-flow-overview-v1', readOnly:true, revision, evaluatedAt: new Date(now*1000).toISOString(),
    inventory:{...totals, lowNames:low.slice(0,5).map(p=>p.name)},
    operations:data,
    findings:findings.slice(0,3),
    limits:['No external market quotes or brokerage connections.','Only first 30 products have model-level forecast details.',
      'Inventory value reflects recorded list prices; it is not company valuation.'],
    capabilities:[CAPABILITIES.inventory,CAPABILITIES.operations]
  };
  const evidenceHash = crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
  return {...result,evidenceHash};
}
function portfolio(rows) {
  if (!Array.isArray(rows) || rows.length > MAX_PORTFOLIO_ROWS) reject('Provide up to 25 manually entered holdings.');
  const holdings = rows.map((x,i) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) reject('Invalid holding row ' + (i+1));
    const symbol = String(x.symbol || '').trim().toUpperCase();
    if (!/^[A-Z0-9.\-]{1,12}$/.test(symbol)) reject('Invalid symbol at row ' + (i+1));
    const shares = Number(x.shares), cost = Number(x.costPerShare), price = Number(x.observedPrice);
    if (![shares,cost,price].every(Number.isFinite) || shares < 0 || shares > 100000000 ||
        cost < 0 || price < 0 || cost > 100000000 || price > 100000000) reject('Invalid share count or price at row ' + (i+1));
    if (typeof x.asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.asOf) ||
        !Number.isFinite(Date.parse(x.asOf + 'T00:00:00Z'))) reject('Each holding needs a valid observed-price date.');
    const costCents = Math.round(shares * cost * 100);
    const valueCents = Math.round(shares * price * 100);
    if (!Number.isSafeInteger(costCents) || !Number.isSafeInteger(valueCents)) reject('Holding value exceeds supported range.');
    return { symbol, shares, asOf:x.asOf, costCents, valueCents, differenceCents:valueCents-costCents,
      source:'User-entered historical price; not a live market quote.' };
  });
  const totals = holdings.reduce((a,h)=>({costCents:a.costCents + h.costCents,valueCents:a.valueCents+h.valueCents}),{costCents:0,valueCents:0});
  if (![totals.costCents,totals.valueCents].every(Number.isSafeInteger)) reject('Portfolio total exceeds supported range.');
  return { readOnly:true, holdings, ...totals, differenceCents:totals.valueCents-totals.costCents,
    notice:'Illustrative mark-to-input valuation. User-supplied quotes may be outdated. No orders or shares were traded.' };
}
function run(state, { capability = CAPABILITIES.inventory, revision, portfolioRows } = {}) {
  if (capability === CAPABILITIES.portfolio) return portfolio(portfolioRows);
  if (capability === CAPABILITIES.inventory || capability === CAPABILITIES.operations) return overview(state,{revision});
  return reject('Unknown or unauthorized Azure Flow capability.');
}
module.exports = { CAPABILITIES, run, overview, portfolio, aggregateSales };
