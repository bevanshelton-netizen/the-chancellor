const store=require('./store');

const SECTION_ACTIONS={
  'Revenue & Commercial Model':{service:'Revenue Model & Profitability Fix',summary:'Improve revenue consistency, offer mix, pricing discipline and repeat-income opportunities.'},
  'Sales & Conversion':{service:'Sales Conversion System',summary:'Strengthen prospecting, quotation follow-up, conversion tracking and sales discipline.'},
  'Marketing & Positioning':{service:'Marketing & Lead Generation',summary:'Sharpen positioning, credibility, campaign activity and measurable lead generation.'},
  'Digital & Automation':{service:'Digital Sales & Automation Upgrade',summary:'Improve digital credibility, lead capture, conversion paths and practical automation.'},
  'Financial Control':{service:'Cash-Flow & Financial Control Programme',summary:'Strengthen records, margins, cash-flow visibility, pricing decisions and financial discipline.'},
  'Compliance & Funding Readiness':{service:'Compliance & Funding Readiness Pack',summary:'Organise statutory compliance, funding evidence and the documents required for larger opportunities.'},
  'Operations & Scale Readiness':{service:'Operations & Scale Programme',summary:'Improve roles, procedures, owner-independence, capacity and delivery systems for sustainable growth.'}
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
      tier:'FOCUSED_FIX',
      code:'growth-focused-fix',
      service:`Focused Fix — ${first.action}`,
      amount:3500,
      headline:'Fix the biggest constraint first',
      description:`A focused intervention aimed at ${first.section}, currently your highest-priority audit area.`,
      deliverables:`Priority diagnostic review; practical corrective actions for ${first.section}; implementation checklist; one execution review; measurable next-step targets.`,
      scopeNote:'Designed for one clearly defined priority area.'
    },
    {
      tier:'GROWTH_SPRINT',
      code:'growth-sprint-90',
      service:'90-Day Business Growth Sprint',
      amount:7500,
      headline:'Fix the top two gaps and build momentum',
      description:`A structured 90-day sprint focused on ${two}.`,
      deliverables:`Top-two priority implementation plan; weekly execution rhythm; sales/revenue actions where relevant; systems and accountability actions; 30/60/90-day milestones; progress review.`,
      scopeNote:'Best for businesses ready to implement, measure and improve over 90 days.'
    },
    {
      tier:'IMPLEMENTATION_PROGRAMME',
      code:'growth-implementation-programme',
      service:'Business Growth Implementation Programme',
      amount:10000,
      headline:'Turn the diagnosis into hands-on implementation',
      description:`A broader implementation programme built around ${three}.`,
      deliverables:`Integrated top-three priority plan; implementation support; commercial systems improvement; management actions; performance measures; executive review and next-stage growth roadmap.`,
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
    created.push(store.insert('offers',{
      auditId:audit.id,
      businessName:audit.businessName,
      clientName:audit.name,
      clientEmail:audit.email,
      code:tier.code,
      tier:tier.tier,
      service:tier.service,
      amount:tier.amount,
      recurring:false,
      headline:tier.headline,
      description:tier.description,
      deliverables:tier.deliverables,
      scopeNote:tier.scopeNote,
      status:'Sent',
      acceptedAt:null,
      paidAt:null,
      expiresAt:new Date(Date.now()+7*86400000).toISOString(),
      source:'growth-tier-engine'
    }));
  }
  const recommended=tiers[Number(audit.score||0)>=115?2:Number(audit.score||0)>=65?1:0];
  store.update('audits',audit.id,{salesStage:'Offer sent',recommendedService:recommended.service,quoteAmount:recommended.amount,nextAction:'Choose the implementation level that fits the business'});
  return created;
}

module.exports={SECTION_ACTIONS,priorityList,buildGrowthTiers,ensureGrowthOffers};
