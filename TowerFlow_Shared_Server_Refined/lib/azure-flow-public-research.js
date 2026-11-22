'use strict';
// An optional, explicitly user-authorized research adapter. Never sends inventory,
// account data, session secrets, markdown knowledge or prompts to outside model APIs.
const crypto=require('node:crypto');
const ORIGIN='https://en.wikipedia.org';
const MAX=100000;
function validateTopic(topic) {
  if(typeof topic!=='string'||topic.trim().length<2||topic.length>160||
    /[\x00-\x1f\x7f]/.test(topic))throw Object.assign(Error('Invalid public research topic'),{status:400});
  return topic.trim();
}
async function publicSearch(topic,{fetchImpl=fetch,now=Date.now}={}){
  const validated=validateTopic(topic);
  const url=new URL('/w/api.php',ORIGIN);
  for(const [key,value] of Object.entries({
    action:'query',generator:'search',gsrsearch:validated,gsrlimit:'3',
    prop:'extracts|info',exintro:'1',explaintext:'1',inprop:'url',format:'json',
    redirects:'1',formatversion:'2'
  }))url.searchParams.set(key,value);
  try{
    const response=await fetchImpl(url.toString(),{
      headers:{Accept:'application/json','User-Agent':'TowerFlowAzureResearch/0.1 (public background research)'},
      redirect:'error',signal:AbortSignal.timeout(6500)
    });
    if(!response.ok)throw Error('PROVIDER_HTTP_'+response.status);
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength>MAX)throw Error('PROVIDER_OVERSIZED');
    const json=JSON.parse(Buffer.from(bytes).toString('utf8'));
    const pages=Array.isArray(json?.query?.pages)?json.query.pages:[];
    const hits=[];
    for(const item of pages.slice(0,3)){
      if(typeof item.title!=='string'||typeof item.extract!=='string')continue;
      const excerpt=item.extract.replace(/\s+/g,' ').trim().slice(0,1500);
      if(excerpt.length<40)continue;
      const documentUrl=typeof item.fullurl==='string'&&
        item.fullurl.startsWith(ORIGIN+'/wiki/')?item.fullurl:null;
      if(!documentUrl)continue;
      const hash=crypto.createHash('sha256').update(excerpt).digest('hex');
      hits.push({sourceId:'wiki-'+item.pageid+'-'+hash.slice(0,10),
        kind:'public_reference',source:'English Wikipedia (community-edited)',
        title:item.title,url:documentUrl,excerpt,sha256:hash,retrievedAt:new Date(now()).toISOString(),
        limitations:'Background only; community-edited, not an official financial filing or live market data.'});
    }
    return {status:hits.length?'SOURCES_FOUND':'NO_MATCH',hits,provider:ORIGIN,
      limitations:'Background context only. No stock prices, verified financial claims, or company affiliation inferred.'};
  }catch{
    return {status:'PROVIDER_UNAVAILABLE',hits:[],provider:ORIGIN,
      limitations:'Public provider unavailable or content could not be validated; no research facts were invented.'};
  }
}
module.exports={ORIGIN,validateTopic,publicSearch};
