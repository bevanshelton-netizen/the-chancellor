const store=require('./store');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const money=v=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0};
const paidForAudit=(db,auditId)=>(db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');

const serviceMap={
  'Business Foundation':{code:'foundation-pack',service:'Business Foundation & Compliance Pack',amount:3500,deliverables:'Business structure, records, compliance priorities, responsibilities and immediate management actions.'},
  'Product / Service':{code:'offer-pricing-fix',service:'Offer, Pricing & Profitability Fix',amount:3500,deliverables:'Offer clarification, pricing review, margin analysis and focus on the products or services most likely to produce profitable demand.'},
  'Sales':{code:'sales-rescue',service:'30-Day Sales & Lead Conversion Rescue',amount:3500,deliverables:'Lead pipeline, quotation process, follow-up system, conversion actions, sales targets and a 30-day execution rhythm.'},
  'Marketing & Brand':{code:'marketing-plan',service:'Marketing & Lead Generation',amount:3500,deliverables:'Positioning, target market, campaign plan, lead-generation channels and measurable 30-day marketing activity.'},
  'Cash Flow & Finance':{code:'cashflow-fix',service:'Cash-Flow & Finance Improvement',amount:3500,deliverables:'Cash-flow review, pricing and margin checks, collections priorities, expense visibility and practical management actions.'},
  'Customers':{code:'customer-growth',service:'Customer Growth & Retention Pack',amount:3500,deliverables:'Customer-fit review, service improvements, repeat-sales actions, referral process and reputation-building priorities.'},
  'Operations':{code:'operations-improvement',service:'Operations Improvement Programme',amount:5000,deliverables:'Operating procedures, capacity priorities, supplier controls, quality measures and practical systems improvement.'},
  'People & Capacity':{code:'people-capacity',service:'People & Capacity Improvement',amount:4500,deliverables:'Roles, accountability, skills gaps, owner-dependence reduction and the people/capacity plan required for growth.'},
  'Growth Readiness':{code:'growth-strategy',service:'90-Day Growth Strategy',amount:7500,deliverables:'Growth opportunity selection, capacity and capital requirements, revenue priorities, execution milestones and a measurable 90-day plan.'},
  'Finance & Cash Flow':{code:'cashflow-fix',service:'Cash-Flow & Finance Improvement',amount:3500,deliverables:'Cash-flow review, pricing and margin checks, collections priorities, expense visibility and practical management actions.'},
  'Marketing':{code:'marketing-plan',service:'Marketing & Lead Generation',amount:3500,deliverables:'Positioning, target market, channels, campaigns, lead generation actions and practical 90-day marketing plan.'},
  'Compliance':{code:'foundation-pack',service:'Business Foundation & Compliance Pack',amount:3500,deliverables:'Business compliance readiness checklist, records organisation and referral to appropriately qualified professionals where regulated work is required.'},
  'Funding Readiness':{code:'funding-proposal',service:'Funding Proposal',amount:6500,deliverables:'Funding case, use-of-funds plan, supporting evidence checklist, financial narrative and funder-ready proposal.'},
  'Tender & Contract Readiness':{code:'tender-support',service:'Tender / Bid Preparation',amount:6500,deliverables:'Tender-readiness review, bid documentation structure, pricing support and submission preparation for suitable opportunities.'},
  'Growth Potential':{code:'growth-strategy',service:'90-Day Growth Strategy',amount:7500,deliverables:'90-day growth strategy, capacity plan, revenue priorities and executive accountability.'}
};

function diagnosis(audit){
  const value=`${audit.band||''} ${audit.bandTone||''}`.toLowerCase();
  if(value.includes('scale ready')||value.includes('growth ready')||value.includes('green'))return 'Your business has a strong readiness foundation. The priority now is focused execution: strengthen the weakest areas while protecting momentum and scaling deliberately.';
  if(value.includes('growth potential')||value.includes('nearly'))return 'Your business has a workable foundation, but identifiable bottlenecks should be strengthened before aggressive scaling.';
  if(value.includes('rebuild required')||value.includes('amber'))return 'Your audit shows several weaknesses restricting sustainable growth. The commercial priority is to solve the most important constraint first, measure the result and then address the next gap.';
  return 'Your audit shows material readiness gaps. Immediate corrective action should come before taking on greater financial, contractual or operating risk.';
}
function choose(audit){const priority=(audit.priorities||[])[0]?.section;return {priority,offer:serviceMap[priority]||{code:'retainer-starter',service:'Growth Desk Starter Intervention',amount:3500,deliverables:'Focused implementation support based on the highest-priority gap identified by your Business Readiness Audit.'}}}
function ensureOffer(audit,selected){
  const db=store.read();const existing=(db.offers||[]).find(o=>o.auditId===audit.id&&!['Expired','Cancelled'].includes(o.status));if(existing)return existing;
  const o=selected.offer;const offer=store.insert('offers',{auditId:audit.id,businessName:audit.businessName,clientName:audit.name,clientEmail:audit.email,code:o.code,service:o.service,amount:o.amount,recurring:false,description:`Recommended automatically by The Chancellor from your paid Business Readiness Audit. Primary priority: ${selected.priority||'overall business readiness'}.`,deliverables:o.deliverables,status:'Sent',acceptedAt:null,paidAt:null,expiresAt:new Date(Date.now()+7*86400000).toISOString(),source:'post-audit-concierge'});
  store.update('audits',audit.id,{salesStage:'Offer sent',recommendedService:o.service,quoteAmount:o.amount,nextAction:'Review, accept and pay the recommended follow-on offer'});return offer;
}

module.exports=function registerPostAuditConcierge(app){
  app.get('/api/client/post-audit-concierge',requireClient,(req,res)=>{
    const db=store.read(),audit=(db.audits||[]).find(a=>a.id===req.session.clientId);if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidForAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 audit payment before The Chancellor prepares the post-audit recommendation.'});
    const selected=choose(audit),offer=ensureOffer(audit,selected);const top=(audit.priorities||[]).slice(0,3).map(p=>({section:p.section,score:Number(p.score||0),maxScore:Number(p.maxScore||10),percent:Number.isFinite(Number(p.percent))?Number(p.percent):Math.round((Number(p.score||0)/Number(p.maxScore||10))*100)}));
    res.setHeader('Cache-Control','private, no-store');res.json({ok:true,diagnosis:diagnosis(audit),score:Number(audit.score||0),maxScore:Number(audit.maxScore||90),readinessPercent:Number(audit.readinessPercent||0),band:audit.band||'',priorities:top,recommendation:audit.recommendation||'',recommendedService:offer.service,amount:money(offer.amount),offerId:offer.id,offerStatus:offer.status,why:`The Chancellor selected ${offer.service} because ${selected.priority||'overall readiness'} is currently the strongest intervention priority from your audit.`,nextAction:offer.status==='Paid'?'Delivery can begin.':'Review the scope below, accept it if it makes sense, then proceed to secure payment.'});
  });
};