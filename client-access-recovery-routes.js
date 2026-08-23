const rateLimit=require('express-rate-limit');
const store=require('./store');
const {hashSecret,accessCode}=require('./core');

const clean=v=>String(v??'').trim();
const key=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const phone=v=>clean(v).replace(/\D/g,'').replace(/^27/,'0');
const limiter=rateLimit({windowMs:15*60*1000,limit:6,standardHeaders:true,legacyHeaders:false,message:{error:'Too many recovery attempts. Please wait 15 minutes and try again.'}});

function businessMatches(saved,supplied){
  const a=key(saved),b=key(supplied);
  if(!a||!b)return false;
  if(a===b)return true;
  if(Math.min(a.length,b.length)<5)return false;
  return a.startsWith(b)||b.startsWith(a);
}

module.exports=function registerClientAccessRecovery(app){
  app.post('/api/auth/client/recover',limiter,(req,res)=>{
    const email=clean(req.body?.email).toLowerCase();
    const suppliedName=key(req.body?.name);
    const suppliedBusiness=clean(req.body?.businessName);
    const suppliedPhone=phone(req.body?.phone);
    if(!email||!suppliedName||!suppliedBusiness||!suppliedPhone)return res.status(400).json({error:'Please enter your name, email, phone number and business name.'});

    const db=store.read();
    const candidates=[...(db.audits||[])].reverse().filter(a=>clean(a.email).toLowerCase()===email);
    const audit=candidates.find(a=>{
      const nameOk=key(a.name)===suppliedName;
      const businessOk=businessMatches(a.businessName,suppliedBusiness);
      const phoneOk=phone(a.phone)===suppliedPhone;
      return nameOk&&(businessOk||phoneOk);
    });

    if(!audit){
      return res.status(401).json({error:candidates.length?'We found an audit for this email, but one of the identity details differs. Use the same name and business name you originally submitted; company suffixes such as (Pty) Ltd are accepted.':'No existing audit was found for that email address.'});
    }

    const code=accessCode();
    store.update('audits',audit.id,{accessHash:hashSecret(code)});
    req.session.regenerate(error=>{
      if(error)return res.status(500).json({error:'Could not restore your secure client session.'});
      req.session.clientId=audit.id;
      res.json({ok:true,accessCode:code,message:'Access restored. Save this new access code; it is shown only once.'});
    });
  });
};
