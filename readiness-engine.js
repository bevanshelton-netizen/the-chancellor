const ANSWER_OPTIONS = [
  { value: 0, label: 'Not in place' },
  { value: 1, label: 'Partially / inconsistent' },
  { value: 2, label: 'Clearly in place' }
];

const SECTION_DEFS = [
  { key:'foundation', name:'Business Foundation', weight:20, questions:[
    ['foundation_registration','The business is formally registered and its registration information is current.'],
    ['foundation_purpose','The business has a clearly defined purpose.'],
    ['foundation_vision','The business has a clear vision for where it is going.'],
    ['foundation_objectives','The business has measurable objectives for the next 12 months.'],
    ['foundation_target_market','The target market is clearly defined.'],
    ['foundation_problem','The business clearly understands the customer problem it solves.'],
    ['foundation_model','The business model and how the business makes money are clearly defined.'],
    ['foundation_structure','There is a documented organisational structure.'],
    ['foundation_roles','Management responsibilities and decision-making are clearly allocated.'],
    ['foundation_three_year','The owner knows where the business should be in three years.']
  ]},
  { key:'offering', name:'Products & Services', weight:20, questions:[
    ['offering_defined','Products and services are clearly defined.'],
    ['offering_demand','There is clear evidence of customer demand.'],
    ['offering_value','The value proposition is compelling and easy to explain.'],
    ['offering_pricing','Prices are calculated using costs, margin and customer value rather than guesswork.'],
    ['offering_margin','Product or service margins are known.'],
    ['offering_bestsellers','The business knows which products or services sell best.'],
    ['offering_unprofitable','Unprofitable or low-margin products and services are identified.'],
    ['offering_review','The business regularly reviews and improves its offering.'],
    ['offering_quality','Product or service quality is monitored.'],
    ['offering_revenue_streams','The business has identified realistic additional revenue streams.']
  ]},
  { key:'customers', name:'Customers', weight:20, questions:[
    ['customers_ideal','The business knows its ideal customer.'],
    ['customers_database','The business maintains a usable customer database.'],
    ['customers_repeat','Repeat customers are tracked.'],
    ['customers_feedback','Customer feedback is collected.'],
    ['customers_complaints','Customer complaints are recorded.'],
    ['customers_resolution','Complaints are resolved through a consistent process.'],
    ['customers_choice','The business knows why customers choose it.'],
    ['customers_leave','The business knows the main reasons customers leave or stop buying.'],
    ['customers_satisfaction','Customer satisfaction is measured.'],
    ['customers_retention','There is a deliberate customer-retention and repeat-sales strategy.']
  ]},
  { key:'sales', name:'Sales', weight:20, questions:[
    ['sales_targets','The business has measurable monthly sales targets.'],
    ['sales_weekly','Sales performance is monitored at least weekly.'],
    ['sales_process','There is a documented or clearly understood sales process.'],
    ['sales_owner','A person or team has clear responsibility for sales.'],
    ['sales_leads','Sales leads are recorded and tracked.'],
    ['sales_followup','Leads and prospects are followed up systematically.'],
    ['sales_conversion','The business knows its sales conversion rate or tracks won versus lost opportunities.'],
    ['sales_quotes','Quotations and proposals are followed up consistently.'],
    ['sales_existing','Existing customers are deliberately approached for repeat, cross-sell or upsell opportunities.'],
    ['sales_pipeline','The business maintains a visible sales pipeline.']
  ]},
  { key:'marketing', name:'Marketing', weight:20, questions:[
    ['marketing_brand','The business has a recognisable and consistent brand.'],
    ['marketing_material','The business has professional and current marketing material.'],
    ['marketing_social','Relevant social-media channels are active and maintained.'],
    ['marketing_web','The business has a functioning website or credible online presence.'],
    ['marketing_cta','Marketing includes clear calls to action.'],
    ['marketing_audience','Marketing is directed at a defined target audience.'],
    ['marketing_results','Marketing results are measured.'],
    ['marketing_leads','Marketing generates qualified leads or enquiries consistently.'],
    ['marketing_proof','The business has usable testimonials, reviews or case studies.'],
    ['marketing_plan','There is a practical monthly marketing plan.']
  ]},
  { key:'finance', name:'Finance', weight:20, questions:[
    ['finance_bank','The business has a dedicated business bank account.'],
    ['finance_separation','Business and personal finances are kept separate.'],
    ['finance_bookkeeping','Bookkeeping and financial records are current.'],
    ['finance_management_accounts','The business produces management accounts or equivalent financial reports.'],
    ['finance_turnover','The owner or management knows current monthly turnover.'],
    ['finance_expenses','The owner or management knows monthly operating expenses.'],
    ['finance_gross_profit','The owner or management knows gross profit or gross margin.'],
    ['finance_net_profit','The owner or management knows net profit or whether the business is truly profitable.'],
    ['finance_cashflow','Cash flow is forecast and monitored regularly.'],
    ['finance_working_capital','The business has or is deliberately building adequate working capital or cash reserves.']
  ]},
  { key:'compliance', name:'Compliance & Governance', weight:20, questions:[
    ['compliance_registration','Company registration and ownership information is current.'],
    ['compliance_tax_registration','Required tax registrations are in place.'],
    ['compliance_tax_current','Required tax submissions and payments are current or formally managed.'],
    ['compliance_licences','Required licences, permits or industry registrations are in place.'],
    ['compliance_employment','Employment arrangements and agreements are properly documented where applicable.'],
    ['compliance_contracts','Supplier and customer contracts are used where commercially necessary.'],
    ['compliance_records','Important statutory and business records are stored safely and can be retrieved.'],
    ['compliance_calendar','Statutory and governance obligations are tracked.'],
    ['compliance_insurance','Appropriate business insurance is in place or the need has been formally assessed.'],
    ['compliance_risks','Major business, contractual and regulatory risks are documented and reviewed.']
  ]},
  { key:'operations', name:'Operations & Systems', weight:20, questions:[
    ['operations_procedures','Important business procedures are documented and repeatable.'],
    ['operations_orders','Orders, projects or jobs are tracked from start to completion.'],
    ['operations_stock','Stock or materials are controlled effectively where relevant.'],
    ['operations_suppliers','Suppliers are evaluated and managed.'],
    ['operations_deadlines','Delivery deadlines and turnaround times are monitored.'],
    ['operations_quality','Quality-control processes are used.'],
    ['operations_filing','Business documents and records are organised and easy to retrieve.'],
    ['operations_backup','Important business data is backed up.'],
    ['operations_digital','Suitable digital systems are used to manage work, customers, finance or records.'],
    ['operations_owner_dependence','The business can operate temporarily without the owner being physically present in every task.']
  ]},
  { key:'growth', name:'Funding, Tenders & Growth', weight:20, questions:[
    ['growth_profile','The business has a current and credible company profile or capability statement.'],
    ['growth_business_plan','The business has a current and credible business plan where one is needed.'],
    ['growth_financials','The business has realistic financial projections.'],
    ['growth_documents','Supporting documents required for funding, contracts or due diligence can be produced.'],
    ['growth_funding_ready','The business is funding-ready or knows exactly what must be fixed before applying.'],
    ['growth_tender_ready','The business is tender- or contract-ready where relevant to its market.'],
    ['growth_competitors','The business understands its main competitors and competitive position.'],
    ['growth_opportunities','Realistic expansion opportunities are identified and documented.'],
    ['growth_12_month','The business has a practical 12-month growth plan.'],
    ['growth_milestone','The owner knows the next major measurable growth milestone.']
  ]}
];

const SERVICE_MAP = {
  foundation:{service:'Business Strategy & Structure Pack',category:'Foundation',indicativeFrom:2500,summary:'Clarify purpose, model, priorities, structure and management foundations.'},
  offering:{service:'Pricing & Profitability Review',category:'Commercial',indicativeFrom:2500,summary:'Strengthen the offer, pricing, margins, product focus and additional revenue opportunities.'},
  customers:{service:'Customer Growth System',category:'Customers',indicativeFrom:2500,summary:'Improve customer insight, retention, service, repeat sales and referral generation.'},
  sales:{service:'Sales Growth Intervention',category:'Sales',indicativeFrom:2500,summary:'Build a repeatable lead, quotation, follow-up, conversion and pipeline discipline.'},
  marketing:{service:'Marketing & Lead Generation Plan',category:'Marketing',indicativeFrom:2500,summary:'Improve positioning, campaigns, proof, visibility and measurable lead generation.'},
  finance:{service:'Financial Rescue & Cash Flow Plan',category:'Finance',indicativeFrom:2500,summary:'Strengthen bookkeeping, profitability visibility, cash-flow control, collections and working capital.'},
  compliance:{service:'Compliance Rescue Package',category:'Compliance',indicativeFrom:3500,summary:'Organise statutory, tax, contractual and governance obligations and reduce avoidable risk.'},
  operations:{service:'Operations & Systems Improvement',category:'Operations',indicativeFrom:3500,summary:'Improve procedures, controls, delivery, data, tools and owner independence.'},
  growth:{service:'Funding & Tender Readiness Pack',category:'Growth',indicativeFrom:5000,summary:'Prepare the business case, documentation, projections, capability evidence and growth execution plan.'}
};

const RED_FLAG_RULES = {
  finance_bank:'No dedicated business bank account can weaken financial control and funding readiness.',
  finance_separation:'Mixing personal and business money compromises financial visibility and reporting.',
  finance_bookkeeping:'Out-of-date bookkeeping means management may be making decisions without reliable financial information.',
  finance_gross_profit:'If gross profit is unknown, the business cannot confidently judge whether its pricing and sales are economically sound.',
  finance_net_profit:'If net profit is unknown, growth may increase activity without increasing real profitability.',
  finance_cashflow:'Without a cash-flow forecast, the business is more exposed to unexpected cash shortages.',
  sales_targets:'Without measurable sales targets, sales activity cannot be managed against clear outcomes.',
  sales_followup:'Weak lead follow-up can cause existing opportunities to leak before more marketing is needed.',
  sales_quotes:'Quotations that are not followed up consistently create avoidable revenue leakage.',
  sales_pipeline:'Without a visible sales pipeline, management has poor forward visibility of expected revenue.',
  customers_database:'Without a usable customer database, repeat sales, reactivation and remarketing opportunities are easily lost.',
  compliance_tax_current:'Tax or statutory arrears can obstruct funding, tenders, contracting and normal business operations.',
  operations_backup:'Business data that is not backed up creates a serious continuity risk.',
  operations_owner_dependence:'A business that cannot operate without the owner in every task is not yet truly scalable.',
  growth_12_month:'Without a practical 12-month growth plan, expansion activity can become reactive and unfocused.'
};

function answerValue(value){
  const v=String(value ?? '').trim().toLowerCase();
  if(['2','yes','strong','clearly in place','in place'].includes(v)) return 2;
  if(['1','partial','partially','inconsistent','somewhat'].includes(v)) return 1;
  return 0;
}

function bandForPercent(percent){
  if(percent>=92) return {code:'HIGH_PERFORMANCE',label:'HIGH PERFORMANCE / INVESTMENT READY',tone:'green',meaning:'The business demonstrates strong readiness. Focus on disciplined scale, capital, partnerships, automation and market expansion.'};
  if(percent>=78) return {code:'SCALE_READY',label:'SCALE READY',tone:'green',meaning:'The business has strong fundamentals and should prepare for expansion, larger contracts, funding and new markets.'};
  if(percent>=56) return {code:'GROWTH_READY',label:'GROWTH READY',tone:'amber',meaning:'The business has a workable operating base. Targeted improvements can unlock meaningful growth.'};
  if(percent>=34) return {code:'STABILISATION_REQUIRED',label:'BUSINESS STABILISATION',tone:'amber',meaning:'The foundations exist, but significant weaknesses are restricting reliable growth and should be corrected before aggressive scaling.'};
  return {code:'DISTRESS',label:'BUSINESS DISTRESS',tone:'red',meaning:'Immediate intervention is recommended. Prioritise survival, cash flow, sales control, compliance and operating stability before expansion.'};
}

function categoryStatus(percent){
  if(percent>=80) return 'STRONG';
  if(percent>=60) return 'IMPROVEMENT OPPORTUNITY';
  if(percent>=40) return 'MATERIAL WEAKNESS';
  return 'CRITICAL';
}

function fastestOpportunity(answers, sections){
  const sales=sections.Sales?.percent ?? 100;
  const customers=sections.Customers?.percent ?? 100;
  const marketing=sections.Marketing?.percent ?? 100;
  if(answerValue(answers.sales_quotes)===0 || answerValue(answers.sales_followup)===0) return 'Recover revenue already in the pipeline by improving quotation and prospect follow-up before spending more on lead generation.';
  if(answerValue(answers.customers_repeat)===0 || answerValue(answers.customers_retention)===0) return 'Reactivate existing customers and create repeat, cross-sell and upsell activity before relying only on new-customer acquisition.';
  if(sales<marketing) return 'Strengthen sales conversion and pipeline discipline so current marketing activity produces more cash.';
  if(customers<60) return 'Improve customer retention and repeat revenue to lower the cost of growth.';
  return 'Focus management attention on the weakest readiness category and measure the result before opening additional growth fronts.';
}

function scoreReadiness(input={}){
  const answers=input.answers && typeof input.answers==='object' ? input.answers : input;
  const sections={};
  for(const section of SECTION_DEFS){
    const raw=section.questions.reduce((sum,[id])=>sum+answerValue(answers[id]),0);
    const rawMax=section.questions.length*2;
    const weighted=Number(((raw/rawMax)*section.weight).toFixed(1));
    const percent=Math.round((raw/rawMax)*100);
    sections[section.name]={key:section.key,score:weighted,maxScore:section.weight,percent,raw,rawMax,status:categoryStatus(percent)};
  }
  const score=Math.round(Object.values(sections).reduce((sum,s)=>sum+s.score,0));
  const maxScore=180;
  const readinessPercent=Math.round((score/maxScore)*100);
  const band=bandForPercent(readinessPercent);
  const ordered=Object.entries(sections).sort((a,b)=>a[1].percent-b[1].percent || a[0].localeCompare(b[0]));
  const priorities=ordered.slice(0,3).map(([section,s])=>({section,key:s.key,score:s.score,maxScore:s.maxScore,percent:s.percent,status:s.status,...SERVICE_MAP[s.key]}));
  const recommendations=priorities.map((p,index)=>({priority:index+1,...p}));
  const strongest=Object.entries(sections).sort((a,b)=>b[1].percent-a[1].percent).slice(0,3).map(([section,s])=>({section,...s}));
  const weakestFive=ordered.slice(0,5).map(([section,s])=>({section,...s}));
  const redFlags=Object.entries(RED_FLAG_RULES).filter(([id])=>answerValue(answers[id])===0).map(([id,message])=>({id,message}));
  const criticalCategories=ordered.filter(([,s])=>s.percent<40).map(([section,s])=>({section,...s}));
  const weakest=priorities[0];
  const strongestArea=strongest[0];
  const biggestRisk=redFlags[0]?.message || (weakest ? `${weakest.section} is currently the weakest scored area at ${weakest.percent}% readiness.` : 'No priority risk identified.');
  const biggestOpportunity=fastestOpportunity(answers,sections);
  const multipleCritical=criticalCategories.length>=2;
  const priorityIntervention=multipleCritical ? '30-Day Business Recovery Programme' : (weakest?.service || 'Business Growth Review');
  const recommendation=multipleCritical
    ? `Multiple critical areas were detected. Stabilise the business through a focused 30-Day Business Recovery Programme, beginning with ${priorities.map(p=>p.section).join(', ')}.`
    : weakest ? `Focus first on ${weakest.section}. Implement ${priorityIntervention}, measure the result, then move to the next priority rather than spreading resources across too many fixes at once.`
    : 'Maintain disciplined review and focus resources on the highest-value growth opportunity.';
  return {
    score,maxScore,readinessPercent,band:band.label,bandCode:band.code,bandTone:band.tone,bandMeaning:band.meaning,
    sections,sectionScores:Object.fromEntries(Object.entries(sections).map(([name,s])=>[name,s.score])),
    priorities,recommendations,strongest,weakestFive,redFlags,criticalCategories,biggestRisk,biggestOpportunity,
    priorityIntervention,recommendation,assessmentConfidence:'High',engineVersion:'180.1'
  };
}

function publicDefinition(){
  return SECTION_DEFS.map(({key,name,weight,questions})=>({key,name,weight,questions:questions.map(([id,text])=>({id,text}))}));
}

module.exports={ANSWER_OPTIONS,SECTION_DEFS,SERVICE_MAP,RED_FLAG_RULES,answerValue,bandForPercent,categoryStatus,scoreReadiness,publicDefinition};
