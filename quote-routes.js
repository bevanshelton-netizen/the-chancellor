const store=require('./store');
const {buildQuoteSuggestion}=require('./quote-engine');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const paidAudit=(db,auditId)=>(db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');

function publicSuggestion(audit){
  const q=buildQuoteSuggestion(audit);
  return {service:q.service,amount:q.amount,description:q.description,deliverables:q.deliverables,primaryPriority:q.primaryPriority,supportingPriorities:q.supportingPriorities,humanReviewRequired:Boolean(q.humanReviewRequired)};
}

function createRecommendedOffer(audit){
  const db=store.read();
  const existing=(db.offers||[]).slice().reverse().find(o=>o.auditId===audit.id&&!['Expired','Cancelled'].includes(String(o.status||''))&&o.source==='automatic-recommendation');
  if(existing)return existing;
  const q=buildQuoteSuggestion(audit);
  const offer=store.insert('offers',{
    auditId:audit.id,businessName:audit.businessName,clientName:audit.name,clientEmail:audit.email,
    code:q.code,service:q.service,amount:Number(q.amount),recurring:false,
    description:q.description,deliverables:q.deliverables,status:'Sent',acceptedAt:null,paidAt:null,
    expiresAt:new Date(Date.now()+Number(q.expiresInDays||14)*86400000).toISOString(),source:'automatic-recommendation',humanReviewed:false
  });
  store.update('audits',audit.id,{salesStage:'Offer sent',recommendedService:q.service,quoteAmount:q.amount,nextAction:'Client to review, accept and pay follow-on offer'});
  return offer;
}

module.exports=function registerQuoteRoutes(app){
  app.get('/api/client/quote-recommendation',requireClient,(req,res)=>{
    const db=store.read();const audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
    if(!audit)return res.status(404).json({error:'Audit not found.'});
    const isPaid=paidAudit(db,audit.id);
    const request=(db.quoteRequests||[]).slice().reverse().find(x=>x.auditId===audit.id)||null;
    const sentOffer=isPaid?createRecommendedOffer(audit):((db.offers||[]).slice().reverse().find(o=>o.auditId===audit.id&&o.source==='automatic-recommendation')||null);
    res.json({recommendation:publicSuggestion(audit),auditPaid:isPaid,request,sentOffer});
  });

  app.post('/api/client/quote-recommendation/request',requireClient,(req,res)=>{
    const db=store.read();const audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
    if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 Business Readiness Audit payment before requesting a follow-on quotation.'});
    let request=(db.quoteRequests||[]).slice().reverse().find(x=>x.auditId===audit.id&&['Requested','Approved'].includes(x.status));
    const suggestion=buildQuoteSuggestion(audit);
    const offer=createRecommendedOffer(audit);
    if(!request){
      request=store.insert('quoteRequests',{auditId:audit.id,businessName:audit.businessName,clientName:audit.name,clientEmail:audit.email,status:'Approved',suggestion,requestedAt:new Date().toISOString(),approvedAt:new Date().toISOString(),offerId:offer.id});
    }else if(request.status!=='Approved'){
      request=store.update('quoteRequests',request.id,{status:'Approved',approvedAt:new Date().toISOString(),offerId:offer.id});
    }
    res.status(201).json({request,recommendation:publicSuggestion(audit),offer});
  });

  app.get('/api/admin/quote-overview',requireAdmin,(_req,res)=>{
    const db=store.read();
    const requests=db.quoteRequests||[];
    const rows=(db.audits||[]).map(a=>({auditId:a.id,businessName:a.businessName,name:a.name,paid:paidAudit(db,a.id),recommendation:publicSuggestion(a),request:requests.slice().reverse().find(x=>x.auditId===a.id)||null,offer:(db.offers||[]).slice().reverse().find(o=>o.auditId===a.id&&o.source==='automatic-recommendation')||null}));
    res.json({rows});
  });

  app.post('/api/admin/audits/:auditId/recommended-offer',requireAdmin,(req,res)=>{
    const db=store.read();const audit=(db.audits||[]).find(a=>a.id===req.params.auditId);
    if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidAudit(db,audit.id))return res.status(409).json({error:'The R500 audit payment must be confirmed before a recommended follow-on offer is issued.'});
    const offer=createRecommendedOffer(audit);
    const request=(store.read().quoteRequests||[]).slice().reverse().find(x=>x.auditId===audit.id&&x.status==='Requested');
    if(request)store.update('quoteRequests',request.id,{status:'Approved',approvedAt:new Date().toISOString(),offerId:offer.id});
    res.status(201).json({offer});
  });
};