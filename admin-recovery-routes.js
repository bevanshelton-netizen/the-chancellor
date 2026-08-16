const crypto=require('node:crypto');
const rateLimit=require('express-rate-limit');
const store=require('./store');

const clean=v=>String(v??'').trim();
const sha256=v=>crypto.createHash('sha256').update(String(v)).digest('hex');
const baseUrl=()=>clean(process.env.APP_URL).replace(/\/$/,'');
const recoveryLimiter=rateLimit({windowMs:15*60*1000,limit:8,standardHeaders:true,legacyHeaders:false,message:{error:'Too many recovery attempts. Please wait 15 minutes and try again.'}});

async function sendRecoveryEmail(to,href){
  if(!process.env.RESEND_API_KEY||!process.env.COMMS_FROM_EMAIL)return{ok:false,reason:'Email recovery is not configured'};
  const html=`<!doctype html><html><body style="margin:0;background:#090806;color:#f4efe5;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:36px 24px"><div style="font-size:12px;letter-spacing:2px;color:#caa653;text-transform:uppercase">The Chancellor</div><h1 style="font-family:Georgia,serif;font-size:32px;margin:12px 0;color:#fff">Secure administrator sign-in</h1><p style="font-size:15px;line-height:1.7;color:#cec6b9">A secure sign-in link was requested for your Business Growth Desk administrator account. This link expires in 15 minutes and can only be used once.</p><p style="margin-top:28px"><a href="${href}" style="display:inline-block;background:#d5b464;color:#17130b;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">Sign in securely</a></p><p style="margin-top:34px;font-size:11px;color:#81796d">If you did not request this link, ignore this email. Never share this link, passwords, PINs or card details.</p></div></body></html>`;
  try{
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.COMMS_FROM_EMAIL,to:[to],subject:'The Chancellor — secure sign-in link',html})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.message||`Resend ${r.status}`);
    return{ok:true,id:j.id||''};
  }catch(error){return{ok:false,reason:String(error.message||error).slice(0,240)};}
}

function createConsoleCode(email){
  const code=crypto.randomBytes(4).toString('hex').toUpperCase();
  const expiresAt=new Date(Date.now()+15*60*1000).toISOString();
  const record=store.insert('adminRecoveryTokens',{email,kind:'console-code',tokenHash:sha256(code),expiresAt,usedAt:null});
  const masked=email.replace(/^(.{1,2}).*(@.*)$/,'$1***$2');
  console.warn(`ADMIN RECOVERY CODE | ${masked} | ${code} | expires ${expiresAt} | one-time use`);
  return{record,expiresAt};
}

module.exports=function registerAdminRecoveryRoutes(app){
  app.post('/api/auth/admin/forgot',recoveryLimiter,async(req,res)=>{
    const email=clean(req.body?.email).toLowerCase();
    const expected=clean(process.env.ADMIN_EMAIL).toLowerCase();
    const neutral={ok:true,message:'If that email matches the administrator account, recovery instructions have been created.'};
    if(!email||!expected||email!==expected)return res.json(neutral);

    const base=baseUrl();
    const emailReady=Boolean(base&&process.env.RESEND_API_KEY&&process.env.COMMS_FROM_EMAIL);
    if(emailReady){
      const token=crypto.randomBytes(32).toString('hex');
      const record=store.insert('adminRecoveryTokens',{email,kind:'email-link',tokenHash:sha256(token),expiresAt:new Date(Date.now()+15*60*1000).toISOString(),usedAt:null});
      const href=`${base}/api/auth/admin/recover?token=${encodeURIComponent(token)}`;
      const sent=await sendRecoveryEmail(email,href);
      if(sent.ok){
        store.update('adminRecoveryTokens',record.id,{deliveryProvider:'Resend',deliveryId:sent.id});
        return res.json({ok:true,method:'email-link',message:'A secure one-time sign-in link has been sent to the administrator email.'});
      }
      store.update('adminRecoveryTokens',record.id,{usedAt:new Date().toISOString(),deliveryError:sent.reason});
    }

    createConsoleCode(email);
    res.json({ok:true,method:'console-code',message:'A one-time recovery code has been created. Open this Render service’s Logs and search for “ADMIN RECOVERY CODE”, then enter the code below. It expires in 15 minutes and works once.'});
  });

  app.post('/api/auth/admin/recover-code',recoveryLimiter,(req,res)=>{
    const email=clean(req.body?.email).toLowerCase();
    const expected=clean(process.env.ADMIN_EMAIL).toLowerCase();
    const code=clean(req.body?.code).replace(/[^a-fA-F0-9]/g,'').toUpperCase();
    if(!email||!expected||email!==expected||code.length!==8)return res.status(401).json({error:'Recovery code is incorrect or has expired.'});
    const hash=sha256(code);
    const db=store.read();
    const match=[...(db.adminRecoveryTokens||[])].reverse().find(x=>x.kind==='console-code'&&x.email===email&&x.tokenHash===hash&&!x.usedAt&&new Date(x.expiresAt).getTime()>Date.now());
    if(!match)return res.status(401).json({error:'Recovery code is incorrect or has expired.'});
    store.update('adminRecoveryTokens',match.id,{usedAt:new Date().toISOString()});
    req.session.regenerate(error=>{
      if(error)return res.status(500).json({error:'Could not establish a secure administrator session.'});
      req.session.admin=true;
      res.json({ok:true,message:'Administrator access restored.'});
    });
  });

  app.get('/api/auth/admin/recover',(req,res)=>{
    const token=clean(req.query?.token);
    const hash=token?sha256(token):'';
    const db=store.read();
    const match=[...(db.adminRecoveryTokens||[])].reverse().find(x=>x.kind!=='console-code'&&x.tokenHash===hash&&!x.usedAt&&new Date(x.expiresAt).getTime()>Date.now());
    if(!match)return res.status(400).type('html').send('<h2>That secure sign-in link is invalid or has expired.</h2><p>Please return to the CRM and request a new link.</p>');
    store.update('adminRecoveryTokens',match.id,{usedAt:new Date().toISOString()});
    req.session.regenerate(error=>{
      if(error)return res.status(500).type('html').send('<h2>Could not establish a secure administrator session.</h2>');
      req.session.admin=true;
      res.redirect('/crm?recovered=1');
    });
  });
};
