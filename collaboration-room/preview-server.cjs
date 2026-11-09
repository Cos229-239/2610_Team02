"use strict";
const http=require("node:http"), fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,".."); // Serve only repository collaboration-room subtree.
const allowed=path.resolve(__dirname);
const port=Number(process.env.FOUNDRY_PREVIEW_PORT||4174);
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".md":"text/plain; charset=utf-8"};
http.createServer((req,res)=>{
  if(req.method!=="GET"&&req.method!=="HEAD"){res.writeHead(405);return res.end();}
  let decoded;
  try{decoded=decodeURIComponent(new URL(req.url,"http://localhost").pathname);}catch{res.writeHead(400);return res.end();}
  let name=decoded==="/" ? "/public/index.html" : decoded;
  const file=path.resolve(allowed,"."+name);
  if(!(file===allowed||file.startsWith(allowed+path.sep))){res.writeHead(403);return res.end();}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404);return res.end("Not found");}
    res.setHeader("Content-Type",mime[path.extname(file)]||"application/octet-stream");
    res.setHeader("X-Content-Type-Options","nosniff");
    res.setHeader("Cache-Control","no-store");
    if(req.method==="HEAD")return res.end();
    fs.createReadStream(file).pipe(res);
  });
}).listen(port,"127.0.0.1",()=>console.log("Towerflow Foundry movement preview: http://localhost:"+port));
