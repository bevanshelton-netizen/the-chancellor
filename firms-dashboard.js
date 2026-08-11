const firmEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let firmsLoading=false;
async function loadFirmsDashboard(){
  if(firmsLoading||!document.querySelector('#adminDash')||document.querySelector('#adminDash').classList.contains('hidden'))return;
  firmsLoading=true;
  try{
    const r=await fetch('/api/admin/firms');
    if(!r.ok)return;
    const d=await r.json(),firms=d.firms||[],m=d.metrics||{};
    document.querySelector('#firmCount').textContent=m.firms||0;
    document.querySelector('#firmTeamTotal').textContent=m.teamMembers||0;
    document.querySelector('#firmActiveCases').textContent=m.activeCases||0;
    document.querySelector('#firmAverageTeam').textContent=firms.length?Math.round((Number(m.teamMembers||0)/firms.length)*10)/10:0;
    document.querySelector('#firmsList').innerHTML=firms.length?firms.slice().sort((a,b)=>Number(b.activeCases||0)-Number(a.activeCases||0)).map(f=>`<article class="professional-card"><div><small>${firmEsc(f.practiceType||'Professional Practice')} · ${firmEsc(f.country||'South Africa')}</small><h3>${firmEsc(f.name)}</h3><p><b>Registration:</b> ${firmEsc(f.registrationNumber||'Not supplied')}</p><p><b>Coverage:</b> ${firmEsc(f.regions||'Not specified')}</p><p><b>Capacity:</b> ${Number(f.capacity||0)||'Not specified'} cases/month</p>${f.website?`<p><b>Website:</b> ${firmEsc(f.website)}</p>`:''}</div><div class="professional-controls"><span class="badge">${firmEsc(f.status||'Active')}</span><div class="status-stack"><span><small>Team size</small><b>${Number(f.teamSize||0)}</b></span><span><small>Verified members</small><b>${Number(f.verifiedMembers||0)}</b></span><span><small>Active cases</small><b>${Number(f.activeCases||0)}</b></span><span><small>Resolved</small><b>${Number(f.resolvedCases||0)}</b></span></div></div></article>`).join(''):'<p>No firms or practices have been registered yet.</p>';
  }finally{firmsLoading=false;}
}
const firmsDash=document.querySelector('#adminDash');
if(firmsDash)new MutationObserver(()=>loadFirmsDashboard()).observe(firmsDash,{attributes:true,attributeFilter:['class']});
document.querySelectorAll('.command-tabs button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab==='firmsView')loadFirmsDashboard();}));
setTimeout(loadFirmsDashboard,850);
