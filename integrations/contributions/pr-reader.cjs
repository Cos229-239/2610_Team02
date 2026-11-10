"use strict";
// Member-authenticated, read-only GitHub PR metadata. Never merges, closes or
// deletes PRs; no browser token. Repository allowlist is hard-coded.
function normalizePR(raw){
 const n=raw?.number,sha=raw?.head?.sha,author=raw?.user?.login;
 if(!Number.isSafeInteger(n)||n<1||typeof author!=="string"||!/^[A-Za-z0-9-]{1,39}$/.test(author)||
  typeof sha!=="string"||!/^[a-f0-9]{40}$/.test(sha))return null;
 const expected="https://github.com/Cos229-239/2610_Team02/pull/"+n;
 if(raw.html_url!==expected)return null;
 return {pullRequest:n,author,title:String(raw.title||"Untitled").slice(0,180),
  contribution:String(raw.title||"Proposed change").slice(0,140),url:expected,sha,
  source:"GitHub API (server-to-server)",reviewStatus:raw.state==="open"?"OPEN":"CLOSED / REVIEW HISTORY",
  previewStatus:"Source diff available; use isolated pinned PR preview"};
}
function createContributionHandler({token=process.env.TOWERFLOW_GITHUB_READ_TOKEN,fetchFn=globalThis.fetch}={}){
 return async function handle(req,res){
  res.set("Cache-Control","no-store");
  res.set("X-Content-Type-Options","nosniff");
  if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
  if(!req.session?.user?.login||!req.permission)return res.status(403).json({error:"GitHub member required"});
  if(!token)return res.status(503).json({status:"NOT_CONNECTED",message:"Server-side GitHub PR read credential missing"});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  try{
   const r=await fetchFn("https://api.github.com/repos/Cos229-239/2610_Team02/pulls?state=all&per_page=30",{
    headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token,
     "User-Agent":"TowerFlow-Contribution-Review"},signal:controller.signal,redirect:"error"});
   if(!r.ok)throw Error("GitHub PR provider unavailable");
   const list=await r.json();
   if(!Array.isArray(list))throw Error("Invalid GitHub PR response");
   return res.json({status:"CONNECTED",source:"GitHub server-side API",records:list.map(normalizePR).filter(Boolean)});
  }catch{return res.status(502).json({status:"UPSTREAM_UNAVAILABLE",message:"PR metadata unavailable; use GitHub directly."});}
  finally{clearTimeout(timer);}
 };
}
module.exports={createContributionHandler,normalizePR};
