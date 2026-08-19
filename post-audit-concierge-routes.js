const store=require('./store');
const {buildQuoteSuggestion}=require('./quote-engine');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const paidForAudit=(db,auditId)=>(db.payments||[]).some(p=>p.auditId===auditId&&String(p.status||'').toUpperCase()==='COMPLETE');

function diagnosis(audit){
  const pct=Number(audit.readinessPercent||0);
  if(pct>=80)return 'Your business shows strong foundations. The next priority is disciplined scaling while protecting the systems and controls that already work.';
  if(pct>=60)return 'Your business is growth ready, but targeted improvements can materially improve its ability to scale and convert opportunities.';
  if(pct>=40)return 'Your business has potential, but several weaknesses should be strengthened before aggressive growth or additional financial pressure.';
  return 'Your audit shows critical readiness gaps. Immediate corrective implementation should come before taking on greater financial, contractual or operating risk.';
}

module.exports=function registerPostAuditConcierge(app){
  app.get('/api/client/post-audit-concierge',requireClient,(req,res)=>{
    const db=store.read(),audit=(db.audits||[]).find(a=>a.id===req.session.clientId);if(!audit)return res.status(404).json({error:'Audit not found.'});
    if(!paidForAudit(db,audit.id))return res.status(402).json({error:'Complete the R500 audit payment before The Chancellor prepares the post-audit recommendation.'});
    const q=buildQuoteSuggestion(audit);
    const top=(audit.priorities||[]).slice(0,3).map(p=>({section:p.section,score:Number(p.score||0),maxScore:Number(p.maxScore||25),percent:Number.isFinite(Number(p.percent))?Number(p.percent):Math.round((Number(p.score||0)/Number(p.maxScore||25))*100)}));
    res.setHeader('Cache-Control','private, no-store');
    res.json({ok:true,diagnosis:diagnosis(audit),score:Number(audit.score||0),maxScore:Number(audit.maxScore||225),readinessPercent:Number(audit.readinessPercent||0),band:audit.band||'',priorities:top,recommendation:audit.recommendation||'',recommendedService:q.service,amount:Number(q.amount),tier:q.tier,tierLabel:q.tierLabel,focusAreas:q.focusAreas,why:q.description,nextAction:'Download your implementation proposal, review the recommended offer in your portal, and pay securely when you are ready to proceed.'});
  });
};
