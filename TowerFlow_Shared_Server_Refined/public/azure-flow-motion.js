'use strict';
// Scoped, lightweight Azure Flow motion controller; no libraries or model calls.
// It observes the current UX and never changes application business state.
(() => {
  const root = document.getElementById('azureFlow');
  if (!root) return;
  const orb = root.querySelector('.af-orbit');
  const answer = root.querySelector('#afAnswer');
  const analysis = root.querySelector('#afStatus');
  const modelHealth = root.querySelector('#afModelHealth');
  const calibration = root.querySelector('#afCalibrationStatus');
  const market = root.querySelector('#afMarketResult');
  const portfolio = root.querySelector('#afPortfolioResult');
  const question = root.querySelector('#afQuestion');
  if (!orb || !answer || !analysis || !question) return;

  root.dataset.afMotion = 'enabled';
  root.dataset.afState = 'idle';
  root.dataset.afVisible = document.hidden ? 'false' : 'true';

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canMove = () => !motion.matches && !document.hidden && !root.hidden;

  let frame = 0;
  orb.addEventListener('pointermove', event => {
    if (!canMove() || event.pointerType === 'touch') return;
    const {left,top,width,height} = orb.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - left) / width - .5) * 2));
    const y = Math.max(-1, Math.min(1, ((event.clientY - top) / height - .5) * 2));
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      orb.style.setProperty('--af-pointer-x', (x * 8).toFixed(2) + 'px');
      orb.style.setProperty('--af-pointer-y', (y * 6).toFixed(2) + 'px');
      orb.style.setProperty('--af-tilt-x', (x * 10).toFixed(2) + 'deg');
      orb.style.setProperty('--af-tilt-y', (y * -8).toFixed(2) + 'deg');
      frame = 0;
    });
  }, {passive:true});
  orb.addEventListener('pointerleave', () => {
    if(frame) cancelAnimationFrame(frame);
    frame=0;
    for(const key of ['--af-pointer-x','--af-pointer-y','--af-tilt-x','--af-tilt-y']) {
      orb.style.removeProperty(key);
    }
  });

  function setState(value) {
    if (!['idle','ready','busy','error','focused'].includes(value)) return;
    root.dataset.afState=value;
  }
  // Respect source UI state instead of inferring that a server/model result succeeded.
  const observe = (element, compute) => {
    if (!element) return;
    new MutationObserver(() => {
      const value=element.textContent.trim();
      const state=compute(value);
      if(state) setState(state);
    }).observe(element,{childList:true,characterData:true,subtree:true});
  };

  observe(answer, value => {
    if(answer.hidden) return null;
    if(/Investigating verified information/i.test(value))return 'busy';
    if(/cannot verify|unavailable|needs context|no verified recent|not available/i.test(value))return 'error';
    return value ? 'ready' : null;
  });
  observe(analysis, value => {
    if(/Investigating/i.test(value))return 'busy';
    if(/Could not analyze/i.test(value))return 'error';
    if(/complete|prioritized|Verified harness|Recorded-data analysis/i.test(value))return 'ready';
    return null;
  });
  observe(market, value => {
    if(/Checking the free/i.test(value))return 'busy';
    if(/unavailable|no verified/i.test(value))return 'error';
    if(/closing date/i.test(value))return 'ready';
    return null;
  });
  observe(portfolio, value => {
    if(/Entered cost:/i.test(value))return 'ready';
    return null;
  });
  observe(modelHealth, value => {
    if(/Checking local Ollama/i.test(value))return 'busy';
    if(/UNREACHABLE|NOT_INSTALLED|Cannot verify/i.test(value))return 'error';
    if(/MODEL_INSTALLED/i.test(value))return 'ready';
    return null;
  });
  observe(calibration, value => {
    if(/Screening existing models/i.test(value))return 'busy';
    if(/SCREEN_PASS/i.test(value))return 'ready';
    if(/FAIL|unavailable|NOT_QUALIFIED/i.test(value))return 'error';
    return null;
  });

  question.addEventListener('focus', () => {
    if(root.dataset.afState==='idle'||root.dataset.afState==='ready')setState('focused');
  });
  question.addEventListener('blur', () => {
    if(root.dataset.afState==='focused')setState('idle');
  });

  // Browsers skip compositing hidden tabs; pause visually when this tab is not shown.
  const syncVisibility = () => {
    root.dataset.afVisible=(!document.hidden && !root.hidden) ? 'true' : 'false';
  };
  document.addEventListener('visibilitychange',syncVisibility);
  new MutationObserver(syncVisibility).observe(root,{attributes:true,attributeFilter:['hidden']});
  syncVisibility();
})();
