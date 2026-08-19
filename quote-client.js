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
    panel.innerHTML='<p class="eyebrow">Recommended next move</p><h2>Your audit-based recommendation</h2><p class="muted">Preparing your recommendation…</p>';
    try{
      const r=await fetch('/api/client/quote-recommendation',{cache:'no-store'});if(!r.ok)return;
      const d=await r.json(),q=d.recommendation||{};
      const status=d.sentOffer?`Offer ready · ${esc(d.sentOffer.status)}`:d.request?`Quotation ready · ${esc(d.request.status)}`:'Recommendation ready';
      panel.innerHTML=`<div class="panel-heading"><div><p class="eyebrow">The Chancellor recommends</p><h2>${esc(q.service||'Growth Desk support')}</h2></div><span class="badge">${esc(status)}</span></div><div class="quote-recommendation-card"><div><small>Recommended investment</small><strong>${money(q.amount)}</strong></div><p>${esc(q.description||'')}</p><p><b>What this intervention focuses on:</b> ${esc(q.deliverables||'')}</p><p><b>Primary priority:</b> ${esc(q.primaryPriority||'')}</p></div><p class="muted">This recommendation is generated directly from your paid Business Readiness Audit. Review the scope and price carefully before accepting and paying.</p><button id="requestRecommendedQuote" class="button" ${(!d.auditPaid||d.sentOffer)?'disabled':''}>${d.sentOffer?'Offer ready below':d.auditPaid?'Create my payable offer':'Complete R500 audit payment first'}</button><p id="quoteRequestStatus" class="status"></p>`;
      if(d.sentOffer&&typeof window.loadOffers==='function')window.loadOffers();
      const b=panel.querySelector('#requestRecommendedQuote');if(b&&!b.disabled)b.onclick=async()=>{b.disabled=true;b.textContent='Creating offer…';const rr=await fetch('/api/client/quote-recommendation/request',{method:'POST'});const j=await rr.json();const st=panel.querySelector('#quoteRequestStatus');if(!rr.ok){st.textContent=j.error||'Could not create your offer.';st.className='status error';b.disabled=false;b.textContent='Create my payable offer';return}st.textContent='Your recommended offer is ready below. Review it and pay securely when you are ready.';if(typeof window.loadOffers==='function')await window.loadOffers();render();};
    }catch{}
  }
  const observer=new MutationObserver(render);observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
  window.addEventListener('load',render);setTimeout(render,800);
})();