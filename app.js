const $=s=>document.querySelector(s),messages=$('#messages'),quick=$('#quick'),form=$('#chatForm'),input=$('#chatInput');let history=[],voiceOn=false,aiVoice=false;
function add(text,type,id){const el=document.createElement('div');el.className=`message ${type}`;if(id)el.id=id;el.textContent=text;messages.appendChild(el);messages.scrollTop=messages.scrollHeight;return el}
function offerAudit(){if(document.querySelector('.audit-conversion'))return;const wrap=document.createElement('div');wrap.className='message bot audit-conversion';wrap.innerHTML='<strong>Your next practical step</strong><br><span>Get a 180-point Business Readiness Audit for R500 and leave with a clear priority plan.</span>';const b=document.createElement('button');b.type='button';b.textContent='Start my R500 audit →';b.className='button compact';b.style.cssText='display:block;margin-top:12px;width:max-content;max-width:100%';b.addEventListener('click',()=>{const goal=$('#auditForm [name="goal"]');const last=[...history].reverse().find(x=>x.role==='user');if(goal&&!goal.value&&last)goal.value=last.content;window.ChancellorAcquisition?.track?.('campaign_cta',{label:'Chat to R500 audit',href:'#audit'});document.querySelector('#audit').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#auditForm [name="name"]')?.focus(),500)});wrap.appendChild(b);messages.appendChild(wrap);messages.scrollTop=messages.scrollHeight}
async function speak(text){if(!voiceOn)return;if(aiVoice){try{const r=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});if(r.ok){const audio=new Audio(URL.createObjectURL(await r.blob()));await audio.play();return}}catch{}}if('speechSynthesis'in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);const voices=speechSynthesis.getVoices();u.voice=voices.find(v=>/en-ZA/i.test(v.lang))||voices.find(v=>/en-GB/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang));u.rate=.92;u.pitch=.95;speechSynthesis.speak(u)}}
async function answer(text){text=text.trim();if(!text)return;add(text,'user');history.push({role:'user',content:text});input.value='';quick.hidden=true;const thinking=add('The Chancellor is considering that…','bot thinking','thinking');try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:history.slice(-8)})});const data=await r.json();if(!r.ok)throw new Error(data.error);thinking.remove();add(data.reply,'bot');history.push({role:'assistant',content:data.reply});const turnCount=history.filter(x=>x.role==='assistant').length;if(/R500|readiness audit|audit/i.test(data.reply)||turnCount>=3)offerAudit();speak(data.reply)}catch(e){thinking.textContent=e.message||'I could not respond just now. Please try again.'}}
quick.addEventListener('click',e=>{if(e.target.tagName==='BUTTON')answer(e.target.textContent)});form.addEventListener('submit',e=>{e.preventDefault();answer(input.value)});$('#resetChat').addEventListener('click',()=>{history=[];messages.innerHTML='<div class="message bot">Welcome. Which opportunity matters most to your business right now?</div>';quick.hidden=false;if('speechSynthesis'in window)speechSynthesis.cancel()});
$('#voiceToggle').addEventListener('click',()=>{voiceOn=!voiceOn;const b=$('#voiceToggle');b.textContent=voiceOn?'Voice on':'Voice off';b.classList.toggle('active',voiceOn);if(voiceOn)speak("Voice is on. I'm ready when you are.")});
$('#micButton').addEventListener('click',()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('Voice input is not supported by this browser. You can still type your answer.');return}const recognition=new SR();recognition.lang='en-ZA';recognition.interimResults=false;$('#micButton').textContent='●';recognition.onresult=e=>{input.value=e.results[0][0].transcript;input.focus()};recognition.onend=()=>{$('#micButton').textContent='🎙'};recognition.onerror=()=>{$('#micButton').textContent='🎙'};recognition.start()});
fetch('/api/status').then(r=>r.json()).then(s=>{aiVoice=Boolean(s.voice)}).catch(()=>{});

const servicePrompts={
'funding':'I need funding and want to know whether my business is funder-ready.',
'contracts':'I need help preparing my business to win contracts.',
'tenders':'I need help getting my business tender-ready.',
'customers':'I need more customers and stronger sales.',
'investment':'I need to prepare my business for an investor conversation.',
'growth':'My business is established and I want a strategy to scale to the next level.',
'business-rescue':'My business is in trouble and I need a turnaround plan.',
'business-plan':'I need a professional business plan.',
'investor-pack':'I need a funding or investor pack for a serious funding conversation.',
'company-profile':'I need a professional company profile that sells my business properly.',
'sales':'I have a product or service but I need more customers and sales.',
'marketing':'I need a practical marketing strategy to generate more enquiries and customers.',
'startup':'I want to start a business and need help turning the idea into a workable launch plan.',
'compliance':'I need to identify compliance and documentation gaps in my business.',
'cashflow':'My cash flow is under pressure and I need to understand where the money is going.',
'pricing':'I need to know whether my pricing is actually profitable.',
'ai':'I want to use AI and automation practically in my business.',
'digital':'I need help setting up my business online, including digital selling and payments.',
'brand':'I need stronger branding and corporate positioning.',
'mentorship':'I want ongoing business mentorship and accountability.',
'emergency':'My business has an urgent problem and I need to know what to do first.',
'unsure':'I am not sure what my business needs. Please help me diagnose the gaps first.'
};
function startServicePathway(){const params=new URLSearchParams(location.search);let service=params.get('service');if(!service){try{service=sessionStorage.getItem('chancellorSelectedService')||''}catch{}}const prompt=servicePrompts[service];if(!prompt)return;try{sessionStorage.removeItem('chancellorSelectedService')}catch{}setTimeout(()=>answer(prompt),250)}
startServicePathway();

let readinessDefinition=[];
let readinessOptions=[];
async function loadReadinessDefinition(){
  const box=$('#questions');
  if(!box)return;
  box.innerHTML='<p class="muted">Loading the 180-point, 9-category Business Readiness Audit…</p>';
  try{
    const r=await fetch('/api/readiness/definition',{headers:{Accept:'application/json'},cache:'no-store'});
    if(!r.ok)throw new Error('The audit questions could not be loaded.');
    const data=await r.json();
    readinessDefinition=data.sections||[];
    readinessOptions=data.options||[{value:0,label:'Not in place'},{value:1,label:'Partially / inconsistent'},{value:2,label:'Clearly in place'}];
    const optionHtml=readinessOptions.map(option=>`<option value="${option.value}">${option.label}</option>`).join('');
    box.innerHTML=readinessDefinition.map(section=>`<div class="audit-question-group"><h3>${section.name}</h3>${section.questions.map(q=>`<label>${q.text}<select name="${q.id}" required><option value="">Select</option>${optionHtml}</select></label>`).join('')}</div>`).join('');
  }catch(error){
    box.innerHTML=`<p class="status error">${error.message||'The audit is temporarily unavailable.'}</p>`;
    const button=$('#auditForm button[type="submit"]');if(button)button.disabled=true;
  }
}
loadReadinessDefinition();

$('#auditForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const status=$('#auditStatus'),button=e.currentTarget.querySelector('button[type="submit"]');
  if(!readinessDefinition.length){status.className='status error';status.textContent='The audit questions are not ready yet. Please refresh and try again.';return}
  status.className='status';status.textContent='Scoring your business readiness and creating your private workspace…';button.disabled=true;
  const formData=new FormData(e.currentTarget);
  const answers={};
  readinessDefinition.flatMap(section=>section.questions).forEach(q=>{answers[q.id]=formData.get(q.id)});
  const data={name:formData.get('name'),email:formData.get('email'),phone:formData.get('phone'),businessName:formData.get('businessName'),registrationNumber:formData.get('registrationNumber'),industry:formData.get('industry'),goal:formData.get('goal'),answers};
  try{
    const r=await fetch('/api/readiness/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(data)});
    const out=await r.json();if(!r.ok)throw new Error(out.error);
    sessionStorage.setItem('newAccessCode',out.accessCode);sessionStorage.setItem('readinessScore',String(out.audit?.score??''));sessionStorage.setItem('readinessBand',String(out.audit?.band??''));
    try{await window.ChancellorAcquisition?.linkAudit?.();await window.ChancellorAcquisition?.linkReferral?.('Growth Desk Audit');await window.ChancellorInstitution?.linkAudit?.()}catch{}
    status.innerHTML=`Audit captured. Your private access code is <strong>${out.accessCode}</strong>. Save it now. Taking you to secure R500 payment and your readiness dashboard…`;
    setTimeout(()=>location.href='portal.html?new=1',1200);
  }catch(err){status.className='status error';status.textContent=err.message;button.disabled=false}
});