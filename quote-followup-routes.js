const store=require('./store');

const DAY=24*60*60*1000;
const now=()=>Date.now();
const iso=()=>new Date().toISOString();
const ageDays=value=>Math.floor(Math.max(0,now()-new Date(value||0).getTime())/DAY);
const isComplete=p=>String(p?.status||'').toUpperCase()==='COMPLETE';

function ensureFollowUp(record){
  const db=store.read();
  const existing=(db.followUps||[]).find(x=>x.key===record.key);
  if(existing)return existing;
  return store.insert('followUps',{status:'Open',priority:'medium',dueAt:iso(),...record});
}
function ensureNotice(record){
  const db=store.read();
  const existing=(db.clientNotices||[]).find(x=>x.key===record.key);
  if(existing)return existing;
  return store.insert('clientNotices',{read:false,...record});
}
function resolveOfferTasks(offerId,reason){
  const db=store.read();
  for(const task of db.followUps||[]){
    if(['Open','Snoozed'].includes(task.status)&&String(task.key||'').startsWith(`quote:${offerId}:`)){
      store.update('followUps',task.id,{status:'Resolved',resolvedAt:iso(),resolution:reason,snoozedUntil:null});
    }
  }
}
function contact(a={}){return{auditId:a.id,name:a.name,businessName:a.businessName,email:a.email,phone:a.phone};}

function scanQuoteFollowups(){
  const db=store.read();
  const audits=db.audits||[],offers=db.offers||[],offerPayments=db.offerPayments||[];
  let created=0,updated=0;

  for(const offer of offers){
    const audit=audits.find(a=>a.id===offer.auditId)||{};
    const payments=offerPayments.filter(p=>p.offerId===offer.id);
    const paid=offer.status==='Paid'||payments.some(isComplete);
    const accepted=String(offer.status||'').startsWith('Accepted');
    const expired=offer.expiresAt&&new Date(offer.expiresAt).getTime()<now();

    if(paid){
      resolveOfferTasks(offer.id,'Follow-on offer paid.');
      continue;
    }
    if(expired&&!['Expired','Paid','Declined','Cancelled'].includes(String(offer.status||''))){
      store.update('offers',offer.id,{status:'Expired'});
      if(audit.id)store.update('audits',audit.id,{salesStage:'Lost',nextAction:'Re-engage client only if the opportunity is still relevant'});
      resolveOfferTasks(offer.id,'Offer expired before payment.');
      updated++;
      continue;
    }
    if(['Expired','Declined','Cancelled'].includes(String(offer.status||'')))continue;

    const sentAt=offer.createdAt||offer.updatedAt||iso();
    const days=ageDays(sentAt);
    const stages=[
      {day:1,key:'24h',priority:'high',title:`24-hour quote follow-up: ${offer.service}`,noticeTitle:'Your Growth Desk offer is ready',notice:`Your ${offer.service} offer is waiting in your private portal. Review the scope and price, and let us know if you have any questions.`,action:'Follow up on the offer while the need is still fresh.'},
      {day:3,key:'3d',priority:'medium',title:`3-day quote follow-up: ${offer.service}`,noticeTitle:'A quick check-in on your Growth Desk offer',notice:`Your ${offer.service} offer is still open. If scope, timing or affordability is holding up the decision, tell us so we can discuss the practical next step.`,action:'Ask what is blocking the decision: scope, timing, affordability or priority.'},
      {day:7,key:'7d',priority:'high',title:`7-day final quote follow-up: ${offer.service}`,noticeTitle:'Final follow-up on your current Growth Desk offer',notice:`Your current ${offer.service} offer is still available for a limited period. Review it in your portal and contact the Growth Desk if you want to proceed or need clarification.`,action:'Make a final helpful follow-up and ask for a clear yes, no or later decision.'}
    ];

    for(const step of stages){
      if(days<step.day)continue;
      const key=`quote:${offer.id}:${step.key}`;
      const before=(store.read().followUps||[]).length;
      ensureFollowUp({key,type:'quote-follow-up',priority:step.priority,title:step.title,message:`${audit.businessName||audit.name||'Client'} has not completed payment for ${offer.service} after ${step.day} day${step.day===1?'':'s'}.`,...contact(audit),offerId:offer.id,dueAt:new Date(new Date(sentAt).getTime()+step.day*DAY).toISOString(),recommendedAction:step.action});
      ensureNotice({key,auditId:offer.auditId,type:'quote-reminder',title:step.noticeTitle,message:step.notice});
      if((store.read().followUps||[]).length>before)created++;
    }

    if(days>=1&&audit.id&&!accepted&&['Offer sent','Upsell opportunity','Quote sent'].includes(String(audit.salesStage||''))){
      store.update('audits',audit.id,{salesStage:'Quote follow-up',nextAction:days>=7?'Final quotation follow-up':days>=3?'3-day quotation follow-up':'24-hour quotation follow-up'});
      updated++;
    }
  }
  return{ok:true,created,updated,scannedAt:iso()};
}

module.exports=function registerQuoteFollowupRoutes(app){
  const timer=setInterval(()=>{try{scanQuoteFollowups()}catch(error){console.error('Quote follow-up scan failed:',error.message)}},15*60*1000);
  timer.unref();
  setTimeout(()=>{try{scanQuoteFollowups()}catch(error){console.error('Initial quote follow-up scan failed:',error.message)}},1500).unref();
  app.post('/api/admin/quote-followups/scan',(req,res)=>{
    if(!req.session?.admin)return res.status(401).json({error:'Administrator sign-in required.'});
    try{res.json(scanQuoteFollowups())}catch(error){res.status(500).json({error:String(error.message||error)})}
  });
  return{scan:scanQuoteFollowups};
};

module.exports.scanQuoteFollowups=scanQuoteFollowups;
