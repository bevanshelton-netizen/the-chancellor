if(!document.querySelector('link[data-offer-styles]')){const l=document.createElement('link');l.rel='stylesheet';l.href='offers.css?v=20260819-2';l.dataset.offerStyles='1';document.head.appendChild(l)}
const $=s=>document.querySelector(s);const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));
const code=sessionStorage.getItem('newAccessCode');if(code)$('#newCode').innerHTML=`Your new access code is <strong>${esc(code)}</strong>. Save it before signing in.`;
const qs=new URLSearchParams(location.search);
function paymentComplete(payments=[]){return payments.some(p=>String(p.status||'').toUpperCase()==='COMPLETE')}
function offerPaid(offer,payments=[]){return offer.status==='Paid'||payments.some(p=>p.offerId===offer.id&&String(p.status||'').toUpperCase()==='COMPLETE')}
function clientNextStep(audit,fileCount){const stage=String(audit.salesStage||'');if(stage==='Delivered')return'Delivered';if(['Follow-on paid','In delivery'].includes(stage))return'Delivery in progress';if(stage==='Offer accepted')return'Complete implementation payment';if(stage==='Offer sent')return'Choose implementation level';return fileCount?'Growth Desk review':'Upload supporting documents'}

const serviceMap={
  'Revenue & Commercial Model':['Revenue Model & Profitability Fix','Improve revenue consistency, offer mix, pricing discipline and repeat-income opportunities.'],
  'Sales & Conversion':['Sales Conversion System','Strengthen prospecting, quotation follow-up, conversion tracking and sales discipline.'],
  'Marketing & Positioning':['Marketing & Lead Generation','Sharpen positioning, credibility, campaign activity and measurable lead generation.'],
  'Digital & Automation':['Digital Sales & Automation Upgrade','Improve digital credibility, lead capture, conversion paths and practical automation.'],
  'Financial Control':['Cash-Flow & Financial Control Programme','Strengthen records, margins, cash-flow visibility, pricing decisions and financial discipline.'],
  'Compliance & Funding Readiness':['Compliance & Funding Readiness Pack','Organise statutory compliance, funding evidence and documentation for larger opportunities.'],
  'Operations & Scale Readiness':['Operations & Scale Programme','Improve roles, procedures, owner-independence, capacity and delivery systems for sustainable growth.']
};
function bandClass(band='',tone=''){
  const value=`${band} ${tone}`.toLowerCase();
  if(value.includes('scale ready')||value.includes('growth opportunities')||value.includes('green'))return'green';
  if(value.includes('vulnerable')||value.includes('amber'))return'amber';
  return'red';
}
function renderReadiness(audit={}){
  const sectionScores=audit.sectionScores||{};
  const priorities=Array.isArray(audit.priorities)?audit.priorities:[];
  $('#readinessPercent').textContent=`${Number(audit.readinessPercent||0)}%`;
  const badge=$('#readinessBadge');badge.textContent=audit.band||'Growth diagnosis pending';badge.className=`readiness-badge ${bandClass(audit.band,audit.bandTone)}`;
  $('#sectionScores').innerHTML=Object.entries(sectionScores).map(([section,score])=>{const detailed=audit.sections?.[section];const max=Number(detailed?.maxScore||20)||20;const pct=Number.isFinite(Number(detailed?.percent))?Number(detailed.percent):Math.round((Number(score||0)/max)*100);const cls=pct>=70?'green':pct>=40?'amber':'red';return `<article class="readiness-item ${cls}"><div><strong>${esc(section)}</strong><span>${Number(score||0)}/${max}</span></div><div class="readiness-track"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div><small>${Math.max(0,Math.min(100,pct))}% ready</small></article>`}).join('')||'<p class="muted">Your seven business-area scores will appear here after the audit is completed.</p>';
  $('#priorityAreas').innerHTML=priorities.length?priorities.slice(0,3).map((p,i)=>`<article><span>0${i+1}</span><div><strong>${esc(p.section)}</strong><small>${Number.isFinite(Number(p.percent))?Number(p.percent):Math.round((Number(p.score||0)/Number(p.maxScore||20))*100)}% ready · priority for strengthening</small></div></article>`).join(''):'<p class="muted">Priority areas will appear here after scoring.</p>';
  const seen=new Set();const services=priorities.slice(0,3).map(p=>({section:p.section,detail:p.service?[p.service,p.summary||'Recommended from your Business Growth Audit.']:serviceMap[p.section]})).filter(x=>x.detail&&!seen.has(x.detail[0])&&seen.add(x.detail[0]));
  $('#recommendedServices').innerHTML=services.length?services.map(({section,detail})=>`<article><small>${esc(section)}</small><strong>${esc(detail[0])}</strong><p>${esc(detail[1])}</p></article>`).join(''):'<p class="muted">Recommended interventions will appear here after scoring.</p>';
}
function renderLockedReadiness(audit={}){
  $('#readinessPercent').textContent=`${Number(audit.readinessPercent||0)}%`;
  const badge=$('#readinessBadge');badge.textContent=audit.band||'Growth score calculated';badge.className=`readiness-badge ${bandClass(audit.band,audit.bandTone)}`;
  $('#sectionScores').innerHTML='<article class="readiness-item"><div><strong>Your 7-area scorecard is ready</strong></div><small>Complete the R500 payment to unlock every category score and growth-readiness bar.</small></article>';
  $('#priorityAreas').innerHTML='<article><span>01</span><div><strong>Your Top 3 priorities are ready</strong><small>Unlock the three areas that should receive attention first.</small></div></article>';
  $('#recommendedServices').innerHTML='<article><small>PAID AUDIT</small><strong>Your prescribed interventions are ready</strong><p>Complete the R500 audit payment to unlock the detailed diagnosis, formal report and implementation proposal.</p></article>';
}

function tierLabel(o){if(o.tier==='FOCUSED_FIX')return'Focused Fix';if(o.tier==='GROWTH_SPRINT')return'90-Day Growth Sprint';if(o.tier==='IMPLEMENTATION_PROGRAMME')return'Implementation Programme';return'Growth Desk Offer'}
async function loadOffers(){
  const r=await fetch('/api/client/offers',{cache:'no-store'});if(!r.ok)return null;
  const d=await r.json(),box=$('#offers'),st=$('#offerPayStatus');
  const offers=(d.offers||[]).filter(o=>!['Cancelled','Superseded'].includes(o.status)).sort((a,b)=>Number(a.amount||0)-Number(b.amount||0));
  if(!offers.length){box.innerHTML='<p class="muted">Your implementation options are being prepared from the paid Business Growth Audit.</p>';return d}
  box.innerHTML=offers.map(o=>{const paid=offerPaid(o,d.payments),expired=o.expired;const scope=o.scopeNote?`<p><b>Scope note:</b> ${esc(o.scopeNote)}</p>`:'';const recommended=o.tier==='GROWTH_SPRINT'?'<span class="badge">RECOMMENDED STARTING POINT</span>':'';return `<article class="offer-card" data-id="${esc(o.id)}"><div><p class="eyebrow">${esc(tierLabel(o))}</p><h3>${esc(o.service)}</h3>${recommended}<p>${esc(o.headline||o.description||'Prepared from your Business Growth Audit.')}</p>${o.description&&o.headline?`<p>${esc(o.description)}</p>`:''}${o.deliverables?`<p><b>Scope:</b> ${esc(o.deliverables)}</p>`:''}${scope}<small>Offer valid until ${new Date(o.expiresAt).toLocaleDateString('en-ZA')}</small></div><div class="offer-price"><strong>${money(o.amount)}</strong><span class="badge">${esc(paid?'Paid':expired?'Expired':o.status)}</span>${paid?'<button class="button compact" disabled>Paid ✓</button>':expired?'<button class="button compact dark" disabled>Request updated quote</button>':`<button class="button compact offer-accept">Accept offer</button><button class="button compact offer-pay">Pay securely</button>`}</div></article>`}).join('');
  box.querySelectorAll('.offer-accept').forEach(b=>b.onclick=async()=>{const card=b.closest('.offer-card');b.disabled=true;b.textContent='Accepting…';const r=await fetch(`/api/client/offers/${card.dataset.id}/accept`,{method:'POST'});const j=await r.json();if(!r.ok){st.textContent=j.error||'Offer could not be accepted.';st.className='status error';b.disabled=false;return}st.textContent='Offer accepted. You can now complete secure payment.';st.className='status';loadOffers()});
  box.querySelectorAll('.offer-pay').forEach(b=>b.onclick=async()=>{const card=b.closest('.offer-card');b.disabled=true;b.textContent='Opening PayFast…';st.textContent='Preparing secure checkout…';st.className='status';const r=await fetch(`/api/client/offers/${card.dataset.id}/checkout`,{method:'POST'});const j=await r.json();if(!r.ok){st.textContent=j.error||'Checkout is not available yet.';st.className='status error';b.disabled=false;b.textContent='Pay securely';return}const f=$('#offerPayForm');f.action=j.url;f.innerHTML=Object.entries(j.fields).map(([k,v])=>`<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');f.submit()});
  if(qs.get('offerPayment')==='returned')st.textContent='You have returned from PayFast. We are confirming the implementation payment now.';
  if(qs.get('offerPayment')==='cancelled'){st.textContent='The implementation payment was not completed. Your options remain available until they expire.';st.className='status error'}
  return d;
}

async function load(){
  const r=await fetch('/api/portal',{cache:'no-store'});if(!r.ok)return null;const d=await r.json();
  $('#login').classList.add('hidden');$('#dashboard').classList.remove('hidden');
  $('#businessName').textContent=d.audit.businessName;$('#clientGoal').textContent=d.audit.goal;$('#score').textContent=Number(d.audit.score||0);$('#scoreMax').textContent=`/${Number(d.audit.maxScore||140)}`;$('#band').textContent=d.audit.band;$('#status').textContent=d.audit.status;$('#fileCount').textContent=d.files.length;
  const paid=paymentComplete(d.payments),pay=$('#payButton'),payStatus=$('#payStatus'),next=$('#nextStep'),reportButton=$('#downloadReadinessReport'),proposalButton=$('#downloadImplementationProposal'),reportHint=$('#reportDownloadHint'),uploadForm=$('#uploadForm');
  if(paid){
    renderReadiness(d.audit);
    pay.disabled=true;pay.textContent='R500 audit payment received ✓';payStatus.textContent='Payment confirmed. Your formal Business Growth Audit and implementation options are unlocked.';payStatus.className='status';next.textContent=clientNextStep(d.audit,d.files.length);reportButton?.classList.remove('hidden');proposalButton?.classList.remove('hidden');if(reportHint)reportHint.textContent='Your paid Business Growth Audit and Implementation Proposal are ready to download.';
    if(uploadForm)uploadForm.querySelectorAll('input,button').forEach(el=>el.disabled=false);
    try{const cr=await fetch('/api/client/post-audit-concierge',{cache:'no-store'});if(cr.ok){const c=await cr.json();$('#recommendation').textContent=[c.diagnosis,c.recommendation].filter(Boolean).join(' ')||d.audit.recommendation}}catch{$('#recommendation').textContent=d.audit.recommendation}
    await loadOffers();
  }else{
    renderLockedReadiness(d.audit);
    $('#recommendation').textContent='Your detailed Chancellor diagnosis is ready. Complete the R500 Business Growth Audit payment to unlock it.';
    pay.disabled=false;pay.textContent='Pay R500 & unlock my audit';next.textContent='Secure payment';reportButton?.classList.add('hidden');proposalButton?.classList.add('hidden');if(reportHint)reportHint.textContent='Complete the R500 payment to unlock your formal audit and implementation proposal.';
    if(uploadForm){uploadForm.querySelectorAll('input,button').forEach(el=>el.disabled=true);const st=$('#uploadStatus');if(st){st.textContent='Document upload unlocks after the R500 audit payment is confirmed.';st.className='status'}}
    $('#offers').innerHTML='<p class="muted">Your three implementation options will unlock after the paid audit.</p>';
    if(qs.get('payment')==='returned')payStatus.textContent='You have returned from PayFast. We are confirming your payment automatically…';
    if(qs.get('payment')==='cancelled'){payStatus.textContent='Payment was not completed. You can try again when ready.';payStatus.className='status error'}
  }
  $('#files').innerHTML=d.files.length?d.files.map(f=>`<div class="file-row"><span>${esc(f.originalName)}<small> · ${(f.size/1024).toFixed(0)} KB</small></span><span class="badge">${esc(f.status)}</span></div>`).join(''):'<p>No documents uploaded yet.</p>';
  return d;
}
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const st=$('#loginStatus');st.textContent='Signing in…';const r=await fetch('/api/auth/client',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.currentTarget)))});const d=await r.json();if(!r.ok){st.textContent=d.error;st.className='status error';return}sessionStorage.removeItem('newAccessCode');load()});
$('#uploadForm').addEventListener('submit',async e=>{e.preventDefault();const st=$('#uploadStatus'),button=e.currentTarget.querySelector('button');st.textContent='Uploading securely…';button.disabled=true;const r=await fetch('/api/uploads',{method:'POST',body:new FormData(e.currentTarget)});const d=await r.json();button.disabled=false;if(!r.ok){st.textContent=d.error;st.className='status error';return}st.textContent='Documents received. Your Growth Desk now has them for review.';st.className='status';e.currentTarget.reset();load()});
$('#payButton').addEventListener('click',async()=>{const st=$('#payStatus'),button=$('#payButton');st.className='status';st.textContent='Preparing secure PayFast checkout…';button.disabled=true;const r=await fetch('/api/payfast/checkout',{method:'POST'});const d=await r.json();if(!r.ok){st.textContent=d.error||'Secure checkout is not available yet.';st.className='status error';button.disabled=false;return}const f=$('#payForm');f.action=d.url;f.innerHTML=Object.entries(d.fields).map(([k,v])=>`<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');f.submit()});
$('#logout').addEventListener('click',async()=>{await fetch('/api/auth/logout',{method:'POST'});location.reload()});

async function confirmReturnedPayments(){
  const auditReturned=qs.get('payment')==='returned',offerReturned=qs.get('offerPayment')==='returned';if(!auditReturned&&!offerReturned)return;
  const payStatus=$('#payStatus'),offerStatus=$('#offerPayStatus');
  for(let attempt=0;attempt<12;attempt++){
    await new Promise(resolve=>setTimeout(resolve,5000));
    try{
      if(auditReturned){const r=await fetch('/api/portal',{cache:'no-store'});if(r.ok){const d=await r.json();if(paymentComplete(d.payments)){await load();return}}}
      if(offerReturned){const r=await fetch('/api/client/offers',{cache:'no-store'});if(r.ok){const d=await r.json();if(d.payments?.some(p=>String(p.status||'').toUpperCase()==='COMPLETE')){await load();return}}}
    }catch{}
  }
  if(auditReturned&&payStatus){payStatus.textContent='PayFast has not confirmed the payment yet. Your payment is not being charged again. Refresh this page shortly; if it remains pending, contact the Growth Desk.';payStatus.className='status'}
  if(offerReturned&&offerStatus){offerStatus.textContent='PayFast has not confirmed the implementation payment yet. Refresh this page shortly; if it remains pending, contact the Growth Desk.';offerStatus.className='status'}
}

load();
confirmReturnedPayments();
