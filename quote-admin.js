(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));
  let loading=false;
  async function enhance(){
    if(loading)return;const box=document.querySelector('#audits');if(!box||!box.children.length)return;loading=true;
    try{
      const r=await fetch('/api/admin/quote-overview',{cache:'no-store'});if(!r.ok)return;
      const d=await r.json();
      for(const row of d.rows||[]){
        const card=box.querySelector(`[data-id="${CSS.escape(String(row.auditId))}"]`);if(!card)continue;
        let q=card.querySelector('.auto-quote-admin');if(q)continue;
        q=document.createElement('div');q.className='auto-quote-admin';const rec=row.recommendation||{};
        const state=row.offer?`Offer sent · ${row.offer.status}`:row.request?`Client requested · ${row.request.status}`:'Ready for human review';
        q.innerHTML=`<div><small>AUTO QUOTE · ${esc(state)}</small><strong>${esc(rec.service||'Recommended follow-on service')}</strong><span>${money(rec.amount)} · ${esc(rec.primaryPriority||'')}</span></div><button class="button compact" ${(!row.paid||row.offer)?'disabled':''}>${row.offer?'Offer issued':row.paid?'Approve & send offer':'Awaiting R500 payment'}</button>`;
        card.querySelector('.professional-controls')?.appendChild(q);
        const b=q.querySelector('button');if(b&&!b.disabled)b.onclick=async()=>{if(!confirm(`Approve and send the recommended ${rec.service} offer for ${money(rec.amount)}?`))return;b.disabled=true;b.textContent='Sending…';const rr=await fetch(`/api/admin/audits/${encodeURIComponent(row.auditId)}/recommended-offer`,{method:'POST'});const j=await rr.json();if(!rr.ok){alert(j.error||'Recommended offer could not be issued.');b.disabled=false;b.textContent='Approve & send offer';return}b.textContent='Offer issued';};
      }
    }catch{}finally{loading=false}
  }
  const obs=new MutationObserver(()=>setTimeout(enhance,50));const target=document.querySelector('#audits')||document.documentElement;obs.observe(target,{childList:true,subtree:true});
  window.addEventListener('load',()=>setTimeout(enhance,1000));
})();
