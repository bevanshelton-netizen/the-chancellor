const store=require('./store');

const HOUR=60*60*1000;
const DAY=24*HOUR;
const priorityRank={critical:4,high:3,medium:2,low:1};

function ageMs(value){const t=new Date(value||0).getTime();return Number.isFinite(t)?Math.max(0,Date.now()-t):0;}
function isComplete(p){return String(p?.status||'').toUpperCase()==='COMPLETE';}
function dueNow(item){return !item.dueAt||new Date(item.dueAt).getTime()<=Date.now();}
function phoneDigits(value=''){let d=String(value).replace(/\D/g,'');if(d.startsWith('0'))d=`27${d.slice(1)}`;return d;}
function publicAudit(a={}){return {id:a.id,name:a.name,businessName:a.businessName,email:a.email,phone:a.phone,status:a.status,salesStage:a.salesStage,goal:a.goal,score:a.score,band:a.band};}

function ensureFollowUp(record){
  const db=store.read();
  const existing=(db.followUps||[]).find(x=>x.key===record.key);
  if(existing)return existing;
  return store.insert('followUps',{status:'Open',priority:'medium',dueAt:new Date().toISOString(),...record});
}
function ensureClientNotice(record){
  const db=store.read();
  const existing=(db.clientNotices||[]).find(x=>x.key===record.key);
  if(existing)return existing;
  return store.insert('clientNotices',{read:false,...record});
}
function auditContact(a){return {auditId:a.id,name:a.name,businessName:a.businessName,email:a.email,phone:a.phone};}

function scanFollowups(){
  const db=store.read();
  const audits=db.audits||[],payments=db.payments||[],files=db.files||[],offers=db.offers||[],offerPayments=db.offerPayments||[],assignments=db.assignments||[],productions=db.productions||[];

  for(const a of audits){
    const contact=auditContact(a),created=a.createdAt||new Date().toISOString();
    const auditPayments=payments.filter(p=>p.auditId===a.id),paid=auditPayments.some(isComplete),docs=files.filter(f=>f.auditId===a.id);
    ensureFollowUp({key:`lead:${a.id}:new`,type:'new-lead',priority:'high',title:'New R500 audit lead',message:`${a.businessName||a.name} entered the Business Readiness Audit funnel. Make contact while intent is fresh.`,...contact,dueAt:created,recommendedAction:'Contact lead and move them to R500 audit payment.'});

    if(paid){
      const completed=auditPayments.slice().reverse().find(isComplete)||{};
      ensureFollowUp({key:`audit:${a.id}:paid`,type:'payment-received',priority:'high',title:'R500 audit payment received',message:`R500 audit payment received from ${a.businessName||a.name}.`,...contact,dueAt:completed.updatedAt||completed.createdAt||new Date().toISOString(),recommendedAction:docs.length?'Move audit into human review.':'Request supporting documents.'});
      ensureClientNotice({key:`audit:${a.id}:paid`,auditId:a.id,type:'payment',title:'Payment received',message:'Your R500 Business Readiness Audit payment has been confirmed. Thank you. The Growth Desk will now move your audit into review.'});
      if(!docs.length && ageMs(completed.updatedAt||completed.createdAt)>=DAY){
        ensureFollowUp({key:`audit:${a.id}:docs24`,type:'missing-documents',priority:'high',title:'Paid audit waiting for documents',message:`${a.businessName||a.name} paid for the R500 audit but no supporting documents have been uploaded after 24 hours.`,...contact,dueAt:new Date(new Date(completed.updatedAt||completed.createdAt).getTime()+DAY).toISOString(),recommendedAction:'Ask client to upload the documents needed for review.'});
        ensureClientNotice({key:`audit:${a.id}:docs24`,auditId:a.id,type:'reminder',title:'Documents still needed',message:'Your audit payment is confirmed. Please upload the supporting business documents in your Growth Desk so the review can proceed.'});
      }
    }else{
      if(ageMs(created)>=DAY){
        ensureFollowUp({key:`audit:${a.id}:unpaid24`,type:'unpaid-audit',priority:'high',title:'R500 audit unpaid after 24 hours',message:`${a.businessName||a.name} started the audit but has not completed the R500 payment.`,...contact,dueAt:new Date(new Date(created).getTime()+DAY).toISOString(),recommendedAction:'Send a short payment follow-up and portal link.'});
        ensureClientNotice({key:`audit:${a.id}:unpaid24`,auditId:a.id,type:'reminder',title:'Your audit is waiting',message:'Your Business Readiness Audit is ready to continue. Complete the R500 payment when you are ready to activate the review.'});
      }
      if(ageMs(created)>=3*DAY){
        ensureFollowUp({key:`audit:${a.id}:unpaid72`,type:'unpaid-audit',priority:'medium',title:'R500 audit unpaid after 3 days',message:`${a.businessName||a.name} remains unpaid three days after entering the audit funnel.`,...contact,dueAt:new Date(new Date(created).getTime()+3*DAY).toISOString(),recommendedAction:'Make a final helpful follow-up; ask whether the client still wants the audit.'});
      }
    }
  }

  for(const o of offers){
    const a=audits.find(x=>x.id===o.auditId)||{},contact=auditContact(a),ops=offerPayments.filter(p=>p.offerId===o.id),paid=o.status==='Paid'||ops.some(isComplete),created=o.createdAt||new Date().toISOString();
    if(paid){
      const completed=ops.slice().reverse().find(isComplete)||{};
      ensureFollowUp({key:`offer:${o.id}:paid`,type:'follow-on-paid',priority:'high',title:`Paid follow-on: ${o.service}`,message:`${a.businessName||a.name} paid ${Number(o.amount||0).toLocaleString('en-ZA',{style:'currency',currency:'ZAR'})} for ${o.service}.`,...contact,dueAt:completed.updatedAt||o.paidAt||new Date().toISOString(),recommendedAction:'Confirm assignment, deadline and information checklist.'});
      ensureClientNotice({key:`offer:${o.id}:paid`,auditId:o.auditId,type:'payment',title:`${o.service} payment received`,message:`Your payment for ${o.service} has been confirmed. The Growth Desk has opened the assignment and will show progress in your portal.`});
    }else if(!['Declined','Expired'].includes(o.status)){
      if(ageMs(created)>=DAY){
        ensureFollowUp({key:`offer:${o.id}:unpaid24`,type:'unpaid-offer',priority:'high',title:`Offer unpaid: ${o.service}`,message:`${a.businessName||a.name} has had the ${o.service} offer for more than 24 hours without payment.`,...contact,dueAt:new Date(new Date(created).getTime()+DAY).toISOString(),recommendedAction:'Follow up on the offer, scope and payment.'});
      }
      if(ageMs(created)>=3*DAY){
        ensureFollowUp({key:`offer:${o.id}:unpaid72`,type:'unpaid-offer',priority:'medium',title:`Offer still open after 3 days`,message:`${a.businessName||a.name} has not yet paid the ${o.service} offer.`,...contact,dueAt:new Date(new Date(created).getTime()+3*DAY).toISOString(),recommendedAction:'Ask if scope, timing or affordability is blocking the decision.'});
      }
    }
  }

  for(const a of assignments){
    const audit=audits.find(x=>x.id===a.auditId)||{},contact=auditContact(audit),updated=a.updatedAt||a.createdAt||new Date().toISOString();
    if(a.status==='Waiting for client information'&&ageMs(updated)>=2*DAY){
      ensureFollowUp({key:`assignment:${a.id}:client-info48`,type:'client-information',priority:'high',title:'Assignment waiting for client information',message:`${a.service} for ${audit.businessName||audit.name} has been waiting on client information for 48 hours.`,...contact,dueAt:new Date(new Date(updated).getTime()+2*DAY).toISOString(),recommendedAction:'Remind client exactly which checklist items are outstanding.'});
      ensureClientNotice({key:`assignment:${a.id}:client-info48`,auditId:a.auditId,type:'reminder',title:'Information needed to keep your job moving',message:`Your ${a.service} assignment is waiting for information from you. Please check the production checklist in your portal and provide the outstanding items.`});
    }
    if(a.status!=='Completed'&&a.deadline&&new Date(a.deadline).getTime()<Date.now()){
      ensureFollowUp({key:`assignment:${a.id}:overdue`,type:'overdue-assignment',priority:'critical',title:'Paid assignment overdue',message:`${a.service} for ${audit.businessName||audit.name} is past its target delivery date.`,...contact,dueAt:a.deadline,recommendedAction:'Escalate internally, update the client and set a realistic recovery date.'});
    }
    if(a.status==='Completed'&&ageMs(a.completedAt||updated)>=DAY){
      ensureFollowUp({key:`assignment:${a.id}:post-delivery`,type:'post-delivery',priority:'medium',title:'Post-delivery growth opportunity',message:`${a.service} was delivered to ${audit.businessName||audit.name}.`,...contact,dueAt:new Date(new Date(a.completedAt||updated).getTime()+DAY).toISOString(),recommendedAction:'Ask for feedback/testimonial and consider the next suitable service or retainer.'});
      ensureClientNotice({key:`assignment:${a.id}:post-delivery`,auditId:a.auditId,type:'feedback',title:'How did we do?',message:`Your ${a.service} has been delivered. We would value your feedback, and the Growth Desk can help you identify the next practical growth priority when you are ready.`});
    }
  }

  for(const p of productions){
    if(p.status==='Human review'&&ageMs(p.updatedAt||p.createdAt)>=DAY){
      const assignment=assignments.find(x=>x.id===p.assignmentId)||{},audit=audits.find(x=>x.id===p.auditId)||{};
      ensureFollowUp({key:`production:${p.id}:review24`,type:'review-queue',priority:'high',title:'Draft waiting for human review',message:`${assignment.service||'Growth Desk draft'} for ${audit.businessName||audit.name} has been waiting for reviewer action for more than 24 hours.`,...auditContact(audit),dueAt:new Date(new Date(p.updatedAt||p.createdAt).getTime()+DAY).toISOString(),recommendedAction:'Review facts, edit the draft and either revise or finalise.'});
    }
  }

  return followupSnapshot();
}

function followupSnapshot(){
  const db=store.read();
  const tasks=(db.followUps||[]).slice().sort((a,b)=>{
    const sa=a.status==='Open'?1:0,sb=b.status==='Open'?1:0;if(sa!==sb)return sb-sa;
    const pd=(priorityRank[b.priority]||0)-(priorityRank[a.priority]||0);if(pd)return pd;
    return new Date(a.dueAt||a.createdAt).getTime()-new Date(b.dueAt||b.createdAt).getTime();
  });
  const open=tasks.filter(x=>x.status==='Open'&&dueNow(x));
  return {metrics:{open:open.length,critical:open.filter(x=>x.priority==='critical').length,high:open.filter(x=>x.priority==='high').length,snoozed:tasks.filter(x=>x.status==='Snoozed').length},tasks};
}

function buildContact(task){
  const portal=String(process.env.APP_URL||'https://the-chancellor.onrender.com').replace(/\/$/,'')+'/portal.html';
  const first=String(task.name||'there').trim().split(/\s+/)[0]||'there';
  let message='';
  if(task.type==='unpaid-audit')message=`Hi ${first}, this is The Chancellor's Business Growth Desk. Your R500 Business Readiness Audit is ready to continue. You can complete it securely in your client portal: ${portal}`;
  else if(task.type==='missing-documents')message=`Hi ${first}, your R500 audit payment is confirmed. Please upload the supporting business documents in your Growth Desk so we can proceed with the review: ${portal}`;
  else if(task.type==='unpaid-offer')message=`Hi ${first}, I am following up on the Growth Desk offer for your business. If you have any question about the scope, timing or payment, please let us know. Your private portal is here: ${portal}`;
  else if(task.type==='client-information')message=`Hi ${first}, your paid Growth Desk assignment is waiting for a few outstanding information items. Please check your production checklist here: ${portal}`;
  else if(task.type==='post-delivery')message=`Hi ${first}, thank you for working with The Chancellor's Business Growth Desk. We would appreciate your feedback on the work delivered. When you are ready, we can also identify the next practical growth priority.`;
  else message=`Hi ${first}, this is The Chancellor's Business Growth Desk following up on ${task.businessName||'your business'}. Please let us know how we can assist with the next step.`;
  const digits=phoneDigits(task.phone);
  return {whatsapp:digits?`https://wa.me/${digits}?text=${encodeURIComponent(message)}`:'',email:task.email?`mailto:${encodeURIComponent(task.email)}?subject=${encodeURIComponent(task.title||"The Chancellor's Business Growth Desk")}&body=${encodeURIComponent(message)}`:'',message,portal};
}

module.exports={scanFollowups,followupSnapshot,buildContact};
