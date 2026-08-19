const packages={
  foundation:{code:'business-proposal',service:'Growth Strategy Session',amount:1250,scope:'Clarify the business foundation, priorities and a practical 30–90 day growth direction.'},
  finance:{code:'retainer-starter',service:'Financial & Cash-Flow Readiness Intervention',amount:2500,scope:'Improve financial visibility, records, budgeting, collections and cash-flow control.'},
  sales:{code:'marketing-plan',service:'Sales & Marketing Growth Plan',amount:2500,scope:'Build a repeatable lead-generation, follow-up, conversion and sales-target process.'},
  marketing:{code:'marketing-plan',service:'Brand & Market Positioning Intervention',amount:2500,scope:'Strengthen positioning, brand credibility, visibility and customer acquisition.'},
  compliance:{code:'capability',service:'Business Compliance Rescue',amount:1500,scope:'Identify and prioritise registration, tax, licensing, contractual and governance gaps; regulated advice is referred where required.'},
  funding:{code:'funding-proposal',service:'Funding Readiness Package',amount:3500,scope:'Prepare the business case, numbers, use-of-funds and supporting documentation for funding discussions.'},
  tender:{code:'tender-support',service:'Tender Readiness Package',amount:2500,scope:'Strengthen supplier readiness, documentation, quotation quality, bid preparation and contract-delivery capability.'},
  operations:{code:'retainer-growth',service:'Operations & Systems Improvement Plan',amount:3500,scope:'Improve processes, tracking, record-keeping, capacity controls and service delivery.'},
  growth:{code:'retainer-executive',service:'Growth Accelerator',amount:7500,scope:'Turn multiple growth constraints into a coordinated implementation programme focused on stability, revenue and scale readiness.'}
};

const sectionKeys={
  'Business Foundation & Strategy':'foundation',
  'Financial Readiness':'finance',
  'Sales & Customer Acquisition':'sales',
  'Marketing & Brand Positioning':'marketing',
  'Compliance & Governance':'compliance',
  'Funding Readiness':'funding',
  'Tender & Procurement Readiness':'tender',
  'Operations & Systems':'operations',
  'Growth & Scalability':'growth',
  'Multiple business areas':'growth'
};

function packageForRecommendation(rec={}){
  const key=rec.key||sectionKeys[rec.section];
  const base=packages[key]||packages.foundation;
  return {
    ...base,
    service:rec.service||base.service,
    amount:Number(rec.indicativeFrom||base.amount),
    scope:rec.summary||base.scope,
    key:key||'foundation'
  };
}

function buildQuoteSuggestion(audit={}){
  const primaryRec=Array.isArray(audit.recommendations)&&audit.recommendations.length?audit.recommendations[0]:null;
  const fallbackPriority=Array.isArray(audit.priorities)&&audit.priorities.length?audit.priorities[0]:null;
  const rec=primaryRec||fallbackPriority||{section:'Business Foundation & Strategy',key:'foundation'};
  const primary=packageForRecommendation(rec);
  const supporting=(audit.priorities||[]).filter(p=>p.section!==rec.section).slice(0,2).map(p=>p.section);
  const description=`${primary.service}, recommended from the Business Readiness Audit because ${rec.section||'the highest-priority business area'} requires focused action first.`;
  return {
    code:primary.code,
    service:primary.service,
    amount:primary.amount,
    description,
    deliverables:primary.scope,
    primaryPriority:rec.section||'Business Foundation & Strategy',
    supportingPriorities:supporting,
    expiresInDays:14,
    humanReviewRequired:false
  };
}

module.exports={packages,sectionKeys,packageForRecommendation,buildQuoteSuggestion};