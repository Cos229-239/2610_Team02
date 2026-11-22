'use strict';
// Azure Flow conversational intent gateway. No arbitrary tool execution, code generation,
// external LLM instructions, company profiling inventions or persistence.
const { getDailyClose } = require('./azure-flow-market');
const { overview } = require('./azure-flow-harness');

const COMPANY_ALIASES = Object.freeze({
  sony: { symbol:'SONY', label:'Sony Group Corporation' },
  apple: { symbol:'AAPL', label:'Apple Inc.' },
  microsoft: { symbol:'MSFT', label:'Microsoft Corporation' },
});
const HELP = Object.freeze([
  'Analyze my business', 'Show my low-stock risks', 'Review sales trajectory',
  'Evaluate Sony', 'Check AAPL closing price'
]);
function normalize(question) {
  if (typeof question !== 'string' || question.trim().length < 2 || question.length > 280 ||
      /[\u0000-\u001f\u007f]/.test(question)) {
    const err=new Error('Describe your business question in 2–280 characters.');
    err.status=400;throw err;
  }
  return question.trim().replace(/\s+/g,' ');
}
function resolve(question, state) {
  const original = normalize(question);
  const text=original.toLowerCase();
  // Exact company names or company names in investment-related questions only.
  for (const [term,company] of Object.entries(COMPANY_ALIASES)) {
    if (text===term || (
      /\b(stock|shares|ticker|market|company|invest|evaluate|analyze|price|research|about)\b/i.test(text) &&
      new RegExp('\\b'+term+'\\b','i').test(text)
    )) return {intent:'market',source:'explicit alias dictionary',subject:company.label,symbol:company.symbol,original};
  }
  const symbol = /^(?:check|evaluate|research|analyze|price|quote|stock|ticker)?\s*(?:the\s+)?\$?([A-Za-z]{1,5}(?:\.[A-Za-z])?)\s*(?:stock|share|shares|price|quote|ticker|closing price)?[?.!]?$/i.exec(original);
  if(symbol && (original===original.toUpperCase() || /^(?:check|price|quote|stock|ticker|evaluate|research)\b/i.test(original))) {
    return {intent:'market',source:'user-provided symbol',subject:symbol[1].toUpperCase(),symbol:symbol[1].toUpperCase(),original};
  }
  if(/\b(sales|revenue|turnover|performance|sold|trajectory|trend)\b/i.test(text)) {
    return {intent:'sales',source:'explicit business terminology',original};
  }
  if(/\b(inventory|stock level|low stock|reorder|products|supplier|purchase order|parts|business|grow|opportunities)\b/i.test(text)) {
    return {intent:'inventory',source:'explicit business terminology',original};
  }
  const products=(state?.products||[]).filter(p=>!p.archived && typeof p.name==='string' &&
    p.name.toLowerCase().includes(text)).slice(0,5);
  if(products.length) return {intent:'inventory',source:'matched recorded product',matches:products.map(p=>p.name),original};
  return {intent:'unresolved',source:'insufficient context',original};
}
function responseForBusiness(resolution,state,{now=Math.floor(Date.now()/1000),revision='unknown'}={}) {
  const report=overview(state,{now,revision});
  const sales=resolution.intent==='sales';
  const explanation = sales
    ? (report.operations.recordedSales
      ? 'The sales chart uses recorded sales and is not a validated revenue forecast.'
      : 'There are no recorded sales transactions to analyze. Enter genuine sales before projecting revenue.')
    : (report.inventory.products
      ? 'This assessment uses recorded products, stock thresholds, pending orders and movement history.'
      : 'This TowerFlow workspace contains no active products. Add actual inventory in the Inventory tab before Azure can assess stock risk.');
  return {kind:'azure-flow-answer/v1',readOnly:true,original:resolution.original,intent:resolution.intent,
    explanation,report,source:'TowerFlow recorded business data',actions:report.reviewActions||[],evidenceHash:report.evidenceHash};
}
async function answer(question,state,{now=Math.floor(Date.now()/1000),revision='unknown',marketLookup=getDailyClose}={}) {
  const resolution=resolve(question,state);
  if(resolution.intent==='market') {
    const quote=await marketLookup(resolution.symbol,{nowMs:now*1000});
    return {kind:'azure-flow-answer/v1',readOnly:true,original:resolution.original,intent:'market',
      subject:resolution.subject,symbol:resolution.symbol,
      resolution:resolution.source,market:quote,
      explanation:quote.status==='OBSERVED'
        ? 'A dated historical closing price was retrieved. It is not live and cannot establish company valuation or investment suitability.'
        : 'No verified recent closing price was available. Azure did not estimate a price, position, market trend or investment return.',
      source:quote.source,actions:[],limitations:['No brokerage access or live quotes.','Issuer mappings require independent confirmation.']};
  }
  if(resolution.intent==='sales'||resolution.intent==='inventory') return responseForBusiness(resolution,state,{now,revision});
  return {kind:'azure-flow-answer/v1',readOnly:true,intent:'unresolved',original:resolution.original,
    explanation:'I need a business area, recorded product name, or company/ticker to choose a verified investigation. No market or inventory results were guessed.',
    suggestions:HELP,actions:[],source:'No supported data source selected'};
}
module.exports={COMPANY_ALIASES,HELP,normalize,resolve,responseForBusiness,answer};
