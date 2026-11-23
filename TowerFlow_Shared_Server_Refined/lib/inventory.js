'use strict';

const MAX_STOCK = 2_147_483_647;
const MAX_PRICE = 100_000_000_000;
const MAX_ITEMS = 100_000;
const TYPES = new Set(['receive', 'remove', 'transfer', 'purchase', 'sale']);

class InputError extends Error {
  constructor(message) { super(message); this.status = 400; }
}

function integer(value, label, min = 0, max = MAX_STOCK) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new InputError(`${label} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function label(value, name, max = 160, required = true) {
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) {
    throw new InputError(`${name} must be text of at most ${max} characters.`);
  }
  const result = value.trim();
  if (required && !result) throw new InputError(`${name} is required.`);
  return result;
}

function stockLocation(value) {
  return label(value, 'Location', 100);
}

function emptyInventory() {
  return { version: 2, businessName: 'TowerFlow', nextId: 1, products: [], movements: [],
    nextWorkId: 1, workOrders: [], nextPurchaseId: 1, purchaseOrders: [] };
}

function checkCodes(state, barcode, qrPayload, exceptId = 0) {
  if (barcode && qrPayload && barcode === qrPayload) return checkCodes(state, barcode, '', exceptId);
  for (const p of state.products) {
    if (p.id === exceptId) continue;
    if ((barcode && (p.barcode === barcode || p.qrPayload === barcode)) ||
        (qrPayload && (p.barcode === qrPayload || p.qrPayload === qrPayload))) {
      throw new InputError('Barcode and QR values must be unique across the inventory.');
    }
  }
}

function productFields(state, input, exceptId = 0) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InputError('Invalid product.');
  const name = label(input.name, 'Product name');
  const category = label(input.category ?? '', 'Category', 100, false);
  const partNumber = input.partNumber == null || input.partNumber === '' ? null : integer(input.partNumber, 'Part number', 1);
  const serialNumber = input.serialNumber == null || input.serialNumber === '' ? null : integer(input.serialNumber, 'Serial number', 1);
  if ((partNumber === null) !== (serialNumber === null)) throw new InputError('Part number and serial number must be provided together.');
  const revision = input.revision == null || input.revision === '' ? null : integer(input.revision, 'Revision');
  const barcode = label(input.barcode || (partNumber !== null ? `PART-${partNumber}-SERIAL-${serialNumber}` : ''), 'Barcode', 120);
  const qrPayload = label(input.qrPayload ?? '', 'QR payload', 250, false);
  const priceCents = integer(input.priceCents, 'List price in cents', 0, MAX_PRICE);
  const minimumStock = integer(input.minimumStock, 'Minimum stock');
  for (const p of state.products) {
    if (p.id !== exceptId && serialNumber !== null && p.partNumber === partNumber && p.serialNumber === serialNumber) {
      throw new InputError('That part number and serial number pair already exists.');
    }
  }
  checkCodes(state, barcode, qrPayload, exceptId);
  return { name, category, partNumber, serialNumber, revision, barcode, qrPayload, priceCents, minimumStock };
}

function createProduct(state, input) {
  if (state.products.length >= MAX_ITEMS || state.nextId > MAX_STOCK) throw new InputError('Inventory limit reached.');
  const fields = productFields(state, input);
  const product = { id: state.nextId++, ...fields, stock: [], archived: false };
  state.products.push(product);
  return product;
}

function findProduct(state, id) {
  const product = state.products.find(p => p.id === integer(id, 'Product ID', 1));
  if (!product) throw new InputError('Product not found.');
  return product;
}

function editProduct(state, id, input) {
  const product = findProduct(state, id);
  if (product.archived) throw new InputError('Archived products cannot be edited.');
  Object.assign(product, productFields(state, input, product.id));
  return product;
}

function archiveProduct(state, id) {
  const product = findProduct(state, id);
  if (product.stock.some(item => item.quantity > 0)) throw new InputError('Remove remaining stock before archiving.');
  if (state.purchaseOrders.some(order => order.productId === id && order.status === 'pending')) {
    throw new InputError('Receive or cancel pending purchase orders before archiving.');
  }
  product.archived = true;
  return product;
}

function deleteProduct(state, id) {
  const product = findProduct(state, id);
  if (product.stock.some(item => item.quantity > 0) || state.movements.some(m => m.productId === id)) {
    throw new InputError('This product has stock or history. Empty and archive it instead.');
  }
  if (state.purchaseOrders.some(order => order.productId === id && order.status === 'pending')) {
    throw new InputError('Cancel pending purchase orders before deleting this product.');
  }
  state.products.splice(state.products.indexOf(product), 1);
  return { deleted: id };
}

function findCode(state, code) {
  if (typeof code !== 'string') throw new InputError('Code must be text.');
  code = code.trim();
  if (!code) return null;
  const product = state.products.find(p => p.barcode === code || (p.qrPayload && p.qrPayload === code));
  if (product) return product;
  return /^\d+$/.test(code) ? state.products.find(p => String(p.id) === code) || null : null;
}

function locations(state) {
  const found = new Set();
  for (const p of state.products) for (const item of p.stock) found.add(item.location);
  for (const m of state.movements) {
    if (m.from) found.add(m.from);
    if (m.to) found.add(m.to);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

function setStock(state, id, input) {
  const product = findProduct(state, id);
  if (product.archived) throw new InputError('Archived products cannot be adjusted.');
  if (!input || typeof input !== 'object') throw new InputError('Invalid stock adjustment.');
  const location = stockLocation(input.location);
  const desired = integer(input.quantity, 'New stock quantity');
  const current = product.stock.find(item => item.location === location)?.quantity || 0;
  if (desired > current) recordMovement(state, id, { type: 'receive', quantity: desired - current, to: location });
  if (desired < current) recordMovement(state, id, { type: 'remove', quantity: current - desired, from: location });
  return { productId: id, location, quantity: desired, changed: desired - current };
}

function orderProduct(state, id) {
  const product = findProduct(state, integer(id, 'Product ID', 1));
  if (product.archived) throw new InputError('Select an active product.');
  return product;
}
function workFields(state, input) {
  if (!input || typeof input !== 'object') throw new InputError('Invalid work order.');
  const product = orderProduct(state, input.productId);
  return { description: label(input.description, 'Job description', 500),
    productId: product.id, productName: product.name,
    quantity: integer(input.quantity, 'Planned quantity', 1) };
}
function createWorkOrder(state, input) {
  if (state.nextWorkId > MAX_STOCK) throw new InputError('Work order limit reached.');
  const order = { id: state.nextWorkId++, ...workFields(state, input),
    createdAt: Math.floor(Date.now() / 1000) };
  state.workOrders.push(order);
  return order;
}
function editWorkOrder(state, id, input) {
  const order = state.workOrders.find(o => o.id === integer(id, 'Work order ID', 1));
  if (!order) throw new InputError('Work order not found.');
  Object.assign(order, workFields(state, input));
  return order;
}
function deleteWorkOrder(state, id) {
  const index = state.workOrders.findIndex(o => o.id === integer(id, 'Work order ID', 1));
  if (index < 0) throw new InputError('Work order not found.');
  return state.workOrders.splice(index, 1)[0];
}
function createPurchaseOrder(state, input) {
  if (!input || typeof input !== 'object') throw new InputError('Invalid purchase order.');
  if (state.nextPurchaseId > MAX_STOCK) throw new InputError('Purchase order limit reached.');
  const product = orderProduct(state, input.productId);
  const order = { id: state.nextPurchaseId++, supplier: label(input.supplier, 'Supplier'),
    productId: product.id, productName: product.name,
    quantity: integer(input.quantity, 'Quantity', 1),
    unitPriceCents: integer(input.unitPriceCents, 'Unit price in cents', 0, MAX_PRICE),
    status: 'pending', createdAt: Math.floor(Date.now() / 1000), receivedAt: null };
  state.purchaseOrders.push(order);
  return order;
}
function receivePurchaseOrder(state, id, input) {
  const order = state.purchaseOrders.find(o => o.id === integer(id, 'Purchase order ID', 1));
  if (!order) throw new InputError('Purchase order not found.');
  if (order.status !== 'pending') throw new InputError('Only pending orders can be received.');
  const location = stockLocation(input?.location);
  recordMovement(state, order.productId, { type: 'purchase', quantity: order.quantity,
    to: location, unitPriceCents: order.unitPriceCents,
    business: order.supplier, reference: `PO-${order.id}` });
  order.status = 'received';
  order.receivedAt = Math.floor(Date.now() / 1000);
  return order;
}
function cancelPurchaseOrder(state, id) {
  const order = state.purchaseOrders.find(o => o.id === integer(id, 'Purchase order ID', 1));
  if (!order) throw new InputError('Purchase order not found.');
  if (order.status !== 'pending') throw new InputError('Only pending orders can be cancelled.');
  order.status = 'cancelled';
  return order;
}

function recordMovement(state, id, input) {
  const product = findProduct(state, id);
  if (product.archived) throw new InputError('Archived products cannot receive movements.');
  if (!input || !TYPES.has(input.type)) throw new InputError('Unknown movement type.');
  const type = input.type;
  const quantity = integer(input.quantity, 'Quantity', 1);
  const from = ['remove', 'transfer', 'sale'].includes(type) ? stockLocation(input.from) : '';
  const to = ['receive', 'transfer', 'purchase'].includes(type) ? stockLocation(input.to) : '';
  if (from && from === to) throw new InputError('Transfer locations must differ.');
  const trade = type === 'purchase' || type === 'sale';
  const unitPriceCents = trade ? integer(input.unitPriceCents, 'Unit price in cents', 0, MAX_PRICE) : 0;
  const business = trade ? label(input.business, 'Supplier or customer') : '';
  const reference = trade ? label(input.reference ?? '', 'Reference', 160, false) : '';
  const source = product.stock.find(item => item.location === from);
  if (from && (!source || source.quantity < quantity)) throw new InputError('Insufficient stock at the source location.');
  const destination = product.stock.find(item => item.location === to);
  if (to && quantity > MAX_STOCK - (destination?.quantity || 0)) throw new InputError('Stock limit reached at this location.');
  if (to && !destination && product.stock.length >= 10_000 && !(source && source.quantity === quantity)) {
    throw new InputError('Location limit reached.');
  }
  if (from) {
    source.quantity -= quantity;
    if (source.quantity === 0) product.stock.splice(product.stock.indexOf(source), 1);
  }
  if (to) {
    const existing = product.stock.find(item => item.location === to);
    if (existing) existing.quantity += quantity;
    else product.stock.push({ location: to, quantity });
  }
  const movement = { type, productId: product.id, quantity, from, to,
    recordedAt: Math.floor(Date.now() / 1000), unitPriceCents, business, reference };
  state.movements.push(movement);
  return movement;
}

function importProducts(state, imported) {
  if (state.products.length + imported.products.length > MAX_ITEMS) throw new InputError('Inventory limit reached.');
  const idMap = new Map();
  for (const old of imported.products) {
    if (idMap.has(old.id)) throw new InputError('Duplicate ID in imported file.');
    const product = createProduct(state, old);
    idMap.set(old.id, product.id);
    if (old.stock.length > 10_000) throw new InputError('Too many locations in imported product.');
    const seen = new Set();
    product.stock = old.stock.map(item => {
      const location = stockLocation(item.location);
      if (seen.has(location)) throw new InputError('Duplicate stock location in imported product.');
      seen.add(location);
      return { location, quantity: integer(item.quantity, 'Stock quantity', 0) };
    }).filter(item => item.quantity > 0);
  }
  for (const m of imported.movements) {
    const productId = idMap.get(m.productId);
    if (!productId) throw new InputError('Movement refers to an unknown product.');
    const type = m.type;
    if (!TYPES.has(type)) throw new InputError('Invalid imported movement.');
    const quantity = integer(m.quantity, 'Movement quantity', 1);
    const from = m.from ? stockLocation(m.from) : '';
    const to = m.to ? stockLocation(m.to) : '';
    const trade = type === 'purchase' || type === 'sale';
    const valid = (['receive', 'purchase'].includes(type) && !from && to) ||
      (['remove', 'sale'].includes(type) && from && !to) ||
      (type === 'transfer' && from && to && from !== to);
    if (!valid) throw new InputError('Invalid imported movement locations.');
    const unitPriceCents = integer(m.unitPriceCents, 'Movement price in cents', 0, MAX_PRICE);
    const business = label(m.business, 'Business name', 160, trade);
    const reference = label(m.reference, 'Reference', 160, false);
    if (!trade && (unitPriceCents || business || reference)) throw new InputError('Invalid movement details.');
    state.movements.push({ type, productId, quantity, from, to,
      recordedAt: integer(m.recordedAt, 'Movement timestamp', 0, 253_402_300_799),
      unitPriceCents, business, reference });
  }
  return { products: imported.products.length, movements: imported.movements.length };
}

function summary(state) {
  let units = 0n;
  let value = 0n;
  let low = 0;
  for (const p of state.products) {
    if (p.archived) continue;
    const count = p.stock.reduce((sum, item) => sum + item.quantity, 0);
    units += BigInt(count);
    value += BigInt(p.priceCents) * BigInt(count);
    if (count <= p.minimumStock) low++;
  }
  return { products: state.products.filter(p => !p.archived).length, units: units.toString(),
    valueCents: value.toString(), lowStock: low };
}

function validateState(state) {
  if (!state || ![1, 2].includes(state.version) || !Array.isArray(state.products) || !Array.isArray(state.movements) ||
      typeof state !== 'object') throw new InputError('Inventory data has an unsupported format.');
  label(state.businessName, 'Business name');
  integer(state.nextId, 'Next ID', 1, MAX_STOCK + 1);
  const checked = emptyInventory();
  for (const p of state.products) {
    if (!p || typeof p !== 'object') throw new InputError('Invalid product in stored data.');
    integer(p.id, 'Product ID', 1);
    if (checked.products.some(q => q.id === p.id)) throw new InputError('Duplicate product ID in stored data.');
    const fields = productFields(checked, p);
    if (p.archived !== true && p.archived !== false) throw new InputError('Invalid archive flag.');
    if (!Array.isArray(p.stock) || p.stock.length > 10_000) throw new InputError('Invalid stock locations.');
    const seen = new Set();
    for (const item of p.stock) {
      if (!item || typeof item !== 'object') throw new InputError('Invalid stock location.');
      const loc = stockLocation(item.location);
      integer(item.quantity, 'Quantity', 1);
      if (seen.has(loc)) throw new InputError('Duplicate stock location.');
      seen.add(loc);
    }
    if (p.archived && p.stock.length) throw new InputError('Archived product still has stock.');
    checked.products.push({ ...p, ...fields });
  }
  if (checked.products.length > MAX_ITEMS || checked.products.some(p => p.id >= state.nextId)) {
    throw new InputError('Invalid product count or next ID.');
  }
  const ids = new Set(state.products.map(p => p.id));
  for (const m of state.movements) {
    if (!m || typeof m !== 'object') throw new InputError('Invalid stored movement.');
    if (!ids.has(m.productId) || !TYPES.has(m.type)) throw new InputError('Invalid stored movement.');
    integer(m.quantity, 'Movement quantity', 1);
    integer(m.recordedAt, 'Movement timestamp', 0, 253_402_300_799);
    const from = label(m.from, 'Source location', 100, false);
    const to = label(m.to, 'Destination location', 100, false);
    const trade = m.type === 'purchase' || m.type === 'sale';
    const valid = (['receive', 'purchase'].includes(m.type) && !from && to) ||
      (['remove', 'sale'].includes(m.type) && from && !to) ||
      (m.type === 'transfer' && from && to && from !== to);
    if (!valid) throw new InputError('Invalid movement locations.');
    const price = integer(m.unitPriceCents, 'Movement price', 0, MAX_PRICE);
    const business = label(m.business, 'Supplier or customer', 160, trade);
    const reference = label(m.reference, 'Reference', 160, false);
    if (!trade && (price || business || reference)) throw new InputError('Invalid movement details.');
  }
  // Import the older inventory editions without carrying over their room fields.
  const result = { version: 2, businessName: state.businessName, nextId: state.nextId,
    products: checked.products, movements: state.movements,
    nextWorkId: state.version === 2 ? state.nextWorkId : 1,
    workOrders: state.version === 2 ? state.workOrders : [],
    nextPurchaseId: state.version === 2 ? state.nextPurchaseId : 1,
    purchaseOrders: state.version === 2 ? state.purchaseOrders : [] };
  if (!Array.isArray(result.workOrders) || !Array.isArray(result.purchaseOrders) ||
      result.workOrders.length > MAX_ITEMS || result.purchaseOrders.length > MAX_ITEMS) {
    throw new InputError('Invalid order lists.');
  }
  integer(result.nextWorkId, 'Next work order ID', 1, MAX_STOCK + 1);
  integer(result.nextPurchaseId, 'Next purchase order ID', 1, MAX_STOCK + 1);
  const workIds = new Set(), purchaseIds = new Set();
  for (const order of result.workOrders) {
    if (!order || typeof order !== 'object') throw new InputError('Invalid work order.');
    integer(order.id, 'Work order ID', 1);
    if (order.id >= result.nextWorkId || workIds.has(order.id)) throw new InputError('Duplicate or invalid work order ID.');
    workIds.add(order.id);
    label(order.description, 'Job description', 500);
    integer(order.productId, 'Product ID', 1);
    label(order.productName, 'Product name');
    integer(order.quantity, 'Planned quantity', 1);
    integer(order.createdAt, 'Creation time', 0, 253_402_300_799);
  }
  for (const order of result.purchaseOrders) {
    if (!order || typeof order !== 'object') throw new InputError('Invalid purchase order.');
    integer(order.id, 'Purchase order ID', 1);
    if (order.id >= result.nextPurchaseId || purchaseIds.has(order.id)) throw new InputError('Duplicate or invalid purchase order ID.');
    purchaseIds.add(order.id);
    label(order.supplier, 'Supplier');
    integer(order.productId, 'Product ID', 1);
    label(order.productName, 'Product name');
    integer(order.quantity, 'Quantity', 1);
    integer(order.unitPriceCents, 'Unit price in cents', 0, MAX_PRICE);
    if (!['pending', 'received', 'cancelled'].includes(order.status)) throw new InputError('Invalid purchase order status.');
    integer(order.createdAt, 'Creation time', 0, 253_402_300_799);
    if (order.status === 'received') integer(order.receivedAt, 'Receipt time', 0, 253_402_300_799);
    else if (order.receivedAt !== null) throw new InputError('Invalid receipt time.');
  }
  return result;
}

module.exports = { InputError, emptyInventory, integer, label, createProduct, editProduct,
  archiveProduct, deleteProduct, findCode, locations, recordMovement, importProducts, summary, validateState,
  setStock, createWorkOrder, editWorkOrder, deleteWorkOrder,
  createPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder };
