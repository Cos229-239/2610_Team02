'use strict';
// Isolated Azure Flow UI adapter. The existing TowerFlow interface owns navigation.
(() => {
  const root = document.getElementById('azureFlow');
  if (!root) return;
  const get = id => root.querySelector('#' + id);
  const textNode = (tag, value, className='') => {
    const el = document.createElement(tag);
    el.textContent = String(value);
    if (className) el.className = className;
    return el;
  };
  const dollars = cents => {
    const n = BigInt(cents);
    const abs = n < 0n ? -n : n;
    return (n < 0n ? '-' : '') + '$' +
      (abs / 100n).toLocaleString('en-US') + '.' + (abs % 100n).toString().padStart(2, '0');
  };
  async function evaluate(payload) {
    const response = await fetch('/api/azure-flow/evaluate', {
      method: 'POST',
      credentials:'same-origin',
      headers:{ 'Content-Type':'application/json', 'X-TowerFlow-Request':'1' },
      body:JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Evaluation unavailable.');
    return data;
  }
  async function evaluateInvestigation() {
    const response = await fetch('/api/azure-flow/investigate', {
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json','X-TowerFlow-Request':'1'},
      body:'{}'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Investigation unavailable.');
    return data;
  }
  // Query results are rendered entirely as text; never trust market/provider/model data as HTML.
  async function askAzure(question) {
    const output=get('afAnswer'), button=get('afAsk');
    button.disabled=true; output.hidden=false;
    output.replaceChildren(textNode('p','Investigating verified information…'));
    try {
      const response=await fetch('/api/azure-flow/query',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-TowerFlow-Request':'1'},
        body:JSON.stringify({question})
      });
      const result=await response.json();
      if(!response.ok) throw Error(result.error||'Investigation unavailable.');
      output.replaceChildren();
      const label=result.intent==='market' ? (result.subject||result.symbol) :
        result.intent==='unresolved' ? 'Investigation needs context' :
        result.intent==='sales' ? 'Sales intelligence' : 'Inventory intelligence';
      output.append(textNode('h3',label),textNode('p',result.explanation));
      if(result.intent==='market') {
        const quote=result.market;
        if(quote?.status==='OBSERVED'&&quote.observation) {
          output.append(textNode('strong',result.symbol+' · USD '+Number(quote.observation.closeUsd).toFixed(2)),
            textNode('p','Close '+quote.observation.date+' · '+(quote.source||'unknown source')+' · not live','af-badge'));
        } else {
          output.append(textNode('p','Recent quote unavailable; no price was fabricated.','af-badge'));
        }
      }
      if(result.report) {
        const report=result.report;
        output.append(textNode('p','Active products: '+report.inventory.products+
          ' · Stock alerts: '+report.inventory.lowStock+
          ' · Recorded sales: '+report.operations.recordedSales));
        const issue=(report.findings||[])[0];
        if(issue) output.append(textNode('p','Next review: '+issue.action));
        const targetTab=result.intent==='sales'?'movements':'inventory';
        const review=textNode('button','Review source in '+(targetTab==='sales'?'Sales':'TowerFlow'),'af-secondary');
        review.type='button';
        review.textContent=targetTab==='movements'?'Open Movements':'Open Inventory';
        review.addEventListener('click',()=>{
          document.querySelector('.nav[data-page="'+targetTab+'"]')?.click();
        });
        output.append(review);
      }
      for(const phrase of (result.suggestions||[]).slice(0,4)){
        const choice=textNode('button',phrase,'af-example-action');
        choice.type='button';
        choice.addEventListener('click',()=>{get('afQuestion').value=phrase;void askAzure(phrase);});
        output.append(choice);
      }
      output.append(textNode('small','Evidence source: '+result.source,'af-badge'));
    } catch(error){
      output.replaceChildren(textNode('p','Azure Flow cannot verify this investigation: '+error.message));
    } finally {button.disabled=false;}
  }
  get('afQueryForm').addEventListener('submit',event=>{
    event.preventDefault();
    void askAzure(get('afQuestion').value.trim());
  });
  for(const button of root.querySelectorAll('[data-af-example]')){
    button.addEventListener('click',()=>{
      const question=button.dataset.afExample;
      get('afQuestion').value=question;
      void askAzure(question);
    });
  }
  get('afAnalyze').addEventListener('click', async () => {
    const button = get('afAnalyze');
    const status = get('afStatus');
    button.disabled = true;
    status.textContent = 'Investigating recorded business evidence…';
    try {
      const result = await evaluateInvestigation();
      const inventory = get('afInventory');
      const sales = get('afOperations');
      const rec = get('afRecommendations');
      inventory.replaceChildren(); sales.replaceChildren(); rec.replaceChildren();
      inventory.append(
        textNode('p', result.inventory.products + ' active products · ' + result.inventory.units + ' units'),
        textNode('p', result.inventory.lowStock + ' products at or below minimum'),
        textNode('p', 'Recorded stock list value: ' + dollars(result.inventory.valueCents))
      );
      if (result.inventory.lowNames.length) inventory.append(textNode('p', 'First alerts: ' + result.inventory.lowNames.join(', ')));
      sales.append(textNode('p', result.operations.recordedSales + ' recorded sale movements'));
      sales.append(textNode('p', 'Recorded gross sales: ' + dollars(result.operations.recordedSalesCents)));
      if (result.operations.monthly.length) {
        const figure = document.createElement('div');
        figure.className = 'af-chart';
        figure.setAttribute('role','img');
        figure.setAttribute('aria-label','Monthly recorded gross sales. Visual comparison, not a forecast.');
        const values = result.operations.monthly.map(p => Number(p.salesCents));
        const max = Math.max(...values, 1);
        figure.setAttribute('title', result.operations.monthly.map(p => p.month + ': ' + dollars(p.salesCents)).join(' | '));
        for (const value of values) {
          const bar = document.createElement('span');
          bar.className = 'af-bar';
          bar.style.height = Math.max(3, Math.round(100 * value / max)) + '%';
          figure.append(bar);
        }
        sales.append(figure);
      } else sales.append(textNode('p','No sales history available for a trajectory.'));
      sales.append(textNode('p',result.operations.basis,'af-badge'));
      for (const finding of result.findings) {
        const card = document.createElement('div');
        card.append(textNode('strong', finding.title), textNode('p', finding.basis), textNode('p', finding.action, 'af-badge'));
        rec.append(card);
      }
      if (Array.isArray(result.reviewActions) && result.reviewActions.length) {
        const heading = textNode('p', 'Prepared for your review · no changes made', 'af-badge');
        rec.append(heading);
        for (const action of result.reviewActions) {
          const row = document.createElement('div');
          row.className = 'af-review-row';
          row.append(textNode('p', action.productName + ': ' +
            (action.reviewQuantity ? 'review ' + action.reviewQuantity + ' additional units' : 'pending order covers minimum')));
          const open = textNode('button', 'Review in ' + (action.targetTab === 'orders' ? 'Orders' : 'Inventory'));
          open.type = 'button';
          open.className = 'af-secondary';
          open.addEventListener('click', () => {
            const button = document.querySelector('.nav[data-page="' + action.targetTab + '"]');
            if(button) button.click();
          });
          row.append(open);
          rec.append(row);
        }
      }
      get('afHeadlineText').textContent = result.findings[0]?.title || 'Investigation complete';
      get('afMeta').textContent = 'Evidence ' + result.evidenceHash.slice(0, 12) +
        ' · ' + new Date(result.evaluatedAt).toLocaleString();
      get('afHeadline').hidden = false;
      get('afCards').hidden = false;
      status.textContent = result.model?.state === 'MODEL_SUGGESTION_VALIDATED'
        ? 'Local model prioritized a verified finding · read-only'
        : 'Recorded-data analysis only · AI not verified (' + (result.model?.state||'unknown') + ')';

    } catch (error) {
      status.textContent = 'Could not analyze: ' + error.message;
    } finally { button.disabled = false; }
  });
  get('afProbe').addEventListener('click', async () => {
    const button=get('afProbe'), status=get('afModelHealth');
    button.disabled=true;
    status.textContent='Checking local Ollama availability without downloading anything…';
    try {
      const response=await fetch('/api/azure-flow/model-health',{credentials:'same-origin'});
      if(!response.ok) throw Error('Model health HTTP '+response.status);
      const data=await response.json();
      status.textContent=data.state+' · '+data.next+
        (data.installedAllowed?.length ? ' · Eligible installed: '+data.installedAllowed.join(', ') : '');
    } catch(error){status.textContent='Cannot verify local AI: '+error.message;}
    finally{button.disabled=false;}
  });
  get('afCalibrate').addEventListener('click', async () => {
    const button = get('afCalibrate'), status = get('afCalibrationStatus');
    button.disabled = true;
    status.textContent = 'Screening existing models against five bounded examples…';
    try {
      const result = await evaluateCalibration();
      const lines = result.tested?.map(x =>
        x.model + ': ' + x.correct + '/' + x.total + ' correct in ' + x.measuredMs + ' ms') || [];
      status.textContent = (result.status || 'UNKNOWN') + ' · ' +
        (lines.join(' · ') || 'No eligible local models detected.') +
        ' · Results are a small screening, not general model reliability.';
    } catch(error) {
      status.textContent = 'Screening unavailable: ' + error.message;
    } finally { button.disabled = false; }
  });
  async function evaluateCalibration() {
    const reply = await fetch('/api/azure-flow/calibrate', {
      method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json','X-TowerFlow-Request':'1'},
      body:'{}'
    });
    const result = await reply.json();
    if (!reply.ok) throw new Error(result.error || 'Screening unavailable.');
    return result;
  }
  get('afMarketForm').addEventListener('submit', async event => {
    event.preventDefault();
    const output = get('afMarketResult');
    output.textContent = 'Checking the free daily close provider…';
    try {
      const response = await fetch('/api/azure-flow/market-close', {
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-TowerFlow-Request':'1'},
        body:JSON.stringify({symbol:get('afMarketSymbol').value.trim()})
      });
      const data = await response.json();
      if(!response.ok) throw new Error(data.error||'Price unavailable');
      if(data.status!=='OBSERVED'){
        output.textContent = data.symbol + ': no verified recent close available. No price assumed.';
      } else {
        output.textContent = data.symbol + ' · USD ' + data.observation.closeUsd.toFixed(2) +
          ' · closing date ' + data.observation.date + ' · ' + data.source +
          ' · not live, potentially delayed.';
      }
    } catch(error){ output.textContent='Market lookup unavailable: '+error.message; }
  });
  get('afPortfolioForm').addEventListener('submit', async event => {
    event.preventDefault();
    const target = get('afPortfolioResult');
    const field = get('afPortfolioRows');
    try {
      const lines = field.value.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length > 25) throw new Error('Maximum 25 holdings.');
      const rows = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        if (parts.length !== 5) throw new Error('Each line needs five comma-separated values.');
        return { symbol:parts[0], shares:parts[1], costPerShare:parts[2],
          observedPrice:parts[3], asOf:parts[4] };
      });
      const result = await evaluate({capability:'portfolio.evaluate-import', portfolioRows:rows});
      target.replaceChildren();
      target.append(textNode('p', 'Entered cost: ' + dollars(result.costCents)),
        textNode('p', 'Value at entered prices: ' + dollars(result.valueCents)),
        textNode('p', 'Change: ' + dollars(result.differenceCents)),
        textNode('p', result.notice, 'af-badge'));
    } catch (error) {
      target.replaceChildren(textNode('p', error.message));
    }
  });
})();
