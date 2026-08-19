const store=require('./store');
const {priorityList,ensureGrowthOffers}=require('./growth-offer-engine');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const money=v=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0};
const paidForAudit=(db,auditId)=>(db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');

function diagnosis(audit){
  const value=`${audit.band||''} ${audit.bandTone||''}`.toLowerCase();
  if(value.includes('scale ready')||value.includes('green'))return 'Your business has a strong operating base. The commercial priority is disciplined execution: strengthen the weakest areas while protecting margin, customer experience and cash flow as you scale.';
  if(value.includes('growth opportunities'))return 'Your business is functioning well, but the audit identifies specific areas where better execution can unlock more revenue, stronger margins or easier scale.';
  if(value.includes('vulnerable')||value.includes('amber'))return 'Your business has meaningful commercial potential, but important weaknesses should be corrected before aggressive expansion. Focus first on the strongest constraint shown by the audit.';
  if(value.includes('high risk'))return 'Material weaknesses are affecting stability. Prioritise the most urgent commercial and financial controls before taking on larger commitments.';
  return 'Immediate stabilisation and prioritisation are required. Address the most serious commercial and financial weaknesses before increasing operational or financial risk.';
}

function recommendedTier(audit,offers){
  const score=Number(audit.score||0);
  const preferred=score>=115?'IMPLEMENTATION_PROGRAMME':score>=65?'GROWTH_SPRINT':'FOCUSED_FIX';
  return offers.find(o=>o.tier===preferred)||offers[0]||null;
}

module.exports=function registerPostAuditConcierge(app){
  app.get('/api/client/post-audit-concierge',requireClient,(req,res)=>{
    const db=store.read();
    const audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
    if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidForAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 Business Growth Audit payment before The Chancellor prepares the implementation options.'});

    const offers=ensureGrowthOffers(audit);
    const recommended=recommendedTier(audit,offers);
    const priorities=priorityList(audit,3);
    res.setHeader('Cache-Control','private, no-store');
    res.json({
      ok:true,
      diagnosis:diagnosis(audit),
      score:Number(audit.score||0),
      maxScore:Number(audit.maxScore||140),
      readinessPercent:Number(audit.readinessPercent||0),
      band:audit.band||'',
      biggestRisk:audit.biggestRisk||'',
      biggestOpportunity:audit.biggestOpportunity||'',
      priorities,
      recommendation:audit.recommendation||'',
      recommendedTier:recommended?.tier||'',
      recommendedService:recommended?.service||'',
      amount:money(recommended?.amount),
      offers:offers.map(o=>({id:o.id,tier:o.tier,service:o.service,headline:o.headline,amount:money(o.amount),description:o.description,deliverables:o.deliverables,scopeNote:o.scopeNote,status:o.status,expiresAt:o.expiresAt})),
      why:recommended?`The Chancellor recommends ${recommended.service} because the score and the top audit priorities indicate this is the most appropriate implementation depth.`:'',
      nextAction:'Choose the implementation level that matches your needs and budget. Each option remains optional and clearly priced before payment.'
    });
  });
};
