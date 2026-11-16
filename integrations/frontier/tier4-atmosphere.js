// TF_TIER4_ATMOSPHERE_V1_BEGIN
// Opt-in additive atmosphere. Does not change room geometry, navigation or fixtures.
(function () {
  'use strict';
  if (typeof THREE === 'undefined' || typeof scene === 'undefined' || typeof renderer === 'undefined') return;
  if (window.tfTier4Atmosphere) return;
  const KEY = 'towerflow.tier4.atmosphere.v1';
  const settings = { enabled: true, quality: 'auto', intensity: 0.45 };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (typeof saved.enabled === 'boolean') settings.enabled = saved.enabled;
    if (['auto','low','balanced','high'].includes(saved.quality)) settings.quality = saved.quality;
    if (Number.isFinite(saved.intensity)) settings.intensity = Math.max(0, Math.min(1, saved.intensity));
  } catch (_) {}
  const authoredFog = scene.fog;
  const group = new THREE.Group();
  group.name = 'TF_TIER4_ATMOSPHERE';
  scene.add(group);
  const fog = authoredFog ? null : new THREE.FogExp2(0x111d29, 0.0012);
  const fill = new THREE.HemisphereLight(0xb5d7ff, 0x28303c, 0);
  group.add(fill);
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.PointsMaterial({ color: 0xdbe9f5, size: 0.024, transparent: true, opacity: 0.1, depthWrite: false });
  const dust = new THREE.Points(geometry, material);
  group.add(dust);
  let positions, phases, count, raf = 0, last = 0, frames = 0, average = 16.7;
  function desiredCount() {
    const mobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    return ({ low: 45, balanced: 110, high: 190 })[settings.quality === 'auto' ? (mobile ? 'low' : 'balanced') : settings.quality];
  }
  function rand(seed) { const n = Math.sin(seed * 127.1 + 78.233) * 43758.5453; return n - Math.floor(n); }
  function rebuild() {
    count = desiredCount();
    positions = new Float32Array(count * 3);
    phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[3*i] = (rand(i*3+1)-0.5)*37;
      positions[3*i+1] = 0.7+rand(i*3+2)*10;
      positions[3*i+2] = (rand(i*3+3)-0.5)*28;
      phases[i] = rand(i+812)*Math.PI*2;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }
  function apply() {
    group.visible = settings.enabled;
    if (!authoredFog && (scene.fog === null || scene.fog === fog)) scene.fog = settings.enabled && settings.intensity > 0 ? fog : null;
    if (fog) fog.density = 0.0006 + settings.intensity * 0.0015;
    fill.intensity = settings.enabled ? settings.intensity * 0.17 : 0;
    material.opacity = settings.enabled ? settings.intensity * 0.23 : 0;
  }
  rebuild(); apply();
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!settings.enabled || document.hidden) { last = now; return; }
    const dt = Math.min(0.05, Math.max(0, (now - (last || now))/1000)); last = now;
    average = average * 0.98 + dt * 1000 * 0.02;
    if (++frames % 2) return;
    for (let i = 0; i < count; i++) {
      const p = 3*i, t = now*0.00011+phases[i];
      positions[p] += (Math.sin(t*0.73+positions[p+2]*0.1)*0.012+0.001)*dt;
      positions[p+1] += Math.sin(t+phases[i])*0.004*dt;
      positions[p+2] += Math.cos(t*0.83+positions[p]*0.1)*0.012*dt;
      if (positions[p] > 18.5) positions[p] = -18.5;
    }
    geometry.attributes.position.needsUpdate = true;
    if (settings.quality === 'auto' && frames % 240 === 0 && average > 28) { settings.quality = 'low'; rebuild(); }
  }
  raf = requestAnimationFrame(tick);
  function configure(patch = {}) {
    if (typeof patch.enabled === 'boolean') settings.enabled = patch.enabled;
    if (['auto','low','balanced','high'].includes(patch.quality)) settings.quality = patch.quality;
    if (Number.isFinite(patch.intensity)) settings.intensity = Math.max(0, Math.min(1, patch.intensity));
    if (desiredCount() !== count) rebuild();
    apply();
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
    return { ...settings };
  }
  function dispose() {
    cancelAnimationFrame(raf);
    if (!authoredFog && scene.fog === fog) scene.fog = null;
    scene.remove(group); geometry.dispose(); material.dispose();
    delete window.tfTier4Atmosphere;
  }
  window.tfTier4Atmosphere = Object.freeze({ configure, get settings() { return { ...settings }; }, dispose });
}());
// TF_TIER4_ATMOSPHERE_V1_END
