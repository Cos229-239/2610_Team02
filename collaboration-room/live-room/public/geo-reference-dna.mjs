// Source-backed reference contracts, not invented 3D landmarks.
// Each numeric value declares its real-world units and provenance.
export const GEO_REFERENCE_DNA_VERSION='1.0.0';
export const juneauDNA=Object.freeze({
 id:'alaska',state:'Alaska',capital:'Juneau',region:'southeast Alaska',
 geographicAnchor:{latitude:58.3020694,longitude:-134.4104388,
  meaning:'Vega capital coordinate near the Alaska State Capitol, not a view camera',
  source:'https://github.com/vega/vega/blob/main/docs/data/us-state-capitals.json'},
 referenceCamera:{latitude:58.289373,longitude:-134.400816,
  headingDegrees:315,headingConvention:'clockwise from true north as recorded on Commons',
  imageTaken:'2009-08-04',heightMeters:null,focalLengthMm:null,
  status:'geotagged source; view altitude and lens unknown',
  source:'https://commons.wikimedia.org/wiki/File:Downtown_Juneau_and_Mount_Juneau,_Alaska_from_Gastineau_Channel.jpg'},
 geographicSystem:{horizontal:'WGS84 lat/lon',vertical:'local terrain datum NOT YET ESTABLISHED',
  geometryUnits:'meters',screenToMeters:'requires camera calibration'},
 realElements:[
  {name:'Gastineau Channel',kind:'tidal waterway',level:'ground/water',source:'https://www.travelalaska.com/destinations/cities-towns/juneau'},
  {name:'Downtown Juneau',kind:'dense mixed-era townsite',level:'near/mid',source:'https://juneau.org/community-development/hsd-downtown-historic-district'},
  {name:'Mount Juneau',kind:'forested mountain',level:'far/horizon',heightMeters:null,
   source:'https://library.oarcloud.noaa.gov/noaa_documents.lib/NESDIS/NGDC/TM/NOAA_TM_NESDIS_NGDC_53.pdf'},
  {name:'Mount Roberts',kind:'forested mountain',level:'far/horizon',heightMeters:null,
   source:'https://www.travelalaska.com/destinations/cities-towns/juneau'},
  {name:'Alaska State Capitol',address:'120 Fourth Street, Juneau, AK',kind:'civic building',
   constructionCompleted:1931,hasDome:false,measuredHeightMeters:null,measuredFootprintMeters:null,
   source:'https://alaskacapitol.gov/wp-content/uploads/2024/07/Capitol-Brochure.pdf'}
 ],
 geometryEvidence:{terrainRaster:null,footprints:'OSM only when available',
  buildingHeights:'explicit measured heights only; levels must be marked estimated',
  roofs:'not measured',windows:'not measured',facades:'historical description available, survey required',
  waterSurfaceElevationMeters:null,tidalState:'unknown'},
 qualityGate:{sourcePhotosRequired:2,matchedExteriorCameraRequired:true,
  terrainElevationRequired:true,buildingGeometryRequired:true,
  actualPhotogrammetryVerified:false,status:'REFERENCE_ONLY'}
});
export function referenceLevel({cameraHeightMeters,groundElevationMeters}){
 // Camera height is absolute eye elevation in the SAME vertical datum as ground.
 // Do not insert a guessed person's 1.65 m eye-height correction.
 if(!Number.isFinite(cameraHeightMeters)||!Number.isFinite(groundElevationMeters)){
  return {storiesAboveGround:null,heightAboveGroundMeters:null,certainty:'unknown'};
 }
 const meters=cameraHeightMeters-groundElevationMeters;
 return {storiesAboveGround:null,heightAboveGroundMeters:meters,
  certainty:'meters are known; story index requires measured floor elevations'};
}
export function validationReport(dna){
 const claims=[];
 for(const feature of dna.realElements){
  claims.push({name:feature.name,source:feature.source,
   geometryVerified:Number.isFinite(feature.measuredHeightMeters)||
   Number.isFinite(feature.heightMeters)});
 }
 const gate=dna.qualityGate;
 return {location:dna.capital,sourceCoverage:claims.length,
  claims,photorealVerified:Boolean(gate.actualPhotogrammetryVerified),
  geometryReady:Boolean(gate.terrainElevationRequired===false&&
   gate.buildingGeometryRequired===false)};
}
