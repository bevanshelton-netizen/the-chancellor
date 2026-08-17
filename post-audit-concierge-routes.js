const store=require('./store');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const money=v=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0};
const paidForAudit=(db,auditId)=>(db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');

const serviceMap={
  'Business Foundation':{code:'business-plan',service:'Business Plan',amount:6000,deliverables:'Business model clarification, market positioning, operating model, financial assumptions and implementation priorities.'},
  'Finance & Cash Flow':{code:'retainer-growth',service:'Growth Desk Growth Retainer',amount:4500,deliverables:'Cash-flow review, pricing and margin analysis, management actions and monthly accountability.'},
  'Sales':{code:'retainer-growth',service:'Growth Desk Growth Retainer',amount:4500,deliverables:'Sales pipeline, lead follow-up system, conversion actions, sales targets and accountability.'},
  'Marketing':{code:'marketing-plan',service:'Marketing Plan',amount:3500,deliverables:'Positioning, target market, channels, campaigns, lead generation actions and practical 90-day marketing plan.'},
  'Compliance':{code:'retainer-starter',service:'Growth Desk Starter Retainer',amount:2500,deliverables:'Business compliance readiness checklist, documentation organisation and referral to appropriately qualified professionals where regulated work is required.'},
  'Funding Readiness':{code:'funding-proposal',service:'Funding Proposal',amount:6500,deliverables:'Funding case, use-of-funds plan, supporting evidence checklist, financial narrative and funder-ready proposal.'},
  'Tender & Contract Readiness':{code:'tender-support',service:'Tender / Bid Preparation',amount:6500,deliverables:'Tender-readiness review, bid documentation structure, pricing support and submission preparation for suitable opportunities.'},
  'Operations':{code:'retainer-growth',service:'Growth Desk Growth Retainer',amount:4500,deliverables:'Operating procedures, capacity priorities, supplier/service controls and practical management system improvements.'},
  'Growth Potential':{code:'retainer-growth',service:'Growth Desk Growth Retainer',amount:4500,deliverables:'90-day growth strategy, capacity plan, revenue priorities and executive accountability.'}
};

function diagnosis(audit){
  const band=String(audit.band||'').toLowerCase();
  if(band.includes('green'))return 'Your business has a relatively strong readiness foundation. The priority now is focused execution: strengthen the weakest areas without slowing down growth.';
  if(band.includes('amber'))return 'Your business is viable, but important gaps should be strengthened before you pursue larger funding, contracts or expansion aggressively.';
  return 'Your audit shows material readiness gaps. The safest commercial move is to strengthen the weakest areas first before taking on larger financial, contractual or operating risk.';
}
function choose(audit){const priority=(audit.priorities||[])[0]?.section;return {priority,offer:serviceMap[priority]||{code:'retainer-starter',service:'Growth Desk Starter Retainer',amount:2500,deliverables:'Focused 90-day implementation support based on your Business Readiness Audit.'}}}
function ensureOffer(audit,selected){
  const db=store.read();const existing=(db.offers||[]).find(o=>o.auditId===audit.id&&!['Expired','Cancelled'].includes(o.status));if(existing)return existing;
  const o=selected.offer;const offer=store.insert('offers',{auditId:audit.id,businessName:audit.businessName,clientName:audit.name,clientEmail:audit.email,code:o.code,service:o.service,amount:o.amount,recurring:o.code.startsWith('retainer-'),description:`Recommended automatically by The Chancellor from your paid Business Readiness Audit. Primary priority: ${selected.priority||'overall business readiness'}.`,deliverables:o.deliverables,status:'Sent',acceptedAt:null,paidAt:null,expiresAt:new Date(Date.now()+7*86400000).toISOString(),source:'post-audit-concierge'});
  store.update('audits',audit.id,{salesStage:'Offer sent',recommendedService:o.service,quoteAmount:o.amount,nextAction:'Review, accept and pay the recommended follow-on offer'});return offer;
}

module.exports=function registerPostAuditConcierge(app){
  app.get('/api/client/post-audit-concierge',requireClient,(req,res)=>{
    const db=store.read(),audit=(db.audits||[]).find(a=>a.id===req.session.clientId);if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidForAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 audit payment before The Chancellor prepares the post-audit recommendation.'});
    const selected=choose(audit),offer=ensureOffer(audit,selected);const top=(audit.priorities||[]).slice(0,3).map(p=>({section:p.section,score:Number(p.score||0)}));
    res.setHeader('Cache-Control','private, no-store');res.json({ok:true,diagnosis:diagnosis(audit),score:Number(audit.score||0),readinessPercent:Number(audit.readinessPercent||0),band:audit.band||'',priorities:top,recommendation:audit.recommendation||'',recommendedService:offer.service,amount:money(offer.amount),offerId:offer.id,offerStatus:offer.status,why:`The Chancellor selected ${offer.service} because ${selected.priority||'overall readiness'} is currently the strongest intervention priority from your audit.`,nextAction:offer.status==='Paid'?'Delivery can begin.':'Review the scope below, accept it if it makes sense, then proceed to secure payment.'});
  });
};
