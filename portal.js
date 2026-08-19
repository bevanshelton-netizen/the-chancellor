if(!document.querySelector('link[data-offer-styles]')){const l=document.createElement('link');l.rel='stylesheet';l.href='offers.css?v=20260811-1';l.dataset.offerStyles='1';document.head.appendChild(l)}
const $=s=>document.querySelector(s); const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));
const code=sessionStorage.getItem('newAccessCode'); if(code) $('#newCode').innerHTML=`Your new access code is <strong>${esc(code)}</strong>. Save it before signing in.`;
const qs=new URLSearchParams(location.search);
function paymentComplete(payments=[]){return payments.some(p=>String(p.status||'').toUpperCase()==='COMPLETE')}
function offerPaid(offer,payments=[]){return offer.status==='Paid'||payments.some(p=>p.offerId===offer.id&&String(p.status||'').toUpperCase()==='COMPLETE')}
function clientNextStep(audit,fileCount){const stage=String(audit.salesStage||'');if(stage==='Delivered')return'Delivered';if(['Follow-on paid','In delivery'].includes(stage))return'Delivery in progress';if(stage==='Offer accepted')return'Complete follow-on payment';if(stage==='Offer sent')return'Review your growth offer';return fileCount?'Human review':'Upload documents'}

const serviceMap={
  'Business Foundation':['Business Foundation & Compliance Pack','Strengthen structure, records, compliance priorities and management foundations.'],
  'Product / Service':['Offer, Pricing & Profitability Fix','Clarify the offer, improve pricing and focus the business on profitable demand.'],
  'Sales':['30-Day Sales & Lead Conversion Rescue','Build a repeatable lead, quotation, follow-up and conversion process.'],
  'Marketing & Brand':['Marketing & Lead Generation','Improve positioning, campaigns, visibility and measurable lead generation.'],
  'Cash Flow & Finance':['Cash-Flow & Finance Improvement','Strengthen records, margins, collections, cash-flow visibility and management reporting.'],
  'Customers':['Customer Growth & Retention Pack','Improve customer fit, service, retention, referrals and repeat revenue.'],
  'Operations':['Operations Improvement Programme','Improve procedures, capacity, supplier controls and service delivery systems.'],
  'People & Capacity':['People & Capacity Improvement','Clarify roles, accountability, skills gaps and the capacity needed for growth.'],
  'Growth Readiness':['90-Day Growth Strategy','Turn the strongest opportunities into a practical, measurable growth plan.'],
  'Finance & Cash Flow':['Cash-Flow Improvement','Strengthen records, cash-flow forecasting, costing and financial visibility.'],
  'Marketing':['Marketing & Lead Generation','Strengthen positioning, channels and measurable weekly marketing activity.'],
  'Compliance':['Compliance Readiness Pack','Organise statutory, contractual and operating compliance requirements.'],
  'Funding Readiness':['Funding Readiness / Investor Pack','Prepare the evidence, business case and supporting documents funders expect.'],
  'Tender & Contract Readiness':['Tender Readiness Package','Build supplier, company-profile, compliance and bid-response readiness.'],
  'Growth Potential':['90-Day Growth Strategy','Turn growth opportunities into a practical capacity and execution plan.']
};
function bandClass(band='',tone=''){
  const value=`${band} ${tone}`.toLowerCase();
  if(value.includes('scale ready')||value.includes('growth ready')||value.includes('green'))return'green';
  if(value.includes('growth potential')||value.includes('rebuild required')||value.includes('amber')||value.includes('nearly'))return'amber';
  return'red';
}
function renderReadiness(audit={}){
  const sectionScores=audit.sectionScores||{};
  const priorities=Array.isArray(audit.priorities)?audit.priorities:[];
  $('#readinessPercent').textContent=`${Number(audit.readinessPercent||0)}%`;
  const badge=$('#readinessBadge');badge.textContent=audit.band||'Readiness pending';badge.className=`readiness-badge ${bandClass(audit.band,audit.bandTone)}`;
  $('#sectionScores').innerHTML=Object.entries(sectionScores).map(([section,score])=>{const detailed=audit.sections?.[section];const max=Number(detailed?.maxScore||10)||10;const pct=Number.isFinite(Number(detailed?.percent))?Number(detailed.percent):Math.round((Number(score||0)/max)*100);const cls=pct>=70?'green':pct>=40?'amber':'red';return `<article class="readiness-item ${cls}"><div><strong>${esc(section)}</strong><span>${Number(score||0)}/${max}</span></div><div class="readiness-track"><i style="width:${Math.max(0,Math.min(100,pct))}%"></i></div><small>${Math.max(0,Math.min(100,pct))}% ready</small></article>`}).join('')||'<p class="muted">Your section scores will appear here after the audit is completed.</p>';
  $('#priorityAreas').innerHTML=priorities.length?priorities.map((p,i)=>`<article><span>0${i+1}</span><div><strong>${esc(p.section)}</strong><small>${Number.isFinite(Number(p.percent))?Number(p.percent):Math.round((Number(p.score||0)/Number(p.maxScore||10))*100)}% ready · priority for strengthening</small></div></article>`).join(''):'<p class="muted">Priority areas will appear here after scoring.</p>';
  const seen=new Set();const services=priorities.map(p=>({section:p.section,detail:p.service?[p.service,p.summary||'Recommended from your Business Readiness Audit.']:serviceMap[p.section]})).filter(x=>x.detail&&!seen.has(x.detail[0])&&seen.add(x.detail[0]));
  $('#recommendedServices').innerHTML=services.length?services.map(({section,detail})=>`<article><small>${esc(section)}</small><strong>${esc(detail[0])}</strong><p>${esc(detail[1])}</p></article>`).join(''):'<p class="muted">Recommended follow-on services will appear here after scoring.</p>';
}
function renderLockedReadiness(audit={}){
  $('#readinessPercent').textContent=`${Number(audit.readinessPercent||0)}%`;
  const badge=$('#readinessBadge');badge.textContent=audit.band||'Readiness scored';badge.className=`readiness-badge ${bandClass(audit.band,audit.bandTone)}`;
  $('#sectionScores').innerHTML='<article class="readiness-item"><div><strong>Your 9-category scorecard is ready</strong></div><small>Complete the R500 payment to unlock every category score and readiness bar.</small></article>';
  $('#priorityAreas').innerHTML='<article><span>01</span><div><strong>Your Top 3 priorities are ready</strong><small>Unlock the three areas that need attention first.</small></div></article>';
  $('#recommendedServices').innerHTML='<article><small>PAID REPORT</small><strong>Your recommended next services are ready</strong><p>Complete the R500 audit payment to unlock the detailed diagnosis, recommendations and downloadable report.</p></article>';
}

async function loadOffers(){
  const r=await fetch('/api/client/offers'); if(!r.ok)return null;
  const d=await r.json(),box=$('#offers'),st=$('#offerPayStatus');
  if(!d.offers.length){box.innerHTML='<p class="muted">No follow-on offer has been issued yet. Once your audit is reviewed, any recommended paid work will appear here with a clear scope and price.</p>';return d}
  box.innerHTML=d.offers.slice().reverse().map(o=>{const paid=offerPaid(o,d.payments),expired=o.expired;const recurring=o.recurring?'<small>Monthly retainer · this checkout secures the first month; future renewals are not charged automatically unless separately agreed.</small>':'';return `<article class="offer-card" data-id="${esc(o.id)}"><div><p class="eyebrow">Growth Desk offer</p><h3>${esc(o.service)}</h3><p>${esc(o.description||'Prepared from your Business Readiness Audit and Growth Desk review.')}</p>${o.deliverables?`<p><b>Scope:</b> ${esc(o.deliverables)}</p>`:''}${recurring}<small>Offer valid until ${new Date(o.expiresAt).toLocaleDateString('en-ZA')}</small></div><div class="offer-price"><strong>${money(o.amount)}</strong><span class="badge">${esc(paid?'Paid':expired?'Expired':o.status)}</span>${paid?'<button class="button compact" disabled>Paid ✓</button>':expired?'<button class="button compact dark" disabled>Request updated quote</button>':`<button class="button compact offer-accept">Accept offer</button><button class="button compact offer-pay">Pay securely</button>`}</div></article>`}).join('');
  box.querySelectorAll('.offer-accept').forEach(b=>b.onclick=async()=>{const card=b.closest('.offer-card');b.disabled=true;b.textContent='Accepting…';const r=await fetch(`/api/client/offers/${card.dataset.id}/accept`,{method:'POST'});const j=await r.json();if(!r.ok){st.textContent=j.error||'Offer could not be accepted.';st.className='status error';b.disabled=false;return}st.textContent='Offer accepted. You can now complete secure payment.';st.className='status';loadOffers()});
  box.querySelectorAll('.offer-pay').forEach(b=>b.onclick=async()=>{const card=b.closest('.offer-card');b.disabled=true;b.textContent='Opening PayFast…';st.textContent='Preparing secure checkout…';st.className='status';const r=await fetch(`/api/client/offers/${card.dataset.id}/checkout`,{method:'POST'});const j=await r.json();if(!r.ok){st.textContent=j.error||'Checkout is not available yet.';st.className='status error';b.disabled=false;b.textContent='Pay securely';return}const f=$('#offerPayForm');f.action=j.url;f.innerHTML=Object.entries(j.fields).map(([k,v])=>`<input type="hidden" name="${esc(k)}" value="${esc(v)}">`).join('');f.submit()});
  if(qs.get('offerPayment')==='returned')st.textContent='You have returned from PayFast. We are confirming the payment now; this section will update automatically.';
  if(qs.get('offerPayment')==='cancelled'){st.textContent='The follow-on payment was not completed. Your offer remains available until it expires.';st.className='status error'}
  return d;
}

async function load(){
  const r=await fetch('/api/portal'); if(!r.ok)return null; const d=await r.json();
  $('#login').classList.add('hidden'); $('#dashboard').classList.remove('hidden');
  $('#businessName').textContent=d.audit.businessName; $('#clientGoal').textContent=d.audit.goal; $('#score').textContent=`${d.audit.score}/${d.audit.maxScore||90}`; $('#band').textContent=d.audit.band; $('#status').textContent=d.audit.status; $('#fileCount').textContent=d.files.length;
  const paid=paymentComplete(d.payments); const pay=$('#payButton'),payStatus=$('#payStatus'),next=$('#nextStep'),reportButton=$('#downloadReadinessReport'),reportHint=$('#reportDownloadHint'),uploadForm=$('#uploadForm');
  if(paid){
    renderReadiness(d.audit);
    $('#recommendation').textContent=d.audit.recommendation;
    pay.disabled=true;pay.textContent='Payment received ✓';payStatus.textContent='Your R500 audit payment is confirmed. Your Growth Desk can now proceed with review.';payStatus.className='status';next.textContent=clientNextStep(d.audit,d.files.length);reportButton?.classList.remove('hidden');if(reportHint)reportHint.textContent='Your paid Business Readiness Report is ready to download.';
    if(uploadForm){uploadForm.querySelectorAll('input,button').forEach(el=>el.disabled=false)}
    try{await fetch('/api/client/post-audit-concierge',{cache:'no-store'})}catch{}
    await loadOffers();
  }else{
    renderLockedReadiness(d.audit);
    $('#recommendation').textContent='Your detailed Chancellor recommendation is ready. Complete the R500 audit payment to unlock it.';
    pay.disabled=false;pay.textContent='Pay R500 & unlock my report';next.textContent='Secure payment';reportButton?.classList.add('hidden');if(reportHint)reportHint.textContent='Complete the R500 audit payment to unlock your detailed report and recommendations.';
    if(uploadForm){uploadForm.querySelectorAll('input,button').forEach(el=>el.disabled=true);const st=$('#uploadStatus');if(st){st.textContent='Document upload unlocks after the R500 audit payment is confirmed.';st.className='status'}}
    $('#offers').innerHTML='<p class="muted">Your follow-on service options will appear after the paid audit review.</p>';
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
  const auditReturned=qs.get('payment')==='returned';
  const offerReturned=qs.get('offerPayment')==='returned';
  if(!auditReturned&&!offerReturned)return;
  const payStatus=$('#payStatus'),offerStatus=$('#offerPayStatus');
  for(let attempt=0;attempt<12;attempt++){
    await new Promise(resolve=>setTimeout(resolve,5000));
    try{
      if(auditReturned){const r=await fetch('/api/portal',{cache:'no-store'});if(r.ok){const d=await r.json();if(paymentComplete(d.payments)){await load();return}}}
      if(offerReturned){const r=await fetch('/api/client/offers',{cache:'no-store'});if(r.ok){const d=await r.json();if(d.payments?.some(p=>String(p.status||'').toUpperCase()==='COMPLETE')){await load();return}}}
    }catch{}
  }
  if(auditReturned&&payStatus){payStatus.textContent='PayFast has not confirmed the payment yet. Your payment is not being charged again. Refresh this page shortly; if it remains pending, contact the Growth Desk.';payStatus.className='status'}
  if(offerReturned&&offerStatus){offerStatus.textContent='PayFast has not confirmed the follow-on payment yet. Refresh this page shortly; if it remains pending, contact the Growth Desk.';offerStatus.className='status'}
}

load();
confirmReturnedPayments();