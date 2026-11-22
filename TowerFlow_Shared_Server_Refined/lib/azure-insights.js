'use strict';
const { summary } = require('./inventory');
const { analyze } = require('./decision-model');

// Fixed watchlist is illustrative market context, NOT users' owned shares.
const WATCHLIST = Object.freeze([{ symbol: 'SPY', name: 'S&P 500 ETF' }, { symbol: 'AAPL', name: 'Apple' }, { symbol: 'MSFT', name: 'Microsoft' }]);
let marketCache = { at: 0, result: null };
let pending = null;
function insight(state, now = Math.floor(Date.now() / 1000)) {
  const s = summary(state);
  const review = analyze(state, { now });
  const rows = review.rows || [];
  const critical = rows.filter(x => x.status === 'CURRENTLY_LOW').length;
  const soon = rows.filter(x => x.status === 'PROJECTED_LOW').length;
  const insufficient = rows.filter(x => x.status === 'INSUFFICIENT_DATA').length;
  return {
    inventory: { products: s.products, units: s.units, lowStock: s.lowStock, valueCents: s.valueCents },
    attention: [
      ...(s.lowStock ? [{ kind: 'stock', text: s.lowStock + ' product(s) at or below minimum stock.', action: 'Review low stock' }] : []),
      ...(soon ? [{ kind: 'planning', text: soon + ' product(s) may reach minimum within 7 days.', action: 'Review 7-day outlook' }] : []),
      ...(insufficient ? [{ kind: 'evidence', text: insufficient + ' product(s) lack sufficient sales history for an outlook.', action: 'Review evidence' }] : [])
    ].slice(0, 3),
    note: 'Inventory figures use recorded local data. Outlooks are planning estimates, not validated forecasts.',
    // Do not invent a priority score or interpret securities as inventory.
    counts: { currentLow: critical, projectedLow: soon, insufficient }
  };
}
function parseCsv(text, today = new Date()) {
  const lines = String(text).trim().split(/\r?\n/);
  if (lines[0] !== 'Date,Open,High,Low,Close,Volume' || lines.length < 2) return null;
  const records = lines.slice(1).map(line => line.split(',')).filter(columns => {
    if (columns.length !== 6 || !/^\d{4}-\d\d-\d\d$/.test(columns[0])) return false;
    return Number.isFinite(Date.parse(columns[0] + 'T00:00:00Z')) &&
      Number.isFinite(Number(columns[4])) && Number(columns[4]) > 0;
  }).sort((a,b) => a[0].localeCompare(b[0]));
  if (!records.length) return null;
  const row = records.at(-1);
  const age = today.getTime() - Date.parse(row[0] + 'T00:00:00Z');
  if (age < -86400000 || age > 7 * 86400000) return null;
  return { asOf: row[0], close: Number(row[4]) };
}
async function market({ fetchImpl = fetch, now = Date.now(), force = false } = {}) {
  if (!force && marketCache.result && now - marketCache.at < 30 * 60 * 1000) return marketCache.result;
  if (pending && !force) return pending;
  const job = (async () => {
    // Stooq may require an API key or block automated CSV downloads. Fail closed.
    const observations = [];
    for (const entry of WATCHLIST) {
      try {
        const end = new Date(now);
        const start = new Date(now - 10 * 86400000);
        const date = d => d.toISOString().slice(0,10).replaceAll('-','');
        const url = 'https://stooq.com/q/d/l/?s=' + entry.symbol.toLowerCase() + '.us&i=d&d1=' + date(start) + '&d2=' + date(end);
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(3500), redirect: 'error', headers: { 'Accept': 'text/csv' } });
        if (!response.ok) continue;
        const raw = await response.text();
        if (raw.length > 30000) continue;
        const quote = parseCsv(raw, new Date(now));
        if (quote) observations.push({ ...entry, ...quote, currency: 'USD', source: 'Stooq (end-of-day; potentially delayed)' });
      } catch { /* Network and provider failures are not market values. */ }
    }
    return {
      status: observations.length ? 'partial' : 'unavailable',
      quotes: observations,
      message: observations.length ? 'Daily closing prices; not real-time. These are example securities, not your holdings.' :
        'Market quotes unavailable from the free source. No prices have been estimated.',
      source: 'Stooq', fetchedAt: new Date(now).toISOString()
    };
  })();
  pending = job;
  try { const result = await job; marketCache = { at: now, result }; return result; }
  finally { if (pending === job) pending = null; }
}
module.exports = { insight, market, parseCsv };
