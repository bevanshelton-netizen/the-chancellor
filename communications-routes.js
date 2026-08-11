const store=require('./store');

const DAY=86400000;
const HOUR=3600000;
const now=()=>Date.now();
const iso=()=>new Date().toISOString();
const clean=s=>String(s??'').trim();
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));

function phoneE164(value){
  let p=clean(value).replace(/[^\d+]/g,'');
  if(!p)return'';
  if(p.startsWith('00'))p=`+${p.slice(2)}`;
  if(p.startsWith('0'))p=`+27${p.slice(1)}`;
  if(!p.startsWith('+')&&/^27\d+$/.test(p))p=`+${p}`;
  return /^\+\d{8,15}$/.test(p)?p:'';
}
function configured(){
  return{
    email:Boolean(process.env.RESEND_API_KEY&&process.env.COMMS_FROM_EMAIL),
    sms:Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_FROM_NUMBER),
    whatsapp:Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_WHATSAPP_FROM)
  };
}
function link(pathname){const base=clean(process.env.APP_URL).replace(/\/$/,'');return base?`${base}${pathname}`:pathname;}
function htmlEscape(s){return clean(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function emailHtml(title,body,href){return `<!doctype html><html><body style="margin:0;background:#090806;color:#f4efe5;font-family:Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:36px 24px"><div style="font-size:12px;letter-spacing:2px;color:#caa653;text-transform:uppercase">The Chancellor</div><h1 style="font-family:Georgia,serif;font-size:34px;margin:12px 0;color:#fff">${htmlEscape(title)}</h1><p style="font-size:15px;line-height:1.7;color:#cec6b9">${htmlEscape(body)}</p>${href?`<p style="margin-top:28px"><a href="${htmlEscape(href)}" style="display:inline-block;background:#d5b464;color:#17130b;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">Open secure workspace</a></p>`:''}<p style="margin-top:34px;font-size:11px;color:#81796d">This is an operational message from The Chancellor platform. Never send passwords, PINs or card details by reply.</p></div></body></html>`;}

async function sendEmail(to,subject,body,href){
  if(!configured().email)return{status:'Skipped',detail:'Email not configured'};
  if(!to||!String(to).includes('@'))return{status:'Skipped',detail:'No valid email'};
  try{
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.COMMS_FROM_EMAIL,to:[to],subject,html:emailHtml(subject,body,href)})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.message||`Resend ${r.status}`);
    return{status:'Sent',provider:'Resend',providerId:j.id||''};
  }catch(err){return{status:'Failed',detail:String(err.message||err).slice(0,400)};}
}
async function sendTwilio(to,body,channel='sms'){
  const c=configured();
  if(channel==='sms'&&!c.sms)return{status:'Skipped',detail:'SMS not configured'};
  if(channel==='whatsapp'&&!c.whatsapp)return{status:'Skipped',detail:'WhatsApp not configured'};
  const number=phoneE164(to);if(!number)return{status:'Skipped',detail:'No valid phone'};
  const from=channel==='whatsapp'?`whatsapp:${process.env.TWILIO_WHATSAPP_FROM.replace(/^whatsapp:/,'')}`:process.env.TWILIO_FROM_NUMBER;
  const dest=channel==='whatsapp'?`whatsapp:${number}`:number;
  const account=process.env.TWILIO_ACCOUNT_SID,auth=Buffer.from(`${account}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const form=new URLSearchParams({From:from,To:dest,Body:body.slice(0,1500)});
  try{
    const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(account)}/Messages.json`,{method:'POST',headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:form});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.message||`Twilio ${r.status}`);
    return{status:'Sent',provider:'Twilio',providerId:j.sid||''};
  }catch(err){return{status:'Failed',detail:String(err.message||err).slice(0,400)};}
}
function wasHandled(key,channel){return(store.read().communicationLog||[]).some(x=>x.dedupeKey===key&&x.channel===channel&&['Sent','Skipped'].includes(x.status));}
function log(item,channel,result){return store.insert('communicationLog',{dedupeKey:item.key,eventType:item.type,recipientRole:item.role,recipientId:item.recipientId||'',recipient:item.email||item.phone||'',channel,status:result.status,provider:result.provider||'',providerId:result.providerId||'',detail:result.detail||'',title:item.title,createdAt:iso()});}
async function deliver(item){
  const results=[];
  if(item.email&&!wasHandled(item.key,'email')){const r=await sendEmail(item.email,item.title,item.body,item.href);log(item,'email',r);results.push({channel:'email',...r});}
  const preferred=clean(process.env.COMMS_MOBILE_CHANNEL||'sms').toLowerCase()==='whatsapp'?'whatsapp':'sms';
  if(item.phone&&!wasHandled(item.key,preferred)){const text=`The Chancellor: ${item.title}. ${item.body}${item.href?` ${item.href}`:''}`;const r=await sendTwilio(item.phone,text,preferred);log(item,preferred,r);results.push({channel:preferred,...r});}
  return results;
}
function buildReminders(){
  const d=store.read(),t=now(),out=[];
  const cases=d.rescueCases||[],pros=d.professionals||[],appointments=d.caseAppointments||[],quotes=d.caseQuotes||[],payments=d.casePayments||[],payouts=d.casePayouts||[];
  const paidFor=q=>payments.filter(p=>p.quoteId===q.id&&String(p.status||'').toUpperCase()==='COMPLETE').reduce((s,p)=>s+Number(p.amount||0),0);
  appointments.filter(a=>a.status==='Scheduled'&&a.scheduledAt).forEach(a=>{
    const c=cases.find(x=>x.id===a.caseId);if(!c)return;const at=new Date(a.scheduledAt).getTime(),hours=(at-t)/HOUR;if(hours>23&&hours<=25)out.push({key:`appointment24:${a.id}:${a.scheduledAt}`,type:'appointment-reminder',role:'client',recipientId:c.id,email:c.email,phone:c.phone,title:'Appointment tomorrow',body:`${a.title} is scheduled for ${new Date(a.scheduledAt).toLocaleString('en-ZA')}.`,href:link('/rescue-portal.html')});if(hours>1.5&&hours<=2.5)out.push({key:`appointment2:${a.id}:${a.scheduledAt}`,type:'appointment-reminder',role:'client',recipientId:c.id,email:c.email,phone:c.phone,title:'Appointment in about 2 hours',body:`${a.title} is scheduled for ${new Date(a.scheduledAt).toLocaleString('en-ZA')}.`,href:link('/rescue-portal.html')});
    const p=pros.find(x=>x.id===c.assignedProfessionalId);if(p&&hours>23&&hours<=25)out.push({key:`pro-appointment24:${a.id}:${a.scheduledAt}`,type:'appointment-reminder',role:'professional',recipientId:p.id,email:p.email,phone:p.phone,title:'Client appointment tomorrow',body:`${a.title} for case ${c.caseNumber} is scheduled for ${new Date(a.scheduledAt).toLocaleString('en-ZA')}.`,href:link('/professional-portal.html')});
  });
  quotes.filter(q=>['Awaiting client approval','Approved — payment due','Part-paid'].includes(q.status)).forEach(q=>{
    const c=cases.find(x=>x.id===q.caseId);if(!c)return;const age=(t-new Date(q.clientDecisionAt||q.createdAt).getTime())/DAY,paid=paidFor(q),outstanding=Math.max(0,Number(q.amount||0)-paid);if(q.status==='Awaiting client approval'&&age>=1)out.push({key:`quote-review:${q.id}:${Math.floor(age/3)}`,type:'quote-reminder',role:'client',recipientId:c.id,email:c.email,phone:c.phone,title:'Fee quote awaiting your decision',body:`Quote ${q.quoteNumber} for ${money(q.amount)} is ready for your review.`,href:link('/rescue-portal.html')});if(q.status!=='Awaiting client approval'&&outstanding>0&&age>=1)out.push({key:`quote-pay:${q.id}:${Math.floor(age/3)}`,type:'payment-reminder',role:'client',recipientId:c.id,email:c.email,phone:c.phone,title:'Case payment still outstanding',body:`${money(outstanding)} remains due on ${q.quoteNumber}.`,href:link('/rescue-portal.html')});
  });
  pros.filter(p=>p.subscriptionStatus==='Active'&&p.subscriptionRenewsAt).forEach(p=>{const days=Math.ceil((new Date(p.subscriptionRenewsAt).getTime()-t)/DAY);if([7,3,1].includes(days))out.push({key:`membership:${p.id}:${p.subscriptionRenewsAt}:${days}`,type:'membership-renewal',role:'professional',recipientId:p.id,email:p.email,phone:p.phone,title:`Membership renewal in ${days} day${days===1?'':'s'}`,body:`Your ${p.membershipTier||'Professional Network'} membership is due to renew on ${new Date(p.subscriptionRenewsAt).toLocaleDateString('en-ZA')}.`,href:link('/professional-portal.html')});});
  cases.filter(c=>Number(c.triage?.score||0)>=80&&!c.assignedProfessionalId&&!['Resolved','Closed'].includes(c.status)).forEach(c=>out.push({key:`critical-admin:${c.id}:${new Date().toISOString().slice(0,10)}`,type:'critical-case',role:'admin',recipientId:'admin',email:process.env.ADMIN_ALERT_EMAIL||process.env.ADMIN_EMAIL,phone:process.env.ADMIN_ALERT_PHONE,title:'Critical Rescue case needs assignment',body:`${c.caseNumber} for ${c.name} has urgency ${Number(c.triage?.score||0)}/100 and is still unassigned.`,href:link('/admin.html')}));
  payouts.filter(p=>p.status==='Approved for payout').forEach(p=>out.push({key:`payout-admin:${p.id}:${p.updatedAt||p.createdAt}`,type:'payout',role:'admin',recipientId:'admin',email:process.env.ADMIN_ALERT_EMAIL||process.env.ADMIN_EMAIL,phone:process.env.ADMIN_ALERT_PHONE,title:'Professional payout approved',body:`A professional payout of ${money(p.amount)} is approved and awaiting completion.`,href:link('/admin.html')}));
  return out;
}
async function scan(){const items=buildReminders();let attempts=0;for(const item of items){const r=await deliver(item);attempts+=r.length;}store.insert('communicationRuns',{events:items.length,attempts,channels:configured(),completedAt:iso()});return{events:items.length,attempts,channels:configured()};}

module.exports=function registerCommunicationsRoutes(app){
  app.get('/api/admin/communications/status',(req,res)=>{if(!req.session?.admin)return res.status(401).json({error:'Administrator sign-in required.'});const d=store.read(),logs=d.communicationLog||[],runs=d.communicationRuns||[];res.json({channels:configured(),mobileChannel:clean(process.env.COMMS_MOBILE_CHANNEL||'sms'),metrics:{sent:logs.filter(x=>x.status==='Sent').length,failed:logs.filter(x=>x.status==='Failed').length,skipped:logs.filter(x=>x.status==='Skipped').length},recent:logs.slice(-60).reverse(),lastRun:runs.at(-1)||null});});
  app.post('/api/admin/communications/run',async(req,res)=>{if(!req.session?.admin)return res.status(401).json({error:'Administrator sign-in required.'});try{res.json(await scan());}catch(err){res.status(500).json({error:String(err.message||err)});}});
  return{scan,configured};
};
