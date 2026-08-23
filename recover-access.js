(()=>{
  const form=document.getElementById('recoverForm');
  const button=document.getElementById('recoverButton');
  const status=document.getElementById('recoverStatus');
  const box=document.getElementById('codeBox');
  const codeEl=document.getElementById('newAccessCode');
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    status.className='status';
    status.textContent='Checking your existing audit…';
    button.disabled=true;
    button.textContent='Restoring access…';
    try{
      const body=Object.fromEntries(new FormData(form));
      const response=await fetch('/api/auth/client/recover',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||'Could not restore access.');
      sessionStorage.setItem('newAccessCode',data.accessCode);
      codeEl.textContent=data.accessCode;
      status.textContent='Access restored.';
      box.style.display='block';
      form.style.display='none';
    }catch(error){
      status.className='status error';
      status.textContent=error.message||'Could not restore access.';
      button.disabled=false;
      button.textContent='Restore my audit access';
    }
  });
})();
