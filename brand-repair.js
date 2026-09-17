(()=>{
  const APPROVED='/assets/chancellor-approved-live.webp?v=20260813-approved-1';
  const CREST='/assets/the-chancellor-crest.svg?v=20260813-fix-1';

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

  function ensurePresenceController(){
    if(window.ChancellorPresence||document.querySelector('script[data-chancellor-presence]'))return;
    const script=document.createElement('script');
    script.src='/chancellor-presence.js?v=20260830-1';
    script.defer=true;
    script.dataset.chancellorPresence='1';
    document.head.appendChild(script);
  }
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
  function mountPortfolioAd(){
    if(document.querySelector('[data-portfolio-ad="mre"]'))return;
    const footer=document.querySelector('footer');
    if(!footer)return;
    const ad=document.createElement('a');
    ad.href='https://mandatory-regulatory-exams.vercel.app/?utm_source=the-chancellor&utm_medium=owned_promo&utm_campaign=portfolio_launch';
    ad.target='_blank';
    ad.rel='noopener noreferrer';
    ad.dataset.portfolioAd='mre';
    ad.setAttribute('aria-label','Mandatory Regulatory Exams preparation platform');
    ad.innerHTML='<strong>WORK IN A REGULATED PROFESSION?</strong><span>Prepare for RE1, RE3, RE4, RE5 and other professional exam pathways.</span><em>Find your exam →</em>';
    Object.assign(ad.style,{display:'flex',alignItems:'center',justifyContent:'center',gap:'14px',flexWrap:'wrap',margin:'28px auto',padding:'16px 20px',width:'min(1120px,92vw)',borderRadius:'16px',background:'linear-gradient(135deg,#071827,#0f5960)',border:'1px solid rgba(255,255,255,.18)',color:'#fff',textDecoration:'none',boxShadow:'0 14px 36px rgba(0,0,0,.2)',fontFamily:'Inter,system-ui,-apple-system,Segoe UI,sans-serif'});
    ad.querySelector('strong').style.fontWeight='950';
    ad.querySelector('span').style.opacity='.9';
    ad.querySelector('em').style.cssText='font-style:normal;font-weight:950;color:#f5c95f';
    footer.parentNode.insertBefore(ad,footer);
  }
  function apply(){
    document.documentElement.dataset.chancellorCharacter=CHARACTER.id;
    document.querySelectorAll('.chancellor-portrait,.rescue-portrait,.avatar-img,.campaign-identity img').forEach(show);
    document.querySelectorAll('.crest-logo').forEach(repairCrest);
    loadRescueLayoutFix();
    ensurePresenceController();
    mountPortfolioAd();
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
