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
  // Active research is routed by a validated model plan and capability registry.
  // Every displayed source is a text-only, attributable retrieval receipt.
  let latestEvidenceId=null;
  async function askAzure(question) {
    const output=get('afAnswer'),button=get('afAsk');
    const saveArea=get('afSaveArea'),saveStatus=get('afSaveStatus');
    latestEvidenceId=null;saveArea.hidden=true;get('afLearning').hidden=true;get('afSaveResearch').disabled=false;get('afFeedbackNote').value='';
    button.disabled=true;output.hidden=false;
    output.replaceChildren(textNode('p','Planning an evidence-grounded investigation…'));
    try {
      const sourceMode=get('afSourceMode').value;
      if(sourceMode==='official-sec'&&!get('afAllowPublic').checked)
        throw Error('Enable external research consent to query SEC EDGAR.');
            const response=await fetch('/api/azure-flow/research',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-TowerFlow-Request':'1'},
        body:JSON.stringify({question,allowPublic:get('afAllowPublic').checked,
          sourceMode})
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Research unavailable.');
      output.replaceChildren(
        textNode('h3','Research investigation'),
        textNode('p',result.answer),
        textNode('p','Plan: '+(result.plan?.status||'unknown')+
          ' · Authorized harnesses: '+(result.plan?.capabilities||[]).join(', '),'af-badge')
      );
      if(result.plan?.status==='USER_SELECTED_OFFICIAL_SOURCE')
        output.append(textNode('p','Official SEC source selected by you. This bypasses the experimental AI routing, not evidence validation.','af-badge'));
      if(result.plan?.model)output.append(textNode('p','Planner: '+result.plan.model,'af-badge'));
      if(result.evidenceAudit){
        const a=result.evidenceAudit;
        output.append(textNode('p','Evidence audit: '+a.evidenceStatus+
          ' · '+a.sourceCount+' source passages · '+a.independentOriginsObserved+
          ' observed source origins · '+(result.retrievalPasses||1)+' research pass(es).','af-badge'));
        if(a.failedCapabilities?.length)
          output.append(textNode('p','Unresolved source checks: '+
            a.failedCapabilities.map(x=>x.id+' ('+x.status+')').join('; '),'af-badge'));
        output.append(textNode('p',a.nextEvidenceNeed,'af-badge'));
      }

      if(result.plan?.status==='MODEL_UNAVAILABLE')output.append(textNode('p',
        'Local model could not plan this inquiry. Only local Markdown retrieval ran.','af-badge'));
      if(result.synthesis?.state==='MODEL_HYPOTHESIS_SOURCE_MATCHED'){
        const box=document.createElement('section');
        box.className='af-reasoning';
        box.append(textNode('strong','Provisional interpretation · requires verification'),
          textNode('p',result.synthesis.hypothesis),
          textNode('p','Next research: '+result.synthesis.nextStep,'af-badge'));
        for(const observation of result.synthesis.observations||[]){
          box.append(textNode('p','Source '+observation.sourceId+': "'+observation.quote+'"','af-badge'));
        }
        if(result.synthesis.unknowns?.length)
          box.append(textNode('p','Unknowns: '+result.synthesis.unknowns.join(' · '),'af-badge'));
        output.append(box);
      } else {
        output.append(textNode('p','Synthesis status: '+
          (result.synthesis?.state||'not available')+
          '. Source excerpts are not independent proof of investment suitability.','af-badge'));
      }
      if(result.learning?.recalled)output.append(textNode('p',
        'Recalled '+result.learning.recalled+' owner-approved routing example(s). No model weights changed.','af-badge'));
      if(!result.sources?.length)output.append(textNode('p',
        'No verified sources found. Azure cannot substantiate a factual conclusion.','af-badge'));
      for(const source of (result.sources||[])){
        const article=document.createElement('article');
        article.className='af-evidence';
        article.append(textNode('strong',source.title||source.source||'Evidence'),
          textNode('p',source.excerpt||'No excerpt.'),
          textNode('small',source.source+' · SHA-256 '+String(source.sha256||'').slice(0,12),'af-badge'));
        if(typeof source.url==='string'&&/^https:\/\/(?:en\.wikipedia\.org\/wiki\/|www\.sec\.gov\/Archives\/edgar\/data\/)/.test(source.url)){
          const anchor=document.createElement('a');
          anchor.href=source.url;anchor.rel='noopener noreferrer';anchor.target='_blank';
          anchor.textContent='Open cited source ↗';
          article.append(anchor);
        }
        output.append(article);
      }
      output.append(textNode('small','Evidence receipt: '+result.provenance.evidenceId.slice(0,18)+
        ' · Human review required; no business action performed.','af-badge'));
      latestEvidenceId=result.provenance.evidenceId;
      saveArea.hidden=false;
      get('afLearning').hidden=false;
      get('afFeedbackStatus').textContent='No feedback recorded for this investigation.';
      for(const action of root.querySelectorAll('[data-af-grade]'))action.disabled=false;
      saveStatus.textContent='Optional owner action. Creates a draft findings/ADR Markdown record locally; nothing is saved automatically.';
    } catch(error){
      output.replaceChildren(textNode('p','Azure could not complete this investigation: '+error.message));
    } finally {button.disabled=false;}
  }
  for(const button of root.querySelectorAll('[data-af-grade]')){
    button.addEventListener('click',async()=>{
      const status=get('afFeedbackStatus');
      if(!latestEvidenceId){status.textContent='An active research receipt is required.';return;}
      for(const action of root.querySelectorAll('[data-af-grade]'))action.disabled=true;
      status.textContent='Recording your explicit assessment…';
      try{
        const response=await fetch('/api/azure-flow/feedback',{
          method:'POST',credentials:'same-origin',
          headers:{'Content-Type':'application/json','X-TowerFlow-Request':'1'},
          body:JSON.stringify({evidenceId:latestEvidenceId,grade:button.dataset.afGrade,
            note:get('afFeedbackNote').value})
        });
        const result=await response.json();
        if(!response.ok)throw Error(result.error||'Feedback rejected');
        status.textContent='Review recorded · '+(result.eligibleForRouting?
          'approved as a future routing example':'not approved for retrieval')+
          ' · model weights unchanged.';
      }catch(error){
        status.textContent='Feedback not recorded: '+error.message;
        for(const action of root.querySelectorAll('[data-af-grade]'))action.disabled=false;
      }
    });
  }
  get('afSaveResearch').addEventListener('click',async()=>{
    const status=get('afSaveStatus'),button=get('afSaveResearch');
    if(!latestEvidenceId){status.textContent='No current evidence receipt.';return}
    button.disabled=true;
    status.textContent='Recording reviewed research locally…';
    try{
      const response=await fetch('/api/azure-flow/save-research',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json','X-TowerFlow-Request':'1'},
        body:JSON.stringify({evidenceId:latestEvidenceId})
      });
      const result=await response.json();
      if(!response.ok)throw Error(result.error||'Could not save.');
      status.textContent='Saved '+result.filename+' · SHA-256 '+result.sha256.slice(0,14)+
        ' · draft only, not published.';
      button.disabled=true;
    }catch(error){status.textContent='Save blocked: '+error.message;button.disabled=false}
  });
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
