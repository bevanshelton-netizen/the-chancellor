const store=require('./store');
const {priorityList,ensureGrowthOffers}=require('./growth-offer-engine');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const money=v=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0};
const paidForAudit=(db,auditId)=>(db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');
function diagnosis(audit){const value=`${audit.band||''} ${audit.bandTone||''}`.toLowerCase();if(value.includes('high performance')||value.includes('scale ready'))return'Your business demonstrates strong readiness. The commercial priority is disciplined scale, capital, partnerships, automation and market expansion while protecting margin and service quality.';if(value.includes('growth ready'))return'Your business has a workable operating base. Targeted implementation in the weakest areas can unlock meaningful growth.';if(value.includes('stabilisation'))return'Your foundations exist, but significant weaknesses are restricting reliable growth. Correct the highest-priority commercial and operating gaps before aggressive scaling.';return'Immediate intervention is recommended. Prioritise survival, cash flow, sales control, compliance and operating stability before expansion.'}
function recommendedTier(audit,offers){const pct=Number(audit.readinessPercent||0),preferred=pct>=78?'IMPLEMENTATION_PROGRAMME':pct>=34?'GROWTH_SPRINT':'FOCUSED_FIX';return offers.find(o=>o.tier===preferred)||offers[0]||null}

module.exports=function registerPostAuditConcierge(app){
  app.get('/api/client/post-audit-concierge',requireClient,(req,res)=>{
    const db=store.read(),audit=(db.audits||[]).find(a=>a.id===req.session.clientId);if(!audit)return res.status(404).json({error:'Audit not found.'});if(!paidForAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 Business Readiness & Growth Audit payment before The Chancellor prepares the implementation options.'});
    const offers=ensureGrowthOffers(audit),recommended=recommendedTier(audit,offers),priorities=priorityList(audit,3);
    res.setHeader('Cache-Control','private, no-store');
    res.json({ok:true,diagnosis:diagnosis(audit),score:Number(audit.score||0),maxScore:Number(audit.maxScore||180),readinessPercent:Number(audit.readinessPercent||0),band:audit.band||'',biggestRisk:audit.biggestRisk||'',biggestOpportunity:audit.biggestOpportunity||'',priorities,recommendation:audit.recommendation||'',recommendedTier:recommended?.tier||'',recommendedService:recommended?.service||'',amount:money(recommended?.amount),offers:offers.map(o=>({id:o.id,tier:o.tier,service:o.service,headline:o.headline,amount:money(o.amount),description:o.description,deliverables:o.deliverables,scopeNote:o.scopeNote,status:o.status,expiresAt:o.expiresAt})),why:recommended?`The Chancellor recommends ${recommended.service} because your readiness score and priority areas indicate this is the most appropriate implementation depth.`:'',nextAction:'Choose the implementation level that matches your needs and budget. Each option is optional and clearly priced before payment.'});
  });
};
