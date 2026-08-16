const store=require('./store');

const DAY=86400000;
const clean=(v,max=500)=>String(v??'').trim().replace(/[\u0000-\u001F\u007F]/g,'').slice(0,max);
const money=v=>{const n=Number(v||0);return Number.isFinite(n)&&n>=0?Math.round(n*100)/100:0};
const requireAdmin=(req,res,next)=>req.session?.admin?next():res.status(401).json({error:'Administrator sign-in required.'});
const baseUrl=()=>clean(process.env.APP_URL||'',500).replace(/\/$/,'');
function phoneDigits(value){let d=clean(value,50).replace(/\D/g,'');if(d.startsWith('0'))d=`27${d.slice(1)}`;return d;}
function paidAmount(db,q){return (db.crmQuotePayments||[]).filter(p=>p.quoteId===q.id&&String(p.status||'').toUpperCase()!=='INITIATED').reduce((s,p)=>s+money(p.amount),0)}
function dedupeKey(q,type){return `${q.id}:${type}:${new Date().toISOString().slice(0,10)}`}
function classify(q,db){
  if(['PAID','CANCELLED','EXPIRED'].includes(String(q.status||'').toUpperCase()))return null;
  const ageDays=Math.floor((Date.now()-new Date(q.createdAt).getTime())/DAY);
  const acceptedAge=q.acceptedAt?Math.floor((Date.now()-new Date(q.acceptedAt).getTime())/DAY):0;
  const outstanding=Math.max(0,money(q.amount)-paidAmount(db,q));
  if(String(q.status).toUpperCase()==='SENT'&&ageDays>=3)return{type:'close-today',priority:100,title:'Close this today',message:`Quotation ${q.quoteNumber} has been unanswered for ${ageDays} days. Make a direct closing attempt today.`,outstanding};
  if(String(q.status).toUpperCase()==='SENT'&&ageDays>=1)return{type:'quote-reminder',priority:70,title:'Quotation follow-up due',message:`Quotation ${q.quoteNumber} has been open for ${ageDays} day${ageDays===1?'':'s'}. Follow up for a decision.`,outstanding};
  if(String(q.status).toUpperCase()==='ACCEPTED'&&outstanding>0&&acceptedAge>=1)return{type:'accepted-unpaid',priority:95,title:'Accepted but unpaid',message:`Quotation ${q.quoteNumber} was accepted but R${outstanding.toFixed(2)} is still outstanding. Ask for payment today.`,outstanding};
  if(String(q.status).toUpperCase()==='PART-PAID'&&outstanding>0)return{type:'balance-due',priority:90,title:'Balance outstanding',message:`Quotation ${q.quoteNumber} has R${outstanding.toFixed(2)} outstanding. Collect the balance.`,outstanding};
  if(q.expiresAt){const daysLeft=Math.ceil((new Date(q.expiresAt).getTime()-Date.now())/DAY);if(daysLeft>=0&&daysLeft<=2)return{type:'expiring',priority:85,title:'Quotation expiring soon',message:`Quotation ${q.quoteNumber} expires in ${daysLeft} day${daysLeft===1?'':'s'}. Get a decision before it lapses.`,outstanding};}
  return null;
}
async function sendEmail(q,alert,url){
  if(!process.env.RESEND_API_KEY||!process.env.COMMS_FROM_EMAIL||!q.email)return{status:'Skipped'};
  const subject=`${alert.title} — ${q.quoteNumber}`;
  const html=`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>${subject}</h2><p>Good day ${clean(q.contactName||'',80)},</p><p>${clean(alert.clientMessage||`A reminder regarding quotation ${q.quoteNumber}.`,800)}</p><p><strong>Outstanding: R${alert.outstanding.toFixed(2)}</strong></p><p><a href="${url}">Review quotation</a></p><p>Regards,<br>The Chancellor's Business Growth Desk</p></div>`;
  try{const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.COMMS_FROM_EMAIL,to:[q.email],subject,html})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||`Resend ${r.status}`);return{status:'Sent',provider:'Resend',providerId:j.id||''};}catch(err){return{status:'Failed',detail:String(err.message||err).slice(0,300)}}
}
function clientText(q,alert,url){
  if(alert.type==='accepted-unpaid')return `Good day ${clean(q.contactName||'',80)}. Thank you for accepting quotation ${q.quoteNumber}. The outstanding amount is R${alert.outstanding.toFixed(2)}. You can complete payment here: ${url}`;
  if(alert.type==='balance-due')return `Good day ${clean(q.contactName||'',80)}. A balance of R${alert.outstanding.toFixed(2)} remains on quotation ${q.quoteNumber}. Please review and settle it here: ${url}`;
  return `Good day ${clean(q.contactName||'',80)}. Just following up on quotation ${q.quoteNumber} from The Chancellor's Business Growth Desk. Please review it here and let us know if you are ready to proceed: ${url}`;
}
async function scan(){
  const db=store.read(),quotes=db.crmQuotes||[],existing=db.crmQuoteAlerts||[],created=[];
  for(const q of quotes){
    const alert=classify(q,db);if(!alert)continue;
    const key=dedupeKey(q,alert.type);if(existing.some(x=>x.dedupeKey===key))continue;
    const url=q.publicToken&&baseUrl()?`${baseUrl()}/q/${q.publicToken}`:'';
    alert.clientMessage=clientText(q,alert,url);
    const row=store.insert('crmQuoteAlerts',{dedupeKey:key,quoteId:q.id,leadId:q.leadId,quoteNumber:q.quoteNumber,type:alert.type,priority:alert.priority,title:alert.title,message:alert.message,outstanding:alert.outstanding,status:'OPEN',publicUrl:url,whatsappUrl:phoneDigits(q.phone)&&url?`https://wa.me/${phoneDigits(q.phone)}?text=${encodeURIComponent(alert.clientMessage)}`:'',createdAt:new Date().toISOString()});
    if(['accepted-unpaid','balance-due'].includes(alert.type)){const result=await sendEmail(q,alert,url);store.update('crmQuoteAlerts',row.id,{emailStatus:result.status,emailProviderId:result.providerId||'',emailDetail:result.detail||''});}
    created.push(row);
  }
  return{created:created.length,open:(store.read().crmQuoteAlerts||[]).filter(x=>x.status==='OPEN').length};
}

module.exports=function registerCrmQuoteFollowups(app){
  app.get('/api/crm/quote-alerts',requireAdmin,(_req,res)=>{const db=store.read();res.json({alerts:(db.crmQuoteAlerts||[]).filter(x=>x.status==='OPEN').sort((a,b)=>(b.priority||0)-(a.priority||0)||new Date(a.createdAt)-new Date(b.createdAt))})});
  app.post('/api/crm/quote-alerts/run',requireAdmin,async(_req,res)=>{try{res.json(await scan())}catch(err){res.status(500).json({error:String(err.message||err)})}});
  app.post('/api/crm/quote-alerts/:id/done',requireAdmin,(req,res)=>{const alert=store.update('crmQuoteAlerts',req.params.id,{status:'DONE',resolvedAt:new Date().toISOString(),resolution:clean(req.body?.resolution,300)});if(!alert)return res.status(404).json({error:'Alert not found.'});res.json({alert})});
  return{scan};
};
