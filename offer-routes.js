const dns = require('node:dns').promises;
const store = require('./store');
const { normalise, payfastSignature } = require('./core');

const catalog = [
  { code:'profile-revamp', label:'Company Profile Revamp', floor:1500, defaultAmount:1500 },
  { code:'new-profile', label:'New Company Profile', floor:2500, defaultAmount:2500 },
  { code:'capability', label:'Capability Statement', floor:1500, defaultAmount:1500 },
  { code:'marketing-plan', label:'Marketing Plan', floor:2500, defaultAmount:3500 },
  { code:'business-proposal', label:'Business Proposal', floor:2500, defaultAmount:3500 },
  { code:'business-plan', label:'Business Plan', floor:4500, defaultAmount:6000 },
  { code:'funding-proposal', label:'Funding Proposal', floor:4500, defaultAmount:6500 },
  { code:'investor-pitch', label:'Investor Pitch Package', floor:5500, defaultAmount:7500 },
  { code:'tender-support', label:'Tender / Bid Preparation', floor:5000, defaultAmount:6500 },
  { code:'retainer-starter', label:'Growth Desk Starter Retainer', floor:2500, defaultAmount:2500, recurring:true },
  { code:'retainer-growth', label:'Growth Desk Growth Retainer', floor:4500, defaultAmount:4500, recurring:true },
  { code:'retainer-executive', label:'Growth Desk Executive Retainer', floor:7500, defaultAmount:7500, recurring:true }
];

const requireClient = (req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const requireAdmin = (req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const mode = () => String(process.env.PAYFAST_MODE || 'sandbox').toLowerCase()==='live'?'live':'sandbox';
const configured = () => Boolean(process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY);
const gateway = () => mode()==='live'?'https://www.payfast.co.za/eng/process':'https://sandbox.payfast.co.za/eng/process';
const validator = () => mode()==='live'?'https://www.payfast.co.za/eng/query/validate':'https://sandbox.payfast.co.za/eng/query/validate';
const money = value => Number(Number(value||0).toFixed(2));
const pfEncode = value => encodeURIComponent(String(value).trim()).replace(/%20/g,'+');

function paramString(body){
  return Object.entries(body).filter(([k,v])=>k!=='signature'&&v!==undefined&&v!==null&&v!=='').map(([k,v])=>`${k}=${pfEncode(v)}`).join('&');
}

async function validSource(req){
  const raw = String(req.ip || req.headers['x-forwarded-for'] || '').split(',')[0].trim().replace(/^::ffff:/,'');
  if(mode()==='sandbox' && (raw==='127.0.0.1'||raw==='::1')) return true;
  const hosts = mode()==='sandbox' ? ['sandbox.payfast.co.za'] : ['www.payfast.co.za','w1w.payfast.co.za','w2w.payfast.co.za'];
  const ips = new Set();
  for(const host of hosts){ try { (await dns.resolve4(host)).forEach(ip=>ips.add(ip)); } catch {} }
  return ips.has(raw);
}

async function validServer(body){
  const r = await fetch(validator(), { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:paramString(body) });
  if(!r.ok) return false;
  return (await r.text()).trim()==='VALID';
}

module.exports = function registerOfferRoutes(app){
  app.get('/api/admin/offers/catalog', requireAdmin, (_req,res)=>res.json({catalog}));

  app.get('/api/admin/offers', requireAdmin, (_req,res)=>{
    const db=store.read();
    res.json({offers:db.offers||[],payments:db.offerPayments||[]});
  });

  app.post('/api/admin/audits/:auditId/offers', requireAdmin, (req,res)=>{
    const db=store.read();
    const audit=(db.audits||[]).find(a=>a.id===req.params.auditId);
    if(!audit) return res.status(404).json({error:'Audit not found.'});
    const item=catalog.find(x=>x.code===normalise(req.body.code));
    if(!item) return res.status(400).json({error:'Choose a valid service.'});
    const amount=money(req.body.amount || item.defaultAmount);
    if(!Number.isFinite(amount)||amount<item.floor) return res.status(400).json({error:`Minimum quote for ${item.label} is R${item.floor}.`});
    const expiresIn=Math.min(30,Math.max(1,Number(req.body.expiresInDays||7)));
    const offer=store.insert('offers',{
      auditId:audit.id, businessName:audit.businessName, clientName:audit.name, clientEmail:audit.email,
      code:item.code, service:item.label, amount, recurring:Boolean(item.recurring),
      description:normalise(req.body.description).slice(0,1200),
      deliverables:normalise(req.body.deliverables).slice(0,1600),
      status:'Sent', acceptedAt:null, paidAt:null,
      expiresAt:new Date(Date.now()+expiresIn*86400000).toISOString()
    });
    store.update('audits',audit.id,{salesStage:'Offer sent',recommendedService:item.label,quoteAmount:amount,nextAction:'Client to accept and pay follow-on offer'});
    res.status(201).json({offer});
  });

  app.patch('/api/admin/offers/:id', requireAdmin, (req,res)=>{
    const allowed={};
    ['status','description','deliverables'].forEach(k=>{if(req.body[k]!==undefined)allowed[k]=normalise(req.body[k]).slice(0,k==='status'?80:1600)});
    if(req.body.amount!==undefined){const n=money(req.body.amount);if(!Number.isFinite(n)||n<5)return res.status(400).json({error:'Enter a valid amount.'});allowed.amount=n;}
    const offer=store.update('offers',req.params.id,allowed);
    if(!offer)return res.status(404).json({error:'Offer not found.'});
    res.json({offer});
  });

  app.get('/api/client/offers', requireClient, (req,res)=>{
    const db=store.read();
    const offers=(db.offers||[]).filter(o=>o.auditId===req.session.clientId).map(o=>({...o,expired:Boolean(o.expiresAt&&new Date(o.expiresAt).getTime()<Date.now())}));
    const payments=(db.offerPayments||[]).filter(p=>p.auditId===req.session.clientId);
    res.json({offers,payments,paymentConfigured:configured(),paymentMode:mode()});
  });

  app.post('/api/client/offers/:id/accept', requireClient, (req,res)=>{
    const db=store.read();
    const offer=(db.offers||[]).find(o=>o.id===req.params.id&&o.auditId===req.session.clientId);
    if(!offer)return res.status(404).json({error:'Offer not found.'});
    if(offer.status==='Paid')return res.json({offer});
    if(offer.expiresAt&&new Date(offer.expiresAt).getTime()<Date.now())return res.status(410).json({error:'This offer has expired. Please request an updated quote.'});
    const updated=store.update('offers',offer.id,{status:'Accepted — awaiting payment',acceptedAt:new Date().toISOString()});
    store.update('audits',offer.auditId,{salesStage:'Offer accepted',nextAction:'Follow-on payment due'});
    res.json({offer:updated});
  });

  app.post('/api/client/offers/:id/checkout', requireClient, (req,res)=>{
    if(!configured())return res.status(503).json({error:'Online payment is not configured on this deployment yet.'});
    const db=store.read();
    const offer=(db.offers||[]).find(o=>o.id===req.params.id&&o.auditId===req.session.clientId);
    const audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
    if(!offer||!audit)return res.status(404).json({error:'Offer not found.'});
    if(offer.status==='Paid')return res.status(409).json({error:'This offer is already paid.'});
    if(offer.expiresAt&&new Date(offer.expiresAt).getTime()<Date.now())return res.status(410).json({error:'This offer has expired. Please request an updated quote.'});
    const base=normalise(process.env.APP_URL||`${req.protocol}://${req.get('host')}`).replace(/\/$/,'');
    const paymentId=`offer-${offer.id}`.slice(0,100);
    const fields={merchant_id:process.env.PAYFAST_MERCHANT_ID,merchant_key:process.env.PAYFAST_MERCHANT_KEY,return_url:`${base}/portal.html?offerPayment=returned`,cancel_url:`${base}/portal.html?offerPayment=cancelled`,notify_url:`${base}/api/offers/payfast/notify`,name_first:audit.name.split(' ')[0],email_address:audit.email,m_payment_id:paymentId,amount:Number(offer.amount).toFixed(2),item_name:offer.service.slice(0,100),custom_str1:offer.id};
    fields.signature=payfastSignature(fields,process.env.PAYFAST_PASSPHRASE);
    store.insert('offerPayments',{offerId:offer.id,auditId:audit.id,paymentId,amount:money(offer.amount),status:'Initiated',mode:mode()});
    if(offer.status==='Sent')store.update('offers',offer.id,{status:'Accepted — awaiting payment',acceptedAt:new Date().toISOString()});
    res.json({url:gateway(),fields});
  });

  app.post('/api/offers/payfast/notify', async (req,res)=>{
    try{
      if(!configured())return res.status(503).send('Payments not configured');
      const db=store.read();
      const offerId=normalise(req.body.custom_str1);
      const offer=(db.offers||[]).find(o=>o.id===offerId);
      if(!offer)return res.status(404).send('Offer not found');
      const received=normalise(req.body.signature);
      const fields={...req.body};delete fields.signature;
      const signatureOk=received&&payfastSignature(fields,process.env.PAYFAST_PASSPHRASE)===received;
      const merchantOk=normalise(req.body.merchant_id)===normalise(process.env.PAYFAST_MERCHANT_ID);
      const amountOk=Math.abs(Number(req.body.amount_gross)-Number(offer.amount))<=0.01;
      const sourceOk=await validSource(req);
      const serverOk=await validServer(req.body);
      if(!(signatureOk&&merchantOk&&amountOk&&sourceOk&&serverOk))return res.status(400).send('Invalid payment notification');
      const payment=(db.offerPayments||[]).slice().reverse().find(p=>p.offerId===offer.id&&p.paymentId===req.body.m_payment_id);
      if(payment)store.update('offerPayments',payment.id,{status:req.body.payment_status||'COMPLETE',pfPaymentId:req.body.pf_payment_id});
      if(req.body.payment_status==='COMPLETE'){
        store.update('offers',offer.id,{status:'Paid',paidAt:new Date().toISOString()});
        store.update('audits',offer.auditId,{salesStage:'Follow-on paid',recommendedService:offer.service,quoteAmount:offer.amount,nextAction:'Begin delivery'});
      }
      res.sendStatus(200);
    }catch(error){console.error('Offer PayFast ITN failed:',error.message);res.status(400).send('Payment validation failed');}
  });
};
