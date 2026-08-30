(()=>{
  const APPROVED='/assets/chancellor-approved-live.webp?v=20260813-approved-1';
  const CREST='/assets/the-chancellor-crest.svg?v=20260813-fix-1';

  // Production character contract. Visual/video features should read this before
  // selecting or generating Chancellor media. Bevan Shelton is wardrobe branding,
  // not a replacement identity for The Chancellor.
  const CHARACTER=Object.freeze({
    id:'the-chancellor-v1',
    role:'Business Growth Desk digital adviser',
    identity:Object.freeze({
      agePresentation:'approximately 60',
      appearance:['mature Black man','completely bald','full longer white-grey beard','narrow gold or rimless glasses','broad mature facial proportions'],
      presence:['wise','warm','authoritative','cool','solution-focused'],
      substituteFaceAllowed:false
    }),
    fashion:Object.freeze({brand:'BEVAN SHELTON',usage:'wardrobe and accessories only'}),
    scenes:Object.freeze(['study-library','johannesburg-rooftop','premium-lounge','airport-travel','university-campus','factory-floor','business-district','stage-keynote','studio-podcast','client-consultation']),
    fallback:'crest-led creative only when approved face is unavailable'
  });
  window.CHANCELLOR_CHARACTER=CHARACTER;

  function show(el){
    if(!el)return;
    if(el.getAttribute('src')!==APPROVED)el.setAttribute('src',APPROVED);
    el.style.visibility='visible';
    el.style.opacity='1';
    el.dataset.brandReady='approved-chancellor-portrait';
    el.dataset.characterId=CHARACTER.id;
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
    document.documentElement.dataset.chancellorCharacter=CHARACTER.id;
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
