#pragma once

namespace dashboard {
    inline constexpr char start[] = R"HTML(<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
<title>TowerFlow | Inventory dashboard</title>
<style>
:root {
    color-scheme: light;
    --ink: #14292b;
    --subtle: #49605e;
    --line: #d8e3de;
    --paper: #f2f6f3;
    --green: #126445;
    --green-light: #e2f2e8;
    --warn: #7d4405;
    --warn-light: #fbefdc;
    font-family: "Geist", "Inter", "Segoe UI", sans-serif;
    background: var(--paper);
    color: var(--ink);
}
* { box-sizing: border-box; }
body { margin: 0; }
header { color: white; background: #123e38; }
.header-inner, main { width: min(1280px, calc(100% - 72px)); margin: 0 auto; }
.header-inner { display: flex; align-items: center; justify-content: space-between; min-height: 64px; gap: 16px; }
.brand { display: flex; align-items: center; gap: 11px; font-size: 1.17rem; font-weight: 700; letter-spacing: -.03em; }
.mark { display: grid; place-content: center; place-items: center; gap: 3px; width: 30px; height: 30px; border: 1px solid #569984; border-radius: 7px; }
.mark span { height: 2px; background: #bcf0d4; width: 15px; border-radius: 1px; }
.mark span:first-child { width: 7px; }
.mark span:nth-child(2) { width: 11px; }
.snapshot { color: #d6eee7; font-size: .84rem; }
main { padding: 36px 0 56px; }
h1, h2, p { margin: 0; }
h1 { font-size: clamp(2rem, 4.2vw, 3rem); letter-spacing: -.055em; line-height: 1.06; }
h2 { font-size: 1.2rem; letter-spacing: -.025em; }
label { display: grid; gap: 7px; font-size: .85rem; font-weight: 600; }
input, select, button { color: inherit; font: inherit; font-size: .92rem; min-height: 39px; }
input, select { width: 100%; min-width: 0; background: white; border: 1px solid #b8cbc2; border-radius: 7px; padding: 7px 10px; }
button { cursor: pointer; border: 1px solid #b8cbc2; border-radius: 7px; background: white; padding: 7px 13px; font-weight: 650; }
button:hover { background: #edf5f0; }
button:disabled { cursor: default; opacity: .55; }
:focus-visible { outline: 3px solid #2b8a67; outline-offset: 3px; }
.filters { display: grid; grid-template-columns: minmax(170px, 2fr) minmax(155px, 1fr) minmax(110px, .9fr) auto; align-items: end; gap: 12px; margin: 24px 0 18px; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.metric { padding: 18px; min-width: 0; background: white; border: 1px solid var(--line); border-radius: 10px; }
.metric-label { font-size: .84rem; color: var(--subtle); }
.metric-value { margin-top: 8px; font-size: clamp(1.2rem, 2.25vw, 2rem); font-weight: 680; letter-spacing: -.05em; overflow-wrap: anywhere; }
.panel { background: white; border: 1px solid var(--line); border-radius: 11px; margin-top: 18px; }
.panel-head { padding: 17px 18px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.actions select { width: auto; }
.table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; font-size: .9rem; }
th, td { padding: 12px 16px; border-top: 1px solid var(--line); overflow-wrap: anywhere; }
th { color: var(--subtle); background: #f5f8f6; font-size: .79rem; font-weight: 650; white-space: nowrap; }
th.number, td.number { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
td small { display: block; margin-top: 3px; color: var(--subtle); }
.locations { color: var(--subtle); min-width: 135px; }
.badge { display: inline-block; padding: 4px 8px; border-radius: 5px; background: var(--green-light); color: var(--green); font-size: .78rem; white-space: nowrap; }
.badge.low { color: var(--warn); background: var(--warn-light); }
.pager { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; padding: 12px 16px; border-top: 1px solid var(--line); }
.pager span { margin-right: auto; color: var(--subtle); font-size: .84rem; }
.empty { text-align: center; color: var(--subtle); padding: 24px 14px; }
.notice { color: var(--subtle); font-size: .86rem; }
@media (max-width: 740px) {
    .header-inner, main { width: calc(100% - 36px); }
    main { padding-top: 26px; }
    .filters, .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .snapshot { text-align: right; }
    .metric, .panel-head { padding: 13px; }
}
</style>
</head>
<body>
<header>
  <div class="header-inner">
    <div class="brand"><span class="mark" aria-hidden="true"><span></span><span></span><span></span></span>TowerFlow</div>
    <span class="snapshot" id="snapshot">Inventory snapshot</span>
  </div>
</header>
<main>
  <h1>Inventory dashboard</h1>
  <section class="filters" aria-label="Report filters">
    <label>Product search<input id="search" type="search" placeholder="Name, barcode, QR, or ID"></label>
    <label>Location<select id="location"><option value="">All locations</option></select></label>
    <label>Stock status<select id="status"><option value="all">All statuses</option><option value="low">Low stock</option><option value="ok">In stock</option></select></label>
    <button type="button" id="reset">Clear filters</button>
  </section>
  <section class="metrics" aria-label="Inventory summary">
    <div class="metric"><div class="metric-label">Products</div><div class="metric-value" id="products-total"></div></div>
    <div class="metric"><div class="metric-label">Units on hand</div><div class="metric-value" id="units-total"></div></div>
    <div class="metric"><div class="metric-label">Low-stock products</div><div class="metric-value" id="low-total"></div></div>
    <div class="metric"><div class="metric-label">Value at list prices</div><div class="metric-value" id="value-total"></div></div>
  </section>

  <section class="panel" aria-labelledby="stock-heading">
    <div class="panel-head">
      <h2 id="stock-heading">Stock by product</h2>
      <button type="button" id="stock-download">Download stock CSV</button>
    </div>
    <div class="table-scroll" tabindex="0" aria-label="Stock by product">
      <table>
        <thead><tr><th scope="col">Product</th><th scope="col">Barcode</th><th scope="col">Locations</th>
          <th scope="col" class="number">Units</th><th scope="col" class="number">List price</th>
          <th scope="col">Overall status</th><th scope="col" class="number">List value</th></tr></thead>
        <tbody id="stock-rows"></tbody>
      </table>
    </div>
    <div class="pager"><span id="stock-range" aria-live="polite"></span>
      <button type="button" id="stock-prev">Previous</button><button type="button" id="stock-next">Next</button></div>
  </section>

  <section class="panel" aria-labelledby="movement-heading">
    <div class="panel-head">
      <h2 id="movement-heading">Movement history</h2>
      <div class="actions">
        <select id="movement-type" aria-label="Movement type">
          <option value="">All movements</option><option>Receive</option><option>Remove</option>
          <option>Transfer</option><option>Purchase</option><option>Sale</option>
        </select>
        <button type="button" id="movement-download">Download movement CSV</button>
      </div>
    </div>
    <div class="table-scroll" tabindex="0" aria-label="Movement history">
      <table>
        <thead><tr><th scope="col">Recorded (UTC)</th><th scope="col">Type</th><th scope="col">Product</th>
          <th scope="col">From</th><th scope="col">To</th><th scope="col" class="number">Units</th>
          <th scope="col">Business / reference</th><th scope="col" class="number">Trade total</th></tr></thead>
        <tbody id="movement-rows"></tbody>
      </table>
    </div>
    <div class="pager"><span id="movement-range" aria-live="polite"></span>
      <button type="button" id="movement-prev">Previous</button><button type="button" id="movement-next">Next</button></div>
  </section>
  <noscript><p class="notice">Enable JavaScript in your browser to view the report.</p></noscript>
</main>
<script type="application/json" id="inventory-data">
)HTML";

    inline constexpr char end[] = R"HTML(
</script>
<script>
'use strict';

const { generatedAt, products, movements } = JSON.parse(document.getElementById('inventory-data').textContent);
const control = id => document.getElementById(id);
const number = new Intl.NumberFormat('en-US');
const snapshotFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const pageSize = 30;
let stockPage = 0;
let movementPage = 0;
let stockRows = [];
let movementRows = [];

function decimal(cents) {
    return String(cents / 100n) + '.' + String(cents % 100n).padStart(2, '0');
}

function money(cents) {
    return '$' + number.format(cents / 100n) + '.' + String(cents % 100n).padStart(2, '0');
}

function utcTime(seconds) {
    return new Date(seconds * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

for (const product of products) {
    product.price = BigInt(product.price);
    product.units = product.stock.reduce((sum, entry) => sum + entry[1], 0);
    product.low = product.units <= product.minimum;
    product.searchText = [product.name, product.barcode, product.qr, String(product.id)]
        .map(value => value.toLowerCase());
}
const productsById = new Map(products.map(product => [product.id, product]));
const locations = new Set();
for (const product of products) {
    for (const [location] of product.stock) locations.add(location);
}
for (const movement of movements) {
    movement.price = movement.price === null ? null : BigInt(movement.price);
    if (movement.from) locations.add(movement.from);
    if (movement.to) locations.add(movement.to);
}
movements.reverse();
for (const location of [...locations].sort((a, b) => a.localeCompare(b))) {
    control('location').add(new Option(location, location));
}
control('snapshot').textContent = 'Snapshot | ' + snapshotFormat.format(new Date(generatedAt * 1000));

function cell(row, value, className) {
    const element = row.insertCell();
    element.textContent = value;
    if (className) element.className = className;
    return element;
}

function secondary(element, value) {
    if (!value) return;
    const detail = document.createElement('small');
    detail.textContent = value;
    element.append(detail);
}

function renderStock(row, entry) {
    const { product, atLocations, units } = entry;
    secondary(cell(row, product.name), 'ID ' + product.id);
    cell(row, product.barcode);
    cell(row, atLocations.map(([name, quantity]) =>
        name + ' (' + number.format(quantity) + ')').join(', ') || '—', 'locations');
    cell(row, number.format(units), 'number');
    cell(row, money(product.price), 'number');
    const badge = document.createElement('span');
    badge.className = product.low ? 'badge low' : 'badge';
    badge.textContent = product.low ? 'Low stock' : 'In stock';
    row.insertCell().append(badge);
    cell(row, money(product.price * BigInt(units)), 'number');
}

function renderMovement(row, movement) {
    cell(row, utcTime(movement.time));
    cell(row, movement.type);
    secondary(cell(row, productsById.get(movement.product).name), 'ID ' + movement.product);
    cell(row, movement.from || '—');
    cell(row, movement.to || '—');
    cell(row, number.format(movement.units), 'number');
    secondary(cell(row, movement.business || '—'), movement.reference);
    const total = movement.price === null ? '—' : money(movement.price * BigInt(movement.units));
    const amount = cell(row, total, 'number');
    if (movement.price !== null) secondary(amount, money(movement.price) + ' / unit');
}

function renderPage(id, rows, page, columns, emptyText, renderRow) {
    const table = control(id + '-rows');
    table.replaceChildren();
    const start = page * pageSize;
    const end = Math.min(start + pageSize, rows.length);
    if (rows.length) {
        for (const entry of rows.slice(start, end)) renderRow(table.insertRow(), entry);
    } else {
        const placeholder = cell(table.insertRow(), emptyText, 'empty');
        placeholder.colSpan = columns;
    }
    control(id + '-range').textContent = rows.length
        ? number.format(start + 1) + '–' + number.format(end) + ' of ' + number.format(rows.length)
        : '0 results';
    control(id + '-prev').disabled = page === 0;
    control(id + '-next').disabled = end >= rows.length;
}

function renderStocks() {
    renderPage('stock', stockRows, stockPage, 7, 'No stock matches these filters.', renderStock);
}

function renderMovements() {
    renderPage('movement', movementRows, movementPage, 8,
        movements.length ? 'No movements match these filters.' : 'No stock movements have been recorded.',
        renderMovement);
}

function update() {
    const query = control('search').value.trim().toLowerCase();
    const location = control('location').value;
    const status = control('status').value;
    const type = control('movement-type').value;
    const matchingProducts = products.filter(product =>
        (!query || product.searchText.some(field => field.includes(query))) &&
        (status === 'all' || product.low === (status === 'low')));
    const matchingIds = new Set(matchingProducts.map(product => product.id));

    stockRows = [];
    let units = 0n;
    let value = 0n;
    let low = 0;
    for (const product of matchingProducts) {
        const atLocations = location ? product.stock.filter(entry => entry[0] === location) : product.stock;
        if (location && atLocations.length === 0) continue;
        const visibleUnits = location ? atLocations[0][1] : product.units;
        stockRows.push({ product, atLocations, units: visibleUnits });
        units += BigInt(visibleUnits);
        value += product.price * BigInt(visibleUnits);
        if (product.low) low += 1;
    }
    movementRows = movements.filter(movement => matchingIds.has(movement.product) &&
        (!type || movement.type === type) &&
        (!location || movement.from === location || movement.to === location));

    control('products-total').textContent = number.format(stockRows.length);
    control('units-total').textContent = number.format(units);
    control('low-total').textContent = number.format(low);
    control('value-total').textContent = money(value);
    stockPage = 0;
    movementPage = 0;
    renderStocks();
    renderMovements();
}

function csvField(value) {
    if (typeof value !== 'string') return String(value);
    // Keep spreadsheet applications from interpreting imported text as a formula.
    const safe = /^[\s\u0000-\u001f]*[=+@-]|^[\t\r\n]/u.test(value) ? "'" + value : value;
    return '"' + safe.replaceAll('"', '""') + '"';
}

function download(filename, headers, rows) {
    const lines = [headers, ...rows].map(row => row.map(csvField).join(','));
    const file = new Blob(['\uFEFF', lines.join('\r\n'), '\r\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

control('search').addEventListener('input', update);
for (const id of ['location', 'status', 'movement-type']) control(id).addEventListener('change', update);
control('reset').addEventListener('click', () => {
    control('search').value = '';
    control('location').value = '';
    control('status').value = 'all';
    control('movement-type').value = '';
    update();
});
control('stock-prev').addEventListener('click', () => { stockPage -= 1; renderStocks(); });
control('stock-next').addEventListener('click', () => { stockPage += 1; renderStocks(); });
control('movement-prev').addEventListener('click', () => { movementPage -= 1; renderMovements(); });
control('movement-next').addEventListener('click', () => { movementPage += 1; renderMovements(); });

control('stock-download').addEventListener('click', () => {
    download('towerflow-stock.csv',
        ['Product ID', 'Name', 'Barcode', 'QR payload', 'Location', 'Units',
            'List price USD', 'List value USD', 'Global low-stock threshold', 'Overall status'],
        stockRows.flatMap(({ product, atLocations }) => (atLocations.length ? atLocations : [['', 0]])
            .map(([location, units]) => [product.id, product.name, product.barcode, product.qr,
                location, units, decimal(product.price), decimal(product.price * BigInt(units)),
                product.minimum, product.low ? 'Low stock' : 'In stock'])));
});
control('movement-download').addEventListener('click', () => {
    download('towerflow-movements.csv',
        ['Recorded UTC', 'Type', 'Product ID', 'Product', 'From', 'To', 'Units', 'Business',
            'Reference', 'Unit trade price USD', 'Trade total USD'],
        movementRows.map(movement => [utcTime(movement.time), movement.type, movement.product,
            productsById.get(movement.product).name, movement.from, movement.to, movement.units,
            movement.business, movement.reference,
            movement.price === null ? '' : decimal(movement.price),
            movement.price === null ? '' : decimal(movement.price * BigInt(movement.units))]));
});
update();
</script>
</body>
</html>
)HTML";
}
