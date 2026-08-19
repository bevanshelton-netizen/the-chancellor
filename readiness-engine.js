const ANSWER_OPTIONS = [
  { value: 0, label: 'Not in place' },
  { value: 2, label: 'Weak / informal' },
  { value: 3, label: 'Working, but inconsistent' },
  { value: 5, label: 'Strong and measured' }
];

const SECTION_DEFS = [
  { key:'revenue', name:'Revenue & Commercial Model', weight:20, questions:[
    ['revenue_consistency','The business generates revenue consistently rather than relying on occasional once-off sales.'],
    ['revenue_visibility','We know our average monthly turnover and actively compare revenue trends.'],
    ['revenue_profitmix','We know which products or services contribute the strongest revenue and profit.'],
    ['revenue_repeat','We have meaningful repeat, recurring or returning-customer income.']
  ]},
  { key:'sales', name:'Sales & Conversion', weight:20, questions:[
    ['sales_process','We have a clear sales process from enquiry to quotation, follow-up and close.'],
    ['sales_followup','Every serious enquiry and quotation is tracked and followed up consistently.'],
    ['sales_measure','We track sales targets, conversion performance and reasons for lost opportunities.'],
    ['sales_prospecting','We proactively look for new customers instead of waiting for business to arrive.']
  ]},
  { key:'marketing', name:'Marketing & Positioning', weight:20, questions:[
    ['marketing_value','Customers can quickly understand what we offer, who it is for and why they should choose us.'],
    ['marketing_brand','Our business presents a credible and professional brand across customer touchpoints.'],
    ['marketing_consistency','We market consistently every week using channels appropriate to our customers.'],
    ['marketing_proof','We actively use testimonials, references, case studies or proof of delivery to build trust.']
  ]},
  { key:'digital', name:'Digital & Automation', weight:20, questions:[
    ['digital_presence','We have a credible website or online presence that accurately represents the business.'],
    ['digital_conversion','Customers can easily enquire, book, buy or pay through our digital channels where appropriate.'],
    ['digital_leads','Our social and digital channels are used commercially to generate and capture leads.'],
    ['digital_systems','We use suitable digital tools, automation or AI to reduce repetitive work and improve customer handling.']
  ]},
  { key:'finance', name:'Financial Control', weight:20, questions:[
    ['finance_records','Our bookkeeping and financial records are accurate and current.'],
    ['finance_margin','We understand costing, gross margin and net profitability well enough to make pricing decisions.'],
    ['finance_cashflow','We actively monitor cash flow and future cash requirements.'],
    ['finance_separation','Business and personal finances are properly separated and controlled.']
  ]},
  { key:'compliance', name:'Compliance & Funding Readiness', weight:20, questions:[
    ['compliance_statutory','Business registrations, annual returns and statutory records are current.'],
    ['compliance_tax','Tax and required filings are current or under active management by an appropriate professional.'],
    ['compliance_funding','We can produce the core financial and business documents a funder or investor would reasonably request.'],
    ['compliance_contracts','Relevant contracts, licences, supplier/tender documents and operating compliance are maintained.']
  ]},
  { key:'operations', name:'Operations & Scale Readiness', weight:20, questions:[
    ['operations_owner','The business can continue operating effectively when the owner is not physically present.'],
    ['operations_roles','Roles, responsibilities and decision-making authority are clear.'],
    ['operations_process','Important operating procedures are documented, repeatable and monitored.'],
    ['operations_capacity','We understand our capacity and could handle material growth without service or quality collapsing.']
  ]}
];

const SERVICE_MAP = {
  revenue:{service:'Business Model & Revenue Growth Sprint',category:'Revenue',indicativeFrom:3500,summary:'Strengthen the offer, revenue mix, pricing logic and repeat-income opportunities.'},
  sales:{service:'Sales Growth System',category:'Sales',indicativeFrom:5000,summary:'Build a repeatable prospecting, quotation, follow-up and conversion system.'},
  marketing:{service:'Marketing & Lead Generation',category:'Marketing',indicativeFrom:5000,summary:'Sharpen positioning, credibility, campaigns and measurable lead generation.'},
  digital:{service:'Digital Sales & Automation Upgrade',category:'Digital',indicativeFrom:7500,summary:'Improve digital credibility, lead capture, online conversion and practical automation.'},
  finance:{service:'Cash-Flow & Financial Control Programme',category:'Finance',indicativeFrom:4500,summary:'Strengthen records, costing, margin visibility, cash-flow control and decision support.'},
  compliance:{service:'Compliance & Funding Readiness Pack',category:'Funding',indicativeFrom:7500,summary:'Organise compliance, business evidence and the core documentation needed for funding or larger opportunities.'},
  operations:{service:'Operations & Scale Programme',category:'Operations',indicativeFrom:7500,summary:'Improve roles, procedures, capacity and systems so growth can be delivered reliably.'}
};

function answerValue(value){
  const v=String(value ?? '').trim().toLowerCase();
  if(['5','strong','strong and measured','clearly in place','in place','yes'].includes(v)) return 5;
  if(['3','working','working, but inconsistent','mostly'].includes(v)) return 3;
  if(['2','weak','weak / informal','partial','partially','inconsistent','somewhat','1'].includes(v)) return 2;
  return 0;
}

function bandFor(score){
  if(score >= 115) return {code:'SCALE_READY',label:'STRONG — SCALE READY',tone:'green',meaning:'The business has a strong operating foundation. The next priority is targeted scaling, optimisation and disciplined expansion.'};
  if(score >= 90) return {code:'GROWTH_OPPORTUNITIES',label:'GOOD — GROWTH OPPORTUNITIES IDENTIFIED',tone:'green',meaning:'The business is functioning well, but identifiable gaps are still leaving revenue, efficiency or growth opportunities on the table.'};
  if(score >= 65) return {code:'INTERVENTION_REQUIRED',label:'VULNERABLE — INTERVENTION REQUIRED',tone:'amber',meaning:'The business has meaningful commercial potential, but important weaknesses should be corrected before aggressive expansion.'};
  if(score >= 40) return {code:'HIGH_RISK',label:'HIGH RISK',tone:'red',meaning:'Material weaknesses are affecting stability. Cash flow, sales, financial control and operational risk should be prioritised before major new commitments.'};
  return {code:'CRITICAL',label:'CRITICAL',tone:'red',meaning:'Immediate stabilisation and prioritisation are required. Avoid major new spending until the most serious commercial and financial weaknesses are understood.'};
}

function scoreReadiness(input={}){
  const answers=input.answers && typeof input.answers==='object' ? input.answers : input;
  const sections={};
  for(const section of SECTION_DEFS){
    const raw=section.questions.reduce((sum,[id])=>sum+answerValue(answers[id]),0);
    const rawMax=section.questions.length*5;
    const weighted=Number(((raw/rawMax)*section.weight).toFixed(1));
    const percent=Math.round((raw/rawMax)*100);
    sections[section.name]={key:section.key,score:weighted,maxScore:section.weight,percent,raw,rawMax};
  }
  const score=Math.round(Object.values(sections).reduce((sum,s)=>sum+s.score,0));
  const maxScore=140;
  const readinessPercent=Math.round((score/maxScore)*100);
  const band=bandFor(score);
  const ordered=Object.entries(sections).sort((a,b)=>a[1].percent-b[1].percent || b[1].maxScore-a[1].maxScore);
  const priorities=ordered.slice(0,3).map(([section,s])=>({section,key:s.key,score:s.score,maxScore:s.maxScore,percent:s.percent,...SERVICE_MAP[s.key]}));
  const recommendations=priorities.map((p,index)=>({priority:index+1,...p}));
  const strongest=Object.entries(sections).sort((a,b)=>b[1].percent-a[1].percent).slice(0,3).map(([section,s])=>({section,...s}));
  const weakest=priorities[0];
  const biggestRisk=weakest ? `${weakest.section} is currently the weakest scored area at ${weakest.percent}% readiness.` : 'No priority risk identified.';
  const biggestOpportunity=weakest ? `${weakest.service}: ${weakest.summary}` : 'Continue strengthening the business foundation.';
  const priorityIntervention=weakest?.service || 'Business Growth Review';
  const recommendation=weakest
    ? `Diagnose first, then implement. Address ${weakest.section} before spreading resources across lower-priority improvements. The recommended first intervention is ${priorityIntervention}.`
    : 'Maintain disciplined review and focus resources on the highest-value growth opportunity.';
  return {score,maxScore,readinessPercent,band:band.label,bandCode:band.code,bandTone:band.tone,bandMeaning:band.meaning,sections,sectionScores:Object.fromEntries(Object.entries(sections).map(([name,s])=>[name,s.score])),priorities,recommendations,strongest,biggestRisk,biggestOpportunity,priorityIntervention,recommendation,engineVersion:'140.1'};
}

function publicDefinition(){
  return SECTION_DEFS.map(({key,name,weight,questions})=>({key,name,weight,questions:questions.map(([id,text])=>({id,text}))}));
}

module.exports={ANSWER_OPTIONS,SECTION_DEFS,SERVICE_MAP,answerValue,bandFor,scoreReadiness,publicDefinition};
