'use strict';
// Generic, free business-entity research. No hardcoded companies, LLM, SEC identity,
// credential collection or market-price guesses. Community-sourced metadata ONLY.
const crypto=require('node:crypto');
const BASE='https://www.wikidata.org';
function subjects(input){
  if(typeof input!=='string'||input.length<2||input.length>280||/[\x00-\x1f\x7f]/.test(input))
    throw Object.assign(Error('Enter a business name or research question (2–280 characters).'),{status:400});
  const clean=input.trim().replace(/[?!]+$/,'')
    .replace(/^(?:please\s+)?(?:investigate|research|analy[sz]e|compare|look\s+into|tell\s+me\s+about|what\s+is|who\s+is|give\s+me\s+(?:information\s+on|an\s+overview\s+of))\s+/i,'')
    .replace(/^(?:the\s+)?(?:company|business|corporation|firm)\s+/i,'')
    .replace(/\s+(?:as\s+(?:a|an)\s+(?:business|company)|stock|company|business)\s*$/i,'');
  // Split explicit comparison/list targets, not arbitrary query keywords.
  const parts=clean.split(/\s+(?:and|versus|vs\.?|compared\s+(?:to|with))\s+|\s*[,;]\s*/i)
    .map(s=>s.trim()).filter(Boolean);
  if(!parts.length||parts.length>3||parts.some(p=>p.length<2||p.length>100))
    throw Object.assign(Error('Investigate one to three named businesses per request.'),{status:400});
  return [...new Set(parts)];
}
async function request(url,{fetchImpl=fetch,now=Date.now()}={}){
  if(!url.startsWith(BASE+'/w/api.php?'))throw Error('INVALID_SOURCE_HOST');
  const response=await fetchImpl(url,{method:'GET',redirect:'error',
    headers:{Accept:'application/json','User-Agent':'TowerFlowAzureCompanyResearch/1.0 (read-only public entity lookup)'},
    signal:AbortSignal.timeout(7500)});
  if(!response.ok)throw Error('PUBLIC_SOURCE_HTTP_'+response.status);
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength>200000)throw Error('SOURCE_PAYLOAD_TOO_LARGE');
  return JSON.parse(Buffer.from(buffer).toString('utf8'));
}
function urlFor(params){
  const url=new URL('/w/api.php',BASE);
  for(const [key,value] of Object.entries({...params,format:'json'}))url.searchParams.set(key,String(value));
  return url.toString();
}
function statements(entity,property){
  const claims=entity?.claims?.[property];
  if(!Array.isArray(claims))return [];
  return claims.filter(c=>c.rank!=='deprecated'&&c.mainsnak?.snaktype==='value')
    .map(c=>c.mainsnak.datavalue?.value).filter(Boolean);
}
const itemId=s=>typeof s==='string'&&/^Q[1-9][0-9]{0,12}$/.test(s);
function website(entity){
  return statements(entity,'P856').find(x=>typeof x==='string'&&/^https:\/\/[^\s]+$/i.test(x))||null;
}
function typed(entity){
  const kinds=statements(entity,'P31').map(x=>x.id).filter(itemId);
  // Broad classes: business, enterprise, public company, organization, brand, cooperative,
  // bank, company, private company, or subsidiary. Not a fixed firm name allowlist.
  const broad=new Set(['Q4830453','Q6881511','Q891723','Q783794','Q167037',
    'Q43229','Q783794','Q166142','Q1616075','Q16917','Q507619']);
  const description=entity?.descriptions?.en?.value||'';
  return kinds.some(id=>broad.has(id))||
    /\b(company|corporation|conglomerate|manufacturer|business|enterprise|bank|retailer|technology firm|multinational|subsidiary|airline|automaker|automotive group|brand)\b/i.test(description);
}
function observation(entity,query,now){
  const id=entity?.id;
  if(!itemId(id)||!typed(entity))return null;
  const label=entity.labels?.en?.value;
  if(typeof label!=='string'||label.length>160)return null;
  const description=entity.descriptions?.en?.value||'No English description available.';
  const site=website(entity);
  const inception=statements(entity,'P571').find(x=>typeof x?.time==='string')?.time||null;
  const ticker=statements(entity,'P249').filter(x=>typeof x==='string').slice(0,3);
  const listing=ticker.length?'Exchange ticker identifiers: '+ticker.join(', ')+'. ':'';
  const excerpt=(label+' — '+description+'. '+
    (inception?'Recorded inception: '+inception.slice(1,11)+'. ':'')+
    listing+(site?'Official website identifier: '+site+'. ':'')+
    'Wikidata is community-maintained; verify important assertions independently.').slice(0,1500);
  const sha256=crypto.createHash('sha256').update(excerpt).digest('hex');
  return {sourceId:'wikidata-'+id+'-'+sha256.slice(0,10),kind:'public_reference',
    source:'Wikidata (community-maintained)',title:label,
    url:BASE+'/wiki/'+id,excerpt,sha256,retrievedAt:new Date(now).toISOString(),
    entityId:id,description,officialWebsite:site,sourceQuery:query,
    limitations:'Community-maintained entity record. This is neither independently verified financial performance, live securities pricing, nor an investment recommendation.'};
}
async function researchBusiness(question,{fetchImpl=fetch,now=Date.now(),requester=request}={}){
  const queries=subjects(question),hits=[],outcomes=[];
  for(const query of queries){
    try{
      const found=await requester(urlFor({action:'wbsearchentities',search:query,
        language:'en',uselang:'en',type:'item',limit:'5'}),{fetchImpl,now});
      const results=Array.isArray(found.search)?found.search:[];
      const names=results.filter(x=>itemId(x.id)&&typeof x.label==='string').slice(0,5);
      if(!names.length){outcomes.push({query,status:'NO_MATCH'});continue}
      const ids=names.map(x=>x.id);
      const payload=await requester(urlFor({action:'wbgetentities',ids:ids.join('|'),
        props:'labels|descriptions|claims',languages:'en'}),{fetchImpl,now});
      const candidates=names.map(x=>observation(payload?.entities?.[x.id],query,now)).filter(Boolean);
      if(!candidates.length){outcomes.push({query,status:'NO_BUSINESS_ENTITY_MATCH'});continue}
      // Only auto-resolve when exact first-label or alias match is observed.
      // Otherwise label ambiguity; do not assert that any fuzzy result is the user target.
      const searchMatches=new Map(names.map(x=>[x.id,x]));
      const exact=candidates.filter(x=>{
        const item=searchMatches.get(x.entityId);
        return x.title.toLocaleLowerCase('en')===query.toLocaleLowerCase('en')||
          (typeof item?.match?.text==='string'&&
            item.match.text.toLocaleLowerCase('en')===query.toLocaleLowerCase('en'));
      });
      if(exact.length!==1){
        outcomes.push({query,status:'AMBIGUOUS_OR_NOT_EXACT',candidates:candidates.map(x=>({title:x.title,id:x.entityId}))});
        continue;
      }
      hits.push(exact[0]);
      outcomes.push({query,status:'ENTITY_MATCHED',id:exact[0].entityId});
    }catch(e){
      outcomes.push({query,status:'SOURCE_UNAVAILABLE',reason:String(e.message).slice(0,90)});
    }
  }
  return {status:hits.length?'SOURCES_FOUND':'NO_MATCH',hits,outcomes,requested:queries,
    note:'Company identities and background attributes from Wikidata; no earnings, stock quotes, or recent news verified. If unavailable, no company facts are invented.'};
}
module.exports={BASE,subjects,urlFor,typed,observation,researchBusiness};
