(()=>{
  const KEY='chancellor.auditDraft.v1';
  const form=document.querySelector('#auditForm');
  if(!form)return;

  function snapshot(){
    const data={};
    for(const el of form.elements){
      if(!el.name)continue;
      if(el.type==='checkbox')data[el.name]=Boolean(el.checked);
      else if(el.type==='radio'){if(el.checked)data[el.name]=el.value;}
      else data[el.name]=el.value;
    }
    try{localStorage.setItem(KEY,JSON.stringify(data));}catch{}
  }

  function restore(){
    let data;
    try{data=JSON.parse(localStorage.getItem(KEY)||'null');}catch{return;}
    if(!data||typeof data!=='object')return;
    for(const el of form.elements){
      if(!el.name||!(el.name in data))continue;
      if(el.type==='checkbox')el.checked=Boolean(data[el.name]);
      else if(el.type==='radio')el.checked=String(el.value)===String(data[el.name]);
      else el.value=data[el.name]??'';
    }
    const status=document.querySelector('#auditStatus');
    if(status&&!status.textContent)status.textContent='Your previous audit answers have been restored on this device.';
  }

  form.addEventListener('input',snapshot);
  form.addEventListener('change',snapshot);
  form.addEventListener('submit',snapshot);

  window.ChancellorAuditDraft={
    clear(){try{localStorage.removeItem(KEY);}catch{}},
    save:snapshot,
    restore
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(restore,0),{once:true});
  else setTimeout(restore,0);
})();
