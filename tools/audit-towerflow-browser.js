/* TowerFlow visual/control audit: paste into browser DevTools Console while panel is open.
 * READ-ONLY: never clicks buttons, edits UI, changes source, or shares secrets. */
(async () => {
  const panel = document.getElementById('panel');
  const scope = panel && !panel.hidden ? panel : document.body;
  const visible = e => {
    const r = e.getBoundingClientRect();
    const c = getComputedStyle(e);
    return r.width >= 2 && r.height >= 2 && c.display !== 'none' &&
      c.visibility !== 'hidden' && +c.opacity !== 0;
  };
  const root = scope.getBoundingClientRect();
  const controls = [...scope.querySelectorAll('button, a, input, select, textarea, summary')]
    .filter(visible).map((e, i) => {
      const r = e.getBoundingClientRect();
      const label = (e.getAttribute('aria-label') || e.textContent ||
        e.getAttribute('title') || e.getAttribute('placeholder') || e.tagName)
        .trim().replace(/\s+/g, ' ').slice(0, 75);
      const center = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const covered = !!center && center !== e && !e.contains(center);
      const clipped = r.left < root.left - 2 || r.right > root.right + 2 ||
        r.top < root.top - 2 || r.bottom > root.bottom + 2;
      return {i, label, tag: e.tagName.toLowerCase(), disabled: !!e.disabled,
        clipped, covered, x: Math.round(r.x), y: Math.round(r.y),
        width: Math.round(r.width), height: Math.round(r.height)};
    });
  const headlineNodes = [...scope.querySelectorAll('h1,h2,h3,h4,[role="heading"],.panel-head,.tf-desk-heading,summary')]
    .filter(visible);
  const box = e => e.getBoundingClientRect();
  const intersects = (a,b) => Math.min(a.right,b.right)-Math.max(a.left,b.left)>6 &&
    Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>6;
  const overlaps = [];
  for(let i=0;i<headlineNodes.length;i++)for(let j=i+1;j<headlineNodes.length;j++) {
    const a=headlineNodes[i], b=headlineNodes[j];
    if(a.contains(b)||b.contains(a))continue;
    if(intersects(box(a),box(b)))overlaps.push({
      a:(a.textContent||'').trim().replace(/\s+/g,' ').slice(0,65),
      b:(b.textContent||'').trim().replace(/\s+/g,' ').slice(0,65)
    });
  }
  const endpoints = [
    ['/api/health','health'],
    ['/api/azure-bridge/member-dev?member=SVN-760','member-dev'],
    ['/api/azure-bridge/collaborator-audit?member=SVN-760','collaborator-audit'],
    ['/api/azure-bridge/integration-intake','integration-intake'],
    ['/api/azure-bridge/loadout','loadout']
  ];
  const network = await Promise.all(endpoints.map(async ([path,name])=>{
    try {
      const response = await fetch(path,{cache:'no-store',credentials:'same-origin',
        signal:AbortSignal.timeout(7500)});
      return {name,status:response.status,
        verdict:response.status===200?'PASS':response.status===404?'MISSING ROUTE':
          [401,403].includes(response.status)?'AUTH REQUIRED':'CHECK'};
    }catch(e){return {name,status:'NETWORK',verdict:e.name||'error'}}
  }));
  const result={at:new Date().toISOString(),url:location.origin+location.pathname,
    panelTitle:document.getElementById('panelTitle')?.textContent,
    controls,overlaps,network,
    note:'Static DOM/HTTP evidence only. No click actions were performed.'};
  console.group('TOWERFLOW VISUAL & BUTTON AUDIT');
  console.table(network);
  console.table(controls);
  console.table(overlaps);
  console.log('RESULT (no secrets):',JSON.stringify(result,null,2));
  console.groupEnd();
  try {
    await navigator.clipboard.writeText(JSON.stringify(result,null,2));
    console.log('Audit JSON copied to clipboard.');
  } catch { console.log('Clipboard unavailable: copy RESULT above.'); }
})();