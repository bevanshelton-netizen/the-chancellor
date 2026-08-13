(()=>{
  const APPROVED='/assets/chancellor-approved-live.webp?v=20260813-approved-1';

  function show(el){
    if(!el)return;
    if(el.getAttribute('src')!==APPROVED)el.setAttribute('src',APPROVED);
    el.style.visibility='visible';
    el.style.opacity='1';
    el.dataset.brandReady='approved-chancellor-portrait';
  }

  function apply(){
    document.querySelectorAll('.chancellor-portrait,.rescue-portrait,.avatar-img,.campaign-identity img').forEach(show);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('pageshow',()=>setTimeout(apply,25));

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      const el=mutation.target;
      if(el.matches?.('.chancellor-portrait,.rescue-portrait,.avatar-img,.campaign-identity img')&&el.getAttribute('src')!==APPROVED)show(el);
    }
  });
  const startObserver=()=>document.querySelectorAll('.chancellor-portrait,.rescue-portrait,.avatar-img,.campaign-identity img').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['src']}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();
})();
