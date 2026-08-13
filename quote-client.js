(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));
  async function render(){
    const dash=document.querySelector('#dashboard');if(!dash||dash.classList.contains('hidden'))return;
    let panel=document.querySelector('#autoQuotePanel');
    if(!panel){
      panel=document.createElement('section');panel.id='autoQuotePanel';panel.className='panel';
      const report=document.querySelector('.readiness-report');(report||dash.firstElementChild).insertAdjacentElement('afterend',panel);
    }
    panel.innerHTML='<p class="eyebrow">Recommended next move</p><h2>Your audit-based quotation recommendation</h2><p class="muted">Preparing your recommendation…</p>';
    try{
      const r=await fetch('/api/client/quote-recommendation',{cache:'no-store'});if(!r.ok)return;
      const d=await r.json(),q=d.recommendation||{};
      const status=d.sentOffer?`Offer sent · ${esc(d.sentOffer.status)}`:d.request?`Quotation requested · ${esc(d.request.status)}`:'Recommendation ready';
      panel.innerHTML=`<div class="panel-heading"><div><p class="eyebrow">Recommended next move</p><h2>${esc(q.service||'Growth Desk support')}</h2></div><span class="badge">${esc(status)}</span></div><div class="quote-recommendation-card"><div><small>Suggested investment</small><strong>${money(q.amount)}</strong></div><p>${esc(q.description||'')}</p><p><b>Proposed scope:</b> ${esc(q.deliverables||'')}</p><p><b>Primary priority:</b> ${esc(q.primaryPriority||'')}</p>${(q.supportingPriorities||[]).length?`<p><b>Supporting priorities:</b> ${esc(q.supportingPriorities.join(' · '))}</p>`:''}</div><p class="muted">This recommendation is generated from your audit. A Chancellor administrator reviews the scope and price before any follow-on offer becomes payable.</p><button id="requestRecommendedQuote" class="button" ${(!d.auditPaid||d.request||d.sentOffer)?'disabled':''}>${d.sentOffer?'Offer already issued':d.request?'Quotation requested':d.auditPaid?'Request this quotation':'Complete R500 audit payment first'}</button><p id="quoteRequestStatus" class="status"></p>`;
      const b=panel.querySelector('#requestRecommendedQuote');if(b&&!b.disabled)b.onclick=async()=>{b.disabled=true;b.textContent='Requesting…';const rr=await fetch('/api/client/quote-recommendation/request',{method:'POST'});const j=await rr.json();const st=panel.querySelector('#quoteRequestStatus');if(!rr.ok){st.textContent=j.error||'Could not request quotation.';st.className='status error';b.disabled=false;b.textContent='Request this quotation';return}st.textContent='Quotation request received. The Growth Desk will review the recommendation before issuing the payable offer.';render();};
    }catch{}
  }
  const observer=new MutationObserver(render);observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('load',render);setTimeout(render,800);
})();
