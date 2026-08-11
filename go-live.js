(()=>{
const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(d){
  q('#deployProvider').textContent=d.deployment?.provider||'unknown';q('#deployRepo').textContent=d.deployment?.repo||'not supplied';q('#deployBranch').textContent=d.deployment?.branch||'not supplied';q('#deployCommit').textContent=d.deployment?.commitShort||'not supplied';
  q('#overallState').textContent=d.readyForPaidTraffic?'READY':'BLOCKED';
  q('#overallDetail').textContent=d.readyForPaidTraffic?'Production checks passed for paid traffic.':`${(d.blockers||[]).length} critical blocker${(d.blockers||[]).length===1?'':'s'} must be fixed.`;
  q('#checkList').innerHTML=(d.checks||[]).map(c=>`<div class="golive-check"><i>${c.ok?'✓':'✕'}</i><div><b>${esc(c.label)}</b><small>${esc(c.detail||'')}</small></div><span class="badge">${c.ok?'PASS':c.critical?'BLOCKER':'WARNING'}</span></div>`).join('');
  const blockers=(d.checks||[]).filter(c=>c.critical&&!c.ok),warnings=(d.checks||[]).filter(c=>!c.critical&&!c.ok);
  let html='';if(blockers.length)html+=`<div class="status error"><b>Do not send paid traffic yet.</b> Fix: ${blockers.map(x=>esc(x.label)).join(' · ')}</div>`;else html+='<div class="status"><b>Commercial go-live checks passed.</b> You can proceed to a controlled R500 test transaction.</div>';
  if(warnings.length)html+=`<p class="muted">Warnings: ${warnings.map(x=>esc(x.label)).join(' · ')}. These do not block checkout but may reduce the full Chancellor experience.</p>`;
  if(d.deployment?.commitShort)html+=`<p class="muted">Render reports deployed commit <b>${esc(d.deployment.commitShort)}</b>. Compare this with the latest GitHub commit when diagnosing stale deployments.</p>`;
  q('#blockerPanel').innerHTML=html;
}
async function run(){const b=q('#runCheck');b.disabled=true;b.textContent='Checking…';q('#overallState').textContent='CHECKING…';try{const r=await fetch('/api/go-live',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Production check failed.');render(d)}catch(err){q('#overallState').textContent='UNREACHABLE';q('#overallDetail').textContent=err.message;q('#checkList').innerHTML='<div class="status error">The production self-test endpoint could not be reached. Render may still be deploying the newest commit.</div>';q('#blockerPanel').innerHTML='<p class="muted">Wait for the Render deployment to finish, then run the check again.</p>'}finally{b.disabled=false;b.textContent='Run check again'}}
q('#runCheck').addEventListener('click',run);run();
})();