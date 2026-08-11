const store=require('./store');
const {normalise}=require('./core');

const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const clean=(v,n=500)=>normalise(v).slice(0,n);
const completed=p=>String(p?.status||'').toUpperCase()==='COMPLETE';
const todayKey=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Johannesburg'});
const targets={outreach:30,followup:10,conversation:5,quote:2,close:1};

const campaigns=[
  {
    id:'funding-ready',focus:'funding',name:'Funding Ready',source:'facebook',medium:'social',campaign:'funding_ready',
    hook:'Before you apply for funding, know what a funder will see.',
    facebook:`Applying for business funding? Before you send another application, check whether your business is actually funding-ready.\n\nThe Chancellor's Business Growth Desk helps SMEs identify gaps in their company information, financial readiness, positioning and supporting documents. Start with a structured R500 Business Readiness Audit.\n\nNo promises of funding. Just a clearer, better-prepared next move.`,
    whatsapp:`Are you preparing to apply for business funding? The Chancellor's Business Growth Desk can help you check whether the business is actually ready before you apply. The R500 Business Readiness Audit gives you a structured view of the gaps and the next practical priorities.`,
    linkedin:`Funding readiness is not the same as wanting funding. A credible application needs coherent business information, supporting evidence, financial readiness and a clear use-of-funds story. The Chancellor's Business Growth Desk starts with a R500 readiness audit, then recommends only the next work that makes sense.`,
    radio:`Before your next funding application, ask one question: is the business truly funding-ready? Talk to The Chancellor and start with the R500 Business Readiness Audit.`
  },
  {
    id:'tender-ready',focus:'tender',name:'Tender Ready',source:'facebook',medium:'social',campaign:'tender_ready',
    hook:'Stop discovering your tender gaps on submission day.',
    facebook:`Tender deadlines expose weaknesses fast: missing documents, weak capability evidence, an outdated company profile or unclear delivery capacity.\n\nThe Chancellor's Business Growth Desk helps businesses identify readiness gaps before deadline pressure takes over. Start with the R500 Business Readiness Audit.\n\nWe do not guarantee tenders. We help you prepare more professionally.`,
    whatsapp:`Planning to bid for tenders or contracts? Let us check the business before the deadline pressure starts. The Chancellor's R500 Business Readiness Audit identifies practical gaps in documents, capability, compliance readiness and positioning.`,
    linkedin:`Winning contracts starts before the bid document arrives. Capability, evidence, compliance readiness, positioning and internal delivery capacity should already be organised. The Chancellor's Business Growth Desk gives SMEs a structured readiness starting point.`,
    radio:`Do not wait for tender closing day to discover what your business is missing. Start with The Chancellor's R500 Business Readiness Audit.`
  },
  {
    id:'growth-ready',focus:'growth',name:'Business Growth',source:'whatsapp',medium:'direct-message',campaign:'business_growth',
    hook:'Your business may not need more ideas. It may need the right next move.',
    facebook:`Is your business busy but still not moving forward? The problem may be positioning, sales readiness, documentation, structure or simply not knowing what to fix first.\n\nTalk to The Chancellor. Start with a R500 Business Readiness Audit and get a structured picture of what needs attention next.`,
    whatsapp:`If your business feels stuck, The Chancellor's Business Growth Desk can help you identify the next practical move. Start with the R500 Business Readiness Audit: structured, practical and human-reviewed.`,
    linkedin:`Growth often stalls because the business is trying to fix everything at once. A readiness audit helps separate urgent gaps from nice-to-have improvements and creates a clearer sequence for action.`,
    radio:`If your business feels stuck, talk to The Chancellor. Build. Position. Fund. Grow. Start with the R500 Business Readiness Audit.`
  },
  {
    id:'investor-ready',focus:'investor',name:'Investor Ready',source:'linkedin',medium:'social',campaign:'investor_ready',
    hook:'A good business still needs a credible investment story.',
    facebook:`Looking for investors? A pitch deck alone is not enough. Investors need a coherent business case, market logic, management credibility, financial story, use of funds and evidence.\n\nThe Chancellor's Business Growth Desk starts with a R500 Business Readiness Audit before recommending an investor pack or funding proposal.`,
    whatsapp:`Preparing to approach investors? Start by checking the business story, evidence, numbers, use of funds and readiness gaps. The Chancellor's R500 Business Readiness Audit gives you a structured starting point.`,
    linkedin:`Investor readiness is a business discipline, not a slide-design exercise. The story, evidence, financial logic, market opportunity, team and use of capital have to agree with one another. The Chancellor's Business Growth Desk starts with a structured R500 readiness audit.`,
    radio:`Before you pitch an investor, make sure the business story, evidence and numbers agree. Start with The Chancellor's R500 Business Readiness Audit.`
  }
];

function acquisitionRevenueByReferral(){
  const db=store.read(),links=db.auditAttributions||[],payments=db.payments||[],offers=db.offers||[],offerPayments=db.offerPayments||[];
  const map=new Map();
  for(const link of links){
    const code=String(link.firstTouch?.referralCode||'').trim();if(!code)continue;
    let revenue=payments.filter(p=>p.auditId===link.auditId&&completed(p)).reduce((s,p)=>s+Number(p.amount||500),0);
    const offerIds=offers.filter(o=>o.auditId===link.auditId).map(o=>o.id);
    revenue+=offerPayments.filter(p=>offerIds.includes(p.offerId)&&completed(p)).reduce((s,p)=>s+Number(p.amount||0),0);
    const row=map.get(code)||{code,revenue:0,clients:new Set()};row.revenue+=revenue;if(revenue>0)row.clients.add(link.auditId);map.set(code,row);
  }
  return map;
}
function partnerRows(){
  const revenue=acquisitionRevenueByReferral();
  return (store.read().referralPartners||[]).map(p=>{
    const r=revenue.get(p.code)||{revenue:0,clients:new Set()};
    const rate=Math.max(0,Math.min(100,Number(p.commissionPercent||0)));
    return {...p,attributedRevenue:r.revenue,paidClients:r.clients.size,indicativeCommission:Number((r.revenue*rate/100).toFixed(2))};
  }).sort((a,b)=>b.attributedRevenue-a.attributedRevenue||String(a.name).localeCompare(String(b.name)));
}
function dailySnapshot(){
  const key=todayKey(),actions=(store.read().activationActions||[]).filter(a=>a.day===key);
  const counts={outreach:0,followup:0,conversation:0,quote:0,close:0};
  for(const a of actions)if(counts[a.activity]!==undefined)counts[a.activity]+=Math.max(1,Number(a.quantity||1));
  const totalTarget=Object.values(targets).reduce((s,n)=>s+n,0),totalDone=Object.values(counts).reduce((s,n)=>s+n,0);
  return {day:key,targets,counts,totalTarget,totalDone,completion:totalTarget?Math.min(100,Math.round(totalDone/totalTarget*100)):0,actions:actions.slice().reverse()};
}

module.exports=function registerActivationRoutes(app){
  app.get('/api/admin/activation',requireAdmin,(_req,res)=>res.json({campaigns,daily:dailySnapshot(),partners:partnerRows()}));
  app.post('/api/admin/activation/action',requireAdmin,(req,res)=>{
    const activity=clean(req.body.activity,30).toLowerCase();if(!Object.hasOwn(targets,activity))return res.status(400).json({error:'Choose outreach, followup, conversation, quote or close.'});
    const quantity=Math.min(100,Math.max(1,Number(req.body.quantity||1)));const item=store.insert('activationActions',{day:todayKey(),activity,quantity,campaignId:clean(req.body.campaignId,80),channel:clean(req.body.channel,80),note:clean(req.body.note,800)});
    res.status(201).json({action:item,daily:dailySnapshot()});
  });
  app.post('/api/admin/referral-partners',requireAdmin,(req,res)=>{
    const name=clean(req.body.name,160),code=clean(req.body.code,80).replace(/[^a-zA-Z0-9_-]+/g,'-');if(!name||!code)return res.status(400).json({error:'Partner name and referral code are required.'});
    const db=store.read();if((db.referralPartners||[]).some(p=>p.code.toLowerCase()===code.toLowerCase()))return res.status(409).json({error:'That referral code already exists.'});
    const commissionPercent=Math.min(50,Math.max(0,Number(req.body.commissionPercent||0)));
    const partner=store.insert('referralPartners',{name,code,email:clean(req.body.email,200),phone:clean(req.body.phone,80),status:clean(req.body.status,50)||'Prospect',commissionPercent,agreementNote:clean(req.body.agreementNote,1000)});
    res.status(201).json({partner});
  });
  app.patch('/api/admin/referral-partners/:id',requireAdmin,(req,res)=>{
    const db=store.read(),p=(db.referralPartners||[]).find(x=>x.id===req.params.id);if(!p)return res.status(404).json({error:'Referral partner not found.'});const patch={};
    if(req.body.status!==undefined)patch.status=clean(req.body.status,50);
    if(req.body.commissionPercent!==undefined)patch.commissionPercent=Math.min(50,Math.max(0,Number(req.body.commissionPercent||0)));
    if(req.body.agreementNote!==undefined)patch.agreementNote=clean(req.body.agreementNote,1000);
    res.json({partner:store.update('referralPartners',p.id,patch)});
  });
};
