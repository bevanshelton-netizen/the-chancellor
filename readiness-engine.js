const ANSWER_OPTIONS = [
  { value: 1, label: 'Not in place' },
  { value: 2, label: 'Very weak' },
  { value: 3, label: 'Partly in place' },
  { value: 4, label: 'Strong' },
  { value: 5, label: 'Fully in place and working well' }
];

const SECTION_DEFS = [
  { key:'foundation', name:'Business Foundation & Strategy', weight:25, questions:[
    ['foundation_registration','The business is formally registered and operating under a clear business structure.'],
    ['foundation_offering','Our main product or service offering is clearly defined.'],
    ['foundation_market','We have a clearly defined target market.'],
    ['foundation_goals','We have clear short-, medium- and long-term business goals.'],
    ['foundation_tracking','Management regularly tracks progress against these goals.']
  ]},
  { key:'finance', name:'Financial Readiness', weight:25, questions:[
    ['finance_records','The business maintains accurate and current financial records.'],
    ['finance_bank','The business uses a separate business bank account.'],
    ['finance_visibility','We know our monthly income and expenses.'],
    ['finance_cashflow','Cash flow is actively monitored.'],
    ['finance_budget','We use budgets, projections or management accounts to guide decisions.']
  ]},
  { key:'sales', name:'Sales & Customer Acquisition', weight:25, questions:[
    ['sales_process','The business has a defined sales process.'],
    ['sales_leads','The business consistently generates new leads.'],
    ['sales_conversion','We know how many leads convert into paying customers.'],
    ['sales_followup','Existing prospects and customers are actively followed up.'],
    ['sales_targets','The business works toward clear monthly sales targets.']
  ]},
  { key:'marketing', name:'Marketing & Brand Positioning', weight:25, questions:[
    ['marketing_brand','The business has a professional and consistent brand.'],
    ['marketing_online','The business has a credible and active online presence.'],
    ['marketing_clarity','Potential customers can quickly understand what the business offers.'],
    ['marketing_activity','The business markets its products or services consistently.'],
    ['marketing_advantage','The business has a clear competitive advantage or value proposition.']
  ]},
  { key:'compliance', name:'Compliance & Governance', weight:25, questions:[
    ['compliance_company','Company registration and statutory records are up to date.'],
    ['compliance_tax','Relevant tax registrations and returns are in order.'],
    ['compliance_licences','Required licences, certificates or industry registrations are current.'],
    ['compliance_contracts','Contracts and important business documents are properly maintained.'],
    ['compliance_requirements','The business understands the compliance requirements relevant to its industry.']
  ]},
  { key:'funding', name:'Funding Readiness', weight:25, questions:[
    ['funding_plan','The business has a current business plan or equivalent growth plan.'],
    ['funding_financials','Financial statements or management accounts are available.'],
    ['funding_amount','We can clearly explain how much funding is required.'],
    ['funding_use','We have a clear use-of-funds plan.'],
    ['funding_case','We can demonstrate how funding would create growth or repayment capacity.']
  ]},
  { key:'tender', name:'Tender & Procurement Readiness', weight:25, questions:[
    ['tender_databases','The business is registered on relevant supplier or procurement databases.'],
    ['tender_documents','Required compliance documents are readily available.'],
    ['tender_submissions','The business can prepare professional quotations and tender submissions.'],
    ['tender_sourcing','We understand how relevant tender and contract opportunities are sourced.'],
    ['tender_capacity','We can demonstrate capacity to deliver contracts successfully.']
  ]},
  { key:'operations', name:'Operations & Systems', weight:25, questions:[
    ['operations_process','Day-to-day business processes are clearly defined and repeatable.'],
    ['operations_tracking','Customer enquiries, quotations and orders are properly tracked.'],
    ['operations_records','The business has reliable record-keeping systems.'],
    ['operations_owner','The business can operate without the owner personally managing every task.'],
    ['operations_control','Suppliers, stock, production or service-delivery processes are properly controlled.']
  ]},
  { key:'growth', name:'Growth & Scalability', weight:25, questions:[
    ['growth_capacity','The business can handle significantly more customers without service failure.'],
    ['growth_resources','We understand the people, systems and capacity needed to grow.'],
    ['growth_returns','Management knows which products or services generate the strongest returns.'],
    ['growth_markets','There are clear opportunities to enter new markets or increase revenue.'],
    ['growth_strategy','The business has a documented growth strategy or 90-day execution plan.']
  ]}
];

const SERVICE_MAP = {
  foundation:{service:'Growth Strategy Session',category:'Strategy',indicativeFrom:1250,summary:'Clarify the business foundation, priorities and practical growth direction.'},
  finance:{service:'Financial & Cash-Flow Readiness Intervention',category:'Finance',indicativeFrom:2500,summary:'Improve financial visibility, records, budgeting and cash-flow control.'},
  sales:{service:'Sales & Marketing Growth Plan',category:'Sales',indicativeFrom:2500,summary:'Build a repeatable lead-generation, follow-up, conversion and sales-target process.'},
  marketing:{service:'Brand & Market Positioning Intervention',category:'Marketing',indicativeFrom:2500,summary:'Strengthen positioning, brand credibility, visibility and customer acquisition.'},
  compliance:{service:'Business Compliance Rescue',category:'Compliance',indicativeFrom:1500,summary:'Identify and prioritise registration, tax, licensing and governance gaps.'},
  funding:{service:'Funding Readiness Package',category:'Funding',indicativeFrom:3500,summary:'Prepare the business case, numbers, use-of-funds and supporting documentation for funding discussions.'},
  tender:{service:'Tender Readiness Package',category:'Tender',indicativeFrom:2500,summary:'Strengthen supplier readiness, documentation, quotation quality and contract-delivery capability.'},
  operations:{service:'Operations & Systems Improvement Plan',category:'Operations',indicativeFrom:3500,summary:'Improve processes, tracking, record-keeping and delivery control.'},
  growth:{service:'Growth Accelerator',category:'Growth',indicativeFrom:7500,summary:'Turn multiple growth constraints into a coordinated implementation programme.'}
};

function answerValue(value){
  const numeric=Number(value);
  if(Number.isFinite(numeric)) return Math.min(5,Math.max(1,Math.round(numeric)));
  const v=String(value ?? '').trim().toLowerCase();
  if(['fully in place','fully','excellent'].includes(v)) return 5;
  if(['strong','mostly'].includes(v)) return 4;
  if(['partial','partly','partially','somewhat'].includes(v)) return 3;
  if(['very weak','weak'].includes(v)) return 2;
  return 1;
}

function bandForPercent(percent){
  if(percent >= 80) return {code:'STRONG_FOUNDATION',label:'STRONG FOUNDATION',tone:'green',meaning:'The business demonstrates strong foundations and should focus on disciplined scaling, market expansion and investment readiness.'};
  if(percent >= 60) return {code:'GROWTH_READY',label:'GROWTH READY',tone:'green',meaning:'The business has a reasonable foundation. Targeted improvements can significantly strengthen its growth potential.'};
  if(percent >= 40) return {code:'NEEDS_ATTENTION',label:'NEEDS ATTENTION',tone:'amber',meaning:'The business has potential, but several weaknesses should be addressed before aggressive growth.'};
  return {code:'CRITICAL',label:'CRITICAL',tone:'red',meaning:'The business currently has major weaknesses that could restrict growth or threaten long-term sustainability.'};
}

function scoreReadiness(input={}){
  const answers=input.answers && typeof input.answers==='object' ? input.answers : input;
  const sections={};
  for(const section of SECTION_DEFS){
    const raw=section.questions.reduce((sum,[id])=>sum+answerValue(answers[id]),0);
    const rawMax=section.questions.length*5;
    const percent=Math.round((raw/rawMax)*100);
    sections[section.name]={key:section.key,score:raw,maxScore:section.weight,percent,raw,rawMax};
  }
  const score=Object.values(sections).reduce((sum,s)=>sum+s.raw,0);
  const maxScore=225;
  const readinessPercent=Math.round((score/maxScore)*100);
  const band=bandForPercent(readinessPercent);
  const ordered=Object.entries(sections).sort((a,b)=>a[1].percent-b[1].percent);
  const priorities=ordered.slice(0,3).map(([section,s])=>({section,key:s.key,score:s.score,maxScore:s.maxScore,percent:s.percent,...SERVICE_MAP[s.key]}));
  const strongest=Object.entries(sections).sort((a,b)=>b[1].percent-a[1].percent).slice(0,2).map(([section,s])=>({section,...s}));
  const weakSections=ordered.filter(([,s])=>s.percent<60);
  const weakest=priorities[0];
  const strongestArea=strongest[0];
  const multipleWeaknesses=weakSections.length>=4;
  const fundingGoal=/fund/i.test(String(input.goal||input.primaryGoal||input.primaryChallenge||''));
  const tenderGoal=/tender|contract|procurement/i.test(String(input.goal||input.primaryGoal||input.primaryChallenge||''));
  let primary=weakest ? {...weakest} : null;
  if(multipleWeaknesses){
    primary={section:'Multiple business areas',key:'growth',percent:weakest?.percent||0,...SERVICE_MAP.growth};
  }else if(fundingGoal && sections['Funding Readiness']?.percent<60){
    primary={section:'Funding Readiness',...sections['Funding Readiness'],...SERVICE_MAP.funding};
  }else if(tenderGoal && sections['Tender & Procurement Readiness']?.percent<60){
    primary={section:'Tender & Procurement Readiness',...sections['Tender & Procurement Readiness'],...SERVICE_MAP.tender};
  }
  const recommendations=primary ? [{priority:1,...primary}] : [];
  const biggestRisk=weakest ? `${weakest.section} is currently the weakest scored area at ${weakest.percent}% readiness.` : 'No priority risk identified.';
  const biggestOpportunity=strongestArea ? `${strongestArea.section} is currently your strongest platform at ${strongestArea.percent}% readiness.` : 'Continue strengthening the business foundation.';
  const priorityIntervention=primary?.service || 'Business Growth Review';
  const recommendation=primary ? `Focus first on ${primary.section}. The recommended next intervention is ${priorityIntervention}.` : 'Maintain disciplined review and focus resources on the highest-value growth opportunity.';
  return {score,maxScore,readinessPercent,band:band.label,bandCode:band.code,bandTone:band.tone,bandMeaning:band.meaning,sections,sectionScores:Object.fromEntries(Object.entries(sections).map(([name,s])=>[name,s.score])),priorities,recommendations,strongest,weakSectionCount:weakSections.length,biggestRisk,biggestOpportunity,priorityIntervention,recommendation,engineVersion:'225.1'};
}

function publicDefinition(){
  return SECTION_DEFS.map(({key,name,weight,questions})=>({key,name,weight,questions:questions.map(([id,text])=>({id,text}))}));
}

module.exports={ANSWER_OPTIONS,SECTION_DEFS,SERVICE_MAP,answerValue,bandForPercent,scoreReadiness,publicDefinition};
