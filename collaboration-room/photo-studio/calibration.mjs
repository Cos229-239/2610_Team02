/**
 * Photo-to-scene calibration primitives; deterministic, browser/Node portable.
 * No vision AI is implied. No single photo can determine unobserved geometry.
 */
const FINITE = v => typeof v === 'number' && Number.isFinite(v);
const positive = (v, name, max = Number.MAX_SAFE_INTEGER) => {
  if (!FINITE(v) || v <= 0 || v > max) throw new RangeError(name + ' must be a finite, positive number');
  return v;
};
export const RIGHTS = Object.freeze(['owner', 'licensed', 'permission']);
export function requireRights(rights) {
  if (!RIGHTS.includes(rights)) throw new Error('Photo use requires ownership, a valid license, or explicit permission');
  return rights;
}
export function parsePinterestUrl(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  let url;
  try { url = new URL(text); } catch { throw new Error('Pinterest reference is not a URL'); }
  const host = url.hostname.toLowerCase();
  const permitted = host === 'pinterest.com' || host.endsWith('.pinterest.com') || host === 'pin.it';
  if (url.protocol !== 'https:' || !permitted || url.username || url.password) throw new Error('Use an HTTPS Pinterest pin or board link');
  if (!url.pathname || url.pathname === '/') throw new Error('Provide an individual Pinterest pin or board link');
  url.hash = '';
  url.search = '';
  return url.toString();
}
export function validateCamera({ fov = 55, height = 1.65, distance = 6.5, pitch = 16, aspect = 16 / 9 } = {}) {
  for (const [name, val] of Object.entries({fov,height,distance,pitch,aspect})) if (!FINITE(val)) throw new RangeError('Invalid camera parameter: ' + name);
  if (fov < 20 || fov > 110 || height < 0.3 || height > 4 || distance < 1 || distance > 50 || pitch < 1 || pitch > 75 || aspect <= 0 || aspect > 10) throw new RangeError('Camera parameters outside supported photographic calibration range');
  return {fov,height,distance,pitch,aspect};
}
export function focalLengthPixels(imageHeight, verticalFovDegrees) {
  positive(imageHeight, 'Image height');
  if (!FINITE(verticalFovDegrees) || verticalFovDegrees <= 0 || verticalFovDegrees >= 180) throw new RangeError('Invalid field of view');
  return imageHeight / (2 * Math.tan(verticalFovDegrees * Math.PI / 360));
}
export function displayRect(frameW, frameH, imageW, imageH) {
  for (const [n,v] of Object.entries({frameW,frameH,imageW,imageH})) positive(v,n);
  const scale = Math.min(frameW / imageW, frameH / imageH);
  const w = imageW * scale, h = imageH * scale;
  return {left:(frameW-w)/2,top:(frameH-h)/2,width:w,height:h};
}
/** Input x/y are coordinates within the container, not viewport coordinates. */
export function photoContact(x, y, frameW, frameH, imageW, imageH) {
  if (!FINITE(x) || !FINITE(y)) throw new RangeError('Contact point is not finite');
  const r=displayRect(frameW,frameH,imageW,imageH);
  if (x < r.left || y < r.top || x > r.left + r.width || y > r.top + r.height) throw new RangeError('Contact point is outside the photograph');
  const u=(x-r.left)/r.width, v=(y-r.top)/r.height;
  return {u,v,ndcX:2*u-1,ndcY:1-2*v};
}
/** Camera-ray and y=0 floor intersection: only valid with calibrated camera pose. */
export function groundIntersection(origin, direction) {
  for (const [n,p] of Object.entries({origin,direction})) {
    if (!p || !['x','y','z'].every(axis=>FINITE(p[axis]))) throw new TypeError('Invalid ' + n);
  }
  const norm=Math.hypot(direction.x,direction.y,direction.z);
  if (norm < 1e-9) throw new RangeError('Degenerate ray');
  if (origin.y <= 0 || direction.y >= -1e-8) throw new RangeError('Camera ray does not hit the visible floor');
  const t=-origin.y / direction.y;
  if (!Number.isFinite(t) || t <= 0 || t > 500) throw new RangeError('Floor intersection is outside the calibrated range');
  return {x:origin.x+direction.x*t,z:origin.z+direction.z*t};
}
export function validateDimensions({width,depth,height,basis}) {
  for (const [name,val] of Object.entries({width,depth,height})) positive(val,name,50);
  if (basis !== 'measured' && basis !== 'estimated') throw new Error('Identify dimensional basis as measured or estimated');
  return {width,depth,height,basis};
}
export function buildManifest({pinUrl='',photo,rights,camera,contact,dimensions,asset='authored_mesh',sha256=null}) {
  if (!photo || typeof photo.name !== 'string' || !photo.name ||
      !Number.isInteger(photo.width) || !Number.isInteger(photo.height) ||
      photo.width < 1 || photo.height < 1) throw new Error('An actual image reference is required');
  const parsedPin=parsePinterestUrl(pinUrl);
  const validatedRights=requireRights(rights);
  const cam=validateCamera(camera);
  const dims=validateDimensions(dimensions);
  if (!contact || !FINITE(contact.u) || !FINITE(contact.v) ||
      contact.u < 0 || contact.u > 1 || contact.v < 0 || contact.v > 1) throw new Error('A valid observed floor-contact pixel is required');
  if (sha256 !== null && !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid photo SHA-256');
  if (!['authored_mesh','uploaded_glb'].includes(asset)) throw new Error('Unsupported asset provenance');
  return {
    schemaVersion:1, status:'candidate_unverified',
    source:{name:photo.name,width:photo.width,height:photo.height,pinterestReference:parsedPin,rights:validatedRights,sha256},
    camera:{...cam,status:'user_calibrated_not_solved',focalLengthPixels:focalLengthPixels(photo.height,cam.fov)},
    reconstruction:{
      asset,dimensionsMeters:dims,
      observed:{floorContactNormalized:{u:contact.u,v:contact.v}},
      inferred:['camera model until independently calibrated','hidden/rear geometry','occluded surfaces','depth from sparse evidence'],
      geometryStatus:asset==='uploaded_glb'?'imported_not_verified':'parametric_candidate_not_photogrammetry'
    },
    verification:{code:'unverified',pattern:'unverified',preservation:'unverified',heldOutView:'not_supplied',screenshotComparison:'not_run',dimensionError:'unknown'}
  };
}
