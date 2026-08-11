const store = require('./store');
const { normalise, payfastSignature } = require('./core');

const PLANS = {
  'Chancellor Verified': { amount:199, label:'Chancellor Verified', benefits:['Verified Network profile','Standard case matching','Member workspace','Credential status tracking'] },
  'Chancellor Professional': { amount:499, label:'Chancellor Professional', benefits:['Everything in Verified','Priority case matching','Enhanced professional profile','Opportunity analytics'] },
  'Chancellor Premier': { amount:999, label:'Chancellor Premier', benefits:['Everything in Professional','Highest matching priority','Premier Network positioning','Practice/team-ready status'] }
};

function addDays(iso, days){ const d=iso?new Date(iso):new Date(); d.setDate(d.getDate()+days); return d.toISOString(); }

module.exports = function registerMembershipRoutes(app){
  const requireProfessional=(req,res,next)=>req.session?.professionalId?next():res.status(401).json({error:'Professional Network sign-in required.'});
  const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});

  app.get('/api/professionals/membership/plans',(_req,res)=>res.json({plans:Object.values(PLANS)}));

  app.post('/api/professionals/membership/select',requireProfessional,(req,res)=>{
    const tier=normalise(req.body.tier); const plan=PLANS[tier];
    if(!plan)return res.status(400).json({error:'Choose a valid Professional Network membership plan.'});
    const pro=store.update('professionals',req.session.professionalId,{membershipTier:tier,subscriptionStatus:'Payment pending',membershipStatus:'Pending membership activation'});
    if(!pro)return res.status(404).json({error:'Professional membership record not found.'});
    res.json({ok:true,tier,amount:plan.amount,subscriptionStatus:'Payment pending'});
  });

  app.post('/api/professionals/membership/checkout',requireProfessional,(req,res)=>{
    const db=store.read(); const pro=(db.professionals||[]).find(p=>p.id===req.session.professionalId);
    if(!pro)return res.status(404).json({error:'Professional membership record not found.'});
    const tier=normalise(req.body.tier||pro.membershipTier||'Chancellor Verified'); const plan=PLANS[tier];
    if(!plan)return res.status(400).json({error:'Choose a valid membership plan.'});
    store.update('professionals',pro.id,{membershipTier:tier,subscriptionStatus:'Payment pending',membershipStatus:'Pending membership activation'});
    if(!process.env.PAYFAST_MERCHANT_ID||!process.env.PAYFAST_MERCHANT_KEY)return res.status(503).json({error:'Online membership payment is not configured on this deployment yet.',tier,amount:plan.amount});
    const base=normalise(process.env.APP_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');
    const paymentId=`membership:${pro.id}:${Date.now()}`;
    const fields={merchant_id:process.env.PAYFAST_MERCHANT_ID,merchant_key:process.env.PAYFAST_MERCHANT_KEY,return_url:`${base}/professional-portal.html?membership=returned`,cancel_url:`${base}/professional-portal.html?membership=cancelled`,notify_url:`${base}/api/membership/payfast/notify`,name_first:String(pro.name||'Member').split(' ')[0],email_address:pro.email,m_payment_id:paymentId,amount:Number(plan.amount).toFixed(2),item_name:`${tier} Membership`};
    fields.signature=payfastSignature(fields,process.env.PAYFAST_PASSPHRASE);
    const url=process.env.PAYFAST_MODE==='live'?'https://www.payfast.co.za/eng/process':'https://sandbox.payfast.co.za/eng/process';
    store.insert('payments',{professionalId:pro.id,kind:'Professional Network Membership',tier,amount:plan.amount,status:'Initiated',mode:process.env.PAYFAST_MODE||'sandbox',paymentId});
    res.json({url,fields,tier,amount:plan.amount});
  });

  app.post('/api/membership/payfast/notify',(req,res)=>{
    if(!process.env.PAYFAST_MERCHANT_ID||!process.env.PAYFAST_MERCHANT_KEY)return res.status(503).send('Payments not configured');
    const received=req.body.signature; const fields={...req.body}; delete fields.signature;
    if(!received||payfastSignature(fields,process.env.PAYFAST_PASSPHRASE)!==received)return res.status(400).send('Invalid signature');
    const paymentId=normalise(req.body.m_payment_id); const parts=paymentId.split(':'); if(parts[0]!=='membership')return res.status(400).send('Invalid membership payment');
    const professionalId=parts[1]; const db=store.read(); const payment=[...(db.payments||[])].reverse().find(p=>p.paymentId===paymentId);
    if(payment)store.update('payments',payment.id,{status:req.body.payment_status||'COMPLETE',pfPaymentId:req.body.pf_payment_id});
    if(req.body.payment_status==='COMPLETE'){
      const paidAt=new Date().toISOString(); const current=(db.professionals||[]).find(p=>p.id===professionalId);
      if(current){ const canActivate=current.verificationStatus==='Verified'; store.update('professionals',professionalId,{subscriptionStatus:'Active',subscriptionStartedAt:paidAt,subscriptionRenewsAt:addDays(paidAt,30),membershipStatus:canActivate?'Active member':'Payment received — verification pending',active:canActivate}); }
    }
    res.sendStatus(200);
  });

  app.post('/api/admin/professionals/:id/subscription',requireAdmin,(req,res)=>{
    const status=normalise(req.body.subscriptionStatus).slice(0,120); const tier=normalise(req.body.membershipTier).slice(0,120); const patch={};
    if(status)patch.subscriptionStatus=status; if(tier&&PLANS[tier])patch.membershipTier=tier;
    if(req.body.renewsAt!==undefined)patch.subscriptionRenewsAt=normalise(req.body.renewsAt).slice(0,80);
    const current=(store.read().professionals||[]).find(p=>p.id===req.params.id); if(!current)return res.status(404).json({error:'Professional not found.'});
    if(status==='Active'&&current.verificationStatus==='Verified'){patch.membershipStatus='Active member';patch.active=true;}
    if(['Expired','Cancelled','Suspended'].includes(status)){patch.membershipStatus='Membership suspended';patch.active=false;}
    const pro=store.update('professionals',req.params.id,patch); res.json({professional:pro});
  });

  app.get('/api/admin/membership',requireAdmin,(_req,res)=>{
    const db=store.read(); const professionals=db.professionals||[]; const payments=(db.payments||[]).filter(p=>p.kind==='Professional Network Membership');
    const active=professionals.filter(p=>p.subscriptionStatus==='Active');
    res.json({metrics:{activeSubscriptions:active.length,monthlyRecurringRevenue:active.reduce((s,p)=>s+(PLANS[p.membershipTier]?.amount||0),0,pendingPayments:professionals.filter(p=>p.subscriptionStatus==='Payment pending').length,expired:professionals.filter(p=>p.subscriptionStatus==='Expired').length},plans:Object.values(PLANS),payments});
  });
};
