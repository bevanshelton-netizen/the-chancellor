const SECTION_DEFS = [
  { key:'foundation', name:'Business Foundation', weight:10, questions:[
    ['foundation_registration','Our business registration, ownership structure and banking arrangements are in order.'],
    ['foundation_compliance','We know which statutory, tax and industry compliance requirements apply to us.'],
    ['foundation_goals','We have clear 12-month business goals and immediate priorities.'],
    ['foundation_management','Roles, responsibilities and decision-making are clear.'],
    ['foundation_records','Important company, supplier and operating records are organised and current.']
  ]},
  { key:'offering', name:'Product / Service', weight:10, questions:[
    ['offering_clarity','Our main product or service and the problem it solves are clearly defined.'],
    ['offering_demand','We have evidence that customers genuinely want or need what we sell.'],
    ['offering_pricing','Our pricing is based on costs, margin and customer value rather than guesswork.'],
    ['offering_margin','We know which products or services are most profitable.'],
    ['offering_focus','We know which offers should receive the most sales and marketing attention.']
  ]},
  { key:'sales', name:'Sales', weight:10, questions:[
    ['sales_pipeline','We have a visible pipeline of leads and opportunities.'],
    ['sales_process','We follow a consistent sales, quotation and closing process.'],
    ['sales_followup','We systematically follow up quotations and prospects.'],
    ['sales_targets','We track sales targets, conversion and revenue performance.'],
    ['sales_activity','We carry out deliberate sales activity every week.']
  ]},
  { key:'marketing', name:'Marketing & Brand', weight:10, questions:[
    ['marketing_position','Our brand and value proposition clearly explain why customers should choose us.'],
    ['marketing_presence','Our website, social channels or other public presence look credible and current.'],
    ['marketing_plan','We have a practical marketing plan and regular activity.'],
    ['marketing_leads','We know which channels generate qualified enquiries.'],
    ['marketing_measure','We measure marketing results and improve what is not working.']
  ]},
  { key:'finance', name:'Cash Flow & Finance', weight:10, questions:[
    ['finance_records','Our bookkeeping and financial records are current.'],
    ['finance_cashflow','We actively monitor cash coming in, cash going out and future cash needs.'],
    ['finance_margin','We understand gross margin, costing and profitability.'],
    ['finance_collections','We have a disciplined invoicing and debt-collection process.'],
    ['finance_budget','We use a budget, management accounts or similar information to guide decisions.']
  ]},
  { key:'customers', name:'Customers', weight:10, questions:[
    ['customers_target','We clearly know our ideal and most valuable customers.'],
    ['customers_service','We have a consistent customer service process.'],
    ['customers_retention','We actively retain, repeat-sell or cross-sell existing customers.'],
    ['customers_referrals','We deliberately ask for referrals, reviews or testimonials.'],
    ['customers_feedback','We capture customer feedback and act on recurring issues.']
  ]},
  { key:'operations', name:'Operations', weight:10, questions:[
    ['operations_process','Key operating procedures are documented and repeatable.'],
    ['operations_capacity','We understand current capacity and bottlenecks.'],
    ['operations_suppliers','Important suppliers and service providers are reliable and managed.'],
    ['operations_quality','Quality, turnaround times and service standards are monitored.'],
    ['operations_tools','We use suitable systems and technology to manage work, customers and records.']
  ]},
  { key:'people', name:'People & Capacity', weight:10, questions:[
    ['people_roles','Team roles and performance expectations are clear.'],
    ['people_skills','Critical skills gaps are known and being addressed.'],
    ['people_accountability','People are held accountable for agreed actions and results.'],
    ['people_owner_dependence','The business can operate without the owner being involved in every task.'],
    ['people_capacity','We know what people, outsourcing or capacity will be needed to grow.']
  ]},
  { key:'growth', name:'Growth Readiness', weight:10, questions:[
    ['growth_opportunity','We can identify the next realistic growth opportunities.'],
    ['growth_capacity','We know what capital, capacity and capability growth will require.'],
    ['growth_funding','We can explain how much funding or investment is required and what it would achieve, if funding is needed.'],
    ['growth_contracts','We are able to demonstrate delivery capability for larger customers, contracts or opportunities.'],
    ['growth_plan','We have a practical 90-day growth execution plan.']
  ]}
];

const SERVICE_MAP = {
  foundation:{service:'Business Foundation & Compliance Pack',category:'Foundation',indicativeFrom:3500,summary:'Strengthen structure, records, compliance priorities and management foundations.'},
  offering:{service:'Offer, Pricing & Profitability Fix',category:'Commercial',indicativeFrom:3500,summary:'Clarify the offer, improve pricing and focus the business on profitable demand.'},
  sales:{service:'30-Day Sales & Lead Conversion Rescue',category:'Sales',indicativeFrom:3500,summary:'Build a repeatable lead, quotation, follow-up and conversion process.'},
  marketing:{service:'Marketing & Lead Generation',category:'Marketing',indicativeFrom:3500,summary:'Improve positioning, campaigns, visibility and measurable lead generation.'},
  finance:{service:'Cash-Flow & Finance Improvement',category:'Finance',indicativeFrom:3500,summary:'Strengthen records, margins, collections, cash-flow visibility and management reporting.'},
  customers:{service:'Customer Growth & Retention Pack',category:'Customers',indicativeFrom:3500,summary:'Improve customer fit, service, retention, referrals and repeat revenue.'},
  operations:{service:'Operations Improvement Programme',category:'Operations',indicativeFrom:5000,summary:'Improve procedures, capacity, supplier controls and service delivery systems.'},
  people:{service:'People & Capacity Improvement',category:'People',indicativeFrom:4500,summary:'Clarify roles, accountability, skills gaps and the capacity needed for growth.'},
  growth:{service:'90-Day Growth Strategy',category:'Growth',indicativeFrom:7500,summary:'Turn the strongest opportunities into a practical, measurable growth plan.'}
};

function answerValue(value){
  const v=String(value ?? '').trim().toLowerCase();
  if(['2','yes','strong','clearly in place','in place'].includes(v)) return 2;
  if(['1','partial','partially','inconsistent','somewhat'].includes(v)) return 1;
  return 0;
}

function bandFor(score){
  if(score >= 70) return {code:'SCALE_READY',label:'SCALE READY',tone:'green',meaning:'The business has a strong foundation. Focus on targeted expansion, stronger revenue and disciplined scaling.'};
  if(score >= 50) return {code:'GROWTH_POTENTIAL',label:'GROWTH POTENTIAL',tone:'amber',meaning:'The business has a workable base, but identifiable bottlenecks should be strengthened before aggressive scaling.'};
  if(score >= 30) return {code:'REBUILD_REQUIRED',label:'REBUILD REQUIRED',tone:'amber',meaning:'Several weaknesses are restricting sustainable growth. Prioritise the most important commercial and operating fixes first.'};
  return {code:'URGENT_ACTION_REQUIRED',label:'URGENT ACTION REQUIRED',tone:'red',meaning:'Material business-readiness gaps require immediate attention before taking on greater financial or operating risk.'};
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
  const maxScore=90;
  const readinessPercent=Math.round((score/maxScore)*100);
  const band=bandFor(score);
  const priorities=Object.values(sections)
    .sort((a,b)=>a.percent-b.percent || b.maxScore-a.maxScore)
    .slice(0,3)
    .map(s=>({section:Object.keys(sections).find(name=>sections[name]===s),key:s.key,score:s.score,maxScore:s.maxScore,percent:s.percent,...SERVICE_MAP[s.key]}));
  const recommendations=priorities.map((p,index)=>({priority:index+1,...p}));
  const strongest=Object.entries(sections).sort((a,b)=>b[1].percent-a[1].percent).slice(0,3).map(([section,s])=>({section,...s}));
  const recommendation=`Focus first on ${priorities.map(p=>p.section).join(', ')}. Solve the highest-priority constraint, measure the result, then move to the next intervention.`;
  return {score,maxScore,readinessPercent,band:band.label,bandCode:band.code,bandTone:band.tone,bandMeaning:band.meaning,sections,sectionScores:Object.fromEntries(Object.entries(sections).map(([name,s])=>[name,s.score])),priorities,recommendations,strongest,recommendation,engineVersion:'90.2'};
}

function publicDefinition(){
  return SECTION_DEFS.map(({key,name,weight,questions})=>({key,name,weight,questions:questions.map(([id,text])=>({id,text}))}));
}

module.exports={SECTION_DEFS,SERVICE_MAP,answerValue,bandFor,scoreReadiness,publicDefinition};