"use strict";
// Isolated local preview of tracked TowerFlow assets, never of the private multiplayer host.
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const ROOT=path.resolve(__dirname,"..","TowerFlow");
const TYPES={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg"};
function resolveAsset(url){
  let p;
  try{p=decodeURIComponent(new URL(url,"http://localhost").pathname);}
  catch{return null;}
  if(p.includes("\0")||p.includes("\\")||p.split("/").includes(".."))return null;
  const resolved=path.resolve(ROOT,"."+ (p==="/"?"/index.html":p));
  return resolved.startsWith(ROOT+path.sep)?resolved:null;
}
function serve(req,res){
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if(!["GET","HEAD"].includes(req.method)){res.writeHead(405);return res.end("Method not allowed");}
  const file=resolveAsset(req.url);
  if(!file){res.writeHead(403);return res.end("Forbidden");}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);return res.end("Not found");}
    res.writeHead(200,{"Content-Type":TYPES[path.extname(file)]||"application/octet-stream"});
    if(req.method==="HEAD")return res.end();
    fs.createReadStream(file).on("error",()=>{res.destroy();}).pipe(res);
  });
}
function start({host="127.0.0.1",port=5187}={}){
  if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error("Port 1024-65535 required");
  const server=http.createServer(serve);
  server.listen(port,host,()=>console.log("TowerFlow isolated portfolio preview listening on http://"+host+":"+port));
  return server;
}
if(require.main===module)start({port:Number(process.env.TF_PREVIEW_PORT||5187)});
module.exports={resolveAsset,serve,start};
