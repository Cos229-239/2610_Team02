'use strict';
// Express 5/4 bridge for an existing authenticated collaboration-room server.
// No dependency is installed, no new port, no bypass of existing auth/session.
// Call only from a host that ALREADY uses Express and provides auth middleware.
// The Node HTTP shared-server remains the canonical inventory authority.
const {investigate}=require('./azure-flow-intelligence');
function mountExpress(app,{authenticate,requireMember,loadInventory,readRevision}={}){
  if(!app||typeof app.post!=='function'||typeof authenticate!=='function'||
     typeof requireMember!=='function'||typeof loadInventory!=='function'||
     typeof readRevision!=='function')throw Error('Express host with authenticators and readers required');
  app.post('/api/azure-flow-bridge/research',authenticate,requireMember,async(req,res)=>{
    res.set('Cache-Control','no-store');
    const body=req.body;
    if(!body||Array.isArray(body)||Object.keys(body).sort().join(',')!=='allowPublic,question'||
       typeof body.allowPublic!=='boolean')
      return res.status(400).json({error:'Question and explicit public-search setting required.'});
    // Express host must enforce same-origin request header, JSON body size and CSRF.
    if(req.get('x-towerflow-request')!=='1'||req.get('origin')!==req.protocol+'://'+req.get('host'))
      return res.status(403).json({error:'Same-origin research request required.'});
    try {
      const inventory=await loadInventory(req);
      const revision=await readRevision(req);
      const result=await investigate(body.question,{state:inventory,revision,
        allowPublic:body.allowPublic});
      return res.status(200).json(result);
    } catch(error){
      return res.status(error.status===400?400:503).json({error:error.status===400?
        error.message:'Research unavailable; no business state changed.'});
    }
  });
  return {mounted:true,execution:'READ_ONLY',auth:'HOST_ENFORCED',
    note:'Optional Express bridge only. Does not own sessions, persist data or replace the canonical Node HTTP server.'};
}
module.exports={mountExpress};
