const store=require('./store');
const {normalise}=require('./core');

const requireClient=(req,res,next)=>req.session?.clientId?next():res.status(401).json({error:'Please sign in to continue.'});
const clean=(v,max=1600)=>String(v??'').trim().replace(/[\u0000-\u001F\u007F]/g,'').slice(0,max);
const money=n=>Number(Number(n||0).toFixed(2));
const resumeRe=/^(?:continue(?: where we left off)?|continue|resume|proceed|next|carry on|go on|yes|ok|okay)$/i;

function complete(list=[]){return list.filter(x=>String(x.status||'').toUpperCase()==='COMPLETE')}
function clientUniverse(db,audit){
  const email=String(audit.email||'').toLowerCase();
  const phone=String(audit.phone||'').replace(/\D/g,'');
  const audits=(db.audits||[]).filter(a=>a.id===audit.id||String(a.email||'').toLowerCase()===email||(phone&&String(a.phone||'').replace(/\D/g,'')===phone));
  const auditIds=new Set(audits.map(a=>a.id));
  const offers=(db.offers||[]).filter(o=>auditIds.has(o.auditId));
  const assignments=(db.assignments||[]).filter(a=>auditIds.has(a.auditId));
  const assignmentIds=new Set(assignments.map(a=>a.id));
  const files=(db.files||[]).filter(f=>auditIds.has(f.auditId));
  const deliverables=(db.deliverables||[]).filter(f=>assignmentIds.has(f.assignmentId));
  const payments=(db.payments||[]).filter(p=>auditIds.has(p.auditId));
  const offerPayments=(db.offerPayments||[]).filter(p=>auditIds.has(p.auditId));
  const testimonials=(db.testimonials||db.clientTestimonials||[]).filter(t=>auditIds.has(t.auditId));
  const sessions=(db.conciergeSessions||[]).filter(s=>String(s.email||'').toLowerCase()===email||(phone&&String(s.phone||'').replace(/\D/g,'')===phone));
  const messages=(db.clientMemoryMessages||[]).filter(m=>auditIds.has(m.auditId)).slice(-30);
  return{audits,offers,assignments,files,deliverables,payments,offerPayments,testimonials,sessions,messages};
}
function currentFocus(audit,u){
  const openAssignment=u.assignments.slice().reverse().find(a=>a.status!=='Completed');
  if(openAssignment)return{stage:'Delivery',headline:openAssignment.service,nextAction:openAssignment.clientMessage||`Continue ${openAssignment.service}`,progress:Number(openAssignment.progress||0)};
  const awaiting=u.offers.slice().reverse().find(o=>!['Paid','Expired','Cancelled'].includes(String(o.status||'')));
  if(awaiting)return{stage:'Offer',headline:awaiting.service,nextAction:String(awaiting.status||'').includes('Accepted')?'Complete payment':'Review and accept your offer',progress:0};
  const paid=complete(u.payments).some(p=>p.auditId===audit.id);
  if(!paid)return{stage:'Audit',headline:'Business Readiness Audit',nextAction:'Complete the R500 audit payment',progress:0};
  return{stage:audit.salesStage||'Growth Desk',headline:audit.recommendedService||'Your growth plan',nextAction:audit.nextAction||'Review the next growth opportunity',progress:100};
}
function memorySummary(audit,u){
  const paidAudit=complete(u.payments).reduce((s,p)=>s+money(p.amount),0);
  const paidOffers=complete(u.offerPayments).reduce((s,p)=>s+money(p.amount),0);
  const goals=[...new Set(u.audits.map(a=>clean(a.goal,300)).filter(Boolean))].slice(-3);
  const services=u.offers.filter(o=>o.status==='Paid').map(o=>o.service).filter(Boolean);
  const completed=u.assignments.filter(a=>a.status==='Completed').map(a=>a.service).filter(Boolean);
  const lastSession=u.sessions.slice().sort((a,b)=>new Date(b.lastActiveAt||0)-new Date(a.lastActiveAt||0))[0];
  return{
    clientName:audit.name||'',businessName:audit.businessName||'',industry:audit.industry||'',goals,
    readiness:{score:Number(audit.score||0),percent:Number(audit.readinessPercent||0),band:audit.band||'',priorities:(audit.priorities||[]).slice(0,3)},
    relationship:{audits:u.audits.length,paidServices:services.length,completedServices:completed.length,totalPaid:paidAudit+paidOffers,documents:u.files.length,deliverables:u.deliverables.length},
    services,completed,lastConversation:lastSession?.lastActiveAt||null,current:currentFocus(audit,u)
  };
}
function contextText(m){
  const priorities=(m.readiness.priorities||[]).map(p=>`${p.section} ${p.score}/10`).join(', ');
  return `Client: ${m.clientName}. Business: ${m.businessName}. Industry: ${m.industry||'not stated'}. Goals: ${m.goals.join(' | ')||'not stated'}. Readiness: ${m.readiness.score}/90 (${m.readiness.band}); priorities: ${priorities||'none recorded'}. Paid services: ${m.services.join(', ')||'none yet'}. Completed: ${m.completed.join(', ')||'none yet'}. Total paid: R${m.relationship.totalPaid.toFixed(2)}. Current stage: ${m.current.stage}. Current focus: ${m.current.headline}. Next action: ${m.current.nextAction}.`;
}

module.exports=function registerClientMemoryRoutes(app){
  app.get('/api/client/memory',requireClient,(req,res)=>{
    const db=store.read(),audit=(db.audits||[]).find(a=>a.id===req.session.clientId);
    if(!audit)return res.status(404).json({error:'Client record not found.'});
    const u=clientUniverse(db,audit),memory=memorySummary(audit,u);
    res.setHeader('Cache-Control','private, no-store');
    res.json({ok:true,memory,messages:u.messages.map(({id,auditId,role,content,createdAt})=>({id,auditId,role,content,createdAt}))});
  });

  app.post('/api/client/memory/message',requireClient,async(req,res)=>{
    const message=clean(req.body?.message,1500);if(!message)return res.status(400).json({error:'Enter a message for The Chancellor.'});
    let db=store.read(),audit=(db.audits||[]).find(a=>a.id===req.session.clientId);if(!audit)return res.status(404).json({error:'Client record not found.'});
    let u=clientUniverse(db,audit),memory=memorySummary(audit,u);
    store.insert('clientMemoryMessages',{auditId:audit.id,role:'user',content:message,createdAt:new Date().toISOString()});

    if(resumeRe.test(message)&&memory.current.stage==='Audit'&&/R500 audit payment/i.test(memory.current.nextAction||'')){
      const reply='We are exactly where we left off: your Business Readiness Audit is ready and the R500 payment is still pending. I am opening the secure PayFast checkout now.';
      store.insert('clientMemoryMessages',{auditId:audit.id,role:'assistant',content:reply,createdAt:new Date().toISOString()});
      return res.json({ok:true,reply,memory,action:{type:'payfast_checkout'}});
    }

    let reply='';
    if(process.env.OPENAI_API_KEY){
      try{
        const history=u.messages.slice(-8).map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}));
        const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',instructions:`You are The Chancellor, the client's continuing AI business adviser. You have authorised private client-memory context. Use it naturally so the client does not need to repeat known facts. Be warm, concise and commercially practical. Never claim a payment, document, result or service that is not in the supplied context. Ask at most one focused question at a time. Do not promise funding, tenders, legal, tax or financial outcomes. Regulated matters must be routed to appropriately qualified professionals. Current memory context: ${contextText(memory)}`,input:[...history,{role:'user',content:message}]})});
        if(response.ok){const out=await response.json();reply=clean(out.output_text,2200)}
      }catch(error){console.error('Client memory AI failed:',error.message)}
    }
    if(!reply){
      const first=clean(audit.name,80).split(' ')[0]||'there';
      reply=`${first}, I remember ${audit.businessName||'your business'} and your current focus is ${memory.current.headline}. ${memory.current.nextAction}. What would you like me to help you move forward with now?`;
    }
    store.insert('clientMemoryMessages',{auditId:audit.id,role:'assistant',content:reply,createdAt:new Date().toISOString()});
    db=store.read();u=clientUniverse(db,audit);res.json({ok:true,reply,memory:memorySummary(audit,u)});
  });

  app.post('/api/client/memory/preference',requireClient,(req,res)=>{
    const note=clean(req.body?.note,500);if(!note)return res.status(400).json({error:'Add a preference or ongoing goal.'});
    const audit=store.update('audits',req.session.clientId,{relationshipNote:note});if(!audit)return res.status(404).json({error:'Client record not found.'});
    res.json({ok:true,note:audit.relationshipNote});
  });
};
