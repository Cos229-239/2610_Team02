'use strict';
const {randomUUID} = require('node:crypto');

function mountDemo(app,{auth,ensureMember,sameOrigin,now=Date.now}) {
    const root='/api/azure-bridge/demo';
    const memberships=new Map();
    let live,expiry;
    function clear() { clearTimeout(expiry); live=null; }
    function current() { if (live && now()>=live.until) clear(); return live; }
    function touch() {
        clearTimeout(expiry); live.until=now()+20000;
        expiry=setTimeout(clear,20000); expiry.unref();
    }
    function member(req,res,next) {
        // Per-frame traffic uses a short membership lease tied to the authenticated session.
        const id=req.sessionID;
        if (memberships.get(id)>now()) return next();
        ensureMember(req,res,()=>{
            if (memberships.size>=128) memberships.delete(memberships.keys().next().value);
            memberships.set(id,now()+45000);next();
        });
    }
    function presenter(req,res,next) {
        const demo=current();
        if (!demo || demo.owner!==req.sessionID || demo.id!==req.body?.id) return res.sendStatus(409);
        next();
    }
    app.post(root+'/start',auth,sameOrigin,member,(req,res)=>{
        if (current()) return res.status(409).json({error:'Another window is already on display.'});
        live={id:randomUUID(),owner:req.sessionID,login:req.session.user.login,version:0,last:-Infinity,frame:null};
        touch();res.json({id:live.id});
    });
    app.post(root+'/frame',auth,sameOrigin,member,presenter,(req,res)=>{
        const jpg=req.body?.image;
        if (typeof jpg!=='string' || jpg.length>350000 || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+=*$/u.test(jpg)) return res.sendStatus(400);
        if (now()-live.last<650) return res.sendStatus(429);
        live.frame=jpg;live.last=now();live.version++;touch();res.sendStatus(204);
    });
    app.get(root,auth,member,(req,res)=>{
        const demo=current();
        if (!demo) return res.json(null);
        const version=demo.id+'.'+demo.version;
        res.json({login:demo.login,version,image:req.query.after===version?null:demo.frame});
    });
    app.post(root+'/stop',auth,sameOrigin,presenter,(req,res)=>{clear();res.sendStatus(204);});
}
module.exports={mountDemo};
