(()=>{
  const PORTRAIT='/the-chancellor.jpg?v=20260812-real-1';
  const AVATAR='/the-chancellor-avatar.png?v=20260812-real-1';

  function show(el,src){
    if(!el)return;
    if(el.getAttribute('src')!==src)el.setAttribute('src',src);
    el.style.visibility='visible';
    el.style.opacity='1';
    el.dataset.brandReady='approved-real-photo';
  }

  function apply(){
    document.querySelectorAll('.chancellor-portrait,.rescue-portrait').forEach(el=>show(el,PORTRAIT));
    document.querySelectorAll('.avatar-img').forEach(el=>show(el,AVATAR));
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
  window.addEventListener('pageshow',()=>setTimeout(apply,25));

  // Guard against any older cached brand script trying to swap the approved
  // photograph for a generated likeness after this repair has run.
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      const el=mutation.target;
      if(el.matches?.('.chancellor-portrait,.rescue-portrait')&&el.getAttribute('src')!==PORTRAIT)show(el,PORTRAIT);
      if(el.matches?.('.avatar-img')&&el.getAttribute('src')!==AVATAR)show(el,AVATAR);
    }
  });
  const startObserver=()=>document.querySelectorAll('.chancellor-portrait,.rescue-portrait,.avatar-img').forEach(el=>observer.observe(el,{attributes:true,attributeFilter:['src']}));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();
})();
