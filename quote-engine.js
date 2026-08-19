const packages={
  foundation:{code:'business-proposal',service:'Growth Strategy & Foundation Intervention',scope:'Clarify the business foundation, priorities and a practical 30–90 day growth direction.'},
  finance:{code:'retainer-starter',service:'Financial & Cash-Flow Readiness Intervention',scope:'Improve financial visibility, records, budgeting, collections and cash-flow control.'},
  sales:{code:'marketing-plan',service:'Sales & Customer Acquisition Intervention',scope:'Build a repeatable lead-generation, follow-up, conversion and sales-target process.'},
  marketing:{code:'marketing-plan',service:'Brand & Market Positioning Intervention',scope:'Strengthen positioning, brand credibility, visibility and customer acquisition.'},
  compliance:{code:'capability',service:'Business Compliance Rescue',scope:'Identify and prioritise registration, tax, licensing, contractual and governance gaps; regulated advice is referred where required.'},
  funding:{code:'funding-proposal',service:'Funding Readiness Implementation',scope:'Prepare the business case, numbers, use-of-funds and supporting documentation for funding discussions.'},
  tender:{code:'tender-support',service:'Tender & Procurement Readiness Implementation',scope:'Strengthen supplier readiness, documentation, quotation quality, bid preparation and contract-delivery capability.'},
  operations:{code:'retainer-growth',service:'Operations & Systems Improvement',scope:'Improve processes, tracking, record-keeping, capacity controls and service delivery.'},
  growth:{code:'retainer-executive',service:'Growth & Scalability Implementation',scope:'Turn growth constraints into a coordinated implementation programme focused on stability, revenue and scale readiness.'}
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

const TIERS={
  focused:{label:'Focused Implementation',amount:3500,code:'retainer-starter'},
  growth:{label:'Growth Implementation',amount:7500,code:'retainer-growth'},
  executive:{label:'Executive Growth Implementation',amount:10000,code:'retainer-executive'}
};

function packageForRecommendation(rec={}){
  const key=rec.key||sectionKeys[rec.section];
  const base=packages[key]||packages.foundation;
  return {...base,service:rec.service||base.service,scope:rec.summary||base.scope,key:key||'foundation'};
}

function weakCount(audit={}){
  if(Number.isFinite(Number(audit.weakSectionCount)))return Number(audit.weakSectionCount);
  return Object.values(audit.sections||{}).filter(s=>Number(s.percent)<60).length;
}

function chooseTier(audit={},primary={}){
  const pct=Number(audit.readinessPercent||0);
  const weak=weakCount(audit);
  if(pct<40||weak>=4)return {key:'executive',...TIERS.executive};
  if(weak>=2||['funding','tender','growth'].includes(primary.key))return {key:'growth',...TIERS.growth};
  return {key:'focused',...TIERS.focused};
}

function uniqueFocusAreas(audit={},rec={}){
  const areas=[rec,...(audit.priorities||[])].filter(Boolean);
  const seen=new Set();
  return areas.filter(p=>{const name=String(p.section||'').trim();if(!name||seen.has(name))return false;seen.add(name);return true});
}

function buildQuoteSuggestion(audit={}){
  const primaryRec=Array.isArray(audit.recommendations)&&audit.recommendations.length?audit.recommendations[0]:null;
  const fallbackPriority=Array.isArray(audit.priorities)&&audit.priorities.length?audit.priorities[0]:null;
  const rec=primaryRec||fallbackPriority||{section:'Business Foundation & Strategy',key:'foundation'};
  const primary=packageForRecommendation(rec);
  const tier=chooseTier(audit,primary);
  const focus=uniqueFocusAreas(audit,rec).slice(0,tier.key==='focused'?1:tier.key==='growth'?2:3);
  const focusNames=focus.map(p=>p.section);
  const focusScopes=focus.map(p=>p.summary||packageForRecommendation(p).scope).filter(Boolean);
  const service=tier.key==='focused'?`${primary.service} — Focused Implementation`:tier.key==='growth'?'Business Growth Implementation Programme':'Executive Business Growth Accelerator';
  const description=`${tier.label} recommended from The Chancellor’s Business Growth Audit. ${focusNames.join(', ')||rec.section||'The highest-priority business area'} requires focused action before the next stage of growth.`;
  const deliverables=focusScopes.join(' ')||primary.scope;
  return {
    code:tier.code||primary.code,
    service,
    amount:tier.amount,
    tier:tier.key,
    tierLabel:tier.label,
    description,
    deliverables,
    primaryPriority:rec.section||'Business Foundation & Strategy',
    supportingPriorities:focusNames.filter(x=>x!==rec.section),
    focusAreas:focusNames,
    readinessPercent:Number(audit.readinessPercent||0),
    weakSectionCount:weakCount(audit),
    expiresInDays:14,
    humanReviewRequired:false
  };
}

module.exports={packages,sectionKeys,TIERS,packageForRecommendation,chooseTier,buildQuoteSuggestion};
