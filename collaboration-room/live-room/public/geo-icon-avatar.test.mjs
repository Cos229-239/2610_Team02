import test from 'node:test';
import assert from 'node:assert/strict';
import {silhouetteGrid,buildIconReliefGeometry,ICON_GEOMETRY_LIMITS} from './geo-icon-avatar.mjs';
test('transparent icon yields actual alpha contour, no invented body geometry',()=>{
 const rgba=new Uint8Array(16*16*4);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
  rgba[(y*16+x)*4+3]=x>=5&&x<=10&&y>=3&&y<=12?255:0;
 }
 const s=silhouetteGrid(rgba,16,16,{resolution:16});
 assert.equal(s.sourceShape,'alpha');
 assert.equal(s.silhouetteMeasured,true);
 assert.equal(s.cells,60);
 class BufferGeometry{setAttribute(name,attribute){this[name]=attribute;}computeVertexNormals(){this.normalsComputed=true;}}
 class Float32BufferAttribute{constructor(values,items){this.array=values;this.itemSize=items;}}
 const THREE={BufferGeometry,Float32BufferAttribute};
 const {geometry,report}=buildIconReliefGeometry(THREE,s);
 assert.ok(report.triangles>120&&report.triangles<2000);
 assert.ok(report.triangles<=ICON_GEOMETRY_LIMITS.maxTriangles);
 assert.equal(geometry.position.array.length,report.triangles*9);
 assert.equal(geometry.uv.array.length,report.triangles*6);
 assert.equal(geometry.normalsComputed,true);
 assert.equal(report.bodyRigged,false);
 assert.equal(report.depthMeters,null);
});
test('opaque portrait has explicitly inferred icon crop, not false person segmentation',()=>{
 const rgba=new Uint8Array(16*16*4);rgba.fill(255);
 const s=silhouetteGrid(rgba,16,16,{resolution:16});
 assert.equal(s.sourceShape,'circular icon crop');
 assert.equal(s.silhouetteMeasured,false);
 assert.ok(s.cells<256&&s.cells>100);
 assert.throws(()=>silhouetteGrid(rgba,16,16,{resolution:64}),/resolution/);
});
