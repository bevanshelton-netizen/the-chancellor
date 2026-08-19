const store=require('./store');
const {priorityList,ensureGrowthOffers}=require('./growth-offer-engine');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const money=v=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0};
const paidForAudit=(db,auditId)=>(db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');

function diagnosis(audit){
  const value=`${audit.band||''} ${audit.bandTone||''}`.toLowerCase();
  if(value.includes('strong foundation'))return 'Your business demonstrates strong foundations. The commercial priority is disciplined scaling, market expansion and stronger investment readiness while protecting margin and service quality.';
  if(value.includes('growth ready')||value.includes('green'))return 'Your business has a reasonable operating foundation. Targeted implementation in the weakest areas can materially strengthen growth potential and commercial performance.';
  if(value.includes('needs attention')||value.includes('amber'))return 'Your business has potential, but several weaknesses should be corrected before aggressive growth. Start with the highest-priority constraint shown by the audit.';
  return 'The audit shows major weaknesses that could restrict growth or threaten long-term sustainability. Prioritise stabilisation and the most important control gaps before increasing risk.';
}
function recommendedTier(audit,offers){
  const pct=Number(audit.readinessPercent||0);
  const preferred=pct>=80?'IMPLEMENTATION_PROGRAMME':pct>=40?'GROWTH_SPRINT':'FOCUSED_FIX';
  return offers.find(o=>o.tier===preferred)||offers[0]||null;
}

module.exports=function registerPostAuditConcierge(app){
  app.get('/api/client/post-audit-concierge',requireClient,(req,res)=>{
    const db=store.read(),audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
    if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidForAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 Business Readiness & Growth Audit payment before The Chancellor prepares the implementation options.'});
    const offers=ensureGrowthOffers(audit),recommended=recommendedTier(audit,offers),priorities=priorityList(audit,3);
    res.setHeader('Cache-Control','private, no-store');
    res.json({ok:true,diagnosis:diagnosis(audit),score:Number(audit.score||0),maxScore:Number(audit.maxScore||225),readinessPercent:Number(audit.readinessPercent||0),band:audit.band||'',biggestRisk:audit.biggestRisk||'',biggestOpportunity:audit.biggestOpportunity||'',priorities,recommendation:audit.recommendation||'',recommendedTier:recommended?.tier||'',recommendedService:recommended?.service||'',amount:money(recommended?.amount),offers:offers.map(o=>({id:o.id,tier:o.tier,service:o.service,headline:o.headline,amount:money(o.amount),description:o.description,deliverables:o.deliverables,scopeNote:o.scopeNote,status:o.status,expiresAt:o.expiresAt})),why:recommended?`The Chancellor recommends ${recommended.service} because your readiness score and priority areas indicate this is the most appropriate implementation depth.`:'',nextAction:'Choose the implementation level that matches your needs and budget. Each option is optional and clearly priced before payment.'});
  });
};
