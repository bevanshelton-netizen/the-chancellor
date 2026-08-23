const rateLimit=require('express-rate-limit');
const store=require('./store');
const {hashSecret,accessCode}=require('./core');

const clean=v=>String(v??'').trim();
const key=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const phone=v=>clean(v).replace(/\D/g,'').replace(/^27/,'0');
const limiter=rateLimit({windowMs:15*60*1000,limit:6,standardHeaders:true,legacyHeaders:false,message:{error:'Too many recovery attempts. Please wait 15 minutes and try again.'}});

module.exports=function registerClientAccessRecovery(app){
  app.post('/api/auth/client/recover',limiter,(req,res)=>{
    const email=clean(req.body?.email).toLowerCase();
    const suppliedName=key(req.body?.name);
    const suppliedBusiness=key(req.body?.businessName);
    const suppliedPhone=phone(req.body?.phone);
    if(!email||!suppliedName||!suppliedBusiness||!suppliedPhone)return res.status(400).json({error:'Please enter the same name, email, phone number and business name used for the audit.'});

    const db=store.read();
    const audit=[...(db.audits||[])].reverse().find(a=>
      clean(a.email).toLowerCase()===email&&
      key(a.name)===suppliedName&&
      key(a.businessName)===suppliedBusiness&&
      phone(a.phone)===suppliedPhone
    );
    if(!audit)return res.status(401).json({error:'Those details do not match an existing audit. Check the details exactly as used when the audit was submitted.'});

    const code=accessCode();
    store.update('audits',audit.id,{accessHash:hashSecret(code)});
    req.session.regenerate(error=>{
      if(error)return res.status(500).json({error:'Could not restore your secure client session.'});
      req.session.clientId=audit.id;
      res.json({ok:true,accessCode:code,message:'Access restored. Save this new access code; it is shown only once.'});
    });
  });
};
