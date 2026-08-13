const packages={
  'Business Foundation':{code:'business-proposal',service:'Business Foundation & Positioning Pack',amount:3500,scope:'Clarify the business offer, target customer, positioning, 12-month priorities and core business narrative.'},
  'Finance & Cash Flow':{code:'retainer-starter',service:'Cash-Flow & Management Improvement Sprint',amount:2500,scope:'Strengthen financial visibility, cash-flow planning, costing discipline and management routines.'},
  'Sales':{code:'retainer-growth',service:'Sales Growth System',amount:4500,scope:'Build a practical lead pipeline, quotation follow-up process, sales targets and customer-retention rhythm.'},
  'Marketing':{code:'marketing-plan',service:'Marketing & Lead Generation Plan',amount:3500,scope:'Clarify market positioning, channels, weekly campaigns, lead generation and measurement.'},
  'Compliance':{code:'capability',service:'Business Compliance Readiness Pack',amount:2500,scope:'Organise the business compliance checklist, operating records and contract-readiness documents; regulated advice is referred where required.'},
  'Funding Readiness':{code:'funding-proposal',service:'Funding Readiness Pack',amount:6500,scope:'Prepare the funding case, use-of-funds narrative, supporting document checklist and funder-ready proposal structure.'},
  'Tender & Contract Readiness':{code:'tender-support',service:'Tender & Contract Readiness Package',amount:6500,scope:'Strengthen supplier readiness, company profile, compliance pack, bid response process and pricing discipline.'},
  'Operations':{code:'retainer-growth',service:'Operations Improvement Programme',amount:4500,scope:'Document priority procedures, capacity controls, supplier routines, service standards and operational accountability.'},
  'Growth Potential':{code:'retainer-growth',service:'90-Day Growth Strategy',amount:4500,scope:'Define the strongest expansion opportunities and convert them into a 90-day capacity, sales and execution plan.'}
};

function buildQuoteSuggestion(audit={}){
  const priorities=Array.isArray(audit.priorities)?audit.priorities:[];
  const primary=priorities.map(p=>packages[p.section]).find(Boolean)||packages['Business Foundation'];
  const supporting=priorities.slice(1,3).map(p=>packages[p.section]).filter(Boolean);
  const extras=supporting.map(x=>x.service).filter(x=>x!==primary.service);
  const deliverables=[primary.scope,...supporting.map(x=>x.scope)].filter(Boolean).join(' ');
  const description=extras.length?`${primary.service}, with supporting attention to ${extras.join(' and ')} based on the Business Readiness Audit.`:`${primary.service}, recommended from the Business Readiness Audit.`;
  return {code:primary.code,service:primary.service,amount:primary.amount,description,deliverables,primaryPriority:priorities[0]?.section||'Business Foundation',supportingPriorities:priorities.slice(1,3).map(p=>p.section),expiresInDays:14,humanReviewRequired:true};
}

module.exports={packages,buildQuoteSuggestion};
