'use strict';
// Public *capability status* for the authenticated user, never secrets or credentials.
// Configuration introspection must not initiate provider calls, downloads or mutations.
const {authorized}=require('./azure-flow-capabilities');
const {userAgent}=require('./azure-flow-sec-filings');
function runtimeConfig({isOwner=false,secIdentity=process.env.TOWERFLOW_SEC_USER_AGENT}={}){
  const secReady=Boolean(userAgent(secIdentity));
  return {
    schema:'towerflow.azure-flow.runtime-config/v1',
    core:{enabled:true,researchEndpoint:'/api/azure-flow/research',
      inventoryAnalysisEndpoint:'/api/azure-flow/investigate',
      modelStatusEndpoint:'/api/azure-flow/model-health'},
    research:{defaultMode:'adaptive',externalConsentRequired:true,
      modes:[
        {id:'adaptive',enabled:true,description:'Local, read-only research; external sources require explicit consent.'},
        {id:'official-sec',enabled:secReady,
          description:secReady?'Optional SEC provider configured.':'Optional SEC provider not configured. Core remains available.'}
      ]},
    capabilities:authorized({allowPublic:false,isOwner}).map(x=>({
      id:x.id,scope:x.scope,permission:x.permission
    })),
    note:'Status only: this checks configuration, not source accuracy, model capability or external connectivity.'
  };
}
module.exports={runtimeConfig};
