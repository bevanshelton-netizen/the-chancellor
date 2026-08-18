const store=require('./store');
const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const n=v=>Number(v||0);
const complete=v=>String(v||'').toUpperCase()==='COMPLETE';
const round=(v,d=0)=>{const p=10**d;return Math.round(n(v)*p)/p};
const key=(source,medium,campaign,ref='')=>[source||'direct',medium||'none',campaign||'organic',ref||''].join('|');

function channelData(){
  const db=store.read(),rows=new Map();
  const visitors=db.acquisitionVisitors||[],links=db.auditAttributions||[],payments=db.payments||[],offers=db.offers||[],offerPayments=db.offerPayments||[],leads=db.acquisitionLeads||[],crmLeads=db.crmLeads||[],quotes=db.crmQuotes||[],quotePayments=db.crmQuotePayments||[],spend=db.campaignSpend||[];
  const ensure=(touch={})=>{const source=touch.source||'direct',medium=touch.medium||'none',campaign=touch.campaign||'organic',referralCode=touch.referralCode||'',k=key(source,medium,campaign,referralCode);if(!rows.has(k))rows.set(k,{key:k,source,medium,campaign,referralCode,visitors:0,leads:0,paidAudits:0,quotes:0,wins:0,revenue:0,spend:0});return rows.get(k)};
  visitors.forEach(v=>ensure(v.firstTouch||{}).visitors++);
  leads.forEach(l=>ensure(l.touch||{}).leads++);
  links.forEach(link=>{const r=ensure(link.firstTouch||{}),paid=payments.filter(p=>p.auditId===link.auditId&&complete(p.status));if(paid.length){r.paidAudits++;r.revenue+=paid.reduce((s,p)=>s+n(p.amount||500),0)}const offerIds=offers.filter(o=>o.auditId===link.auditId).map(o=>o.id);r.revenue+=offerPayments.filter(p=>offerIds.includes(p.offerId)&&complete(p.status)).reduce((s,p)=>s+n(p.amount),0)});
  crmLeads.forEach(l=>{const r=ensure({source:l.source||'crm',medium:'crm',campaign:l.campaign||l.category||'pipeline'});r.leads++;const qs=quotes.filter(q=>q.leadId===l.id);r.quotes+=qs.length;qs.forEach(q=>{const paid=quotePayments.filter(p=>p.quoteId===q.id&&String(p.status||'').toUpperCase()!=='INITIATED').reduce((s,p)=>s+n(p.amount),0);r.revenue+=paid;if(n(q.amount)>0&&paid>=n(q.amount))r.wins++})});
  spend.forEach(s=>ensure(s).spend+=n(s.amount));
  return [...rows.values()].map(r=>{const roas=r.spend>0?r.revenue/r.spend:null,roi=r.spend>0?(r.revenue-r.spend)/r.spend*100:null,conversions=r.paidAudits+r.wins,evidence=r.leads+r.paidAudits*3+r.wins*4+r.quotes;let confidence='LOW';if(evidence>=12&&r.spend>=500)confidence='HIGH';else if(evidence>=5||r.spend>=250)confidence='MEDIUM';let decision='TEST';if(r.spend>0&&r.revenue===0)decision='PAUSE / FIX';else if(roi!==null&&roi>=100&&conversions>0)decision='SCALE';else if(roi!==null&&roi>=0)decision='HOLD';else if(r.revenue>0&&r.spend===0)decision='SCALE ORGANIC';return{...r,roas:roas===null?null:round(roas,2),roi:roi===null?null:round(roi,1),conversions,evidence,confidence,decision}});
}
function weight(c){
  if(c.decision==='PAUSE / FIX')return 0;
  if(c.decision==='SCALE')return Math.max(5,Math.min(18,(c.roas||1)*3+c.conversions*2+(c.confidence==='HIGH'?4:c.confidence==='MEDIUM'?2:0)));
  if(c.decision==='HOLD')return Math.max(2,Math.min(7,(c.roas||1)*2+c.conversions));
  if(c.decision==='SCALE ORGANIC')return Math.max(2,Math.min(5,1+c.conversions+c.leads/5));
  return c.leads||c.visitors?1.5:0.7;
}
function buildPlan(amount){
  amount=Math.max(0,Math.min(50000,round(amount)));
  const channels=channelData(),eligible=channels.filter(c=>c.decision!=='PAUSE / FIX'&&(c.leads||c.visitors||c.revenue||c.spend)).sort((a,b)=>weight(b)-weight(a));
  if(!amount)return{budget:0,allocated:0,reserve:0,confidence:'LOW',summary:'Choose a budget to generate an allocation plan.',allocations:[],projectedRevenue:null,disclaimer:'Projections are directional and are not guarantees.'};
  if(!eligible.length)return{budget:amount,allocated:0,reserve:amount,confidence:'LOW',summary:'There is not enough conversion evidence to deploy this budget safely yet. Keep it in reserve and gather channel data first.',allocations:[],projectedRevenue:null,disclaimer:'Do not spend merely to create data; use small controlled tests with trackable calls to action.'};
  const strong=eligible.filter(c=>c.decision==='SCALE'),measured=eligible.filter(c=>c.spend>0),sparse=strong.length===0||measured.length<1;
  const deployRate=sparse?0.6:0.9,deploy=Math.round(amount*deployRate/50)*50||Math.min(amount,50),reserve=Math.max(0,amount-deploy),pool=eligible.slice(0,Math.min(5,eligible.length));
  const totalWeight=pool.reduce((s,c)=>s+weight(c),0)||1;let allocations=pool.map(c=>{let share=weight(c)/totalWeight;const maxShare=c.decision==='SCALE'&&c.confidence==='HIGH'?0.6:c.decision==='SCALE'?0.5:c.decision==='HOLD'?0.35:0.2;share=Math.min(share,maxShare);return{channel:c,raw:deploy*share}});
  let rawTotal=allocations.reduce((s,a)=>s+a.raw,0);if(rawTotal<deploy){let remainder=deploy-rawTotal;for(const a of allocations){const cap=(a.channel.decision==='SCALE'&&a.channel.confidence==='HIGH'?0.6:a.channel.decision==='SCALE'?0.5:a.channel.decision==='HOLD'?0.35:0.2)*deploy-a.raw;if(cap>0){const add=Math.min(cap,remainder);a.raw+=add;remainder-=add;if(remainder<=0)break}}}
  allocations=allocations.filter(a=>a.raw>=25).map(a=>{const allocated=Math.max(50,Math.round(a.raw/50)*50),c=a.channel,observedRoas=c.roas&&c.roas>0?c.roas:null;let mode='TEST';if(c.decision==='SCALE')mode='FUND';else if(c.decision==='HOLD')mode='CONTROLLED';else if(c.decision==='SCALE ORGANIC')mode='AMPLIFY';return{key:c.key,label:`${c.source} / ${c.campaign}`,source:c.source,campaign:c.campaign,amount:allocated,mode,confidence:c.confidence,decision:c.decision,observed:{spend:round(c.spend),revenue:round(c.revenue),roi:c.roi,roas:c.roas,leads:c.leads,paidAudits:c.paidAudits,wins:c.wins},projectedRevenue:observedRoas?round(allocated*observedRoas):null,reason:c.decision==='SCALE'?`Best measured return: ${c.roi}% ROI with ${c.conversions} recorded conversion${c.conversions===1?'':'s'}.`:c.decision==='HOLD'?`Positive or break-even evidence, but scale cautiously until more conversions are observed.`:c.decision==='SCALE ORGANIC'?`This source is producing tracked revenue without recorded paid spend; use a small amplification test.`:`Use only a small measurable test until this source proves it can convert.`}});
  let allocated=allocations.reduce((s,a)=>s+a.amount,0);if(allocated>deploy&&allocations.length){let over=allocated-deploy;for(let i=allocations.length-1;i>=0&&over>0;i--){const reducible=Math.max(0,allocations[i].amount-50),cut=Math.min(reducible,Math.ceil(over/50)*50);allocations[i].amount-=cut;over-=cut}allocations=allocations.filter(a=>a.amount>0);allocated=allocations.reduce((s,a)=>s+a.amount,0)}
  const projected=allocations.some(a=>a.projectedRevenue!==null)?round(allocations.reduce((s,a)=>s+(a.projectedRevenue||0),0)):null;
  const confidence=strong.some(c=>c.confidence==='HIGH')?'HIGH':strong.length||eligible.some(c=>c.confidence==='MEDIUM')?'MEDIUM':'LOW';
  return{budget:amount,allocated,reserve:amount-allocated,confidence,summary:sparse?`Deploy only ${allocated} now and retain R${amount-allocated} as reserve. Evidence is still developing, so use staged tests and review results before releasing the balance.`:`Deploy R${allocated} across the best evidenced channels and keep R${amount-allocated} in reserve for optimisation after fresh results.`,allocations,projectedRevenue:projected,disclaimer:'Projected revenue uses historical observed ROAS where available. It is directional, may not repeat, and is not a guarantee of sales or return.'};
}
module.exports=function registerGrowthBudget(app){
  app.get('/api/admin/growth-budget',requireAdmin,(req,res)=>{const requested=n(req.query.amount||1000);const amount=[500,1000,5000].includes(requested)?requested:Math.max(100,Math.min(50000,requested));res.setHeader('Cache-Control','no-store');res.json({ok:true,plan:buildPlan(amount),presets:[500,1000,5000].map(buildPlan),generatedAt:new Date().toISOString()})});
};
