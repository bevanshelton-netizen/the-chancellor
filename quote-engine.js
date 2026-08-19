const packages={
  foundation:{code:'business-proposal',service:'Business Strategy & Structure Pack',amount:2500,scope:'Clarify purpose, business model, priorities, structure and management foundations.'},
  offering:{code:'business-proposal',service:'Pricing & Profitability Review',amount:2500,scope:'Strengthen the offer, pricing, margins, product focus and additional revenue opportunities.'},
  customers:{code:'marketing-plan',service:'Customer Growth System',amount:2500,scope:'Improve customer insight, retention, service, repeat sales, cross-selling and referral generation.'},
  sales:{code:'marketing-plan',service:'Sales Growth Intervention',amount:2500,scope:'Build a repeatable lead, quotation, follow-up, conversion and sales-pipeline discipline.'},
  marketing:{code:'marketing-plan',service:'Marketing & Lead Generation Plan',amount:2500,scope:'Improve positioning, campaigns, proof, visibility and measurable lead generation.'},
  finance:{code:'retainer-starter',service:'Financial Rescue & Cash Flow Plan',amount:2500,scope:'Strengthen bookkeeping, profitability visibility, cash-flow control, collections and working capital.'},
  compliance:{code:'capability',service:'Compliance Rescue Package',amount:3500,scope:'Organise statutory, tax, contractual and governance obligations and reduce avoidable business risk; regulated advice is referred where required.'},
  operations:{code:'retainer-growth',service:'Operations & Systems Improvement',amount:3500,scope:'Improve procedures, controls, delivery, data, tools and owner independence.'},
  growth:{code:'funding-proposal',service:'Funding & Tender Readiness Pack',amount:5000,scope:'Prepare the business case, documentation, projections, capability evidence and growth execution plan.'}
};

const sectionKeys={
  'Business Foundation':'foundation',
  'Products & Services':'offering',
  'Customers':'customers',
  'Sales':'sales',
  'Marketing':'marketing',
  'Finance':'finance',
  'Compliance & Governance':'compliance',
  'Operations & Systems':'operations',
  'Funding, Tenders & Growth':'growth',
  'Multiple business areas':'growth',
  // Compatibility with audits created under earlier engine versions.
  'Business Foundation & Strategy':'foundation',
  'Financial Readiness':'finance',
  'Sales & Customer Acquisition':'sales',
  'Marketing & Brand Positioning':'marketing',
  'Funding Readiness':'growth',
  'Tender & Procurement Readiness':'growth',
  'Growth & Scalability':'growth'
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
  const rec=primaryRec||fallbackPriority||{section:'Business Foundation',key:'foundation'};
  let primary=packageForRecommendation(rec);
  const criticalCount=Array.isArray(audit.criticalCategories)?audit.criticalCategories.length:0;
  if(audit.priorityIntervention==='30-Day Business Recovery Programme'||criticalCount>=2){
    primary={code:'retainer-growth',service:'30-Day Business Recovery Programme',amount:2500,scope:'Stabilise the most urgent financial, sales, compliance or operating weaknesses through a focused 30-day implementation plan.',key:'growth'};
  }
  const supporting=(audit.priorities||[]).filter(p=>p.section!==rec.section).slice(0,2).map(p=>p.section);
  const description=`${primary.service}, recommended from the Business Readiness Audit because ${rec.section||'the highest-priority business area'} requires focused action first.`;
  return {
    code:primary.code,
    service:primary.service,
    amount:primary.amount,
    description,
    deliverables:primary.scope,
    primaryPriority:rec.section||'Business Foundation',
    supportingPriorities:supporting,
    expiresInDays:14,
    humanReviewRequired:false
  };
}

module.exports={packages,sectionKeys,packageForRecommendation,buildQuoteSuggestion};
