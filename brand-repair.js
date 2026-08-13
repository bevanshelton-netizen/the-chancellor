(()=>{
  const APPROVED='/assets/chancellor-approved-live.webp?v=20260813-approved-1';
  const CREST='/assets/the-chancellor-crest.svg?v=20260813-fix-1';

  function show(el){
    if(!el)return;
    if(el.getAttribute('src')!==APPROVED)el.setAttribute('src',APPROVED);
    el.style.visibility='visible';
    el.style.opacity='1';
    el.dataset.brandReady='approved-chancellor-portrait';
  }
  function repairCrest(el){
    if(!el)return;
    if(el.getAttribute('src')!==CREST)el.setAttribute('src',CREST);
  }
  function loadRescueLayoutFix(){
    if(!/\/rescue(?:\.html)?$/i.test(location.pathname))return;
    if(document.querySelector('link[data-rescue-layout-fix]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='/rescue-layout-fix.css?v=20260813-1';
    link.dataset.rescueLayoutFix='1';
    document.head.appendChild(link);
  }
  function apply(){
    document.querySelectorAll('.chancellor-portrait,.rescue-portrait,.avatar-img,.campaign-identity img').forEach(show);
    document.querySelectorAll('.crest-logo').forEach(repairCrest);
    loadRescueLayoutFix();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('pageshow',()=>setTimeout(apply,25));

  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      const el=mutation.target;
      if(el.matches?.('.chancellor-portrait,.rescue-portrait,.avatar-img,.campaign-identity img')&&el.getAttribute('src')!==APPROVED)show(el);
      if(el.matches?.('.crest-logo')&&el.getAttribute('src')!==CREST)repairCrest(el);
    }
  });
  const startObserver=()=>{
    document.querySelectorAll('.chancellor-portrait,.rescue-portrait,.avatar-img,.campaign-identity img,.crest-logo').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['src']}));
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();
})();
