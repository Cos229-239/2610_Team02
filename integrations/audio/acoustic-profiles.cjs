'use strict';
// Acoustic configuration only: no UI, autoplay, TTS engine, or claims of brain entrainment.
// Audio renderer consumes these profiles; all media must be licensed or user-supplied.
const PROFILES = Object.freeze({
  focus: Object.freeze({label:'Focus', layers:['soft_air','distant_forest'], targetLufs:-25, crossfadeSeconds:5, voiceDuckDb:-12}),
  forest: Object.freeze({label:'Forest Meditation', layers:['forest_bed','birds_sparse','wind_leaves','acoustic_flute'], targetLufs:-26, crossfadeSeconds:8, voiceDuckDb:-12}),
  yoga: Object.freeze({label:'Yoga', layers:['acoustic_flute','soft_drone','water_distant'], targetLufs:-27, crossfadeSeconds:8, voiceDuckDb:-12}),
  psychedelic: Object.freeze({label:'Psychedelic Ambient', layers:['evolving_pad','spatial_texture','forest_bed'], targetLufs:-25, crossfadeSeconds:10, voiceDuckDb:-12})
});
function validateProfile(name) {
  if (typeof name !== 'string' || !Object.prototype.hasOwnProperty.call(PROFILES,name)) throw new RangeError('Unknown acoustic profile');
  return PROFILES[name];
}
function clampVolume(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Volume must be finite');
  return Math.max(0,Math.min(1,value));
}
function chooseGreetingAsset(assets,locale='en-US') {
  if (!Array.isArray(assets)) throw new TypeError('Expected greeting assets');
  // Recorded or neural speech must be explicitly supplied; never silently fall back to OS speech.
  return assets.find(a => a && a.locale===locale && ['recorded','neural'].includes(a.kind) &&
    typeof a.url==='string' && /^\/assets\/audio\/[a-z0-9/_-]+\.(mp3|ogg|wav)$/i.test(a.url)) || null;
}
module.exports={PROFILES,validateProfile,clampVolume,chooseGreetingAsset};
