'use strict';

// Adaptation of Daniel Dulsky's AzureStockGuide.cs for William's WinForms parts
// manager. This module runs locally on the shared Node.js server, not in .NET.
// All changes go through the shared inventory's normal stock ledger.
const { InputError, setStock } = require('./inventory');

const MAX_GUIDE_QUANTITY = 1_000_000;
const MAX_DISPLAY_PARTS = 100;
const adjustmentPattern = /^(set|add)\s+(\d+)\s*\/\s*(\d+)\s+(to|by)\s+(\d+)$/i;
const stockOf = part => part.stock.reduce((count, location) => count + location.quantity, 0);
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
const byQuantity = (a, b) => stockOf(a) - stockOf(b) || byName(a, b);
const reorderAmount = part => Math.max(0, part.minimumStock + 1 - stockOf(part));

function adviceParts(parts, message) {
  const displayParts = parts.slice(0, MAX_DISPLAY_PARTS).map(part => ({
    id: part.id, name: part.name, partNumber: part.partNumber,
    serialNumber: part.serialNumber, quantity: stockOf(part), minimumStock: part.minimumStock,
    reorderAmount: reorderAmount(part), locationCount: part.stock.length,
    locations: part.stock.map(item => `${item.location}: ${item.quantity}`).join(', ') || 'none'
  }));
  return { message: message + (parts.length > MAX_DISPLAY_PARTS ?
    ` Showing the first ${MAX_DISPLAY_PARTS} of ${parts.length} matches.` : ''), displayParts };
}

function interpret(state, input) {
  if (typeof input !== 'string' || input.length > 500 || /[\u0000-\u001f\u007f]/.test(input)) {
    throw new InputError('Enter a guide command of at most 500 characters without control characters.');
  }
  const command = input.trim();
  const parts = state.products.filter(p => !p.archived);
  if (!command || /^help$/i.test(command)) {
    return { message: 'Azure Stock Guide — commands: summary, low stock (5 or fewer units), reorder (at/below the configured minimum), '
      + 'find <name, part/serial, barcode, or category>, sort name, sort quantity, '
      + 'set <part#>/<serial#> to <quantity>, add <part#>/<serial#> by <quantity>. '
      + 'Stock changes are always previewed and require confirmation. Use Inventory → Set stock for products held in multiple locations.' };
  }
  if (/^summary$/i.test(command)) {
    const units = parts.reduce((sum, part) => sum + stockOf(part), 0);
    const low = parts.filter(part => stockOf(part) <= 5).length;
    const reorder = parts.filter(part => reorderAmount(part) > 0).length;
    return { message: `Inventory overview: ${parts.length} active product(s), ${units.toLocaleString()} total unit(s), `
      + `${low} part(s) with 5 or fewer units, ${reorder} item(s) at or below their configured minimum. `
      + 'Run low stock or reorder to see the relevant products.' };
  }
  if (/^reorder$/i.test(command)) {
    const matches = parts.filter(part => reorderAmount(part) > 0).sort((a, b) =>
      reorderAmount(b) - reorderAmount(a) || byName(a, b));
    return adviceParts(matches, matches.length ?
      `${matches.length} product(s) at or below minimum stock. Suggested quantities bring each one to minimum + 1.` :
      'No active products are at or below their configured minimum.');
  }
  if (/^low stock$/i.test(command)) {
    const low = parts.filter(p => stockOf(p) <= 5).sort(byQuantity);
    return adviceParts(low, low.length ? `${low.length} part(s) at or below 5 units.` : 'No parts at or below 5 units.');
  }
  if (/^find(?:\s|$)/i.test(command)) {
    const term = command.slice(4).trim().toLowerCase();
    if (!term) return { message: 'Enter a name, barcode, or part/serial number after find (e.g. find 115/902701).' };
    const matches = parts.filter(p => {
      const terms = [p.name, p.category, p.barcode, p.qrPayload,
        p.partNumber != null ? String(p.partNumber) : '',
        p.serialNumber != null ? String(p.serialNumber) : '',
        p.partNumber != null && p.serialNumber != null ? `${p.partNumber}/${p.serialNumber}` : ''];
      return terms.some(value => value && String(value).toLowerCase().includes(term));
    }).sort(byName);
    return adviceParts(matches, `${matches.length} part(s) match '${term}'.`);
  }
  if (/^sort quantity$/i.test(command)) return adviceParts([...parts].sort(byQuantity), 'Showing parts with the lowest quantity first.');
  if (/^sort name$/i.test(command)) return adviceParts([...parts].sort(byName), 'Showing parts alphabetically.');

  const matched = adjustmentPattern.exec(command);
  if (!matched) return { message: 'Command not recognized. Type help to see supported actions.' };
  const isSet = matched[1].toLowerCase() === 'set';
  const preposition = matched[4].toLowerCase();
  const partNumber = Number(matched[2]);
  const serialNumber = Number(matched[3]);
  const amount = Number(matched[5]);
  if (preposition !== (isSet ? 'to' : 'by') || !Number.isSafeInteger(partNumber) || partNumber < 1 ||
      !Number.isSafeInteger(serialNumber) || serialNumber < 1 || !Number.isSafeInteger(amount)) {
    return { message: 'Use set <part#>/<serial#> to <quantity> or add <part#>/<serial#> by <quantity>.' };
  }
  const matches = state.products.filter(p => p.partNumber === partNumber && p.serialNumber === serialNumber);
  if (matches.length !== 1) return { message: matches.length === 0 ?
    'Part not found. Confirm both part and serial numbers.' :
    'Duplicate part/serial identity. Resolve duplicates before modifying stock.' };
  const part = matches[0];
  if (part.archived) return { message: 'This part is archived. Reactivate or use an active part instead.' };
  if (part.stock.length > 1) {
    return { message: 'This part has stock in multiple locations. Use Inventory → Set stock to specify a location; the guide will not guess which location to change.' };
  }
  const current = stockOf(part);
  if (amount > MAX_GUIDE_QUANTITY || current > MAX_GUIDE_QUANTITY ||
      (!isSet && amount > MAX_GUIDE_QUANTITY - current)) {
    return { message: 'Unsafe stock value. Azure Guide supports quantities from 0 to 1,000,000.' };
  }
  const next = isSet ? amount : current + amount;
  const location = part.stock[0]?.location || 'Main';
  if (current === next) return { message: `No change needed: ${part.name} (#${partNumber}/${serialNumber}) already has ${current} units.` };
  return {
    message: `Preview only: ${part.name} (#${partNumber}/${serialNumber}) at ${location}: quantity ${current} → ${next}. Confirm below to save.`,
    previewDetails: { name: part.name, partNumber, serialNumber, location, current, next },
    proposedChange: { productId: part.id, partNumber, serialNumber,
      expectedName: part.name, expectedRevision: part.revision,
      expectedQuantity: current, newQuantity: next, location }
  };
}

function apply(state, proposal) {
  // The server passes only an internally stored proposal, never client-supplied stock values.
  const matches = state.products.filter(p => p.partNumber === proposal.partNumber &&
    p.serialNumber === proposal.serialNumber);
  const part = matches.length === 1 ? matches[0] : null;
  const samePart = part && part.id === proposal.productId && !part.archived &&
    part.name === proposal.expectedName && part.revision === proposal.expectedRevision &&
    part.stock.length <= 1 && (part.stock[0]?.location || 'Main') === proposal.location &&
    stockOf(part) === proposal.expectedQuantity;
  if (!samePart) {
    const conflict = new InputError('The part changed since the preview. Run the guide command again.');
    conflict.status = 409;
    throw conflict;
  }
  if (!Number.isSafeInteger(proposal.newQuantity) || proposal.newQuantity < 0 ||
      proposal.newQuantity > MAX_GUIDE_QUANTITY) throw new InputError('Unsafe stock value.');
  return setStock(state, part.id, { location: proposal.location, quantity: proposal.newQuantity });
}

module.exports = { interpret, apply };
