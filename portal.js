if(!document.querySelector('link[data-offer-styles]')){const l=document.createElement('link');l.rel='stylesheet';l.href='offers.css?v=20260811-1';l.dataset.offerStyles='1';document.head.appendChild(l)}
const $=s=>document.querySelector(s); const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));
const code=sessionStorage.getItem('newAccessCode'); if(code) $('#newCode').innerHTML=`Your new access code is <strong>${esc(code)}</strong>. Save it before signing in.`;
const qs=new URLSearchParams(location.search);
function paymentComplete(payments=[]){return payments.some(p=>String(p.status||'').toUpperCase()==='COMPLETE')}
function offerPaid(offer,payments=[]){return offer.status==='Paid'||payments.some(p=>p.offerId===offer.id&&String(p.status||'').toUpperCase()==='COMPLETE')}
function clientNextStep(audit,fileCount){const stage=String(audit.salesStage||'');if(stage==='Delivered')return'Delivered';if(['Follow-on paid','In delivery'].includes(stage))return'Delivery in progress';if(stage==='Offer accepted')return'Complete follow-on payment';if(stage==='Offer sent')return'Review your growth offer';return fileCount?'Human review':'Upload documents'}

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

async function load(){ const r=await fetch('/api/portal'); if(!r.ok)return null; const d=await r.json(); $('#login').classList.add('hidden'); $('#dashboard').classList.remove('hidden'); $('#businessName').textContent=d.audit.businessName; $('#clientGoal').textContent=d.audit.goal; $('#score').textContent=d.audit.score; $('#band').textContent=d.audit.band; $('#status').textContent=d.audit.status; $('#recommendation').textContent=d.audit.recommendation; $('#fileCount').textContent=d.files.length; $('#files').innerHTML=d.files.length?d.files.map(f=>`<div class="file-row"><span>${esc(f.originalName)}<small> · ${(f.size/1024).toFixed(0)} KB</small></span><span class="badge">${esc(f.status)}</span></div>`).join(''):'<p>No documents uploaded yet.</p>'; const paid=paymentComplete(d.payments); const pay=$('#payButton'),payStatus=$('#payStatus'),next=$('#nextStep'); if(paid){pay.disabled=true;pay.textContent='Payment received ✓';payStatus.textContent='Your R500 audit payment is confirmed. Your Growth Desk can now proceed with review.';payStatus.className='status';next.textContent=clientNextStep(d.audit,d.files.length)}else{pay.disabled=false;pay.textContent='Pay R500 & start my review';next.textContent='Secure payment';if(qs.get('payment')==='returned')payStatus.textContent='You have returned from PayFast. We are confirming your payment automatically…';if(qs.get('payment')==='cancelled'){payStatus.textContent='Payment was not completed. You can try again when ready.';payStatus.className='status error'}} await loadOffers(); return d; }
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
      if(auditReturned){
        const r=await fetch('/api/portal',{cache:'no-store'});
        if(r.ok){const d=await r.json();if(paymentComplete(d.payments)){await load();return}}
      }
      if(offerReturned){
        const r=await fetch('/api/client/offers',{cache:'no-store'});
        if(r.ok){const d=await r.json();if(d.payments?.some(p=>String(p.status||'').toUpperCase()==='COMPLETE')){await load();return}}
      }
    }catch{}
  }
  if(auditReturned&&payStatus){payStatus.textContent='PayFast has not confirmed the payment yet. Your payment is not being charged again. Refresh this page shortly; if it remains pending, contact the Growth Desk.';payStatus.className='status'}
  if(offerReturned&&offerStatus){offerStatus.textContent='PayFast has not confirmed the follow-on payment yet. Refresh this page shortly; if it remains pending, contact the Growth Desk.';offerStatus.className='status'}
}

load();
confirmReturnedPayments();
