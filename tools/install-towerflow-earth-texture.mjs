// TOWERFLOW_NASA_BLUE_MARBLE_INSTALL_V1
// Stages NASA Blue Marble imagery under the existing, same-origin TowerFlow
// static assets. Never restarts Node, changes permissions, executes user code,
// modifies Git history or contacts anything except the fixed NASA asset URL.
import {readFile,writeFile,mkdir,rename,rm} from "node:fs/promises";
import {existsSync} from "node:fs";
import {join,resolve} from "node:path";
import {homedir} from "node:os";
import {randomUUID,createHash} from "node:crypto";
const SOURCE="https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png";
const ROOT=join(homedir(),"Desktop","Towerflow_Team02_Private_Invite_Room","Towerflow_Collaboration_Room");
const DEST=join(ROOT,"public","towerflow","assets","earth-blue-marble.png");
export function verifyPng(buf){
 if(!Buffer.isBuffer(buf)||buf.length<50000||buf.length>7000000)throw Error("NASA image size outside expected bounds");
 if(buf.toString("hex",0,8)!=="89504e470d0a1a0a"||buf.toString("ascii",12,16)!=="IHDR")
  throw Error("Unexpected image file format");
 const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20);
 if(width!==2048||height!==1024)throw Error("Unexpected NASA image dimensions: "+width+"x"+height);
 if(buf.toString("ascii",buf.length-8,buf.length-4)!=="IEND")
  throw Error("NASA image missing PNG end marker");
 return {width,height,sha256:createHash("sha256").update(buf).digest("hex")};
}
export async function install({fetchFn=globalThis.fetch,path=DEST}={}){
 if(existsSync(path)){
  const result=verifyPng(await readFile(path));
  console.log("BLUE MARBLE: existing verified 2048x1024 asset preserved. SHA256 "+result.sha256);
  return result;
 }
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
 let bytes;
 try{
  const response=await fetchFn(SOURCE,{signal:controller.signal,redirect:"follow",headers:{"Accept":"image/png"}});
  const final=new URL(response.url);
  if(!response.ok||final.protocol!=="https:"||final.hostname!=="svs.gsfc.nasa.gov")
   throw Error("NASA download blocked: untrusted response origin or status");
  if(!String(response.headers.get("content-type")||"").toLowerCase().includes("image/png"))
   throw Error("NASA download returned unexpected content type");
  const size=Number(response.headers.get("content-length")||"0");
  if(size>7000000)throw Error("NASA image exceeds asset budget");
  bytes=Buffer.from(await response.arrayBuffer());
 }finally{clearTimeout(timer);}
 const verified=verifyPng(bytes);
 await mkdir(resolve(path,".."),{recursive:true});
 const staged=path+"."+randomUUID()+".tmp";
 try{await writeFile(staged,bytes,{flag:"wx"});await rename(staged,path);}
 finally{await rm(staged,{force:true});}
 console.log("BLUE MARBLE: installed locally, 2048x1024, SHA256 "+verified.sha256);
 return verified;
}
if(process.argv[1]&&process.argv[1].replaceAll("\\","/").endsWith("/install-towerflow-earth-texture.mjs")){
 const mode=process.argv.slice(2);
 if(mode.length!==1||!["--dry-run","--apply"].includes(mode[0])){
  console.error("Use --dry-run or --apply");process.exitCode=1;
 }else if(mode[0]==="--dry-run"){
  console.log("BLUE MARBLE dry-run: NASA/Goddard SVS 2048x1024, local target "+DEST);
  if(existsSync(DEST)){
   try{verifyPng(await readFile(DEST));console.log("Existing texture: verified");}
   catch(e){console.error(e.message);process.exitCode=1;}
  }else console.log("Texture absent: apply will download fixed NASA source.");
 }else{
  try{await install();}catch(e){console.error("BLUE MARBLE INSTALL BLOCKED:",e.message);process.exitCode=1;}
 }
}