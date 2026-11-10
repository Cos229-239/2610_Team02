"use strict";
// Source-linked contributor review cards, no delete endpoint and no fake preview.
// Manifest is static and explicitly non-authoritative for current PR state.
(async function(){
 const root=document.getElementById("tfContributorCards");
 if(!root)return;
 function el(tag,text){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}
 function button(label,url){
  const a=el("a",label);a.className="btn secondary";a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a;
 }
 function card(row){
  if(!row||!Number.isInteger(row.pullRequest)||row.pullRequest<=0||
     !/^[A-Za-z0-9-]{1,39}$/.test(row.author)||typeof row.title!=="string")return;
  const expected="https://github.com/Cos229-239/2610_Team02/pull/"+row.pullRequest;
  if(row.url!==expected)return;
  const article=el("article");article.className="panel tf-contribution-card";
  const head=el("h3",row.author+" : "+row.contribution);
  const p=el("p",row.title);
  const status=el("small","SOURCE: "+row.source+" • "+row.reviewStatus+" • NO LIVE PREVIEW ASSERTED");
  const links=el("div");links.className="tf-contribution-links";
  links.append(button("Review exact source change ↗",expected+"/files"),
    button("Review contribution and comments ↗",expected),
    button("Check pinned commits ↗",expected+"/commits"));
  const note=el("p","To preview the actual contribution without merging, use the isolated PR preview command described below. Only the author or GitHub-authorized repository maintainers can change their PR or source.");
  article.append(head,p,status,links,note);root.append(article);
 }
 try{
  const res=await fetch("contributions.json",{cache:"no-store",credentials:"same-origin"});
  if(!res.ok)throw Error("Manifest unavailable");
  const data=await res.json();
  if(data.schemaVersion!==1||!Array.isArray(data.records))throw Error("Invalid manifest");
  data.records.forEach(card);
  if(!root.children.length)throw Error("No reviewed contributions");
 }catch{
  root.append(el("p","Contribution registry unavailable. Use the repository's authenticated GitHub pull-request list to review source and author history."));
 }
 const help=el("details");
 const summary=el("summary","How to preview a PR without touching the live room");
 const p=el("p","On the Windows host, from your Team2 checkout, run this command with the exact PR number. It fetches the pinned PR commit into a separate worktree and serves TowerFlow locally on port 5188. Close the PowerShell session to stop the preview; the contribution remains in GitHub.");
 const cmd=el("code","& '.\\tools\\preview-towerflow-contribution.ps1' -PullRequest 8");
 const pre=el("pre");pre.append(cmd);help.append(summary,p,pre);root.append(help);
}());
