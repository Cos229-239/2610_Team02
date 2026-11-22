'use strict';

const { InputError, summary } = require('./inventory');

const examples = [
  'What is low on stock?',
  'What should we reorder?',
  'Where is SKU-1?',
  'Show recent movements',
  'Show pending purchase orders'
];

const total = p => p.stock.reduce((sum, item) => sum + item.quantity, 0);
const money = cents => {
  const value = BigInt(cents);
  return `$${(value / 100n).toLocaleString('en-US')}.${String(value % 100n).padStart(2, '0')}`;
};
const line = p => `${p.name} (${p.barcode}): ${total(p)} unit${total(p) === 1 ? '' : 's'}; minimum ${p.minimumStock}`;

function identifyProduct(state, raw) {
  const q = raw.toLowerCase();
  const products = state.products.filter(p => !p.archived);
  const exact = products.filter(p => [p.name, p.barcode, p.qrPayload, String(p.id)]
    .some(value => value && q === String(value).toLowerCase()));
  if (exact.length === 1) return exact[0];
  const mentions = products.filter(p => [p.name, p.barcode, p.qrPayload]
    .some(value => value && String(value).length >= 3 && q.includes(String(value).toLowerCase())));
  if (mentions.length === 1) return mentions[0];
  const after = /(?:for|of|about|where is|find|locate)\s+(.+?)(?:[?.!]|$)/i.exec(raw)?.[1]?.trim();
  if (after) {
    const matches = products.filter(p => [p.name, p.barcode, p.qrPayload, String(p.id)]
      .some(value => value && String(value).toLowerCase().includes(after.toLowerCase())));
    if (matches.length === 1) return matches[0];
  }
  return null;
}

function reply(state, question) {
  if (typeof question !== 'string' || question.trim().length === 0 || question.length > 500 ||
      /[\u0000-\u001f\u007f]/.test(question)) {
    throw new InputError('Ask a question of at most 500 characters without control characters.');
  }
  const q = question.trim().toLowerCase();
  const active = state.products.filter(p => !p.archived);
  const product = identifyProduct(state, question.trim());
  let answer;

  if (/\b(help|what can you do|how do i|how to)\b/.test(q)) {
    answer = 'I can summarize current stock, find products by name or code, list low-stock items, suggest reorder amounts, show recent movements, and review planned or pending orders. I only read inventory data; use the app forms to make changes.';
  } else if (product) {
    const places = product.stock.length ? product.stock.map(x => `${x.location}: ${x.quantity}`).join(', ') : 'no stock locations';
    const status = total(product) <= product.minimumStock ? 'at or below minimum' : 'above minimum';
    answer = `${line(product)}. Category: ${product.category || 'uncategorized'}. Locations: ${places}. Status: ${status}. List price: ${money(product.priceCents)} per unit.`;
    if (/\b(reorder|restock|buy more)\b/.test(q)) {
      answer += total(product) <= product.minimumStock ?
        ` Suggested amount to get above minimum: ${Math.max(1, product.minimumStock + 1 - total(product))}.` :
        ' This product is above its minimum; no reorder is suggested by the threshold.';
    }
  } else if (/\b(reorder|restock|need to buy|buy more)\b/.test(q)) {
    const low = active.filter(p => total(p) <= p.minimumStock)
      .sort((a, b) => (b.minimumStock - total(b)) - (a.minimumStock - total(a)) || a.name.localeCompare(b.name));
    answer = low.length ? `Suggested quantities to get above each minimum:\n${low.slice(0, 10)
      .map(p => `• ${line(p)}; add ${Math.max(1, p.minimumStock + 1 - total(p))}`).join('\n')}${low.length > 10 ? `\n…and ${low.length - 10} more.` : ''}` :
      'No active products are at or below their minimum stock.';
  } else if (/\b(low|minimum|alert|shortage)\b/.test(q)) {
    const low = active.filter(p => total(p) <= p.minimumStock).sort((a, b) => a.name.localeCompare(b.name));
    answer = low.length ? `${low.length} active product${low.length === 1 ? ' is' : 's are'} at or below minimum:\n${low.slice(0, 10).map(p => `• ${line(p)}`).join('\n')}${low.length > 10 ? `\n…and ${low.length - 10} more.` : ''}` :
      'No active products are at or below their minimum stock.';
  } else if (/\b(?:purchase orders?|supplier orders?|pending orders?|on order)\b/.test(q)) {
    const pending = state.purchaseOrders.filter(o => o.status === 'pending');
    answer = pending.length ? `${pending.length} pending purchase order${pending.length === 1 ? '' : 's'}:\n${pending.slice(0, 10)
      .map(o => `• #${o.id}: ${o.quantity} × ${o.productName} from ${o.supplier}; ${money(BigInt(o.quantity) * BigInt(o.unitPriceCents))} planned`)
      .join('\n')}${pending.length > 10 ? `\n…and ${pending.length - 10} more.` : ''}` :
      'There are no pending purchase orders.';
  } else if (/\b(?:work orders?|planned work|jobs?)\b/.test(q)) {
    const work = state.workOrders;
    answer = work.length ? `${work.length} work order${work.length === 1 ? '' : 's'}:\n${work.slice(-10).reverse()
      .map(o => `• #${o.id}: ${o.description}; ${o.quantity} × ${o.productName}`).join('\n')}${work.length > 10 ? `\n…and ${work.length - 10} more.` : ''}` :
      'There are no work orders.';
  } else if (/\b(sales?|sold)\b/.test(q)) {
    const sales = state.movements.filter(m => m.type === 'sale').slice(-5).reverse();
    answer = sales.length ? `Recent sales:\n${sales.map(m => {
      const p = state.products.find(item => item.id === m.productId);
      return `• ${m.quantity} × ${p?.name || `product #${m.productId}`} from ${m.from} to ${m.business}`;
    }).join('\n')}` : 'No sales are recorded.';
  } else if (/\b(movement|history|recent|activity|transaction)\b/.test(q)) {
    const movements = state.movements.slice(-5).reverse();
    answer = movements.length ? `Last ${movements.length} stock movements:\n${movements.map(m => {
      const p = state.products.find(item => item.id === m.productId);
      const route = m.from && m.to ? `${m.from} → ${m.to}` : m.to || m.from;
      return `• ${m.type}: ${m.quantity} × ${p?.name || `product #${m.productId}`} (${route})`;
    }).join('\n')}` : 'No stock movements are recorded yet.';
  } else if (/\b(value|worth|total price)\b/.test(q)) {
    const current = summary(state);
    answer = `The current list value is ${money(current.valueCents)} across ${current.units} units and ${current.products} active products. This uses list prices, not a profit calculation.`;
  } else if (/\b(stock|inventory|products?|units?|how many)\b/.test(q)) {
    const current = summary(state);
    answer = `${current.products} active products, ${current.units} units in all locations, and ${current.lowStock} products at or below minimum. Ask about a specific product by name, barcode, QR payload or ID for its locations.`;
  } else {
    answer = 'I could not match that to a product or inventory question. Try a product name or barcode, “What is low on stock?”, “Show recent movements”, or “Show pending purchase orders”.';
  }
  return { answer, suggestions: examples, basedOn: 'current inventory' };
}

module.exports = { reply };
