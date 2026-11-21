// Meter-accurate geographic transformation and floor/horizon contracts.
// WGS84 ECEF -> local East, North, Up; altitudes MUST share ellipsoid datum.
// Longitude/latitude in degrees; altitudes and output in meters.
const WGS84_A=6378137.0;
const WGS84_F=1/298.257223563;
const WGS84_E2=WGS84_F*(2-WGS84_F);
const rad=deg=>deg*Math.PI/180;
export function wgs84ECEF({latitude,longitude,altitudeMeters}){
 if(!Number.isFinite(latitude)||Math.abs(latitude)>90||
    !Number.isFinite(longitude)||Math.abs(longitude)>180||
    !Number.isFinite(altitudeMeters))
  throw Error('WGS84 reference needs latitude, longitude and measured ellipsoidal altitude');
 const p=rad(latitude),l=rad(longitude),sp=Math.sin(p),cp=Math.cos(p);
 const N=WGS84_A/Math.sqrt(1-WGS84_E2*sp*sp);
 return {x:(N+altitudeMeters)*cp*Math.cos(l),
         y:(N+altitudeMeters)*cp*Math.sin(l),
         z:(N*(1-WGS84_E2)+altitudeMeters)*sp};
}
export function enuFromWGS84(point,origin){
 const from=wgs84ECEF(origin),to=wgs84ECEF(point),dx=to.x-from.x,
 dy=to.y-from.y,dz=to.z-from.z;
 const lat=rad(origin.latitude),lon=rad(origin.longitude);
 const sinLat=Math.sin(lat),cosLat=Math.cos(lat),sinLon=Math.sin(lon),cosLon=Math.cos(lon);
 return Object.freeze({
  eastMeters:-sinLon*dx+cosLon*dy,
  northMeters:-sinLat*cosLon*dx-sinLat*sinLon*dy+cosLat*dz,
  upMeters:cosLat*cosLon*dx+cosLat*sinLon*dy+sinLat*dz,
  measuredDatum:'WGS84 ellipsoidal (same vertical datum required)'
 });
}
export function storyAtElevation(eyeElevationMeters,floorElevationsMeters){
 if(!Number.isFinite(eyeElevationMeters)||!Array.isArray(floorElevationsMeters)||
  floorElevationsMeters.length===0||floorElevationsMeters.some(x=>!Number.isFinite(x)))
  return {floorIndex:null,reason:'missing measured eye/floor elevations'};
 for(let i=1;i<floorElevationsMeters.length;i++){
  if(floorElevationsMeters[i]<=floorElevationsMeters[i-1])
   throw Error('Floor elevations must be strictly ascending meters in same datum');
 }
 if(eyeElevationMeters<floorElevationsMeters[0])
  return {floorIndex:null,reason:'camera below first surveyed floor'};
 let index=0;
 for(let i=0;i<floorElevationsMeters.length;i++){
  if(eyeElevationMeters>=floorElevationsMeters[i])index=i;
 }
 return {floorIndex:index,reason:'measured, ground index=0; facade numbering requires survey'};
}
export function screenSpaceErrorPx({distanceMeters,geometricErrorMeters,viewportHeightPx,verticalFOVDeg}){
 if(![distanceMeters,geometricErrorMeters,viewportHeightPx,verticalFOVDeg].every(Number.isFinite)||
    distanceMeters<=0||geometricErrorMeters<0||viewportHeightPx<=0||
    verticalFOVDeg<=0||verticalFOVDeg>=179)
  throw Error('LOD error requires measured distance/geometry error and calibrated FOV');
 return geometricErrorMeters*viewportHeightPx/
  (2*Math.tan(rad(verticalFOVDeg)/2)*distanceMeters);
}
export const integrityGates=Object.freeze({
 crs:'WGS84',worldUnit:'meter',verticalDatum:'ellipsoid if measured; else unknown',
 noDerivedStoriesWithoutFloorSlabs:true,nearMidFarMethod:'screen-space projection error',
 requiresPhotoCameraCalibration:true
});
