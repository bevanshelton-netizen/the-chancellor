const SECTION_DEFS = [
  { key:'foundation', name:'Business Foundation', weight:10, questions:[
    ['foundation_offer','Our core offer and target customer are clearly defined.'],
    ['foundation_model','Our business model and revenue streams are clearly understood.'],
    ['foundation_goals','We have documented 12-month business goals and priorities.'],
    ['foundation_management','Roles, responsibilities and decision-making are clear.']
  ]},
  { key:'finance', name:'Finance & Cash Flow', weight:10, questions:[
    ['finance_records','Our bookkeeping and financial records are current.'],
    ['finance_cashflow','We actively monitor cash flow and future cash needs.'],
    ['finance_costing','We understand gross margin, costing and profitability by product/service.'],
    ['finance_budget','We use a budget or management accounts to guide decisions.']
  ]},
  { key:'sales', name:'Sales & Revenue', weight:10, questions:[
    ['sales_pipeline','We have a visible pipeline of leads and opportunities.'],
    ['sales_process','We follow a consistent sales and quotation process.'],
    ['sales_followup','We systematically follow up quotes and prospects.'],
    ['sales_targets','We track sales targets, conversion and revenue performance.']
  ]},
  { key:'marketing', name:'Marketing & Positioning', weight:8, questions:[
    ['marketing_position','Our positioning and value proposition are clear.'],
    ['marketing_plan','We have a practical marketing plan and regular activity.'],
    ['marketing_leads','We know which marketing channels generate qualified leads.'],
    ['marketing_measure','We measure marketing results and return on spend.']
  ]},
  { key:'digital', name:'Digital Presence', weight:8, questions:[
    ['digital_web','We have a credible website or professional online presence.'],
    ['digital_social','Our social channels are current, consistent and branded.'],
    ['digital_conversion','Our digital channels make it easy to enquire, buy or book.'],
    ['digital_data','We use digital tools to capture customer and lead data.']
  ]},
  { key:'compliance', name:'Compliance & Governance', weight:10, questions:[
    ['compliance_registration','Business registrations and statutory records are in order.'],
    ['compliance_tax','Tax and required filings are current or under active professional management.'],
    ['compliance_contracts','We use appropriate contracts, terms and records.'],
    ['compliance_risk','We understand our key legal, regulatory and operating risks.']
  ]},
  { key:'funding', name:'Funding Readiness', weight:8, questions:[
    ['funding_need','We know exactly how much funding we need and what it will be used for.'],
    ['funding_financials','We can provide current financial statements or credible management accounts.'],
    ['funding_case','We can clearly explain the commercial case, repayment or investor return.'],
    ['funding_pack','We have supporting documents funders or investors are likely to request.']
  ]},
  { key:'tender', name:'Tender & Contract Readiness', weight:8, questions:[
    ['tender_profile','We have a current company/capability profile.'],
    ['tender_supplier','Supplier registrations and compliance documents are maintained.'],
    ['tender_response','We can prepare compliant bids and quotations before deadlines.'],
    ['tender_capacity','We can prove capacity, references and delivery capability.']
  ]},
  { key:'operations', name:'Operations & Systems', weight:8, questions:[
    ['operations_process','Key operating procedures are documented and repeatable.'],
    ['operations_capacity','We understand current capacity and bottlenecks.'],
    ['operations_quality','Quality and service standards are monitored.'],
    ['operations_tools','We use suitable systems to manage work, customers and records.']
  ]},
  { key:'people', name:'People & Leadership', weight:6, questions:[
    ['people_roles','Team roles and performance expectations are clear.'],
    ['people_skills','Critical skills gaps are known and being addressed.'],
    ['people_leadership','Leadership reviews performance and follows through on priorities.'],
    ['people_continuity','The business can operate without depending on one person for everything.']
  ]},
  { key:'customer', name:'Customer & Reputation', weight:6, questions:[
    ['customer_fit','We know who our most profitable or valuable customers are.'],
    ['customer_service','We have a consistent customer service process.'],
    ['customer_retention','We actively retain, repeat-sell or cross-sell existing customers.'],
    ['customer_proof','We can show references, testimonials, case studies or proof of delivery.']
  ]},
  { key:'growth', name:'Growth Potential', weight:8, questions:[
    ['growth_opportunity','We can identify the next realistic growth opportunities.'],
    ['growth_capacity','We know what capacity, capital or capability growth will require.'],
    ['growth_metrics','We track the measures that tell us whether growth is healthy.'],
    ['growth_plan','We have a practical 90-day growth execution plan.']
  ]}
];

const SERVICE_MAP = {
  foundation:{service:'Business Foundation Pack',category:'Strategy',indicativeFrom:3500,summary:'Clarify the offer, target market, business model and execution priorities.'},
  finance:{service:'Finance & Cash-Flow Improvement',category:'Finance',indicativeFrom:4500,summary:'Strengthen records, costing, cash-flow visibility and management reporting.'},
  sales:{service:'Sales Growth System',category:'Sales',indicativeFrom:5000,summary:'Build a repeatable lead, quotation, follow-up and conversion process.'},
  marketing:{service:'Marketing & Lead Generation',category:'Marketing',indicativeFrom:5000,summary:'Improve positioning, campaigns, lead generation and measurable marketing activity.'},
  digital:{service:'Digital Presence Upgrade',category:'Digital',indicativeFrom:5000,summary:'Strengthen website, digital credibility, lead capture and conversion paths.'},
  compliance:{service:'Compliance Readiness Pack',category:'Compliance',indicativeFrom:3500,summary:'Organise statutory, contractual and operating compliance requirements.'},
  funding:{service:'Funding Readiness / Investor Pack',category:'Funding',indicativeFrom:7500,summary:'Prepare the business case, evidence and supporting documents expected by funders.'},
  tender:{service:'Tender Readiness Package',category:'Tender',indicativeFrom:4500,summary:'Build supplier, profile, compliance and bid-response readiness.'},
  operations:{service:'Operations Improvement Programme',category:'Operations',indicativeFrom:5000,summary:'Improve procedures, capacity, controls and service delivery systems.'},
  people:{service:'People & Leadership Improvement',category:'People',indicativeFrom:4500,summary:'Clarify roles, performance expectations, skills gaps and management rhythm.'},
  customer:{service:'Customer Growth & Reputation Pack',category:'Customer',indicativeFrom:3500,summary:'Improve retention, service consistency, proof, testimonials and repeat business.'},
  growth:{service:'90-Day Growth Strategy',category:'Growth',indicativeFrom:7500,summary:'Turn the strongest opportunities into a practical, measurable growth plan.'}
};

function answerValue(value){
  const v=String(value ?? '').trim().toLowerCase();
  if(['2','yes','strong','clearly in place','in place'].includes(v)) return 2;
  if(['1','partial','partially','inconsistent','somewhat'].includes(v)) return 1;
  return 0;
}

function bandFor(score){
  if(score >= 80) return {code:'GROWTH_READY',label:'Growth Ready',tone:'green',meaning:'Strong platform for targeted scaling and optimisation.'};
  if(score >= 60) return {code:'NEARLY_READY',label:'Nearly Growth Ready',tone:'amber',meaning:'The business is viable, with several gaps to strengthen before aggressive scaling.'};
  if(score >= 40) return {code:'HIGH_POTENTIAL_NOT_READY',label:'High Growth Potential — Not Yet Growth Ready',tone:'amber',meaning:'There is meaningful potential, but core weaknesses could constrain growth or increase risk.'};
  return {code:'FOUNDATION_FIRST',label:'Foundation First',tone:'red',meaning:'Important readiness gaps should be addressed before taking on greater financial or operational risk.'};
}

function scoreReadiness(input={}){
  const answers=input.answers && typeof input.answers==='object' ? input.answers : input;
  const sections={};
  for(const section of SECTION_DEFS){
    const raw=section.questions.reduce((sum,[id])=>sum+answerValue(answers[id]),0);
    const rawMax=section.questions.length*2;
    const weighted=Number(((raw/rawMax)*section.weight).toFixed(1));
    const percent=Math.round((raw/rawMax)*100);
    sections[section.name]={key:section.key,score:weighted,maxScore:section.weight,percent,raw,rawMax};
  }
  const score=Math.round(Object.values(sections).reduce((sum,s)=>sum+s.score,0));
  const band=bandFor(score);
  const priorities=Object.values(sections)
    .sort((a,b)=>a.percent-b.percent || b.maxScore-a.maxScore)
    .slice(0,3)
    .map(s=>({section:Object.keys(sections).find(name=>sections[name]===s),key:s.key,score:s.score,maxScore:s.maxScore,percent:s.percent,...SERVICE_MAP[s.key]}));
  const recommendations=priorities.map((p,index)=>({priority:index+1,...p}));
  const strongest=Object.entries(sections).sort((a,b)=>b[1].percent-a[1].percent).slice(0,3).map(([section,s])=>({section,...s}));
  const recommendation=`Focus first on ${priorities.map(p=>p.section).join(', ')}. Complete the highest-priority intervention before committing major resources to expansion, funding or large contracts.`;
  return {score,maxScore:100,readinessPercent:score,band:band.label,bandCode:band.code,bandTone:band.tone,bandMeaning:band.meaning,sections,sectionScores:Object.fromEntries(Object.entries(sections).map(([name,s])=>[name,s.score])),priorities,recommendations,strongest,recommendation,engineVersion:'100.1'};
}

function publicDefinition(){
  return SECTION_DEFS.map(({key,name,weight,questions})=>({key,name,weight,questions:questions.map(([id,text])=>({id,text}))}));
}

module.exports={SECTION_DEFS,SERVICE_MAP,answerValue,bandFor,scoreReadiness,publicDefinition};
