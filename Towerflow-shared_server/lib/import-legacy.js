'use strict';

const { InputError } = require('./inventory');

const movementTypes = ['receive', 'remove', 'transfer', 'purchase', 'sale'];

function tokens(text) {
  const values = [];
  let i = 0;
  while (i < text.length) {
    while (/\s/.test(text[i]) && i < text.length) i++;
    if (i >= text.length) break;
    if (text[i] === '"') {
      i++;
      let value = '';
      let closed = false;
      while (i < text.length) {
        const c = text[i++];
        if (c === '"') { closed = true; break; }
        if (c === '\\') {
          if (i >= text.length) throw new InputError('Incomplete quoted field.');
          value += text[i++];
        } else value += c;
      }
      if (!closed || (i < text.length && !/\s/.test(text[i]))) throw new InputError('Malformed quoted field.');
      values.push(value);
    } else {
      const start = i;
      while (i < text.length && !/\s/.test(text[i])) i++;
      values.push(text.slice(start, i));
    }
  }
  return values;
}

function parseTowerFlow(text) {
  const values = tokens(text);
  let index = 0;
  function next(name) {
    if (index >= values.length) throw new InputError(`Missing ${name} in TowerFlow file.`);
    return values[index++];
  }
  function number(name, maximum = 2_147_483_647) {
    const value = next(name);
    if (!/^\d+$/.test(value)) throw new InputError(`Invalid ${name} in TowerFlow file.`);
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result > maximum) throw new InputError(`Invalid ${name} in TowerFlow file.`);
    return result;
  }
  const versioned = values[0] === 'TOWERFLOW';
  if (versioned && (next('header') !== 'TOWERFLOW' || number('format version') !== 2)) {
    throw new InputError('Unsupported TowerFlow file version.');
  }
  const count = number('product count', 100_000);
  const products = [];
  const ids = new Set();
  for (let n = 0; n < count; n++) {
    const id = number('product ID');
    if (id === 0 || ids.has(id)) throw new InputError('Duplicate or invalid product ID.');
    ids.add(id);
    const name = next('name');
    const barcode = next('barcode');
    let priceCents, minimumStock, qrPayload = '';
    if (versioned) {
      priceCents = number('price in cents', 100_000_000_000);
      minimumStock = number('minimum stock');
      qrPayload = next('QR payload');
    } else {
      const price = next('price');
      if (!/^(?:\d+)(?:\.\d+)?$/.test(price) || Number(price) > 1_000_000_000) {
        throw new InputError('Invalid legacy dollar price.');
      }
      priceCents = Math.round(Number(price) * 100);
      minimumStock = number('minimum stock');
    }
    const locations = number('location count', 10_000);
    const stock = [];
    for (let j = 0; j < locations; j++) {
      const location = next('location');
      const quantity = number('stock quantity');
      stock.push({ location, quantity });
    }
    products.push({ id, name, barcode, qrPayload, priceCents, minimumStock,
      partNumber: null, serialNumber: null, revision: null, stock });
  }
  const movements = [];
  if (versioned) {
    const count = number('movement count', 1_000_000);
    for (let n = 0; n < count; n++) {
      const type = movementTypes[number('movement type', 4)];
      const productId = number('movement product ID');
      const quantity = number('movement quantity');
      const from = next('source');
      const to = next('destination');
      const recordedAt = number('timestamp', 253_402_300_799);
      const unitPriceCents = number('unit price in cents', 100_000_000_000);
      const business = next('supplier/customer');
      const reference = next('reference');
      movements.push({ type, productId, quantity, from, to, recordedAt, unitPriceCents, business, reference });
    }
  }
  if (index !== values.length) throw new InputError('Unexpected extra data in TowerFlow file.');
  return { format: versioned ? 'TowerFlow inventory v2' : 'TowerFlow inventory v1', products, movements };
}

function parseParts(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const products = [];
  for (const [index, row] of lines.entries()) {
    if (!row.trim()) continue;
    const columns = row.split(',');
    if (columns.length !== 5) throw new InputError(`Expected five comma-separated fields on line ${index + 1}.`);
    const [name, ...raw] = columns;
    if (!raw.every(value => /^\d+$/.test(value.trim()))) throw new InputError(`Invalid number on line ${index + 1}.`);
    const [revision, partNumber, serialNumber, quantity] = raw.map(value => Number(value.trim()));
    if (![revision, partNumber, serialNumber, quantity].every(Number.isSafeInteger)) {
      throw new InputError(`Number too large on line ${index + 1}.`);
    }
    products.push({ id: products.length + 1, name: name.trim(), partNumber, serialNumber,
      revision, barcode: `PART-${partNumber}-SERIAL-${serialNumber}`, qrPayload: '',
      priceCents: 0, minimumStock: 0, stock: quantity ? [{ location: 'Main', quantity }] : [] });
  }
  if (products.length === 0) throw new InputError('No parts found in this file.');
  return { format: 'TowerFlow parts.txt (console / WinForms)', products, movements: [] };
}

function parseLegacy(text) {
  if (typeof text !== 'string' || !text.trim()) throw new InputError('Choose a nonempty text file.');
  if (Buffer.byteLength(text, 'utf8') > 2_000_000) throw new InputError('Import files must be under 2 MB.');
  const firstLine = text.trimStart().split(/\r?\n/, 1)[0].trim();
  if (firstLine.startsWith('TOWERFLOW') || /^\d+$/.test(firstLine)) return parseTowerFlow(text);
  return parseParts(text);
}

module.exports = { parseLegacy };
