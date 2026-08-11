const store=require('./store');

const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));
const nowIso=()=>new Date().toISOString();

module.exports=function registerNotificationRoutes(app){
  function identity(req){
    if(req.session?.admin)return{key:'admin',role:'admin'};
    if(req.session?.professionalId)return{key:`professional:${req.session.professionalId}`,role:'professional',professionalId:req.session.professionalId};
    if(req.session?.rescueCaseId)return{key:`client:${req.session.rescueCaseId}`,role:'client',caseId:req.session.rescueCaseId};
    return null;
  }
  const event=(key,type,title,message,createdAt,href='',priority='normal')=>({key,type,title,message,createdAt:createdAt||nowIso(),href,priority});
  function build(req,user){
    const d=store.read();const out=[];const cases=d.rescueCases||[],messages=d.caseMessages||[],docs=d.caseDocuments||[],milestones=d.caseMilestones||[],appointments=d.caseAppointments||[],quotes=d.caseQuotes||[],payments=d.casePayments||[],pros=d.professionals||[],payouts=d.casePayouts||[];
    if(user.role==='client'){
      const c=cases.find(x=>x.id===user.caseId);if(!c)return[];
      if(c.assignedProfessionalId)out.push(event(`assign:${c.id}:${c.assignedProfessionalId}`,'case','Professional assigned',`${c.assignedProfessional||'A verified professional'} has been assigned to ${c.caseNumber}.`,c.updatedAt||c.createdAt,'/rescue-portal.html','high'));
      messages.filter(x=>x.caseId===c.id&&x.authorRole!=='Client').forEach(x=>out.push(event(`message:${x.id}`,'message','New case message',`${x.authorName}: ${String(x.message||'').slice(0,140)}`,x.createdAt,'/rescue-portal.html')));
      docs.filter(x=>x.caseId===c.id&&x.uploadedByRole!=='Client').forEach(x=>out.push(event(`document:${x.id}`,'document','New case document',`${x.uploadedByName||'Your professional'} uploaded ${x.originalName}.`,x.createdAt,'/rescue-portal.html')));
      milestones.filter(x=>x.caseId===c.id).forEach(x=>out.push(event(`milestone:${x.id}:${x.updatedAt||x.createdAt}`,'milestone',`Milestone: ${x.title}`,`${x.status}${x.dueAt?` · due ${new Date(x.dueAt).toLocaleDateString('en-ZA')}`:''}`,x.updatedAt||x.createdAt,'/rescue-portal.html')));
      appointments.filter(x=>x.caseId===c.id).forEach(x=>out.push(event(`appointment:${x.id}:${x.updatedAt||x.createdAt}`,'appointment',x.title,`Appointment ${x.status||'Scheduled'} · ${new Date(x.scheduledAt).toLocaleString('en-ZA')}`,x.updatedAt||x.createdAt,'/rescue-portal.html','high')));
      quotes.filter(x=>x.caseId===c.id).forEach(x=>out.push(event(`quote:${x.id}:${x.status}`,'billing',`Fee quote ${x.quoteNumber}`,`${money(x.amount)} · ${x.status}`,x.updatedAt||x.createdAt,'/rescue-portal.html',String(x.status).includes('approval')?'high':'normal')));
      payments.filter(x=>x.caseId===c.id&&String(x.status).toUpperCase()==='COMPLETE').forEach(x=>out.push(event(`payment:${x.id}:complete`,'payment','Payment received',`${money(x.amount)} has been recorded against your case.`,x.updatedAt||x.createdAt,'/rescue-portal.html')));
    }
    if(user.role==='professional'){
      const p=pros.find(x=>x.id===user.professionalId);const assigned=cases.filter(x=>x.assignedProfessionalId===user.professionalId);
      assigned.forEach(c=>out.push(event(`assign:${c.id}:${user.professionalId}`,'case','New matched case',`${c.caseNumber} · ${String(c.type||'').toUpperCase()} · ${money(c.amount)} involved.`,c.updatedAt||c.createdAt,'/professional-portal.html','high')));
      const ids=new Set(assigned.map(x=>x.id));
      messages.filter(x=>ids.has(x.caseId)&&x.authorRole!=='Professional').forEach(x=>out.push(event(`message:${x.id}`,'message','New case message',`${x.authorName}: ${String(x.message||'').slice(0,140)}`,x.createdAt,'/professional-portal.html')));
      docs.filter(x=>ids.has(x.caseId)&&x.uploadedByRole!=='Professional').forEach(x=>out.push(event(`document:${x.id}`,'document','Client document uploaded',`${x.uploadedByName||'Client'} uploaded ${x.originalName}.`,x.createdAt,'/professional-portal.html')));
      quotes.filter(x=>ids.has(x.caseId)&&!String(x.status).includes('Awaiting client approval')).forEach(x=>out.push(event(`quote:${x.id}:${x.status}`,'billing','Quote status changed',`${x.quoteNumber} · ${x.status}`,x.updatedAt||x.createdAt,'/professional-portal.html','high')));
      payments.filter(x=>ids.has(x.caseId)&&String(x.status).toUpperCase()==='COMPLETE').forEach(x=>out.push(event(`payment:${x.id}:complete`,'payment','Client payment received',`${money(x.amount)} has been recorded for a case fee.`,x.updatedAt||x.createdAt,'/professional-portal.html','high')));
      if(p?.subscriptionStatus==='Active'&&p.subscriptionRenewsAt){const days=Math.ceil((new Date(p.subscriptionRenewsAt)-Date.now())/86400000);if(days>=0&&days<=7)out.push(event(`renewal:${p.id}:${p.subscriptionRenewsAt}`,'membership','Membership renewal approaching',`${p.membershipTier} renews in ${days} day${days===1?'':'s'}.`,p.updatedAt||p.createdAt,'/professional-portal.html',days<=2?'high':'normal'));}
    }
    if(user.role==='admin'){
      cases.filter(c=>Number(c.triage?.score||0)>=80&&!['Resolved','Closed'].includes(c.status)&&!c.assignedProfessionalId).forEach(c=>out.push(event(`admin-critical:${c.id}:${c.updatedAt||c.createdAt}`,'case','Critical case needs assignment',`${c.caseNumber} · ${c.name} · urgency ${Number(c.triage?.score||0)}/100.`,c.updatedAt||c.createdAt,'/admin.html','urgent')));
      pros.filter(p=>String(p.verificationStatus||'').toLowerCase()!=='verified').forEach(p=>out.push(event(`vetting:${p.id}:${p.credentialReviewStatus||p.verificationStatus}`,'membership','Professional awaiting vetting',`${p.name} · ${p.profession} · ${p.credentialReviewStatus||p.verificationStatus}.`,p.updatedAt||p.createdAt,'/admin.html')));
      pros.filter(p=>p.subscriptionStatus==='Active'&&p.subscriptionRenewsAt).forEach(p=>{const days=Math.ceil((new Date(p.subscriptionRenewsAt)-Date.now())/86400000);if(days>=0&&days<=7)out.push(event(`renewal-admin:${p.id}:${p.subscriptionRenewsAt}`,'membership','Member renewal due soon',`${p.name} · ${p.membershipTier} · ${days} day${days===1?'':'s'} remaining.`,p.updatedAt||p.createdAt,'/admin.html'));});
      payouts.filter(p=>p.status==='Pending payout'||p.status==='Approved for payout').forEach(p=>out.push(event(`payout:${p.id}:${p.status}`,'payment','Professional payout requires attention',`${money(p.amount)} · ${p.status}.`,p.updatedAt||p.createdAt,'/admin.html','high')));
      payments.filter(p=>String(p.status).toUpperCase()==='COMPLETE').slice(-30).forEach(p=>out.push(event(`admin-payment:${p.id}`,'payment','Case payment received',`${money(p.amount)} received for a professional case fee.`,p.updatedAt||p.createdAt,'/admin.html')));
    }
    return out.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,100);
  }
  app.get('/api/notifications',(req,res)=>{const user=identity(req);if(!user)return res.status(401).json({error:'Sign in to view notifications.'});const reads=(store.read().notificationReads||[]).filter(x=>x.userKey===user.key);const readKeys=new Set(reads.map(x=>x.eventKey));const notifications=build(req,user).map(x=>({...x,read:readKeys.has(x.key)}));res.json({role:user.role,unread:notifications.filter(x=>!x.read).length,notifications,channels:{inApp:true,emailConfigured:Boolean(process.env.SMTP_HOST||process.env.RESEND_API_KEY),smsConfigured:Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN)}});});
  app.post('/api/notifications/:key/read',(req,res)=>{const user=identity(req);if(!user)return res.status(401).json({error:'Sign in to update notifications.'});const key=String(req.params.key||'').slice(0,500);const exists=(store.read().notificationReads||[]).some(x=>x.userKey===user.key&&x.eventKey===key);if(!exists)store.insert('notificationReads',{userKey:user.key,eventKey:key,readAt:nowIso()});res.json({ok:true});});
  app.post('/api/notifications/read-all',(req,res)=>{const user=identity(req);if(!user)return res.status(401).json({error:'Sign in to update notifications.'});const d=store.read();const existing=new Set((d.notificationReads||[]).filter(x=>x.userKey===user.key).map(x=>x.eventKey));build(req,user).forEach(x=>{if(!existing.has(x.key))store.insert('notificationReads',{userKey:user.key,eventKey:x.key,readAt:nowIso()});});res.json({ok:true});});
};
