const store=require('./store');

const SECTION_ACTIONS={
  'Business Foundation & Strategy':{service:'Growth Strategy & Foundation Fix',summary:'Clarify the business structure, offer, target market, goals and management priorities.'},
  'Financial Readiness':{service:'Financial & Cash-Flow Readiness Intervention',summary:'Improve records, budgeting, cash-flow visibility and management financial control.'},
  'Sales & Customer Acquisition':{service:'Sales & Customer Acquisition System',summary:'Strengthen lead generation, follow-up, conversion tracking and monthly sales discipline.'},
  'Marketing & Brand Positioning':{service:'Brand & Market Positioning Intervention',summary:'Improve brand credibility, value proposition, visibility and customer acquisition activity.'},
  'Compliance & Governance':{service:'Business Compliance Rescue',summary:'Identify and prioritise registration, tax, licensing, contracts and governance gaps.'},
  'Funding Readiness':{service:'Funding Readiness Package',summary:'Prepare the business case, numbers, use-of-funds logic and supporting evidence for funding discussions.'},
  'Tender & Procurement Readiness':{service:'Tender Readiness Package',summary:'Strengthen supplier registrations, compliance documents, bid quality and contract-delivery readiness.'},
  'Operations & Systems':{service:'Operations & Systems Improvement Plan',summary:'Improve processes, tracking, record-keeping, owner-independence and delivery control.'},
  'Growth & Scalability':{service:'Growth Accelerator',summary:'Turn growth opportunities, capacity requirements and execution priorities into a coordinated scale plan.'},
  'Multiple business areas':{service:'Growth Accelerator',summary:'Coordinate several weak business areas into one sequenced implementation programme.'}
};

function priorityList(audit={},limit=3){
  return (Array.isArray(audit.priorities)?audit.priorities:[]).slice(0,limit).map((p,index)=>({
    rank:index+1,
    section:p.section,
    percent:Number.isFinite(Number(p.percent))?Number(p.percent):0,
    action:SECTION_ACTIONS[p.section]?.service||p.service||'Business Growth Intervention',
    summary:SECTION_ACTIONS[p.section]?.summary||p.summary||'Focused implementation based on the audit diagnosis.'
  }));
}

function buildGrowthTiers(audit={}){
  const top=priorityList(audit,3);
  const first=top[0]||{section:'highest-priority business gap',action:'Business Growth Focused Fix',summary:'Focused implementation based on the audit diagnosis.'};
  const two=top.slice(0,2).map(p=>p.section).join(' + ')||first.section;
  const three=top.map(p=>p.section).join(' + ')||first.section;
  return [
    {
      tier:'FOCUSED_FIX',code:'growth-focused-fix',service:`Focused Fix — ${first.action}`,amount:3500,
      headline:'Fix the biggest constraint first',
      description:`A focused intervention aimed at ${first.section}, currently your highest-priority audit area.`,
      deliverables:`Priority diagnostic review; corrective actions for ${first.section}; implementation checklist; one execution review; measurable next-step targets.`,
      scopeNote:'Designed for one clearly defined priority area.'
    },
    {
      tier:'GROWTH_SPRINT',code:'growth-sprint-90',service:'90-Day Business Growth Sprint',amount:7500,
      headline:'Fix the top two gaps and build momentum',
      description:`A structured 90-day sprint focused on ${two}.`,
      deliverables:'Top-two priority implementation plan; weekly execution rhythm; commercial actions where relevant; systems and accountability actions; 30/60/90-day milestones; progress review.',
      scopeNote:'Best for businesses ready to implement, measure and improve over 90 days.'
    },
    {
      tier:'IMPLEMENTATION_PROGRAMME',code:'growth-implementation-programme',service:'Business Growth Implementation Programme',amount:10000,
      headline:'Turn the diagnosis into hands-on implementation',
      description:`A broader implementation programme built around ${three}.`,
      deliverables:'Integrated top-three priority plan; implementation support; commercial systems improvement; management actions; performance measures; executive review and next-stage growth roadmap.',
      scopeNote:'R10,000 starting implementation scope. Larger, regulated or specialist work is separately scoped and quoted before commitment.'
    }
  ];
}

function ensureGrowthOffers(audit={}){
  const db=store.read();
  const active=(db.offers||[]).filter(o=>o.auditId===audit.id&&o.source==='growth-tier-engine'&&!['Expired','Cancelled','Superseded'].includes(o.status));
  if(active.length>=3)return active;
  const tiers=buildGrowthTiers(audit);
  const existingByTier=new Map((db.offers||[]).filter(o=>o.auditId===audit.id&&o.source==='growth-tier-engine').map(o=>[o.tier,o]));
  const created=[];
  for(const tier of tiers){
    const existing=existingByTier.get(tier.tier);
    if(existing&&!['Expired','Cancelled'].includes(existing.status)){created.push(existing);continue;}
    created.push(store.insert('offers',{auditId:audit.id,businessName:audit.businessName,clientName:audit.name,clientEmail:audit.email,code:tier.code,tier:tier.tier,service:tier.service,amount:tier.amount,recurring:false,headline:tier.headline,description:tier.description,deliverables:tier.deliverables,scopeNote:tier.scopeNote,status:'Sent',acceptedAt:null,paidAt:null,expiresAt:new Date(Date.now()+7*86400000).toISOString(),source:'growth-tier-engine'}));
  }
  const pct=Number(audit.readinessPercent||0);
  const recommended=tiers[pct>=80?2:pct>=40?1:0];
  store.update('audits',audit.id,{salesStage:'Offer sent',recommendedService:recommended.service,quoteAmount:recommended.amount,nextAction:'Choose the implementation level that fits the business'});
  return created;
}

module.exports={SECTION_ACTIONS,priorityList,buildGrowthTiers,ensureGrowthOffers};
