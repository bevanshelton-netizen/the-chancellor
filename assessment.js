(()=>{
  const form=document.getElementById('assessmentForm');
  const questionsEl=document.getElementById('questions');
  const progressBar=document.getElementById('progressBar');
  const progressText=document.getElementById('progressText');
  const submitBtn=document.getElementById('submitBtn');
  const resultEl=document.getElementById('result');
  const scoreEl=document.getElementById('score');
  const bandEl=document.getElementById('band');
  const meaningEl=document.getElementById('meaning');
  const riskEl=document.getElementById('risk');
  const opportunityEl=document.getElementById('opportunity');
  const interventionEl=document.getElementById('intervention');
  const accessNote=document.getElementById('accessNote');
  const payBtn=document.getElementById('payBtn');
  const paymentStatus=document.getElementById('paymentStatus');
  let definition=[];
  let options=[];
  let maxScore=180;

  function allQuestions(){return definition.flatMap(section=>section.questions)}
  function answeredCount(){return allQuestions().filter(q=>form.querySelector(`input[name="${q.id}"]:checked`)).length}
  function updateProgress(){
    const total=allQuestions().length||1;
    const answered=answeredCount();
    progressBar.style.width=`${Math.round((answered/total)*100)}%`;
    progressText.textContent=`${answered} of ${total} questions answered`;
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
        const optionHtml=options.map(option=>`<label class="option"><input required type="radio" name="${q.id}" value="${option.value}"><span>${option.label}</span></label>`).join('');
        wrap.innerHTML=`<div class="qtext">${n+1}. ${q.text}</div><div class="options">${optionHtml}</div>`;
        card.appendChild(wrap);
      });
      questionsEl.appendChild(card);
    });
    form.addEventListener('change',updateProgress);
    updateProgress();
  }

  async function load(){
    const response=await fetch('/api/readiness/definition',{headers:{Accept:'application/json'},cache:'no-store'});
    if(!response.ok) throw new Error('The Business Readiness Audit is temporarily unavailable.');
    const data=await response.json();
    definition=data.sections||[];
    maxScore=Number(data.maxScore||180);
    options=data.options||[
      {value:0,label:'Not in place'},
      {value:1,label:'Partially / inconsistent'},
      {value:2,label:'Clearly in place'}
    ];
    render();
  }

  function payload(){
    const data=new FormData(form);
    const answers={};
    allQuestions().forEach(q=>{answers[q.id]=data.get(q.id)});
    return {
      name:data.get('name'),email:data.get('email'),phone:data.get('phone'),businessName:data.get('businessName'),registrationNumber:data.get('registrationNumber'),industry:data.get('industry'),goal:data.get('goal'),primaryChallenge:data.get('primaryChallenge'),turnoverBand:data.get('turnoverBand'),fundingNeed:data.get('fundingNeed'),implementationIntent:data.get('implementationIntent'),answers
    };
  }

  function showResult(data){
    const audit=data.audit||{};
    scoreEl.textContent=`${audit.score||0}/${audit.maxScore||maxScore}`;
    bandEl.textContent=audit.band||'Business Readiness result';
    meaningEl.textContent=audit.bandMeaning||audit.recommendation||'';
    riskEl.textContent=audit.biggestRisk||audit.priorities?.[0]?.section||'Priority review required.';
    opportunityEl.textContent=audit.biggestOpportunity||'Your strongest category will support the next growth move.';
    interventionEl.textContent=audit.priorityIntervention||audit.recommendedService||'Business Growth intervention';
    if(data.accessCode){
      sessionStorage.setItem('newAccessCode',data.accessCode);
      accessNote.textContent=`Save your client access code: ${data.accessCode}. It is shown only once.`;
    }else accessNote.textContent='';
    form.style.display='none';
    resultEl.style.display='block';
    resultEl.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function startCheckout(){
    payBtn.disabled=true;
    payBtn.textContent='Opening secure PayFast checkout…';
    paymentStatus.textContent='';
    try{
      const response=await fetch('/api/payfast/checkout',{method:'POST',headers:{Accept:'application/json'}});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Could not start payment.');
      const checkout=document.createElement('form');
      checkout.method='POST';
      checkout.action=data.url;
      Object.entries(data.fields||{}).forEach(([name,value])=>{
        const input=document.createElement('input');
        input.type='hidden';input.name=name;input.value=value;
        checkout.appendChild(input);
      });
      document.body.appendChild(checkout);
      checkout.submit();
    }catch(error){
      paymentStatus.textContent=error.message||'Could not start payment. You can continue through the client portal.';
      payBtn.disabled=false;
      payBtn.textContent='Pay R500 Securely with PayFast';
    }
  }

  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity()) return;
    submitBtn.disabled=true;
    submitBtn.textContent='Preparing your Business Readiness diagnosis…';
    try{
      const response=await fetch('/api/readiness/submit',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload())});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||'Could not submit the audit.');
      showResult(data);
    }catch(error){
      alert(error.message||'Could not submit the audit.');
    }finally{
      submitBtn.disabled=false;
      submitBtn.textContent='Complete Audit & See My Preliminary Score';
    }
  });

  payBtn.addEventListener('click',startCheckout);
  load().catch(error=>{questionsEl.innerHTML=`<section class="card"><strong>${error.message}</strong></section>`;submitBtn.disabled=true;});
})();