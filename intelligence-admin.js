(()=>{
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)],esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderEvidence(card,data){
  const box=card.querySelector('.intelligence-results');
  const intel=data.intelligence||{};const rows=data.extractions||[];
  box.innerHTML=`<div class="source-meta"><b>Document intelligence — candidate evidence only</b><p>${esc(intel.summary||'No intelligence summary yet.')}</p></div><details><summary>Extraction report (${rows.length} file${rows.length===1?'':'s'})</summary><div class="production-history">${rows.length?rows.map(x=>`<div class="file-row"><span><b>${esc(x.originalName)}</b><small> · ${esc(x.status)} · ${Number(x.words||0).toLocaleString('en-ZA')} words</small>${x.warning?`<small> · ${esc(x.warning)}</small>`:''}</span></div>${x.preview?`<pre style="white-space:pre-wrap;max-height:220px;overflow:auto">${esc(x.preview)}</pre>`:''}`).join(''):'<p class="muted">No uploaded source documents found.</p>'}</div></details>`;
}
async function refreshBrief(card,id){
  const r=await fetch('/api/admin/production');if(!r.ok)return;const d=await r.json();const row=(d.rows||[]).find(x=>x.assignment.id===id);if(row){const ta=card.querySelector('.production-brief');if(ta)ta.value=row.production.brief||''}
}
async function loadExisting(card,id){const r=await fetch(`/api/admin/intelligence/${encodeURIComponent(id)}`);if(!r.ok)return;const d=await r.json();if(d.intelligence||d.extractions?.length)renderEvidence(card,d)}
function augment(card){
  if(card.dataset.intelligenceReady)return;card.dataset.intelligenceReady='1';const id=card.dataset.id;if(!id)return;
  const source=card.querySelector('.source-meta');
  const section=document.createElement('div');section.className='wide';section.innerHTML='<div class="production-actions"><button class="button compact analyse-docs">Analyse source documents</button><button class="button compact dark export-reviewed">Export reviewed PDF + Word</button></div><p class="status intelligence-status"></p><div class="intelligence-results"></div>';
  if(source)source.after(section);else card.querySelector('.production-grid')?.appendChild(section);
  const status=section.querySelector('.intelligence-status');
  section.querySelector('.analyse-docs').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Reading documents…';status.className='status';status.textContent='Extracting PDF, Word and spreadsheet content and building an evidence brief…';try{const r=await fetch(`/api/admin/intelligence/${encodeURIComponent(id)}/scan`,{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Document analysis failed.');renderEvidence(card,d);await refreshBrief(card,id);status.textContent=`Analysed ${d.intelligence?.sourceCount||0} source file(s). Candidate evidence has been added to the production brief for human verification.`}catch(err){status.textContent=err.message;status.className='status error'}finally{b.disabled=false;b.textContent='Analyse source documents'}};
  section.querySelector('.export-reviewed').onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Creating files…';status.className='status';status.textContent='Generating reviewed PDF and Word exports…';try{const r=await fetch(`/api/admin/production/${encodeURIComponent(id)}/export`,{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Export failed.');status.textContent=`PDF and Word are ready in the client portal (${(d.files||[]).length} files).`}catch(err){status.textContent=err.message;status.className='status error'}finally{b.disabled=false;b.textContent='Export reviewed PDF + Word'}};
  loadExisting(card,id).catch(()=>{});
}
function scan(){qa('.production-card').forEach(augment)}
const target=q('#productionList');if(target)new MutationObserver(scan).observe(target,{childList:true,subtree:true});setInterval(scan,1800);scan();
if(!document.querySelector('script[data-followup-desk]')){const s=document.createElement('script');s.src='followup-admin.js?v=20260811-1';s.dataset.followupDesk='1';document.body.appendChild(s)}
})();
