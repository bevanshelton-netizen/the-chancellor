(()=>{
  const form=document.getElementById('assessmentForm');
  const questionsEl=document.getElementById('questions');
  const progressBar=document.getElementById('progressBar');
  const submitBtn=document.getElementById('submitBtn');
  const resultEl=document.getElementById('result');
  const scoreEl=document.getElementById('score');
  const bandEl=document.getElementById('band');
  const meaningEl=document.getElementById('meaning');
  const prioritiesEl=document.getElementById('priorities');
  const accessNote=document.getElementById('accessNote');
  let definition=[];

  function answeredCount(){
    return definition.flatMap(s=>s.questions).filter(q=>form.querySelector(`input[name="${q.id}"]:checked`)).length;
  }
  function updateProgress(){
    const total=definition.flatMap(s=>s.questions).length||1;
    progressBar.style.width=`${Math.round((answeredCount()/total)*100)}%`;
  }
  function render(){
    questionsEl.innerHTML='';
    definition.forEach((section,index)=>{
      const card=document.createElement('section');
      card.className='card';
      card.innerHTML=`<div class="section-head"><div><div class="eyebrow">Section ${index+1} of ${definition.length}</div><h3>${section.name}</h3></div><div class="weight">${section.weight} points</div></div>`;
      section.questions.forEach((q,n)=>{
        const wrap=document.createElement('div');
        wrap.className='question';
        wrap.innerHTML=`<div class="qtext">${n+1}. ${q.text}</div><div class="options">
          <label class="option"><input required type="radio" name="${q.id}" value="0"><span>Not in place</span></label>
          <label class="option"><input required type="radio" name="${q.id}" value="1"><span>Partially</span></label>
          <label class="option"><input required type="radio" name="${q.id}" value="2"><span>Clearly in place</span></label>
        </div>`;
        card.appendChild(wrap);
      });
      questionsEl.appendChild(card);
    });
    form.addEventListener('change',updateProgress);
  }

  async function load(){
    const response=await fetch('/api/readiness/definition',{headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('Assessment is temporarily unavailable.');
    const data=await response.json();
    definition=data.sections||[];
    render();
  }

  function payload(){
    const data=new FormData(form);
    const answers={};
    definition.flatMap(s=>s.questions).forEach(q=>{answers[q.id]=data.get(q.id);});
    return {
      name:data.get('name'),email:data.get('email'),phone:data.get('phone'),businessName:data.get('businessName'),registrationNumber:data.get('registrationNumber'),industry:data.get('industry'),goal:data.get('goal'),answers
    };
  }

  function showResult(data){
    const audit=data.audit||{};
    scoreEl.textContent=`${audit.score||0}/100`;
    bandEl.textContent=audit.band||'Readiness result';
    meaningEl.textContent=audit.bandMeaning||audit.recommendation||'';
    prioritiesEl.innerHTML='';
    (audit.recommendations||audit.priorities||[]).slice(0,3).forEach(p=>{
      const el=document.createElement('div');
      el.className='priority';
      const from=p.indicativeFrom?` · services from R${Number(p.indicativeFrom).toLocaleString('en-ZA')}`:'';
      el.innerHTML=`<strong>${p.priority?`${p.priority}. `:''}${p.section}</strong><br>${p.percent}% ready · ${p.service||'Priority intervention'}${from}<div class="small">${p.summary||''}</div>`;
      prioritiesEl.appendChild(el);
    });
    accessNote.textContent=data.accessCode?`Save your client access code: ${data.accessCode}. It is shown only once.`:'';
    form.style.display='none';
    resultEl.style.display='block';
    resultEl.scrollIntoView({behavior:'smooth',block:'start'});
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity()) return;
    submitBtn.disabled=true;
    submitBtn.textContent='Calculating your readiness score…';
    try{
      const response=await fetch('/api/readiness/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload())});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Could not submit the assessment.');
      showResult(data);
    }catch(error){
      alert(error.message||'Could not submit the assessment.');
    }finally{
      submitBtn.disabled=false;
      submitBtn.textContent='Calculate My Business Readiness Score';
    }
  });

  load().catch(error=>{questionsEl.innerHTML=`<section class="card"><strong>${error.message}</strong></section>`;submitBtn.disabled=true;});
})();
