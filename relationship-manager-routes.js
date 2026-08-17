const store=require('./store');

const DAY=86400000;
const now=()=>Date.now();
const iso=()=>new Date().toISOString();
const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const ageDays=v=>v?Math.floor((now()-new Date(v).getTime())/DAY):9999;
const isComplete=p=>String(p?.status||'').toUpperCase()==='COMPLETE';
function key(auditId,type,ref=''){return `${auditId}:${type}:${ref}`}
function existing(db,k){return (db.relationshipActions||[]).find(a=>a.dedupeKey===k&&a.status!=='Done')}
function addAction(db,audit,type,priority,title,message,nextAction,ref=''){
  const k=key(audit.id,type,ref);if(existing(db,k))return null;
  const record=store.insert('relationshipActions',{auditId:audit.id,type,priority,title,message,nextAction,status:'Open',dedupeKey:k,createdAt:iso(),dueAt:iso(),completedAt:null});
  const lead=(db.crmLeads||[]).slice().reverse().find(l=>String(l.email||'').toLowerCase()===String(audit.email||'').toLowerCase()||l.auditId===audit.id);
  if(lead)store.update('crmLeads',lead.id,{nextAction,followUpDate:new Date().toISOString().slice(0,10),notes:`${String(lead.notes||'').slice(0,1400)}\nRelationship Manager: ${title}`.trim().slice(0,1800)});
  store.update('audits',audit.id,{nextAction});
  return record;
}
function scan(){
  const db=store.read();let created=0;
  for(const audit of db.audits||[]){
    const payments=(db.payments||[]).filter(p=>p.auditId===audit.id);
    const paidAudit=payments.some(isComplete);
    const files=(db.files||[]).filter(f=>f.auditId===audit.id);
    const offers=(db.offers||[]).filter(o=>o.auditId===audit.id);
    const assignments=(db.assignments||[]).filter(a=>a.auditId===audit.id);
    const testimonials=(db.testimonials||db.clientTestimonials||[]).filter(t=>t.auditId===audit.id);
    const lastConversation=(db.clientMemoryMessages||[]).filter(m=>m.auditId===audit.id).slice(-1)[0];
    const lastTouch=lastConversation?.createdAt||audit.updatedAt||audit.createdAt;
    if(!paidAudit&&ageDays(audit.createdAt)>=1)created+=Boolean(addAction(db,audit,'audit-unpaid','high','Audit payment outstanding','Your Business Readiness Audit is ready to activate.','Follow up on R500 audit payment'));
    if(paidAudit&&!files.length&&ageDays(payments.find(isComplete)?.createdAt||payments.find(isComplete)?.updatedAt)>=1)created+=Boolean(addAction(db,audit,'documents-missing','high','Supporting documents outstanding','The Chancellor is waiting for the documents needed to continue the review.','Request missing audit documents'));
    for(const offer of offers){
      if(String(offer.status||'').includes('Accepted')&&!offer.status.includes('Paid')&&ageDays(offer.acceptedAt)>=1)created+=Boolean(addAction(db,audit,'accepted-unpaid','urgent','Accepted offer awaiting payment',`${offer.service} was accepted but payment is still outstanding.`,'Follow up for accepted-offer payment',offer.id));
      if(offer.recurring&&offer.status==='Paid'&&ageDays(offer.paidAt)>=25)created+=Boolean(addAction(db,audit,'renewal','medium','Retainer renewal due',`${offer.service} is approaching its next relationship cycle.`,'Discuss renewal / next month priorities',offer.id));
    }
    for(const assignment of assignments){
      const pending=(assignment.checklist||[]).filter(x=>x.status==='Pending');
      if(pending.length&&['Awaiting kickoff','Waiting for client information'].includes(assignment.status)&&ageDays(assignment.createdAt||assignment.startedAt)>=1)created+=Boolean(addAction(db,audit,'assignment-info','high','Assignment waiting on client information',`${assignment.service} is waiting for ${pending.length} information item${pending.length===1?'':'s'}.`,'Request outstanding assignment information',assignment.id));
      if(assignment.status==='Client review'&&ageDays(assignment.updatedAt||assignment.completedAt||assignment.startedAt)>=2)created+=Boolean(addAction(db,audit,'client-review','high','Client approval outstanding',`${assignment.service} is ready for client review.`,'Request approval or revision feedback',assignment.id));
      if(assignment.status==='Completed'&&!testimonials.length&&ageDays(assignment.completedAt)>=1)created+=Boolean(addAction(db,audit,'testimonial','medium','Testimonial opportunity',`${assignment.service} has been completed.`,'Request client testimonial and publication consent',assignment.id));
    }
    if(paidAudit&&ageDays(lastTouch)>=30){
      const d=ageDays(lastTouch);const cycle=d>=90?'90-day':d>=60?'60-day':'30-day';
      created+=Boolean(addAction(db,audit,`growth-${cycle}`,'medium',`${cycle} growth check-in`,'It is time to review progress, priorities and the next growth opportunity.',`Run ${cycle} Chancellor growth check-in`));
    }
  }
  return{created,totalOpen:(store.read().relationshipActions||[]).filter(a=>a.status==='Open').length,scannedAt:iso()};
}
module.exports=function registerRelationshipManager(app){
  app.get('/api/admin/relationship-manager',requireAdmin,(_req,res)=>{const db=store.read();const audits=db.audits||[];const actions=(db.relationshipActions||[]).filter(a=>a.status!=='Done').map(a=>{const audit=audits.find(x=>x.id===a.auditId)||{};return{...a,clientName:audit.name||'',businessName:audit.businessName||'',email:audit.email||'',phone:audit.phone||''}}).sort((a,b)=>({urgent:4,high:3,medium:2,low:1}[b.priority]||0)-({urgent:4,high:3,medium:2,low:1}[a.priority]||0));res.json({ok:true,actions})});
  app.post('/api/admin/relationship-manager/scan',requireAdmin,(_req,res)=>res.json({ok:true,...scan()}));
  app.post('/api/admin/relationship-manager/:id/done',requireAdmin,(req,res)=>{const action=store.update('relationshipActions',req.params.id,{status:'Done',completedAt:iso()});if(!action)return res.status(404).json({error:'Action not found.'});res.json({ok:true,action})});
  app.get('/api/client/relationship-actions',requireClient,(req,res)=>{const actions=(store.read().relationshipActions||[]).filter(a=>a.auditId===req.session.clientId&&a.status==='Open').slice(-5).reverse().map(({id,title,message,nextAction,priority,createdAt})=>({id,title,message,nextAction,priority,createdAt}));res.json({ok:true,actions})});
  return{scan};
};
