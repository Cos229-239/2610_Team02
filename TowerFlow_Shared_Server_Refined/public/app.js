'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let state = null;
let page = 'overview';
let editingId = null;
let editingRevision = null;
let stockId = null;
let stockRevision = null;
let workEditingId = null;
let workRevision = null;
let movementRevision = null;
let currentUser = null;
let events = null;
let azurePreviewId = null;
let azurePreviewRevision = null;
let azureCommandSequence = 0;

const money = cents => {
  const n = BigInt(cents);
  return '$' + (n / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + (n % 100n).toString().padStart(2, '0');
};
const units = p => p.stock.reduce((sum, item) => sum + item.quantity, 0);
const el = (tag, className = '', value = '') => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = String(value);
  return node;
};
function notice(message, bad = false) {
  const node = $('#notice');
  node.textContent = message;
  node.classList.toggle('bad', bad);
  node.hidden = false;
  window.clearTimeout(notice.timer);
  notice.timer = window.setTimeout(() => { node.hidden = true; }, 6500);
}
async function request(url, method = 'GET', body, revision = state?.revision) {
  const headers = method === 'GET' ? undefined : {
    ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    'X-TowerFlow-Request': '1',
    ...(/^\/api\/(?:auth|users)/.test(url) || url.endsWith('/preview') || revision == null ? {} : { 'X-TowerFlow-Revision': revision })
  };
  const response = await fetch(url, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
async function refresh() {
  state = await request('/api/state');
  render();
  if (azurePreviewId && azurePreviewRevision !== state.revision) {
    clearAzurePreview();
    $('#azureResponse').textContent = 'Inventory changed after the preview. Run the command again before saving.';
  }
}
function navigate(name) {
  page = name;
  $$('[data-view]').forEach(section => { section.hidden = section.dataset.view !== name; });
  $$('.nav').forEach(button => button.classList.toggle('active', button.dataset.page === name));
}
function setLocations() {
  const names = new Set();
  for (const p of state.products) for (const item of p.stock) names.add(item.location);
  for (const m of state.movements) { if (m.from) names.add(m.from); if (m.to) names.add(m.to); }
  for (const id of ['productLocation', 'movementLocation']) {
    const select = $(`#${id}`), selected = select.value;
    select.replaceChildren(new Option('All locations', ''));
    for (const name of [...names].sort((a, b) => a.localeCompare(b))) select.add(new Option(name, name));
    select.value = selected;
  }
}
function render() {
  $('#businessTitle').textContent = state.businessName;
  $('#businessName').value = state.businessName;
  setLocations();
  $('#productCount').textContent = state.summary.products.toLocaleString();
  $('#unitCount').textContent = BigInt(state.summary.units).toLocaleString();
  $('#lowCount').textContent = state.summary.lowStock.toLocaleString();
  $('#totalValue').textContent = money(state.summary.valueCents);
  const low = state.products.filter(p => !p.archived && units(p) <= p.minimumStock);
  const list = $('#lowStockList');
  list.replaceChildren();
  for (const p of low.slice(0, 8)) {
    const row = el('div', 'list-row');
    const name = el('div');
    name.append(el('strong', '', p.name), el('small', '', `SKU ${p.barcode}`));
    row.append(name, el('span', 'pill alert', `${units(p)} / min ${p.minimumStock}`));
    list.append(row);
  }
  if (!low.length) list.append(el('p', 'empty', 'All products are above their minimum stock.'));
  renderProducts();
  renderMovements();
  renderOrders();
  for (const id of ['workProduct', 'purchaseProduct']) {
    const select = $(`#${id}`), selected = select.value;
    select.replaceChildren();
    for (const p of state.products.filter(item => !item.archived)) select.add(new Option(`${p.name} · ${p.barcode}`, p.id));
    if (selected) select.value = selected;
  }
}
function renderProducts() {
  const search = $('#search').value.trim().toLowerCase();
  const location = $('#productLocation').value;
  const showArchived = $('#showArchived').checked;
  const products = state.products.filter(p => (showArchived || !p.archived) &&
    (!location || p.stock.some(item => item.location === location)) &&
    [p.name, p.category, p.barcode, p.qrPayload, p.partNumber, p.serialNumber, p.id].some(v => String(v ?? '').toLowerCase().includes(search)));
  const target = $('#productRows');
  target.replaceChildren();
  for (const p of products) {
    const row = document.createElement('tr');
    row.dataset.productId = String(p.id);
    const product = el('td');
    product.append(el('strong', '', p.name), el('small', '', `${p.category ? p.category + ' · ' : ''}SKU ${p.barcode}`));
    const part = el('td');
    if (p.partNumber !== null) part.append(el('span', '', `#${p.partNumber} · serial ${p.serialNumber}`), el('small', '', p.revision === null ? '' : `Revision ${p.revision}`));
    else part.textContent = '—';
    const stock = el('td');
    const shown = location ? p.stock.filter(item => item.location === location) : p.stock;
    stock.append(el('strong', '', shown.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()));
    stock.append(el('small', '', shown.length ? shown.map(item => `${item.location}: ${item.quantity}`).join(' · ') : 'No stock'));
    const status = el('td');
    const low = units(p) <= p.minimumStock;
    status.append(el('span', p.archived ? 'pill' : low ? 'pill alert' : 'pill good',
      p.archived ? 'Archived' : low ? 'Low stock' : 'In stock'));
    const actions = el('td', 'row-actions');
    if (!p.archived) {
      const edit = el('button', 'textbtn', 'Edit');
      edit.addEventListener('click', () => openProduct(p.id));
      const move = el('button', 'textbtn', 'Move');
      move.addEventListener('click', () => openMovement(p.id));
      const adjust = el('button', 'textbtn', 'Set stock');
      adjust.addEventListener('click', () => openStock(p.id));
      const archive = el('button', 'textbtn danger', 'Archive');
      archive.addEventListener('click', async () => {
        if (!confirm(`Archive ${p.name}? Its history will remain available.`)) return;
        try { await request(`/api/products/${p.id}`, 'DELETE'); await refresh(); notice('Product archived.'); }
        catch (error) { notice(error.message, true); }
      });
      actions.append(edit, move, adjust, archive);
    }
    if (!p.stock.length && !state.movements.some(m => m.productId === p.id)) {
      const remove = el('button', 'textbtn danger', 'Delete unused');
      remove.addEventListener('click', async () => {
        if (!confirm(`Permanently delete unused product ${p.name}?`)) return;
        try { await request(`/api/products/${p.id}/permanent`, 'DELETE'); await refresh(); notice('Unused product deleted.'); }
        catch (error) { notice(error.message, true); }
      });
      actions.append(remove);
    }
    row.append(product, part, stock, el('td', '', money(p.priceCents)), status, actions);
    target.append(row);
  }
  $('#productEmpty').hidden = !!products.length;
}
function renderMovements() {
  const search = $('#movementSearch').value.trim().toLowerCase();
  const location = $('#movementLocation').value;
  const rows = $('#movementRows');
  rows.replaceChildren();
  let count = 0;
  for (const m of [...state.movements].reverse()) {
    if (location && m.from !== location && m.to !== location) continue;
    const p = state.products.find(item => item.id === m.productId);
    if ([p?.name, p?.barcode, m.type, m.from, m.to, m.business, m.reference]
      .every(value => !String(value ?? '').toLowerCase().includes(search))) continue;
    const row = document.createElement('tr');
    const route = m.from && m.to ? `${m.from} → ${m.to}` : (m.to || m.from);
    const detail = m.business ? `${m.business} · ${money(m.unitPriceCents)} / unit${m.reference ? ' · ' + m.reference : ''}` : '—';
    row.append(el('td', '', new Date(m.recordedAt * 1000).toLocaleString()),
      el('td', 'capitalize', m.type), el('td', '', p?.name || `#${m.productId}`),
      el('td', '', m.quantity), el('td', '', route), el('td', '', detail));
    rows.append(row); count++;
  }
  $('#movementEmpty').hidden = !!count;
}
function renderOrders() {
  const work = $('#workRows'), purchase = $('#purchaseRows');
  work.replaceChildren(); purchase.replaceChildren();
  for (const o of [...state.workOrders].reverse()) {
    const row = document.createElement('tr');
    const actions = el('td');
    const edit = el('button', 'textbtn', 'Edit');
    edit.addEventListener('click', () => {
      workEditingId = o.id; workRevision = state.revision;
      const form = $('#workForm').elements;
      form.productId.value = String(o.productId);
      form.description.value = o.description;
      form.quantity.value = o.quantity;
      $('#workSubmit').textContent = 'Save work order';
      $('#workCancel').hidden = false;
      navigate('orders');
    });
    const remove = el('button', 'textbtn danger', 'Delete');
    remove.addEventListener('click', async () => {
      if (!confirm(`Delete planned work order #${o.id}?`)) return;
      try { await request(`/api/work-orders/${o.id}`, 'DELETE'); await refresh(); notice('Work order deleted.'); }
      catch (error) { notice(error.message, true); }
    });
    actions.append(edit, remove);
    row.append(el('td', '', `#${o.id}`), el('td', '', o.description),
      el('td', '', o.productName), el('td', '', o.quantity), actions);
    work.append(row);
  }
  $('#workEmpty').hidden = !!state.workOrders.length;
  for (const o of [...state.purchaseOrders].reverse()) {
    const row = document.createElement('tr');
    const actions = el('td');
    if (o.status === 'pending') {
      const receive = el('button', 'textbtn', 'Receive');
      receive.addEventListener('click', async () => {
        const location = prompt(`Receive order #${o.id} into which location?`, 'Main');
        if (location == null) return;
        try { await request(`/api/purchase-orders/${o.id}/receive`, 'POST', { location }); await refresh(); notice('Order received; stock increased once.'); }
        catch (error) { notice(error.message, true); }
      });
      const cancel = el('button', 'textbtn danger', 'Cancel');
      cancel.addEventListener('click', async () => {
        if (!confirm(`Cancel purchase order #${o.id}? Stock will not change.`)) return;
        try { await request(`/api/purchase-orders/${o.id}/cancel`, 'POST'); await refresh(); notice('Order cancelled.'); }
        catch (error) { notice(error.message, true); }
      });
      actions.append(receive, cancel);
    }
    row.append(el('td', '', `#${o.id}`), el('td', '', o.supplier), el('td', '', o.productName),
      el('td', '', o.quantity), el('td', '', money(BigInt(o.quantity) * BigInt(o.unitPriceCents))),
      el('td', '', o.status), actions);
    purchase.append(row);
  }
  $('#purchaseEmpty').hidden = !!state.purchaseOrders.length;
}
function parseMoney(value) {
  const input = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) throw new Error('Enter a dollar amount with at most two decimal places.');
  const [dollars, fraction = ''] = input.split('.');
  const cents = Number(BigInt(dollars) * 100n + BigInt(fraction.padEnd(2, '0')));
  if (!Number.isSafeInteger(cents) || cents > 100_000_000_000) throw new Error('Price is too large.');
  return cents;
}
function optionalInteger(value) { return value === '' ? null : Number(value); }
function openProduct(id = null) {
  editingId = id;
  editingRevision = state.revision;
  const form = $('#productForm');
  form.reset();
  const p = state.products.find(item => item.id === id);
  $('#productDialogTitle').textContent = p ? 'Edit product' : 'Add product';
  if (p) {
    for (const field of ['name', 'category', 'partNumber', 'serialNumber', 'revision', 'barcode', 'qrPayload', 'minimumStock']) {
      form.elements[field].value = p[field] ?? '';
    }
    form.elements.price.value = (p.priceCents / 100).toFixed(2);
  }
  $('#productDialog').showModal();
}
function updateMovementFields() {
  const type = $('#movementType').value;
  const trade = type === 'purchase' || type === 'sale';
  $$('.trade').forEach(node => { node.hidden = !trade; });
  $('#fromLabel').hidden = !['remove', 'transfer', 'sale'].includes(type);
  $('#toLabel').hidden = !['receive', 'transfer', 'purchase'].includes(type);
  $('#fromLabel input').required = !$('#fromLabel').hidden;
  $('#toLabel input').required = !$('#toLabel').hidden;
  $$('.trade input').forEach(node => { node.required = trade && node.name !== 'reference'; });
}
function openMovement(id = null) {
  const select = $('#movementProduct');
  select.replaceChildren();
  for (const p of state.products.filter(item => !item.archived)) {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.name} · ${p.barcode}`;
    select.append(option);
  }
  if (!select.options.length) return notice('Add a product first.', true);
  $('#movementForm').reset();
  movementRevision = state.revision;
  if (id) select.value = String(id);
  updateMovementFields();
  $('#movementDialog').showModal();
}
function openStock(id) {
  stockId = id; stockRevision = state.revision;
  const p = state.products.find(item => item.id === id);
  $('#stockProductName').textContent = `${p.name} · ${p.barcode}`;
  $('#stockForm').reset();
  $('#stockDialog').showModal();
}
$$('.nav').forEach(button => button.addEventListener('click', () => navigate(button.dataset.page)));
$$('[data-goto]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.goto)));
$$('[data-open-product]').forEach(button => button.addEventListener('click', () => openProduct()));
$$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$('#search').addEventListener('input', () => state && renderProducts());
$('#showArchived').addEventListener('change', () => state && renderProducts());
$('#productLocation').addEventListener('change', () => state && renderProducts());
$('#movementSearch').addEventListener('input', () => state && renderMovements());
$('#movementLocation').addEventListener('change', () => state && renderMovements());
async function scan() {
  const code = $('#scanCode').value.trim();
  if (!code) return notice('Enter an ID, barcode, or QR payload.', true);
  try {
    const p = await request(`/api/scan?code=${encodeURIComponent(code)}`);
    navigate('inventory');
    $('#productLocation').value = '';
    $('#showArchived').checked = p.archived;
    $('#search').value = '';
    renderProducts();
    const row = [...$('#productRows').rows].find(r => r.dataset.productId === String(p.id));
    row?.scrollIntoView({ block: 'center' });
    row?.classList.add('found');
    notice(`Found ${p.name}.`);
  } catch (error) { notice(error.message, true); }
}
$('#scanButton').addEventListener('click', scan);
$('#scanCode').addEventListener('keydown', event => { if (event.key === 'Enter') scan(); });
$('#addMovement').addEventListener('click', () => openMovement());
$('#movementType').addEventListener('change', updateMovementFields);
$('#generateSerial').addEventListener('click', () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  $('#productForm').elements.serialNumber.value = String(100000 + values[0] % 900000);
});

$('#productForm').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  try {
    const body = { name: f.name.value, category: f.category.value, partNumber: optionalInteger(f.partNumber.value),
      serialNumber: optionalInteger(f.serialNumber.value), revision: optionalInteger(f.revision.value),
      barcode: f.barcode.value, qrPayload: f.qrPayload.value, priceCents: parseMoney(f.price.value),
      minimumStock: Number(f.minimumStock.value) };
    await request(editingId ? `/api/products/${editingId}` : '/api/products', editingId ? 'PUT' : 'POST', body, editingRevision);
    $('#productDialog').close(); await refresh(); notice(editingId ? 'Product updated.' : 'Product added.');
  } catch (error) { notice(error.message, true); }
});
$('#movementForm').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  try {
    const trade = ['purchase', 'sale'].includes(f.type.value);
    await request(`/api/products/${f.productId.value}/movements`, 'POST', {
      type: f.type.value, quantity: Number(f.quantity.value), from: f.from.value, to: f.to.value,
      unitPriceCents: trade ? parseMoney(f.unitPrice.value) : 0,
      business: trade ? f.business.value : '', reference: trade ? f.reference.value : ''
    }, movementRevision);
    $('#movementDialog').close(); await refresh(); notice('Movement recorded.');
  } catch (error) { notice(error.message, true); }
});
$('#stockForm').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  try {
    await request(`/api/products/${stockId}/stock/set`, 'POST',
      { location: f.location.value, quantity: Number(f.quantity.value) }, stockRevision);
    $('#stockDialog').close(); await refresh(); notice('Stock quantity set and recorded.');
  } catch (error) { notice(error.message, true); }
});
function resetWorkForm() {
  workEditingId = null; workRevision = null;
  $('#workForm').reset();
  $('#workSubmit').textContent = 'Create work order';
  $('#workCancel').hidden = true;
}
$('#workCancel').addEventListener('click', resetWorkForm);
$('#workForm').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  try {
    const body = { productId: Number(f.productId.value), description: f.description.value,
      quantity: Number(f.quantity.value) };
    await request(workEditingId ? `/api/work-orders/${workEditingId}` : '/api/work-orders',
      workEditingId ? 'PUT' : 'POST', body, workEditingId ? workRevision : state.revision);
    resetWorkForm(); await refresh(); notice('Work order saved.');
  } catch (error) { notice(error.message, true); }
});
$('#purchaseForm').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  try {
    await request('/api/purchase-orders', 'POST', { productId: Number(f.productId.value),
      supplier: f.supplier.value, quantity: Number(f.quantity.value),
      unitPriceCents: parseMoney(f.unitPrice.value) });
    event.currentTarget.reset(); await refresh(); notice('Supplier request recorded; stock unchanged.');
  } catch (error) { notice(error.message, true); }
});
function clearAzurePreview() {
  azurePreviewId = null;
  azurePreviewRevision = null;
  $('#azurePreview').hidden = true;
  $('#azureChangeDescription').textContent = '';
  $('#azureBefore').textContent = '—';
  $('#azureAfter').textContent = '—';
  $('#azureDelta').textContent = '—';
}
async function runAzureGuide(command) {
  command = command.trim();
  if (!command) return;
  const sequence = ++azureCommandSequence;
  clearAzurePreview();
  $('#azureResults').hidden = true;
  $('#azureRows').replaceChildren();
  const modelPanel = $('#azureModelResults');
  modelPanel.hidden = true;
  modelPanel.replaceChildren();
  $('#azureRun').disabled = true;
  $('#azureResponse').textContent = 'Running command…';
  try {
    const result = await request('/api/azure-guide', 'POST', { command });
    if (sequence !== azureCommandSequence) return;
    $('#azureResponse').textContent = result.message;
    if (Array.isArray(result.modelRows)) {
      modelPanel.hidden = false;
      modelPanel.append(el('h3', '', '7-day evidence-based inventory outlook'),
        el('p', 'subtle', 'Planning estimates, not a trained AI model or validated forecast. No inventory changes are made.'));
      for (const item of result.modelRows) {
        const card = el('div', 'list-row');
        const title = el('strong', '', item.name + ' — ' + item.status.replaceAll('_', ' '));
        const details = el('p', 'subtle', item.reason);
        card.append(title, details);
        modelPanel.append(card);
      }
      if (!result.modelRows.length) modelPanel.append(el('p', 'empty', 'No matching active products.'));
      const assumptions = el('p', 'subtle', (result.modelAssumptions || []).join(' '));
      modelPanel.append(assumptions);
    }
    if (result.displayParts) {
      const rows = $('#azureRows');
      for (const part of result.displayParts) {
        const row = el('tr');
        row.append(el('td', '', part.name),
          el('td', '', part.partNumber == null ? '—' : `#${part.partNumber} / ${part.serialNumber}`),
          el('td', '', part.quantity.toLocaleString()),
          el('td', '', part.minimumStock.toLocaleString()),
          el('td', '', part.locations));
        const status = el('td');
        status.append(el('span', part.reorderAmount ? 'pill alert' : 'pill good',
          part.reorderAmount ? `+${part.reorderAmount} suggested` : 'Above minimum'));
        row.append(status);
        const action = el('td');
        if (part.partNumber != null && part.serialNumber != null && part.locationCount <= 1 && part.quantity < 1_000_000) {
          const select = el('button', 'textbtn', 'Prepare adjustment');
          select.type = 'button';
          select.title = 'Fills the command field without saving or running it';
          select.addEventListener('click', () => {
            $('#azureCommand').value = `add ${part.partNumber}/${part.serialNumber} by 1`;
            $('#azureCommand').focus();
          });
          action.append(select);
        } else action.textContent = 'Use Inventory';
        row.append(action);
        rows.append(row);
      }
      $('#azureResults').hidden = result.displayParts.length === 0;
    }
    if (result.previewId) {
      azurePreviewId = result.previewId;
      azurePreviewRevision = result.revision;
      $('#azureChangeDescription').textContent = `${result.previewDetails.name} at ${result.previewDetails.location}`;
      $('#azureBefore').textContent = result.previewDetails.current.toLocaleString();
      $('#azureAfter').textContent = result.previewDetails.next.toLocaleString();
      const difference = result.previewDetails.next - result.previewDetails.current;
      $('#azureDelta').textContent = `${difference > 0 ? '+' : ''}${difference.toLocaleString()}`;
      $('#azurePreview').hidden = false;
      if (state && state.revision !== result.revision) {
        clearAzurePreview();
        $('#azureResponse').textContent = 'Inventory changed while the preview was being created. Refresh and run it again.';
      }
    }
  } catch (error) {
    if (sequence === azureCommandSequence) $('#azureResponse').textContent = error.message;
  } finally {
    if (sequence === azureCommandSequence) $('#azureRun').disabled = false;
  }
}
$('#localLLMForm').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('#localLLMAsk');
  const answer = $('#localLLMAnswer');
  button.disabled = true;
  answer.textContent = 'Asking local model…';
  try {
    const result = await request('/api/local-llm/ask', 'POST',
      { question: $('#localLLMQuestion').value }, null);
    answer.textContent = result.answer + '\\n\\n(Read-only local LLM response. Verify before acting.)';
  } catch (error) {
    answer.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
$('#azureForm').addEventListener('submit', event => {
  event.preventDefault();
  runAzureGuide($('#azureCommand').value);
});
$$('[data-azure-command]').forEach(button => button.addEventListener('click', () => {
  $('#azureCommand').value = button.dataset.azureCommand;
  runAzureGuide(button.dataset.azureCommand);
}));
$('#azureClear').addEventListener('click', () => {
  ++azureCommandSequence;
  $('#azureRun').disabled = false;
  $('#azureCommand').value = '';
  $('#azureResults').hidden = true;
  $('#azureRows').replaceChildren();
  clearAzurePreview();
  $('#azureModelResults').hidden = true;
  $('#azureModelResults').replaceChildren();
  $('#azureResponse').textContent = 'Enter a command or choose a quick action.';
  $('#azureCommand').focus();
});
$('#azureDiscard').addEventListener('click', () => {
  clearAzurePreview();
  $('#azureResponse').textContent = 'Stock change preview discarded. No changes were saved.';
});
$('#azureConfirm').addEventListener('click', async () => {
  if (!azurePreviewId) return;
  if (state?.revision !== azurePreviewRevision) {
    clearAzurePreview();
    $('#azureResponse').textContent = 'Inventory changed after the preview. Run the command again.';
    return;
  }
  if (!confirm('Apply the previewed stock change and record it in movement history?')) return;
  const previewId = azurePreviewId;
  const revision = azurePreviewRevision;
  clearAzurePreview();
  $('#azureConfirm').disabled = true;
  try {
    const saved = await request('/api/azure-guide/apply', 'POST', { previewId }, revision);
    await refresh();
    $('#azureResponse').textContent = `Saved ${saved.quantity} units at ${saved.location}. Movement history was updated.`;
    notice('Azure Stock Guide quantity change saved.');
  } catch (error) {
    $('#azureResponse').textContent = `${error.message} Run the command again to create a new preview.`;
    notice(error.message, true);
    try { await refresh(); } catch { /* Leave the shown server error visible. */ }
  } finally { $('#azureConfirm').disabled = false; }
});
$('#businessForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { await request('/api/business', 'PUT', { name: $('#businessName').value }); await refresh(); notice('Business name saved.'); }
  catch (error) { notice(error.message, true); }
});
$('#businessImport').addEventListener('click', async () => {
  const file = $('#businessFile').files[0];
  if (!file) return notice('Choose an old .business file first.', true);
  if (file.size > 1024) return notice('Business name file is too large.', true);
  try {
    const name = (await file.text()).split('\n', 1)[0].trim();
    if (!name || name.length > 160) throw new Error('Invalid business name.');
    if (!confirm(`Use ${name} as this workspace's business name?`)) return;
    await request('/api/business', 'PUT', { name });
    $('#businessFile').value = '';
    await refresh(); notice('Business name imported.');
  } catch (error) { notice(error.message, true); }
});
$('#importButton').addEventListener('click', async () => {
  const file = $('#importFile').files[0];
  if (!file) return notice('Choose a legacy text file first.', true);
  if (file.size > 2_000_000) return notice('File exceeds the 2 MB import limit.', true);
  try {
    const text = await file.text();
    const revision = state.revision;
    const preview = await request('/api/import/preview', 'POST', { text });
    $('#importStatus').textContent = `${preview.format}: ${preview.products} products and ${preview.movements} movements found.`;
    if (!confirm(`Import ${preview.products} products and ${preview.movements} movements from ${file.name}?`)) return;
    const result = await request('/api/import', 'POST', { text }, revision);
    await refresh(); notice(`Imported ${result.products} products and ${result.movements} movements.`);
    $('#importFile').value = '';
  } catch (error) { notice(error.message, true); }
});
$('#restoreButton').addEventListener('click', async () => {
  const file = $('#restoreFile').files[0];
  if (!file) return notice('Choose a JSON backup first.', true);
  if (file.size > 2_000_000) return notice('Backup exceeds the 2 MB restore limit.', true);
  try {
    const backup = JSON.parse(await file.text());
    const revision = state.revision;
    const preview = await request('/api/restore/preview', 'POST', backup);
    if (!confirm(`Replace the current inventory with ${preview.products} products and ${preview.movements} movements from ${file.name}? The prior inventory is saved as a .bak file.`)) return;
    await request('/api/restore', 'POST', backup, revision);
    $('#restoreFile').value = '';
    await refresh(); notice('Backup restored.');
  } catch (error) { notice(error.message, true); }
});

function showAuth(status) {
  events?.close(); events = null;
  state = null; currentUser = null;
  clearAzurePreview();
  $('#azureResults').hidden = true;
  $('#azureRows').replaceChildren();
  $('#azureResponse').textContent = 'Enter a command or choose an example to inspect inventory.';
  $('#shell').hidden = true;
  $('#authPanel').hidden = false;
  const setup = status.setupAvailable;
  $('#authTitle').textContent = setup ? 'Create owner account' : 'Sign in';
  $('#authHint').textContent = setup ? 'Only the server computer can create the first owner account.' :
    status.initialized ? 'Use the account the owner created for you.' :
      'The owner must finish setup on the server computer first.';
  $('#authForm').hidden = !setup && !status.initialized;
  $('#authSubmit').textContent = setup ? 'Create owner account' : 'Sign in';
  $('#authPassword').autocomplete = setup ? 'new-password' : 'current-password';
  $('#authError').hidden = true;
  $('#authForm').reset();
  $('#authForm').dataset.setup = setup ? '1' : '0';
}
async function enter(user) {
  clearAzurePreview();
  currentUser = user;
  $('#signedInAs').textContent = `${user.username} · ${user.role}`;
  $('#adminPanel').hidden = user.role !== 'admin';
  $('#restorePanel').hidden = user.role !== 'admin';
  $('#authPanel').hidden = true;
  $('#shell').hidden = false;
  await refresh();
  if (user.role === 'admin') await loadUsers();
  events?.close();
  events = new EventSource('/api/events');
  events.onmessage = async event => {
    try {
      const update = JSON.parse(event.data);
      if (!state || update.revision !== state.revision) await refresh();
    } catch (error) { notice(error.message, true); }
  };
  events.onerror = () => notice('Connection interrupted; trying to reconnect.', true);
}
async function loadUsers() {
  const users = await request('/api/users');
  const list = $('#userList'); list.replaceChildren();
  for (const user of users) {
    const row = el('div', 'user-row');
    row.append(el('span', '', `${user.username} · ${user.role}`));
    if (user.id !== currentUser.id) {
      const reset = el('button', 'textbtn', 'Reset password');
      reset.addEventListener('click', async () => {
        const password = prompt(`New temporary password for ${user.username} (12+ characters):`);
        if (password == null) return;
        try { await request(`/api/users/${user.id}/password`, 'PUT', { password }); await loadUsers(); notice('Password reset; previous sessions ended.'); }
        catch (error) { notice(error.message, true); }
      });
      const remove = el('button', 'textbtn danger', 'Remove access');
      remove.addEventListener('click', async () => {
        if (!confirm(`Remove ${user.username}'s access?`)) return;
        try { await request(`/api/users/${user.id}`, 'DELETE'); await loadUsers(); notice('Access removed.'); }
        catch (error) { notice(error.message, true); }
      });
      row.append(reset, remove);
    }
    list.append(row);
  }
}
$('#authForm').addEventListener('submit', async event => {
  event.preventDefault();
  const setup = event.currentTarget.dataset.setup === '1';
  try {
    const result = await request(setup ? '/api/auth/setup' : '/api/auth/login', 'POST',
      { username: $('#authUsername').value, password: $('#authPassword').value });
    await enter(result.user);
  } catch (error) {
    $('#authError').textContent = error.message;
    $('#authError').hidden = false;
  }
});
$('#logoutButton').addEventListener('click', async () => {
  try { await request('/api/auth/logout', 'POST'); showAuth({ initialized: true }); }
  catch (error) { notice(error.message, true); }
});
$('#passwordForm').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  try {
    await request('/api/auth/password', 'PUT',
      { currentPassword: f.currentPassword.value, newPassword: f.newPassword.value });
    showAuth({ initialized: true });
  } catch (error) { notice(error.message, true); }
});
$('#userForm').addEventListener('submit', async event => {
  event.preventDefault();
  const f = event.currentTarget.elements;
  try {
    const user = await request('/api/users', 'POST', { username: f.username.value, password: f.password.value, role: f.role.value });
    event.currentTarget.reset(); await loadUsers(); notice(`Account created for ${user.username}.`);
  } catch (error) { notice(error.message, true); }
});
request('/api/auth/status').then(status => status.user ? enter(status.user) : showAuth(status))
  .catch(error => { showAuth({ initialized: false }); $('#authHint').textContent = error.message; });
