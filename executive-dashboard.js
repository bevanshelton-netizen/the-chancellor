const ceoMoney=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(Number(n||0));
const ceoPct=(n,d)=>d?`${Math.round((Number(n||0)/Number(d))*100)}%`:'0%';
const ceoEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let ceoLoading=false;
async function loadExecutive(){
  if(ceoLoading||!document.querySelector('#adminDash')||document.querySelector('#adminDash').classList.contains('hidden'))return;
  ceoLoading=true;
  try{
    const [growthR,rescueR,membershipR,offersR]=await Promise.all([fetch('/api/admin'),fetch('/api/admin/rescue'),fetch('/api/admin/membership'),fetch('/api/admin/offers')]);
    if(!growthR.ok||!rescueR.ok||!membershipR.ok)return;
    const growth=await growthR.json(),rescue=await rescueR.json(),membership=await membershipR.json(),offers=offersR.ok?await offersR.json():{offers:[],payments:[]};
    const cases=rescue.rescueCases||[],pros=rescue.professionals||[],payments=membership.payments||[],gm=growth.metrics||{},mm=membership.metrics||{};
    const completeMembershipPayments=payments.filter(p=>String(p.status||'').toUpperCase()==='COMPLETE');
    const membershipCollected=completeMembershipPayments.reduce((s,p)=>s+Number(p.amount||0),0);
    const growthCollected=Number(gm.revenue||0);
    const offerPayments=(offers.payments||[]).filter(p=>String(p.status||'').toUpperCase()==='COMPLETE');
    const followOnCollected=offerPayments.reduce((s,p)=>s+Number(p.amount||0),0);
    const totalRecorded=growthCollected+followOnCollected+membershipCollected;
    const mrr=Number(mm.monthlyRecurringRevenue||0),arr=mrr*12;
    const openCases=cases.filter(c=>!['Resolved','Closed'].includes(c.status));
    const assigned=cases.filter(c=>Boolean(c.assignedProfessionalId||c.assignedProfessional));
    const resolved=cases.filter(c=>c.status==='Resolved');
    const activeMembers=pros.filter(p=>p.active&&String(p.membershipStatus||'').toLowerCase()==='active member');
    const risk=openCases.reduce((s,c)=>s+Number(c.amount||0),0);
    document.querySelector('#ceoRevenue').textContent=ceoMoney(totalRecorded);
    document.querySelector('#ceoMrr').textContent=ceoMoney(mrr);
    document.querySelector('#ceoArr').textContent=ceoMoney(arr);
    document.querySelector('#ceoRisk').textContent=ceoMoney(risk);
    document.querySelector('#ceoOpenCases').textContent=openCases.length;
    document.querySelector('#ceoCritical').textContent=cases.filter(c=>Number(c.triage?.score||0)>=80&&!['Resolved','Closed'].includes(c.status)).length;
    document.querySelector('#ceoMembers').textContent=activeMembers.length;
    document.querySelector('#ceoApplications').textContent=pros.length;
    document.querySelector('#ceoAuditConversion').textContent=ceoPct(gm.paid,gm.leads);
    document.querySelector('#ceoMemberConversion').textContent=ceoPct(activeMembers.length,pros.length);
    document.querySelector('#ceoAssignedRate').textContent=ceoPct(assigned.length,cases.length);
    document.querySelector('#ceoResolvedRate').textContent=ceoPct(resolved.length,cases.length);
    const now=Date.now(),soon=now+7*86400000;
    const dueSoon=pros.filter(p=>p.subscriptionStatus==='Active'&&p.subscriptionRenewsAt&&new Date(p.subscriptionRenewsAt).getTime()>=now&&new Date(p.subscriptionRenewsAt).getTime()<=soon).length;
    const unassignedCritical=cases.filter(c=>Number(c.triage?.score||0)>=80&&!c.assignedProfessionalId&&!['Resolved','Closed'].includes(c.status)).length;
    const pendingVetting=pros.filter(p=>String(p.verificationStatus||'').toLowerCase()!=='verified').length;
    const pendingPayments=Number(mm.pendingPayments||0);
    const outstandingOffers=(offers.offers||[]).filter(o=>!['Paid','Declined','Expired'].includes(o.status)).length;
    const attention=[
      ['Critical cases without a professional',unassignedCritical,unassignedCritical?'Immediate action':'Clear'],
      ['Growth offers awaiting payment',outstandingOffers,outstandingOffers?'Follow up':'Clear'],
      ['Professional applications awaiting verification',pendingVetting,pendingVetting?'Review queue':'Clear'],
      ['Membership payments pending',pendingPayments,pendingPayments?'Follow up':'Clear'],
      ['Membership renewals due within 7 days',dueSoon,dueSoon?'Retention attention':'Clear']
    ];
    document.querySelector('#ceoAttention').innerHTML=attention.map(([label,count,state])=>`<div class="audit-row"><div><strong>${ceoEsc(label)}</strong></div><span>${count}</span><span class="badge">${ceoEsc(state)}</span></div>`).join('');
    document.querySelector('#ceoRevenueMix').innerHTML=`<div class="audit-row"><div><strong>Business Readiness Audits</strong><small> Completed R500 audit payments</small></div><span>${ceoMoney(growthCollected)}</span><span class="badge">Collected</span></div><div class="audit-row"><div><strong>Growth Desk follow-on work</strong><small> Paid profiles, plans, proposals, bids, pitch packages and retainers</small></div><span>${ceoMoney(followOnCollected)}</span><span class="badge">Collected</span></div><div class="audit-row"><div><strong>Professional Network</strong><small> Recorded completed membership payments</small></div><span>${ceoMoney(membershipCollected)}</span><span class="badge">Collected</span></div><div class="audit-row"><div><strong>Professional Network run-rate</strong><small> Active subscription MRR × 12</small></div><span>${ceoMoney(arr)}</span><span class="badge">Annualised, not collected</span></div>`;
  }finally{ceoLoading=false;}
}
const ceoObserver=new MutationObserver(()=>loadExecutive());
const ceoDash=document.querySelector('#adminDash');if(ceoDash)ceoObserver.observe(ceoDash,{attributes:true,attributeFilter:['class']});
document.querySelectorAll('.command-tabs button').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.tab==='executiveView')loadExecutive();}));
setTimeout(loadExecutive,700);
if(!document.querySelector('script[data-offer-desk]')){const s=document.createElement('script');s.src='offers-admin.js?v=20260811-2';s.dataset.offerDesk='1';document.body.appendChild(s)}
