'use strict';

const fs = require('node:fs');
const path = require('node:path');
const template = fs.readFileSync(path.join(__dirname, '..', 'public', 'dashboard.html'), 'utf8');

function dashboard(state) {
  const escapeHtml = value => value.replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  const payload = { business: state.businessName, generatedAt: new Date().toISOString(),
    products: state.products, movements: state.movements };
  const json = JSON.stringify(payload).replace(/[<>&\u2028\u2029]/g, ch =>
    `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const [before, after] = template.split('__REPORT_DATA__');
  const business = escapeHtml(state.businessName);
  return before.replaceAll('__BUSINESS_NAME__', business) + json +
    after.replaceAll('__BUSINESS_NAME__', business);
}

module.exports = { dashboard };
